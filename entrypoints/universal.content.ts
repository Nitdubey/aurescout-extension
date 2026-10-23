/**
 * AureScout Universal Content Script
 * Handles: Indeed, Naukri, Glassdoor, Wellfound, Greenhouse, Lever
 */

import { defineContentScript } from 'wxt/utils/define-content-script';
import { extractJob, isJobPage, detectPlatform } from '@/lib/extractors/index';
import { getResume, saveResume } from '@/lib/storage/resume';
import { isJobSaved } from '@/lib/storage/jobs';
import { matchOffline } from '@/lib/matching/matcher';
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
      let matchResult: import('@/lib/matching/matcher').MatchResult = {
        score: 0,
        tier: 'NOT A FIT',
        matchedSkills: [],
        missingSkills: [],
        resumeSkills: [],
        jdSkills: [],
        latencyMs: 0,
      };

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
      if (anchor.parentElement.querySelector('[data-aurescout-badge]')) {
        return () => undefined; // already injected
      }

      const colors: Record<string, string> = {
        'STRONG FIT': '#22c55e',
        'PARTIAL FIT': '#f59e0b',
        'NOT A FIT': '#ef4444',
      };

      const host = document.createElement('div');
      host.setAttribute('data-aurescout-badge', 'true');
      host.style.cssText = 'display:inline-flex;align-items:center;margin-top:6px;';

      const shadow = host.attachShadow({ mode: 'closed' });
      const bgColor = noResume ? '#f3f4f6' : (colors[tier] ?? '#6b7280');
      const textColor = noResume ? '#6b7280' : '#fff';
      const label = noResume ? 'Add Resume for Score' : `${score}% Match`;

      shadow.innerHTML = `
        <style>
          .badge {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 4px 12px; border-radius: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 12px; font-weight: 600; cursor: pointer;
            background: ${bgColor}; color: ${textColor};
            border: ${noResume ? '1px dashed #d1d5db' : 'none'};
            box-shadow: 0 1px 4px rgba(0,0,0,0.12);
            white-space: nowrap; transition: opacity 0.15s;
          }
          .badge:hover { opacity: 0.85; }
          .platform { font-size: 10px; opacity: 0.8; }
        </style>
        <button class="badge" title="AureScout Match Score">
          <span>⚡</span>
          <span>${label}</span>
          ${!noResume && tier ? `<span class="platform">${tier}</span>` : ''}
          ${isSaved ? '<span>✓</span>' : ''}
        </button>
      `;

      const btn = shadow.querySelector('button') as HTMLButtonElement;
      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
      });

      // Insert after anchor or after parent
      anchor.parentElement.insertBefore(host, anchor.nextSibling);

      return () => host.remove();
    }

    function scheduleDetection(delay = 1200) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        detectAndInject().catch(() => undefined);
      }, delay);
    }

    // Direct trigger from background or sidepanel
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === 'TRIGGER_DETECTION') {
        scheduleDetection(100);
        sendResponse({ ok: true });
      }
      return false;
    });

    // SPA navigation monitoring via continuous check + popstate
    window.addEventListener('popstate', () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        cleanupBadge?.();
        cleanupBadge = null;
        scheduleDetection(300);
      }
    });

    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        cleanupBadge?.();
        cleanupBadge = null;
        scheduleDetection(300);
        return;
      }

      // If on a job page and badge isn't mounted, detect
      if (isJobPage(window.location.href) && !document.querySelector('[data-aurescout-badge]')) {
        scheduleDetection(400);
      }
    }, 1200);

    scheduleDetection(600);
  },
});
