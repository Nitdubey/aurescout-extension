/**
 * Authenticated API client for AureScout extension.
 * Wraps all fetch calls with Bearer token auth and error handling.
 */

import { getAuthToken } from '@/lib/auth';
import { API_BASE } from '@/lib/constants';

export class APIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class AuthRequiredError extends APIError {
  constructor() {
    super('Authentication required. Please sign in to AureScout.', 401, 'AUTH_REQUIRED');
  }
}

export class InsufficientCreditsError extends APIError {
  constructor() {
    super('Insufficient credits. Please upgrade your plan.', 402, 'UPGRADE_REQUIRED');
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** If true, skip auth token (for guest endpoints) */
  guest?: boolean;
  /** Timeout in ms (default: 30000) */
  timeoutMs?: number;
}

/**
 * Core authenticated fetch wrapper.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, guest = false, timeoutMs = 30_000 } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Extension-Version': chrome.runtime.getManifest().version,
  };

  if (!guest) {
    const token = await getAuthToken();
    if (!token) throw new AuthRequiredError();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw new AuthRequiredError();
    }
    if (response.status === 402) {
      throw new InsufficientCreditsError();
    }
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorCode: string | undefined;
      try {
        const errJson = JSON.parse(errorText) as { code?: string; message?: string };
        errorCode = errJson.code;
      } catch {
        // Not JSON
      }
      throw new APIError(
        `API error ${response.status}: ${errorText}`,
        response.status,
        errorCode
      );
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * SSE streaming fetch — calls the callback for each chunk, returns the full response.
 */
export async function streamRequest(
  endpoint: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  options: { timeoutMs?: number } = {}
): Promise<void> {
  const { timeoutMs = 60_000 } = options;
  const token = await getAuthToken();
  if (!token) throw new AuthRequiredError();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
        'X-Extension-Version': chrome.runtime.getManifest().version,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 402) throw new InsufficientCreditsError();
    if (response.status === 401 || response.status === 403) throw new AuthRequiredError();
    if (!response.ok) throw new APIError('Stream request failed', response.status);

    const reader = response.body?.getReader();
    if (!reader) throw new APIError('No response body', 500);

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data && data !== '[DONE]') {
            onChunk(data);
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.startsWith('data: ')) {
      const data = buffer.slice(6).trim();
      if (data && data !== '[DONE]') onChunk(data);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
