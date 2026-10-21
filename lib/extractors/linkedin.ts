import { safeQueryText, stripHtml, extractSalaryRegex } from './utils';
import type { ExtractedJob } from './types';

/**
 * LinkedIn DOM extractor.
 *
 * LinkedIn is a Single Page Application (SPA) — selectors must work on both:
 *  - /jobs/view/:id (direct link)
 *  - /jobs/search/ with currentJobId (split-pane search result)
 *
 * NOTE: LinkedIn frequently changes class names. We use multiple fallback selectors
 * and rely on data attributes or structural selectors where possible.
 */
export function extractFromLinkedIn(): ExtractedJob | null {
  // ── Title ────────────────────────────────────────────────────────────────────
  const title = safeQueryText([
    // Unified top card (2024+)
    'h1.job-details-jobs-unified-top-card__job-title',
    'h1[class*="job-details-jobs-unified-top-card__job-title"]',
    // Older patterns
    '.jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title',
    'h1.t-24.t-bold.inline',
    'h1[class*="topcard__title"]',
    // Generic fallback
    '.jobs-details-top-card__job-title',
    '.job-view-layout h1',
    'h1',
  ]);

  // ── Company ──────────────────────────────────────────────────────────────────
  const company = safeQueryText([
    '.job-details-jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    '[class*="topcard__org-name-link"]',
    '.jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name a',
    '.topcard__org-name-link',
    'a[class*="company-name"]',
    '.job-details-jobs-unified-top-card__primary-description-container a',
  ]);

  // ── Location ─────────────────────────────────────────────────────────────────
  const location = safeQueryText([
    '.job-details-jobs-unified-top-card__bullet',
    '.jobs-unified-top-card__bullet',
    '[class*="topcard__flavor--bullet"]',
    '.tvm__text--low-emphasis', // sub-description line items
    '.job-details-jobs-unified-top-card__primary-description span.tvm__text',
    '.jobs-unified-top-card__workplace-type',
  ]);

  // ── Description ──────────────────────────────────────────────────────────────
  const descEl =
    document.querySelector('#job-details') ??
    document.querySelector('.jobs-description__content .jobs-box__html-content') ??
    document.querySelector('.jobs-description__content') ??
    document.querySelector('.jobs-box__html-content') ??
    document.querySelector('[class*="jobs-description"]');

  const description = descEl ? stripHtml(descEl.innerHTML) : '';

  // ── Salary (optional) ────────────────────────────────────────────────────────
  const salaryEl = document.querySelector(
    '.job-details-jobs-unified-top-card__job-insight-text-v2,' +
    '[class*="compensation"],' +
    '.jobs-unified-top-card__salary-info'
  );
  const salary = salaryEl
    ? extractSalaryRegex(salaryEl.textContent ?? '')
    : extractSalaryRegex(
        safeQueryText(['.jobs-unified-top-card__job-insight'])
      );

  if (!title && !description) return null;

  return {
    title: title || 'Unknown Position',
    company: company || 'Unknown Company',
    location,
    description,
    salary,
    url: window.location.href,
    platform: 'LinkedIn',
    extractedAt: Date.now(),
    extractionMethod: 'dom',
  };
}
