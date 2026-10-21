import { safeQueryText, stripHtml, extractSalaryRegex } from './utils';
import type { ExtractedJob } from './types';

/**
 * Indeed DOM extractor.
 * Indeed uses stable data-testid attributes which rarely change.
 */
export function extractFromIndeed(): ExtractedJob | null {
  // ── Title ────────────────────────────────────────────────────────────────────
  const title = safeQueryText([
    '[data-testid="job-title"]',
    'h1.jobsearch-JobInfoHeader-title',
    '[class*="jobTitle"] h1',
    'h1[class*="JobTitle"]',
    'h1',
  ]);

  // ── Company ──────────────────────────────────────────────────────────────────
  const company = safeQueryText([
    '[data-testid="company-name"]',
    '[data-testid="inlineHeader-companyName"]',
    '[class*="companyName"]',
    '.icl-u-lg-mr--sm a',
    '[class*="EmployerName"]',
  ]);

  // ── Location ─────────────────────────────────────────────────────────────────
  const location = safeQueryText([
    '[data-testid="text-location"]',
    '[data-testid="inlineHeader-companyLocation"]',
    '[class*="companyLocation"]',
    '.jobsearch-JobInfoHeader-subtitle > div:last-child',
    '[class*="Location"]',
  ]);

  // ── Description ──────────────────────────────────────────────────────────────
  const descEl =
    document.querySelector('#jobDescriptionText') ??        // very stable
    document.querySelector('[class*="jobDescriptionText"]') ??
    document.querySelector('[data-testid="jobDescriptionText"]');

  const description = descEl ? stripHtml(descEl.innerHTML) : '';

  // ── Salary ───────────────────────────────────────────────────────────────────
  const salaryText = safeQueryText([
    '[data-testid="attribute_snippet_testid"]',
    '#salaryInfoAndJobType .attribute_snippet',
    '.js-match-insights-provider-salary',
    '[class*="Salary"]',
    '[class*="salary"]',
  ]);
  const salary = salaryText ? extractSalaryRegex(salaryText) : undefined;

  if (!title && !description) return null;

  return {
    title: title || 'Unknown Position',
    company: company || 'Unknown Company',
    location,
    description,
    salary,
    url: window.location.href,
    platform: 'Indeed',
    extractedAt: Date.now(),
    extractionMethod: 'dom',
  };
}
