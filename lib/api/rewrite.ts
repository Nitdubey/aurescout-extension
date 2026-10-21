/**
 * Resume Rewrite SSE API — POST /api/rewrite (requires auth, 1 credit)
 * Streams the rewritten resume token-by-token.
 */

import { streamRequest } from './client';

export interface RewriteRequest {
  resumeText: string;
  jdText?: string;
  jobDescription?: string;
  targetCompany?: string;
  company?: string;
}

export interface RewriteChunk {
  type: 'chunk' | 'complete' | 'error' | 'progress';
  content?: string;
  result?: any;
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

function normalizeRewriteResult(raw: any): RewriteResult {
  if (!raw) {
    return {
      rewrittenResume: '',
      beforeAtsScore: 0,
      afterAtsScore: 0,
      improvements: [],
      keywordsAdded: [],
    };
  }
  return {
    rewrittenResume: raw.rewrittenResume || raw.rewritten_resume || '',
    beforeAtsScore: raw.beforeAtsScore ?? raw.original_ats_score ?? 0,
    afterAtsScore: raw.afterAtsScore ?? raw.new_ats_score ?? 0,
    improvements: Array.isArray(raw.improvements)
      ? raw.improvements
      : Array.isArray(raw.improvements_made)
      ? raw.improvements_made
      : [],
    keywordsAdded: Array.isArray(raw.keywordsAdded)
      ? raw.keywordsAdded
      : Array.isArray(raw.keywords_added)
      ? raw.keywords_added
      : [],
  };
}

/**
 * Stream a resume rewrite from the AureScout backend.
 *
 * @param request  Resume text + job description + optional target company
 * @param onChunk  Called on each streaming token (for live typing effect)
 * @param onComplete  Called when rewrite is fully done
 */
export async function streamRewrite(
  request: RewriteRequest,
  onChunk: (token: string) => void,
  onComplete: (result: RewriteResult) => void
): Promise<void> {
  const payload = {
    resumeText: request.resumeText,
    jobDescription: request.jobDescription || request.jdText || '',
    jdText: request.jdText || request.jobDescription || '',
    targetCompany: request.targetCompany || request.company || undefined,
    company: request.company || request.targetCompany || undefined,
  };

  await streamRequest(
    '/api/rewrite',
    payload,
    (rawData: string) => {
      try {
        const chunk = JSON.parse(rawData) as RewriteChunk;

        if (chunk.type === 'chunk' && chunk.content) {
          onChunk(chunk.content);
        } else if (chunk.type === 'complete' && chunk.result) {
          onComplete(normalizeRewriteResult(chunk.result));
        } else if (chunk.type === 'error') {
          throw new Error(chunk.message ?? 'Rewrite failed');
        }
      } catch (err: any) {
        if (err?.message && !err.message.includes('Unexpected token')) {
          throw err;
        }
        // Raw text chunk (not JSON) — treat as content
        if (rawData.length > 0 && !rawData.startsWith('{')) {
          onChunk(rawData);
        }
      }
    },
    { timeoutMs: 60_000 }
  );
}
