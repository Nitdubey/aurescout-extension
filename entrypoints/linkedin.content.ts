/**
 * AureScout Content Script — LinkedIn
 *
 * Injected on LinkedIn job pages. Detects job postings, computes offline
 * match score, and injects a Shadow DOM badge near the job title.
 *
 * Anti-detection principles:
 * - Uses Shadow DOM (closed mode) for all injected UI
 * - Never programmatically clicks LinkedIn buttons
 * - Passive read-only — only reads DOM, never writes to LinkedIn's DOM
 * - Handles SPA navigation via MutationObserver + history state monitoring
 */

import { defineContentScript } from 'wxt/utils/define-content-script';
import { extractFromLinkedIn } from '@/lib/extractors/linkedin';
import { extractFromJsonLD } from '@/lib/extractors/jsonld';
import { isJobPage } from '@/lib/extractors/utils';
import { getResume, saveResume } from '@/lib/storage/resume';
import { isJobSaved } from '@/lib/storage/jobs';
import { matchOffline } from '@/lib/matching/matcher';
import { getUserProfile } from '@/lib/auth';

export default defineContentScript({
  matches: ['*://*.linkedin.com/*'],
  runAt: 'document_idle',
  main() {
    let lastUrl = window.location.href;
    let cleanupBadge: (() => void) | null = null;
    let isDetecting = false;

    function isGarbageTitle(text: string): boolean {
      if (!text) return true;
      const lower = text.toLowerCase().trim();
      const garbage = [
        'are these results helpful',
        'jobs that match your profile',
        'determine your fit',
        'about the job',
        'people you can reach out to',
        'how you compare',
        'search',
        'unknown',
        'feedback',
        'messaging',
        'notifications',
        'show match details',
        'tailor my resume',
        'help me stand out',
      ];
      return garbage.some(g => lower.includes(g)) || lower.length < 3;
    }

    // ── Helper: find the title anchor inside the detail pane ───────────────────
    function findAnchor(): HTMLElement | null {
      // Must target the RIGHT detail pane only, NEVER the left search list
      let detailPane: HTMLElement | null =
        document.querySelector('.scaffold-layout__detail') ||
        document.querySelector('.jobs-search__job-details--wrapper') ||
        document.querySelector('.jobs-search__job-details') ||
        document.querySelector('.job-view-layout') ||
        document.querySelector('.jobs-details__main-content');

      if (!detailPane) {
        const jobDetailsEl =
          document.querySelector('#job-details') ||
          document.querySelector('[id^="JobDetails_AboutTheJob_"]') ||
          document.querySelector('.jobs-description__content');

        if (jobDetailsEl) {
          detailPane = (
            jobDetailsEl.closest('.scaffold-layout__detail') ||
            jobDetailsEl.closest('.jobs-search__job-details--wrapper') ||
            jobDetailsEl.closest('main') ||
            jobDetailsEl.parentElement?.parentElement
          ) as HTMLElement | null;
        }
      }

      if (!detailPane) return null;

      const selectors = [
        '.job-details-jobs-unified-top-card__job-title h1',
        '.job-details-jobs-unified-top-card__job-title h2',
        '.job-details-jobs-unified-top-card__job-title a',
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-unified-top-card__job-title h1',
        '.jobs-unified-top-card__job-title h2',
        '.jobs-unified-top-card__job-title',
        'h1.job-details-jobs-unified-top-card__job-title',
        'h2.job-details-jobs-unified-top-card__job-title',
        'h1[class*="job-details-jobs-unified-top-card__job-title"]',
        'h2[class*="job-details-jobs-unified-top-card__job-title"]',
        'h1[class*="job-title"]',
        'h2[class*="job-title"]',
        '.top-card-layout__title',
        'h1.t-24',
        'h2.t-24',
        'h1.t-bold',
        'h2.t-bold',
        'a[href*="/jobs/view/"]',
      ];

      for (const sel of selectors) {
        const el = detailPane.querySelector(sel);
        if (
          el &&
          el instanceof HTMLElement &&
          el.innerText.trim().length > 3 &&
          !isGarbageTitle(el.innerText) &&
          !el.closest('#job-details') &&
          !el.closest('[id^="JobDetails_AboutTheJob_"]') &&
          !el.closest('.jobs-description')
        ) {
          return el;
        }
      }
      return null;
    }

    // ── Main job detection + badge injection ─────────────────────────────────
    async function detectAndInject(retryCount = 0) {
      if (isDetecting) return;
      if (!isJobPage(window.location.href)) {
        cleanupBadge?.();
        cleanupBadge = null;
        return;
      }

      isDetecting = true;
      try {
        const job = extractFromJsonLD() ?? extractFromLinkedIn();

        // If job element not found yet (AJAX loading), retry up to 5 times
        if (!job) {
          if (retryCount < 5) {
            setTimeout(() => detectAndInject(retryCount + 1), 600);
          }
          return;
        }

        // If description is still loading (< 50 chars), retry before giving up
        if (job.description.length < 50 && retryCount < 5) {
          setTimeout(() => detectAndInject(retryCount + 1), 600);
          return;
        }

        let resume = await getResume();

        // If local resume is missing, auto-hydrate from Career Memory
        if (!resume) {
          try {
            const profile = await getUserProfile();
            if (profile?.resumeText && profile.resumeText.length > 50) {
              await saveResume(profile.resumeText);
              resume = await getResume();
            }
          } catch {}
        }

        if (!resume) {
          // Broadcast detected job so side panel displays details even without resume
          chrome.runtime.sendMessage({
            type: 'JOB_DETECTED',
            job: { ...job, platform: 'LinkedIn' },
            matchResult: {
              score: 0,
              tier: 'NOT A FIT',
              matchedSkills: [],
              missingSkills: [],
              resumeSkills: [],
              jdSkills: [],
              latencyMs: 0,
            },
          }).catch(() => undefined);

          cleanupBadge?.();
          cleanupBadge = injectNoResumeBadge();
          return;
        }

        const result = matchOffline(resume.text, job.description);

        // Notify background to set toolbar badge and update side panel
        chrome.runtime.sendMessage({
          type: 'JOB_DETECTED',
          job: { ...job, platform: 'LinkedIn' },
          matchResult: result,
        }).catch(() => undefined);

        // Check if already saved
        const saved = await isJobSaved(window.location.href);

        cleanupBadge?.();
        cleanupBadge = injectMatchBadge(result.score, result.tier, saved);
      } finally {
        isDetecting = false;
      }
    }

    // ── Badge injection using Shadow DOM ────────────────────────────────────
    function injectMatchBadge(
      score: number,
      tier: string,
      isSaved: boolean
    ): () => void {
      const anchor = findAnchor();
      if (!anchor?.parentElement) return () => undefined;
      if (anchor.parentElement.querySelector('[data-aurescout-badge]')) return () => undefined;

      const colors: Record<string, string> = {
        'STRONG FIT': '#22c55e',
        'PARTIAL FIT': '#f59e0b',
        'NOT A FIT': '#ef4444',
      };
      const color = colors[tier] ?? '#6b7280';

      const host = document.createElement('div');
      host.setAttribute('data-aurescout-badge', 'true');
      host.style.cssText = 'display:inline-flex;align-items:center;margin-left:8px;vertical-align:middle;';

      const shadow = host.attachShadow({ mode: 'closed' });
      shadow.innerHTML = `
        <style>
          :host { display: inline-flex; align-items: center; }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 3px 10px;
            border-radius: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.15s ease;
            background: ${color};
            color: #fff;
            border: none;
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
            white-space: nowrap;
          }
          .badge:hover { opacity: 0.85; }
          .badge .icon { font-size: 11px; }
          .saved { margin-left: 4px; opacity: 0.8; }
        </style>
        <button class="badge" title="AureScout Match — click to analyze">
          <span class="icon">⚡</span>
          <span>${score}% ${tier}</span>
          ${isSaved ? '<span class="saved">✓ Saved</span>' : ''}
        </button>
      `;

      const button = shadow.querySelector('button') as HTMLButtonElement;
      button.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
      });

      anchor.parentElement.insertBefore(host, anchor.nextSibling);

      return () => host.remove();
    }

    function injectNoResumeBadge(): () => void {
      const anchor = findAnchor();
      if (!anchor?.parentElement) return () => undefined;
      if (anchor.parentElement.querySelector('[data-aurescout-badge]')) return () => undefined;

      const host = document.createElement('div');
      host.setAttribute('data-aurescout-badge', 'true');
      host.style.cssText = 'display:inline-flex;align-items:center;margin-left:8px;vertical-align:middle;';

      const shadow = host.attachShadow({ mode: 'closed' });
      shadow.innerHTML = `
        <style>
          .badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 2px 8px; border-radius: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 11px; font-weight: 500; cursor: pointer;
            background: #f3f4f6; color: #6b7280; border: 1px dashed #d1d5db;
            white-space: nowrap;
          }
          .badge:hover { background: #e5e7eb; }
        </style>
        <button class="badge" title="Add resume to get match score">
          ⚡ Add Resume
        </button>
      `;

      const btn = shadow.querySelector('button') as HTMLButtonElement;
      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
      });

      anchor.parentElement.insertBefore(host, anchor.nextSibling);

      return () => host.remove();
    }

    // ── Listen for direct trigger from Background / SidePanel ────────────────
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === 'TRIGGER_DETECTION') {
        detectAndInject(0).catch(() => undefined);
        sendResponse({ ok: true });
      }
      return false;
    });

    // ── Continuous check for URL changes and unmounted badges ────────────────
    setInterval(() => {
      const urlChanged = window.location.href !== lastUrl;
      if (urlChanged) {
        lastUrl = window.location.href;
        cleanupBadge?.();
        cleanupBadge = null;
        detectAndInject(0).catch(() => undefined);
        return;
      }

      // If we are on a job page but badge was not yet mounted, trigger detection
      if (isJobPage(window.location.href) && !document.querySelector('[data-aurescout-badge]')) {
        detectAndInject(0).catch(() => undefined);
      }
    }, 700);

    // ── Initial detection ─────────────────────────────────────────────────────
    setTimeout(() => detectAndInject(0).catch(() => undefined), 400);
  },
});
