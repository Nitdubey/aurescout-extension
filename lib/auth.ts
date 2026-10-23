/**
 * Clerk auth manager for the Chrome Extension.
 *
 * Uses @clerk/chrome-extension to sync auth state with aurescout.com.
 * The extension mirrors the user's session from the SaaS web app — no
 * separate login required if the user is already signed in on aurescout.com.
 */

import { STORAGE_KEYS, SYNC_HOST } from '@/lib/constants';
import { saveResume } from '@/lib/storage/resume';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  imageUrl?: string;
  credits: number;
  plan: 'free' | 'pro' | 'enterprise';
  isAdmin: boolean;
  resumeText?: string;
  skills?: string[];
  targetRole?: string;
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
 * Helper to retrieve the active __session cookie across host variants
 */
export async function getSessionCookie(): Promise<string | null> {
  try {
    const cookie = await new Promise<chrome.cookies.Cookie | null>(resolve => {
      chrome.cookies.get({ url: SYNC_HOST, name: '__session' }, c => resolve(c ?? null));
    });
    if (cookie?.value) return cookie.value;

    const allCookies = await new Promise<chrome.cookies.Cookie[]>(resolve => {
      chrome.cookies.getAll({ name: '__session' }, cookies => resolve(cookies || []));
    });
    const match = allCookies.find(c =>
      c.domain.includes('aurescout.com') ||
      c.domain === 'localhost' ||
      c.domain === '127.0.0.1'
    );
    return match?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch a fresh JWT token from the SaaS backend via cookie-based auth.
 * The SaaS sets __session cookie from Clerk; we read it and exchange it.
 */
async function fetchFreshToken(): Promise<StoredSession | null> {
  try {
    const sessionCookieValue = await getSessionCookie();
    if (!sessionCookieValue) return null;

    // Exchange cookie for a fresh token + user profile
    // Note: Standard fetch drops "Cookie" header in browser extensions, so we pass
    // Authorization: Bearer <cookie> and X-Session-Token for 100% reliable auth
    const response = await fetch(`${SYNC_HOST}/api/extension/auth`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-Extension-Version': chrome.runtime.getManifest().version,
        'Authorization': `Bearer ${sessionCookieValue}`,
        'X-Session-Token': sessionCookieValue,
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

    // Auto-hydrate local resume storage with Career Memory from SaaS
    if (data.user.resumeText && data.user.resumeText.length > 50) {
      await saveResume(data.user.resumeText);
    }

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
