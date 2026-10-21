/**
 * Clerk auth manager for the Chrome Extension.
 *
 * Uses @clerk/chrome-extension to sync auth state with aurescout.com.
 * The extension mirrors the user's session from the SaaS web app — no
 * separate login required if the user is already signed in on aurescout.com.
 */

import { STORAGE_KEYS, SYNC_HOST } from '@/lib/constants';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  imageUrl?: string;
  credits: number;
  plan: 'free' | 'pro' | 'enterprise';
  isAdmin: boolean;
}

interface StoredSession {
  token: string;
  expiresAt: number; // Unix ms
  profile: UserProfile;
}

const TOKEN_REFRESH_BUFFER_MS = 60_000; // refresh 60s before expiry

/**
 * Retrieve the cached auth session from chrome.storage.local.
 * Returns null if expired or missing.
 */
async function getCachedSession(): Promise<StoredSession | null> {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEYS.AUTH_SESSION], result => {
      const session = result[STORAGE_KEYS.AUTH_SESSION] as StoredSession | undefined;
      if (!session) return resolve(null);
      if (Date.now() >= session.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
        // Expired or about to expire
        chrome.storage.local.remove(STORAGE_KEYS.AUTH_SESSION);
        return resolve(null);
      }
      resolve(session);
    });
  });
}

/**
 * Save a session to chrome.storage.local.
 */
async function saveSession(session: StoredSession): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEYS.AUTH_SESSION]: session }, resolve);
  });
}

/**
 * Clear the stored session (logout).
 */
export async function clearSession(): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.remove(STORAGE_KEYS.AUTH_SESSION, resolve);
  });
}

/**
 * Fetch a fresh JWT token from the SaaS backend via cookie-based auth.
 * The SaaS sets __session cookie from Clerk; we read it and exchange it.
 */
async function fetchFreshToken(): Promise<StoredSession | null> {
  try {
    // Get the __session cookie from aurescout.com
    const cookie = await new Promise<chrome.cookies.Cookie | null>(resolve => {
      chrome.cookies.get(
        { url: SYNC_HOST, name: '__session' },
        c => resolve(c ?? null)
      );
    });

    if (!cookie?.value) return null;

    // Exchange cookie for a fresh token + user profile
    const response = await fetch(`${SYNC_HOST}/api/extension/auth`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-Extension-Version': chrome.runtime.getManifest().version,
        Cookie: `__session=${cookie.value}`,
      },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      token: string;
      expiresIn: number; // seconds
      user: UserProfile;
    };

    const session: StoredSession = {
      token: data.token,
      expiresAt: Date.now() + data.expiresIn * 1000,
      profile: data.user,
    };

    await saveSession(session);
    return session;
  } catch {
    return null;
  }
}

/**
 * Get a valid auth token. Uses cache first, then fetches fresh if needed.
 * Returns null if the user is not logged in.
 */
export async function getAuthToken(): Promise<string | null> {
  const cached = await getCachedSession();
  if (cached) return cached.token;

  const fresh = await fetchFreshToken();
  return fresh?.token ?? null;
}

/**
 * Returns true if the user has an active session.
 */
export async function isLoggedIn(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

/**
 * Returns the current user's profile, or null if not logged in.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const cached = await getCachedSession();
  if (cached) return cached.profile;

  const fresh = await fetchFreshToken();
  return fresh?.profile ?? null;
}

/**
 * Force-refresh the user profile from the API.
 * Call this after credit transactions to update the credit count.
 */
export async function refreshUserProfile(): Promise<UserProfile | null> {
  // Clear cache and re-fetch
  await clearSession();
  const fresh = await fetchFreshToken();
  return fresh?.profile ?? null;
}
