// ── AureScout Extension Constants ────────────────────────────────────────────

export const API_BASE =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://www.aurescout.com';

/** Used for Clerk syncHost and auth cookie domain */
export const SYNC_HOST = 'https://www.aurescout.com';

export const CLERK_SYNC_HOST = 'https://www.aurescout.com';

export const SUPPORTED_PLATFORMS = [
  'linkedin.com',
  'indeed.com',
  'naukri.com',
  'glassdoor.com',
  'wellfound.com',
  'boards.greenhouse.io',
  'jobs.lever.co',
] as const;

export type Platform =
  | 'LinkedIn'
  | 'Indeed'
  | 'Naukri'
  | 'Glassdoor'
  | 'Wellfound'
  | 'Greenhouse'
  | 'Lever'
  | 'Unknown';

export const PLATFORM_COLORS: Record<Platform, string> = {
  LinkedIn: '#0a66c2',
  Indeed: '#003A9B',
  Naukri: '#4054b2',
  Glassdoor: '#0caa41',
  Wellfound: '#000000',
  Greenhouse: '#3c7a3d',
  Lever: '#3a3b3c',
  Unknown: '#6366f1',
};

export const MATCH_TIERS = {
  STRONG: { min: 80, label: 'STRONG FIT', color: '#22c55e', bg: '#dcfce7' },
  PARTIAL: { min: 50, label: 'PARTIAL FIT', color: '#f59e0b', bg: '#fef3c7' },
  WEAK: { min: 0, label: 'NOT A FIT', color: '#ef4444', bg: '#fee2e2' },
} as const;

export function getMatchTier(score: number) {
  if (score >= 80) return MATCH_TIERS.STRONG;
  if (score >= 50) return MATCH_TIERS.PARTIAL;
  return MATCH_TIERS.WEAK;
}

export const STORAGE_KEYS = {
  RESUME_TEXT: 'aurescout_resume_text',
  RESUME_UPDATED: 'aurescout_resume_updated_at',
  USER_PROFILE: 'aurescout_user_profile',
  SAVED_JOBS: 'aurescout_saved_jobs',
  SYNC_QUEUE: 'aurescout_sync_queue',
  OFFLINE_QUEUE: 'aurescout_offline_queue',
  AUTH_SESSION: 'aurescout_auth_session',
  SETTINGS: 'aurescout_settings',
  LAST_SYNC: 'aurescout_last_sync',
} as const;

export const RATE_LIMITS = {
  OFFLINE_MATCH_DEBOUNCE_MS: 300,
  AI_SCAN_COOLDOWN_MS: 2000,
};
