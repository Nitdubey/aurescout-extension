import { defineBackground } from 'wxt/utils/define-background';
import { getResume } from '@/lib/storage/resume';
import { saveJob, getSavedJobs, updateJobStatus } from '@/lib/storage/jobs';
import { flushQueue } from '@/lib/storage/sync-queue';
import { syncJobsToCloud, upsertApplication } from '@/lib/api/tracker';
import { refreshUserProfile } from '@/lib/auth';
import { SYNC_HOST } from '@/lib/constants';
import type { ExtractedJob } from '@/lib/extractors/types';
import type { MatchResult } from '@/lib/matching/matcher';
import type { SavedJob } from '@/lib/storage/jobs';

// ── Message types ─────────────────────────────────────────────────────────────
export type BackgroundMessage =
  | { type: 'OPEN_SIDE_PANEL'; tabId: number }
  | { type: 'GET_MATCH_DATA' }
  | { type: 'SET_MATCH_BADGE'; tabId: number; score: number; tier: string }
  | { type: 'SAVE_JOB'; job: Omit<SavedJob, 'id' | 'savedAt' | 'status'> }
  | { type: 'GET_RESUME' }
  | { type: 'GET_SAVED_JOBS' }
  | { type: 'SYNC_PROFILE' }
  | { type: 'JOB_DETECTED'; job: ExtractedJob; matchResult: MatchResult };

export type BackgroundResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

// ── Match badge colors by tier ────────────────────────────────────────────────
const BADGE_COLORS: Record<string, string> = {
  'STRONG FIT': '#22c55e',   // green-500
  'PARTIAL FIT': '#f59e0b',  // amber-500
  'NOT A FIT': '#ef4444',    // red-500
};

// ── Active job data per tab ───────────────────────────────────────────────────
interface TabJobData {
  job: ExtractedJob;
  matchResult: MatchResult;
  detectedAt: number;
}
const tabJobData = new Map<number, TabJobData>();

export default defineBackground(() => {
  // ── On install ──────────────────────────────────────────────────────────────
  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      // Open welcome tab
      chrome.tabs.create({ url: `${SYNC_HOST}/extension-welcome` });

      // Set uninstall URL for feedback
      chrome.runtime.setUninstallURL(
        `${SYNC_HOST}/extension-uninstall?v=${chrome.runtime.getManifest().version}`
      );
    }
  });

  // ── Side panel: open on toolbar click ──────────────────────────────────────
  chrome.action.onClicked.addListener(async tab => {
    if (!tab.id) return;
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch {
      // Side panel may not be supported — open popup instead (handled by manifest)
    }
  });

  // ── Message handler ─────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener(
    (
      message: BackgroundMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: BackgroundResponse) => void
    ) => {
      const tabId = sender.tab?.id;

      switch (message.type) {
        // ── Open Side Panel ─────────────────────────────────────────────────
        case 'OPEN_SIDE_PANEL': {
          chrome.sidePanel.open({ tabId: message.tabId }).then(() => {
            sendResponse({ ok: true });
          }).catch(err => {
            sendResponse({ ok: false, error: String(err) });
          });
          return true;
        }

        // ── Job Detected by Content Script ──────────────────────────────────
        case 'JOB_DETECTED': {
          if (tabId) {
            tabJobData.set(tabId, {
              job: message.job,
              matchResult: message.matchResult,
              detectedAt: Date.now(),
            });

            // Set toolbar badge
            const score = message.matchResult.score;
            const tier = message.matchResult.tier;
            chrome.action.setBadgeText({ text: String(score), tabId });
            chrome.action.setBadgeBackgroundColor({
              color: BADGE_COLORS[tier] ?? '#6b7280',
              tabId,
            });
            chrome.action.setBadgeTextColor({ color: '#ffffff', tabId });
          }
          sendResponse({ ok: true });
          return false;
        }

        // ── Set match badge from content ────────────────────────────────────
        case 'SET_MATCH_BADGE': {
          const { tabId: targetTab, score, tier } = message;
          chrome.action.setBadgeText({ text: String(score), tabId: targetTab });
          chrome.action.setBadgeBackgroundColor({
            color: BADGE_COLORS[tier] ?? '#6b7280',
            tabId: targetTab,
          });
          chrome.action.setBadgeTextColor({ color: '#ffffff', tabId: targetTab });
          sendResponse({ ok: true });
          return false;
        }

        // ── Get match data for current tab ──────────────────────────────────
        case 'GET_MATCH_DATA': {
          const data = tabId ? tabJobData.get(tabId) : undefined;
          sendResponse({ ok: true, data });
          return false;
        }

        // ── Get resume ──────────────────────────────────────────────────────
        case 'GET_RESUME': {
          getResume().then(resume => {
            sendResponse({ ok: true, data: resume });
          }).catch(err => {
            sendResponse({ ok: false, error: String(err) });
          });
          return true;
        }

        // ── Save job ────────────────────────────────────────────────────────
        case 'SAVE_JOB': {
          saveJob(message.job).then(saved => {
            sendResponse({ ok: true, data: saved });
          }).catch(err => {
            sendResponse({ ok: false, error: String(err) });
          });
          return true;
        }

        // ── Get saved jobs ──────────────────────────────────────────────────
        case 'GET_SAVED_JOBS': {
          getSavedJobs().then(jobs => {
            sendResponse({ ok: true, data: jobs });
          }).catch(err => {
            sendResponse({ ok: false, error: String(err) });
          });
          return true;
        }

        // ── Sync profile ────────────────────────────────────────────────────
        case 'SYNC_PROFILE': {
          refreshUserProfile().then(profile => {
            sendResponse({ ok: true, data: profile });
          }).catch(err => {
            sendResponse({ ok: false, error: String(err) });
          });
          return true;
        }

        default:
          sendResponse({ ok: false, error: 'Unknown message type' });
          return false;
      }
    }
  );

  // ── Clear tab data when tab closes ─────────────────────────────────────────
  chrome.tabs.onRemoved.addListener(tabId => {
    tabJobData.delete(tabId);
    chrome.action.setBadgeText({ text: '', tabId });
  });

  // ── Clear badge on navigation ───────────────────────────────────────────────
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      chrome.action.setBadgeText({ text: '', tabId });
      tabJobData.delete(tabId);
    }
  });

  // ── Periodic cloud sync (every 30 min) ─────────────────────────────────────
  chrome.alarms.create('PERIODIC_SYNC', { periodInMinutes: 30 });

  chrome.alarms.onAlarm.addListener(async alarm => {
    if (alarm.name === 'PERIODIC_SYNC') {
      try {
        const jobs = await getSavedJobs();
        if (jobs.length > 0) {
          await syncJobsToCloud(jobs);
        }

        // Flush offline queue
        await flushQueue(async action => {
          if (action.type === 'SAVE_JOB') {
            const job = action.payload as SavedJob;
            await upsertApplication(job);
            return true;
          }
          return false;
        });
      } catch {
        // Silent fail — will retry next cycle
      }
    }
  });
});
