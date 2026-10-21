/**
 * Application tracker API client.
 * Syncs saved jobs to the AureScout backend tracker.
 */

import { apiRequest } from './client';
import type { SavedJob } from '@/lib/storage/jobs';

export interface ApplicationRecord {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  url: string;
  status: SavedJob['status'];
  matchScore: number;
  appliedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface SyncPayload {
  jobs: Array<{
    url: string;
    title: string;
    company: string;
    location: string;
    matchScore: number;
    status: string;
    savedAt: number;
  }>;
  source: 'extension';
  extensionVersion: string;
}

/**
 * Sync the user's saved jobs to the AureScout backend.
 * Calls POST /api/extension/sync
 */
export async function syncJobsToCloud(jobs: SavedJob[]): Promise<void> {
  const payload: SyncPayload = {
    jobs: jobs.map(j => ({
      url: j.url,
      title: j.title,
      company: j.company,
      location: j.location,
      matchScore: j.matchScore,
      status: j.status,
      savedAt: j.savedAt,
    })),
    source: 'extension',
    extensionVersion: chrome.runtime.getManifest().version,
  };

  await apiRequest('/api/extension/sync', {
    method: 'POST',
    body: payload,
    timeoutMs: 15_000,
  });
}

/**
 * Get the user's application records from the cloud tracker.
 */
export async function getApplications(): Promise<ApplicationRecord[]> {
  const result = await apiRequest<{ applications: ApplicationRecord[] }>(
    '/api/applications',
    { method: 'GET', timeoutMs: 10_000 }
  );
  return result.applications ?? [];
}

/**
 * Create or update an application in the cloud tracker.
 */
export async function upsertApplication(
  job: SavedJob
): Promise<ApplicationRecord> {
  return apiRequest<ApplicationRecord>('/api/applications', {
    method: 'POST',
    body: {
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      status: job.status,
      matchScore: job.matchScore,
      appliedAt: job.appliedAt ? new Date(job.appliedAt).toISOString() : undefined,
      notes: job.notes,
    },
    timeoutMs: 10_000,
  });
}
