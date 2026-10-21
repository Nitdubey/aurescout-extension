/**
 * Resume storage — caches the user's plain-text resume in chrome.storage.local.
 * Typical resume size: 2–8 KB (well within the 10 MB storage limit).
 */

import { STORAGE_KEYS } from '@/lib/constants';

export interface StoredResume {
  text: string;
  savedAt: number; // Date.now()
  characterCount: number;
  wordCount: number;
}

/**
 * Save resume text to local storage.
 */
export async function saveResume(text: string): Promise<void> {
  const stored: StoredResume = {
    text: text.trim(),
    savedAt: Date.now(),
    characterCount: text.length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEYS.RESUME_TEXT]: stored }, resolve);
  });
}

/**
 * Retrieve the stored resume text, or null if none saved.
 */
export async function getResume(): Promise<StoredResume | null> {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEYS.RESUME_TEXT], result => {
      resolve((result[STORAGE_KEYS.RESUME_TEXT] as StoredResume | undefined) ?? null);
    });
  });
}

/**
 * Clear the stored resume.
 */
export async function clearResume(): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.remove(STORAGE_KEYS.RESUME_TEXT, resolve);
  });
}

/**
 * Returns true if a resume is stored.
 */
export async function hasResume(): Promise<boolean> {
  const r = await getResume();
  return r !== null && r.text.length > 0;
}
