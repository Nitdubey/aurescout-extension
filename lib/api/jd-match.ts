/**
 * JD Match API client — calls POST /api/jd-match.
 * Works for both guest (3/day IP limit) and authenticated users.
 */

import { apiRequest } from './client';

export interface JDMatchRequest {
  resumeText: string;
  jdText: string;
}

export interface JDMatchResponse {
  score: number;
  tier: 'STRONG FIT' | 'PARTIAL FIT' | 'NOT A FIT';
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  atsScore?: number;
  keywordDensity?: number;
  summary?: string;
}

/**
 * Run AI-powered JD match against the AureScout backend.
 * This is the cloud-powered version (vs offline TF-IDF match).
 * Guest users get 3 free requests/day per IP.
 */
export async function runCloudMatch(
  request: JDMatchRequest
): Promise<JDMatchResponse> {
  return apiRequest<JDMatchResponse>('/api/jd-match', {
    method: 'POST',
    body: request,
    guest: true, // endpoint accepts both auth and guest
    timeoutMs: 25_000,
  });
}
