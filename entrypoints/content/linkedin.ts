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
import { getResume } from '@/lib/storage/resume';
import { isJobSaved } from '@/lib/storage/jobs';
import { matchOffline } from '@/lib/matching/matcher';

export default defineContentScript({
  matches: ['*://*.linkedin.com/*'],
  runAt: 'document_idle',
  main() {
    let currentUrl = window.location.href;
    let cleanupBadge: (() => void) | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // ── Main job detection + badge injection ─────────────────────────────────
    async function detectAndInject() {
      if (!isJobPage(window.location.href)) {
        cleanupBadge?.();
        cleanupBadge = null;
        return;
      }

      const resume = await getResume();
      if (!resume) {
        injectNoResumeBadge();
        return;
      }

      // Extract job data (JSON-LD first, then DOM)
      const job =
        extractFromJsonLD() ??
        extractFromLinkedIn();

      if (!job || job.description.length < 50) return;

      const result = matchOffline(resume.text, job.description);

      // Notify background to set toolbar badge
      chrome.runtime.sendMessage({
        type: 'JOB_DETECTED',
        job: { ...job, platform: 'LinkedIn' },
        matchResult: result,
      });

      // Check if already saved
      const saved = await isJobSaved(window.location.href);

      // Clean up old badge and inject new one
      cleanupBadge?.();
      cleanupBadge = injectMatchBadge(result.score, result.tier, saved);
    }

    // ── Badge injection using Shadow DOM ────────────────────────────────────
    function injectMatchBadge(
      score: number,
      tier: string,
      isSaved: boolean
    ): () => void {
      // Find the anchor element near the job title
      const anchor =
        document.querySelector('h1.job-details-jobs-unified-top-card__job-title') ??
        document.querySelector('h1[class*="job-title"]') ??
        document.querySelector('h1.t-24') ??
        document.querySelector('.jobs-details__main-content h1');

      if (!anchor?.parentElement) return () => undefined;

      const colors: Record<string, string> = {
        'STRONG FIT': '#22c55e',
        'PARTIAL FIT': '#f59e0b',
        'NOT A FIT': '#ef4444',
      };
      const color = colors[tier] ?? '#6b7280';

      // Create host element
      const host = document.createElement('div');
      host.setAttribute('data-aurescout-badge', 'true');
      host.style.cssText = 'display:inline-flex;align-items:center;margin-left:8px;vertical-align:middle;';

      // Attach closed Shadow DOM
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
        // Open side panel
        const tabId = undefined; // content script can't get tab ID directly
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
      });

      anchor.parentElement.insertBefore(host, anchor.nextSibling);

      return () => host.remove();
    }

    function injectNoResumeBadge(): void {
      const anchor = document.querySelector('h1[class*="job-title"]') ??
        document.querySelector('h1');
      if (!anchor?.parentElement) return;

      // Don't inject twice
      if (anchor.parentElement.querySelector('[data-aurescout-badge]')) return;

      const host = document.createElement('div');
      host.setAttribute('data-aurescout-badge', 'true');
      host.style.cssText = 'display:inline-flex;align-items:center;margin-left:8px;';

      const shadow = host.attachShadow({ mode: 'closed' });
      shadow.innerHTML = `
        <style>
          .badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 2px 8px; border-radius: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 11px; font-weight: 500; cursor: pointer;
            background: #f3f4f6; color: #6b7280; border: 1px dashed #d1d5db;
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
    }

    // ── Debounced detection ──────────────────────────────────────────────────
    function scheduleDetection(delay = 1500) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        detectAndInject().catch(() => undefined);
      }, delay);
    }

    // ── SPA navigation monitoring ────────────────────────────────────────────
    // LinkedIn is a full SPA — pushState/replaceState don't fire popstate
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = function (...args) {
      originalPushState(...args);
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        cleanupBadge?.();
        cleanupBadge = null;
        scheduleDetection(1500);
      }
    };

    history.replaceState = function (...args) {
      originalReplaceState(...args);
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        scheduleDetection(1000);
      }
    };

    window.addEventListener('popstate', () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        cleanupBadge?.();
        cleanupBadge = null;
        scheduleDetection(1200);
      }
    });

    // ── MutationObserver for dynamic content ─────────────────────────────────
    // LinkedIn loads job descriptions asynchronously after navigation
    const observer = new MutationObserver(() => {
      const h1 = document.querySelector('h1[class*="job-title"]');
      const badge = document.querySelector('[data-aurescout-badge]');
      if (h1 && !badge && isJobPage(window.location.href)) {
        scheduleDetection(800);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // ── Initial detection ─────────────────────────────────────────────────────
    scheduleDetection(500);
  },
});
