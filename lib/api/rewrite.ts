/**
 * Resume Rewrite SSE API — POST /api/rewrite (requires auth, 1 credit)
 * Streams the rewritten resume token-by-token.
 */

import { streamRequest } from './client';

export interface RewriteRequest {
  resumeText: string;
  jdText: string;
}

export interface RewriteChunk {
  type: 'chunk' | 'complete' | 'error' | 'progress';
  content?: string;
  result?: RewriteResult;
  message?: string;
  code?: string;
}

export interface RewriteResult {
  rewrittenResume: string;
  beforeAtsScore: number;
  afterAtsScore: number;
  improvements: string[];
  keywordsAdded: string[];
}

/**
 * Stream a resume rewrite from the AureScout backend.
 *
 * @param request  Resume text + job description
 * @param onChunk  Called on each streaming token (for live typing effect)
 * @param onComplete  Called when rewrite is fully done
 */
export async function streamRewrite(
  request: RewriteRequest,
  onChunk: (token: string) => void,
  onComplete: (result: RewriteResult) => void
): Promise<void> {
  await streamRequest(
    '/api/rewrite',
    request,
    (rawData: string) => {
      try {
        const chunk = JSON.parse(rawData) as RewriteChunk;

        if (chunk.type === 'chunk' && chunk.content) {
          onChunk(chunk.content);
        } else if (chunk.type === 'complete' && chunk.result) {
          onComplete(chunk.result);
        } else if (chunk.type === 'error') {
          throw new Error(chunk.message ?? 'Rewrite failed');
        }
      } catch {
        // Raw text chunk (not JSON) — treat as content
        if (rawData.length > 0 && !rawData.startsWith('{')) {
          onChunk(rawData);
        }
      }
    },
    { timeoutMs: 60_000 }
  );
}
