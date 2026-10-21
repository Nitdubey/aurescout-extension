/**
 * Should Apply API — POST /api/should-apply (requires auth, 1 credit)
 */

import { apiRequest } from './client';

export interface ShouldApplyRequest {
  jdText: string;
  resumeText?: string;
}

export interface ShouldApplyResponse {
  verdict: 'YES' | 'MAYBE' | 'NO';
  confidence: number; // 0-100
  reasoning: string;
  redFlags?: string[];
  greenFlags?: string[];
  missingRequirements?: string[];
  salaryFit?: 'BELOW' | 'MATCH' | 'ABOVE' | 'UNKNOWN';
}

/**
 * Get AI verdict on whether to apply for a job.
 * Requires authentication. Costs 1 credit.
 */
export async function getShouldApplyVerdict(
  request: ShouldApplyRequest
): Promise<ShouldApplyResponse> {
  return apiRequest<ShouldApplyResponse>('/api/should-apply', {
    method: 'POST',
    body: request,
    timeoutMs: 20_000,
  });
}
