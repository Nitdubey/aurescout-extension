// ── AureScout Job Extraction Engine — Utilities ────────────────────────────────

import type { Platform } from './types';

/**
 * Detects the job board platform from the URL or window.location.
 */
export function detectPlatform(
  url: string = typeof window !== 'undefined' ? window.location.href : ''
): Platform {
  if (!url) return 'Unknown';
  const lower = url.toLowerCase();

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('linkedin.com')) return 'LinkedIn';
    if (hostname.includes('indeed.com')) return 'Indeed';
    if (hostname.includes('naukri.com')) return 'Naukri';
    if (hostname.includes('glassdoor.com')) return 'Glassdoor';
    if (hostname.includes('wellfound.com') || hostname.includes('angel.co')) return 'Wellfound';
    if (hostname.includes('greenhouse.io')) return 'Greenhouse';
    if (hostname.includes('lever.co')) return 'Lever';
  } catch {
    // If URL parsing fails, check string directly
    if (lower.includes('linkedin.com')) return 'LinkedIn';
    if (lower.includes('indeed.com')) return 'Indeed';
    if (lower.includes('naukri.com')) return 'Naukri';
    if (lower.includes('glassdoor.com')) return 'Glassdoor';
    if (lower.includes('wellfound.com') || lower.includes('angel.co')) return 'Wellfound';
    if (lower.includes('greenhouse.io')) return 'Greenhouse';
    if (lower.includes('lever.co')) return 'Lever';
  }

  return 'Unknown';
}

/**
 * Returns true if the URL matches known job posting patterns across supported platforms.
 */
export function isJobPage(
  url: string = typeof window !== 'undefined' ? window.location.href : ''
): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();

  // LinkedIn: /jobs/view/, /jobs/collections/, any /jobs/ with currentjobid
  if (lower.includes('linkedin.com')) {
    return (
      lower.includes('/jobs/view/') ||
      lower.includes('/jobs/collections/') ||
      (lower.includes('/jobs/') && lower.includes('currentjobid=')) ||
      lower.includes('currentjobid=') ||
      /\/jobs\/\d{6,}/.test(lower)
    );
  }

  // Indeed: /viewjob, /rc/clk, /jobs? with jk/vjk
  if (lower.includes('indeed.com')) {
    return (
      lower.includes('/viewjob') ||
      lower.includes('/rc/clk') ||
      (lower.includes('/jobs') && (lower.includes('vjk=') || lower.includes('jk=')))
    );
  }

  // Naukri: /job-listings-, /job-details-, /job-postings/
  if (lower.includes('naukri.com')) {
    return (
      lower.includes('/job-listings-') ||
      lower.includes('/job-details-') ||
      lower.includes('/job-postings/')
    );
  }

  // Greenhouse: boards.greenhouse.io/*/jobs/* or with job?id=
  if (lower.includes('greenhouse.io')) {
    return (
      /boards\.greenhouse\.io\/[^/]+\/jobs\/\d+/i.test(url) ||
      lower.includes('job?id=') ||
      lower.includes('/jobs/')
    );
  }

  // Lever: jobs.lever.co/*/*
  if (lower.includes('lever.co')) {
    return (
      /jobs\.lever\.co\/[^/]+\/[0-9a-f-]{10,}/i.test(url) ||
      (lower.includes('jobs.lever.co/') && !lower.endsWith('jobs.lever.co/'))
    );
  }

  // Glassdoor: /Job/, /job-listing/, jobListingId=
  if (lower.includes('glassdoor.com')) {
    return (
      lower.includes('/job/') ||
      lower.includes('/job-listing/') ||
      lower.includes('joblistingid=') ||
      lower.includes('/jobdetails/')
    );
  }

  // Wellfound / AngelList: /jobs/
  if (lower.includes('wellfound.com') || lower.includes('angel.co')) {
    return lower.includes('/jobs/') || lower.includes('/jobs?');
  }

  return false;
}

/**
 * Tries each selector in order against the root node,
 * returning the first non-empty trimmed text content found, or an empty string.
 */
export function safeQueryText(
  selectors: string[],
  root: ParentNode = document
): string {
  if (!root || !selectors || selectors.length === 0) return '';

  for (const selector of selectors) {
    try {
      const element = root.querySelector(selector);
      if (element) {
        const text =
          (element as HTMLElement).innerText ||
          element.textContent ||
          '';
        const trimmed = text.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    } catch {
      // Continue to next selector if an invalid or unsupported selector was passed
    }
  }

  return '';
}

/**
 * Tries each selector in order and returns the first non-empty attribute value.
 */
export function safeQueryAttr(
  selectors: string[],
  attr: string,
  root: ParentNode = document
): string {
  if (!root || !selectors || selectors.length === 0) return '';

  for (const selector of selectors) {
    try {
      const element = root.querySelector(selector);
      if (element) {
        const val = element.getAttribute(attr);
        if (val && val.trim().length > 0) {
          return val.trim();
        }
      }
    } catch {
      // Ignore query errors
    }
  }

  return '';
}

/**
 * Retrieves the content of the first matching <meta> tag by name or property.
 */
export function safeGetMetaContent(
  namesOrProperties: string[],
  root: ParentNode = document
): string {
  if (!root || !namesOrProperties || namesOrProperties.length === 0) return '';

  for (const key of namesOrProperties) {
    try {
      const el =
        root.querySelector(`meta[name="${key}"]`) ||
        root.querySelector(`meta[property="${key}"]`);
      if (el) {
        const content = el.getAttribute('content');
        if (content && content.trim().length > 0) {
          return content.trim();
        }
      }
    } catch {
      // Ignore query errors
    }
  }

  return '';
}

/**
 * Strips HTML tags using pure regex (safe in Content Script context),
 * decodes common HTML entities, and normalizes whitespace/newlines.
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let cleaned = html;

  // 1. Remove script and style blocks entirely
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 2. Convert line break and block elements to newlines
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/(p|div|section|article|tr|h[1-6])>/gi, '\n');
  cleaned = cleaned.replace(/<li\b[^>]*>/gi, '\n• ');
  cleaned = cleaned.replace(/<\/li>/gi, '');

  // 3. Strip all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // 4. Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&bull;/g, '•')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Decode numeric entities (e.g., &#8217;)
  cleaned = cleaned.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(Number(dec));
    } catch {
      return '';
    }
  });

  // Decode hex entities (e.g., &#x2F;)
  cleaned = cleaned.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return '';
    }
  });

  // 5. Clean up whitespace per line and collapse blank lines
  const lines = cleaned.split('\n');
  const normalizedLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.replace(/[ \t\f\r]+/g, ' ').trim();
    if (trimmedLine.length > 0) {
      normalizedLines.push(trimmedLine);
    } else if (normalizedLines.length > 0 && normalizedLines[normalizedLines.length - 1] !== '') {
      normalizedLines.push('');
    }
  }

  return normalizedLines.join('\n').trim();
}

/**
 * Truncates text to maxChars at the nearest word boundary.
 */
export function truncate(text: string, maxChars: number): string {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxChars) return text;

  const target = text.slice(0, maxChars);
  const lastSpace = target.lastIndexOf(' ');

  // Only break at word boundary if it's reasonably close to maxChars (>70%)
  if (lastSpace > maxChars * 0.7) {
    return target.slice(0, lastSpace).trimEnd() + '...';
  }

  return target.trimEnd() + '...';
}

/**
 * Extracts a salary or compensation string matching standard currency patterns.
 */
export function extractSalaryRegex(text: string): string | undefined {
  if (!text) return undefined;

  // Matches currency symbols or standard codes with numeric ranges and intervals
  const salaryRegex =
    /(?:[\$€£₹]|USD|EUR|GBP|INR)\s*[\d,]+(?:\.\d{2})?(?:\s*(?:k|K|m|M))?(?:\s*(?:[-–—to]+|\/)\s*(?:[\$€£₹]|USD|EUR|GBP|INR)?\s*[\d,]+(?:\.\d{2})?(?:\s*(?:k|K|m|M))?)?(?:\s*(?:\/|per|a|PA|p\.a\.)\s*(?:yr|year|hr|hour|mo|month|annum|day))?/i;

  const match = text.match(salaryRegex);
  return match ? match[0].trim() : undefined;
}
