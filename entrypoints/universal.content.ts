/**
 * AureScout Universal Content Script
 * Handles: Indeed, Naukri, Glassdoor, Wellfound, Greenhouse, Lever
 * Agent-16: <150ms debounced MutationObserver & SPA navigation support
 */

import { defineContentScript } from 'wxt/utils/define-content-script';
import { extractJob, isJobPage, detectPlatform } from '@/lib/extractors/index';
import { getResume, saveResume } from '@/lib/storage/resume';
import { isJobSaved } from '@/lib/storage/jobs';
import { matchOffline, createEmptyMatchResult } from '@/lib/matching/matcher';
import { getUserProfile } from '@/lib/auth';

export default defineContentScript({
  matches: [
    '*://*.indeed.com/*',
    '*://*.naukri.com/*',
    '*://*.glassdoor.com/*',
    '*://*.wellfound.com/*',
    '*://boards.greenhouse.io/*',
    '*://jobs.lever.co/*',
    '*://*.lever.co/*',
  ],
  runAt: 'document_idle',
  main() {
    let currentUrl = window.location.href;
    let cleanupBadge: (() => void) | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    async function detectAndInject() {
      if (!isJobPage(window.location.href)) {
        cleanupBadge?.();
        cleanupBadge = null;
        return;
      }

      let resume = await getResume();

      // Auto-hydrate Career Memory from userProfile if local storage is empty
      if (!resume) {
        try {
          const profile = await getUserProfile();
          if (profile?.resumeText && profile.resumeText.length > 50) {
            await saveResume(profile.resumeText);
            resume = await getResume();
          }
        } catch {}
      }

      const extractionResult = await extractJob();

      if (!extractionResult.success || !extractionResult.job) return;
      if (extractionResult.job.description.length < 50) return;

      const job = extractionResult.job;

      let score = 0;
      let tier = 'NOT A FIT';
      let matchResult = createEmptyMatchResult();

      if (resume) {
        matchResult = matchOffline(resume.text, job.description);
        score = matchResult.score;
        tier = matchResult.tier;
      }

      chrome.runtime.sendMessage({
        type: 'JOB_DETECTED',
        job,
        matchResult,
      }).catch(() => undefined);

      const saved = await isJobSaved(window.location.href);
      cleanupBadge?.();
      cleanupBadge = injectBadge(score, tier, saved, !resume);
    }

    function injectBadge(
      score: number,
      tier: string,
      isSaved: boolean,
      noResume: boolean
    ): () => void {
      // Find best injection anchor per platform
      const anchor =
        document.querySelector('[data-testid="job-title"]') ??         // Indeed
        document.querySelector('h1[class*="jd-header-title"]') ??      // Naukri
        document.querySelector('[class*="JobDetailsHeader"]') ??        // Glassdoor
        document.querySelector('h1[class*="title"]') ??                // Wellfound/Greenhouse
        document.querySelector('.posting-headline h2') ??              // Lever
        document.querySelector('h1') ??
        document.querySelector('h2');

      if (!anchor?.parentElement) return () => undefined;
      if (anchor.parentElement.querySelector('[data-aurescout-badge]')) return () => undefined;

      const host = document.createElement('div');
      host.setAttribute('data-aurescout-badge', 'true');
      host.style.cssText = 'display:inline-flex;align-items:center;margin-left:8px;vertical-align:middle;';

      const shadow = host.attachShadow({ mode: 'closed' });

      const colors: Record<string, string> = {
        'STRONG FIT': '#22c55e',
        'PARTIAL FIT': '#f59e0b',
        'NOT A FIT': '#ef4444',
      };
      const color = noResume ? '#6b7280' : (colors[tier] ?? '#6b7280');

      shadow.innerHTML = `
        <style>
          .badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 2px 8px; border-radius: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 11px; font-weight: 600; cursor: pointer;
            background: ${color}; color: #fff; border: none;
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
            white-space: nowrap;
          }
          .badge:hover { opacity: 0.85; }
        </style>
        <button class="badge" title="AureScout Match — click to open Side Panel">
          ⚡ ${noResume ? 'Add Resume' : `${score}% ${tier}`}${isSaved ? ' · Saved' : ''}
        </button>
      `;

      const btn = shadow.querySelector('button') as HTMLButtonElement;
      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
      });

      anchor.parentElement.insertBefore(host, anchor.nextSibling);

      return () => host.remove();
    }

    function scheduleDetection(delay = 120) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        detectAndInject().catch(() => undefined);
      }, delay);
    }

    // Direct trigger from background or sidepanel
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === 'TRIGGER_DETECTION') {
        scheduleDetection(50);
        sendResponse({ ok: true });
      }
      return false;
    });

    // SPA navigation monitoring via popstate & history state listeners
    const onLocationChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        cleanupBadge?.();
        cleanupBadge = null;
        scheduleDetection(100);
      }
    };

    window.addEventListener('popstate', onLocationChange);

    // Intelligent MutationObserver for SPA detail panes (<150ms switch detection)
    const observer = new MutationObserver((mutations) => {
      let isRelevant = false;
      for (const m of mutations) {
        if (
          m.target instanceof HTMLElement &&
          (m.target.closest('#jobsearch-ViewjobPaneWrapper') ||
           m.target.closest('.jd-container') ||
           m.target.closest('[class*="JobDetails"]') ||
           m.target.closest('[data-testid="job-title"]'))
        ) {
          isRelevant = true;
          break;
        }
      }
      if (isRelevant || window.location.href !== currentUrl) {
        onLocationChange();
        scheduleDetection(120);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Fallback safety poll
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        onLocationChange();
        return;
      }
      if (isJobPage(window.location.href) && !document.querySelector('[data-aurescout-badge]')) {
        scheduleDetection(120);
      }
    }, 1500);

    scheduleDetection(150);
  },
});
