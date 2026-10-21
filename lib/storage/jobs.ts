/**
 * Saved jobs storage — persists job bookmarks in chrome.storage.local.
 * Each saved job stores enough data to display in the popup and link back.
 */

import { STORAGE_KEYS } from '@/lib/constants';
import type { MatchTier } from '@/lib/matching/matcher';

export interface SavedJob {
  id: string; // URL-based hash
  url: string;
  title: string;
  company: string;
  location: string;
  platform: string;
  matchScore: number;
  matchTier: MatchTier;
  savedAt: number; // Date.now()
  /** Application tracking status */
  status: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected';
  appliedAt?: number;
  notes?: string;
}

const MAX_SAVED_JOBS = 500;

/**
 * Generate a simple stable ID from a URL.
 */
function urlToId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

async function getAllJobs(): Promise<SavedJob[]> {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEYS.SAVED_JOBS], result => {
      resolve((result[STORAGE_KEYS.SAVED_JOBS] as SavedJob[] | undefined) ?? []);
    });
  });
}

async function setAllJobs(jobs: SavedJob[]): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEYS.SAVED_JOBS]: jobs }, resolve);
  });
}

/**
 * Save a job to the local bookmark list.
 */
export async function saveJob(job: Omit<SavedJob, 'id' | 'savedAt' | 'status'>): Promise<SavedJob> {
  const jobs = await getAllJobs();
  const id = urlToId(job.url);

  // Check if already saved — update in place
  const existingIndex = jobs.findIndex(j => j.id === id);

  const savedJob: SavedJob = {
    ...job,
    id,
    savedAt: Date.now(),
    status: 'saved',
  };

  if (existingIndex >= 0) {
    jobs[existingIndex] = { ...jobs[existingIndex], ...savedJob };
  } else {
    // Prepend (newest first), enforce max
    jobs.unshift(savedJob);
    if (jobs.length > MAX_SAVED_JOBS) jobs.splice(MAX_SAVED_JOBS);
  }

  await setAllJobs(jobs);
  return savedJob;
}

/**
 * Get all saved jobs (newest first).
 */
export async function getSavedJobs(): Promise<SavedJob[]> {
  return getAllJobs();
}

/**
 * Check if a URL is already saved.
 */
export async function isJobSaved(url: string): Promise<boolean> {
  const id = urlToId(url);
  const jobs = await getAllJobs();
  return jobs.some(j => j.id === id);
}

/**
 * Update a job's status.
 */
export async function updateJobStatus(
  url: string,
  status: SavedJob['status'],
  extra?: Partial<Pick<SavedJob, 'appliedAt' | 'notes'>>
): Promise<void> {
  const id = urlToId(url);
  const jobs = await getAllJobs();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx >= 0) {
    jobs[idx] = { ...jobs[idx], status, ...extra };
    await setAllJobs(jobs);
  }
}

/**
 * Remove a saved job by URL.
 */
export async function removeJob(url: string): Promise<void> {
  const id = urlToId(url);
  const jobs = await getAllJobs();
  await setAllJobs(jobs.filter(j => j.id !== id));
}

/**
 * Clear all saved jobs.
 */
export async function clearSavedJobs(): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.remove(STORAGE_KEYS.SAVED_JOBS, resolve);
  });
}
