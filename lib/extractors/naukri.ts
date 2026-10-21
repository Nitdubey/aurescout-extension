import { safeQueryText, stripHtml, extractSalaryRegex } from './utils';
import type { ExtractedJob } from './types';

/**
 * Naukri.com DOM extractor.
 * Naukri uses class names with underscores and structured data.
 */
export function extractFromNaukri(): ExtractedJob | null {
  // ── Title ────────────────────────────────────────────────────────────────────
  const title = safeQueryText([
    'h1.styles_jd-header-title__rZwM1',
    'h1[class*="jd-header-title"]',
    'h1[class*="jdTitle"]',
    '.jd-header-title h1',
    'h1',
  ]);

  // ── Company ──────────────────────────────────────────────────────────────────
  const company = safeQueryText([
    'a.styles_comp-name__vBqeq',
    'a[class*="comp-name"]',
    'div.jd-header-comp-name a',
    '[class*="companyName"] a',
    '.sub-title a',
  ]);

  // ── Location ─────────────────────────────────────────────────────────────────
  const location = safeQueryText([
    'span.styles_loc-wrap__2oB0N span',
    'span[class*="loc-wrap"] span',
    '.styles_locations__J__VW span',
    '[class*="location"] span',
    '.loc-link',
  ]);

  // ── Description ──────────────────────────────────────────────────────────────
  const descEl =
    document.querySelector('section[class*="styles_JDC"]') ??
    document.querySelector('.dang-inner-html') ??
    document.querySelector('[class*="job-desc"]') ??
    document.querySelector('#job_description');

  const description = descEl ? stripHtml(descEl.innerHTML) : '';

  // ── Salary ───────────────────────────────────────────────────────────────────
  const salaryText = safeQueryText([
    'span.styles_salary-icon__Z3bG7',
    'span[class*="sal-wrap"] span',
    'i.mdi-currency-inr',
    '[class*="salary"]',
  ]);
  const salary = salaryText
    ? extractSalaryRegex(salaryText) ?? (salaryText.length > 0 ? salaryText : undefined)
    : undefined;

  // ── Experience ── Naukri-specific; embed in description context
  const experience = safeQueryText([
    'span[class*="exp"] span',
    'span[class*="exp-wrap"] span',
    '[class*="experience"]',
  ]);

  const enrichedDescription =
    (experience ? `Experience Required: ${experience}\n\n` : '') + description;

  if (!title && !enrichedDescription) return null;

  return {
    title: title || 'Unknown Position',
    company: company || 'Unknown Company',
    location,
    description: enrichedDescription,
    salary,
    url: window.location.href,
    platform: 'Naukri',
    extractedAt: Date.now(),
    extractionMethod: 'dom',
  };
}
