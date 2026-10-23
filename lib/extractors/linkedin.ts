import { safeQueryText, stripHtml, extractSalaryRegex } from './utils';
import type { ExtractedJob } from './types';

/**
 * Filter out common LinkedIn UI prompt strings that are not job titles.
 */
function isGarbageTitle(text: string): boolean {
  if (!text) return true;
  const lower = text.toLowerCase().trim();
  const garbage = [
    'are these results helpful',
    'jobs that match your profile',
    'determine your fit',
    'about the job',
    'people you can reach out to',
    'how you compare',
    'search',
    'unknown',
    'feedback',
    'messaging',
    'notifications',
    'show match details',
    'tailor my resume',
    'help me stand out',
  ];
  return garbage.some(g => lower.includes(g)) || lower.length < 3;
}

function safeQueryTitle(selectors: string[], root: ParentNode): string {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) {
        const text = ((el as HTMLElement).innerText || el.textContent || '').trim();
        if (text && !isGarbageTitle(text)) {
          return text;
        }
      }
    } catch {}
  }
  return '';
}

/**
 * LinkedIn DOM extractor.
 *
 * LinkedIn is a Single Page Application (SPA) — selectors must work on both:
 *  - /jobs/view/:id (direct link)
 *  - /jobs/search/ with currentJobId (split-pane search result)
 */
export function extractFromLinkedIn(): ExtractedJob | null {
  // 1. Get currentJobId from URL if available
  let currentJobId = '';
  try {
    const urlParams = new URLSearchParams(window.location.search);
    currentJobId =
      urlParams.get('currentJobId') ||
      (window.location.pathname.match(/\/jobs\/view\/(\d+)/) || [])[1] ||
      (window.location.pathname.match(/\/jobs\/(\d+)/) || [])[1] ||
      '';
  } catch {
    // ignore URL parse errors
  }

  // 2. Find the Detail Pane (the RIGHT pane) — NEVER match left list elements
  let detailPane: HTMLElement | null =
    document.querySelector('.scaffold-layout__detail') ||
    document.querySelector('.jobs-search__job-details--wrapper') ||
    document.querySelector('.jobs-search__job-details') ||
    document.querySelector('.job-view-layout') ||
    document.querySelector('.jobs-details__main-content');

  // If detailPane wasn't found directly, walk up from #job-details
  if (!detailPane) {
    const jobDetailsEl =
      document.querySelector('#job-details') ||
      document.querySelector('[id^="JobDetails_AboutTheJob_"]') ||
      document.querySelector('.jobs-description__content');

    if (jobDetailsEl) {
      detailPane = (
        jobDetailsEl.closest('.scaffold-layout__detail') ||
        jobDetailsEl.closest('.jobs-search__job-details--wrapper') ||
        jobDetailsEl.closest('main') ||
        jobDetailsEl.parentElement?.parentElement
      ) as HTMLElement | null;
    }
  }

  // 3. Try to extract Title
  let title = '';

  // A. From detail pane top card
  if (detailPane) {
    title = safeQueryTitle([
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title h2',
      '.job-details-jobs-unified-top-card__job-title a',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title h2',
      '.jobs-unified-top-card__job-title',
      'h1.job-details-jobs-unified-top-card__job-title',
      'h2.job-details-jobs-unified-top-card__job-title',
      'h1[class*="job-details-jobs-unified-top-card__job-title"]',
      'h2[class*="job-details-jobs-unified-top-card__job-title"]',
      'h1[class*="job-title"]',
      'h2[class*="job-title"]',
      '.top-card-layout__title',
      'h1.t-24',
      'h2.t-24',
      'h1.t-bold',
      'h2.t-bold',
      // Check top card links (often the title is wrapped in an anchor)
      'a[href*="/jobs/view/"]',
    ], detailPane);
  }

  // B. Fallback from matching job card in the left list (using currentJobId)
  if (!title && currentJobId) {
    const activeLink = document.querySelector(`a[href*="${currentJobId}"]`);
    if (activeLink) {
      const linkText = (activeLink.textContent || '').trim();
      if (linkText && !isGarbageTitle(linkText) && linkText.length > 3) {
        title = linkText;
      }
    }

    const listCard =
      document.querySelector(`[data-job-id="${currentJobId}"]`) ||
      document.querySelector(`[data-occludable-job-id="${currentJobId}"]`) ||
      document.querySelector(`li[data-occludable-job-id*="${currentJobId}"]`) ||
      activeLink?.closest('li') ||
      activeLink?.closest('div.job-card-container');

    if (!title && listCard) {
      title = safeQueryTitle([
        'a.job-card-list__title',
        'a.job-card-container__link',
        'a[class*="job-card-list__title"]',
        'a[class*="job-title"]',
        'strong',
      ], listCard);
    }
  }

  // C. Fallback: check active item in search list
  if (!title) {
    const activeItem =
      document.querySelector('.jobs-search-results-list__list-item--active') ||
      document.querySelector('[class*="jobs-search-results-list__list-item--active"]') ||
      document.querySelector('.jobs-search-results-list__list-item.active');

    if (activeItem) {
      title = safeQueryTitle([
        'a.job-card-list__title',
        'a.job-card-container__link',
        'strong',
      ], activeItem);
    }
  }

  // 4. Try to extract Company
  let company = '';

  // A. From detail pane
  if (detailPane) {
    company = safeQueryText([
      'a[href*="/company/"]',
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.job-details-jobs-unified-top-card__primary-description-container a',
      'a[data-tracking-control-name*="company"]',
      'a[data-tracking-control-name*="org"]',
      '[class*="topcard__org-name-link"]',
      '.artdeco-entity-lockup__subtitle',
      'a[class*="company-name"]',
      '[class*="company-name"]',
    ], detailPane);
  }

  // B. Fallback from matching list card
  if (!company && currentJobId) {
    const listCard =
      document.querySelector(`[data-job-id="${currentJobId}"]`) ||
      document.querySelector(`[data-occludable-job-id="${currentJobId}"]`) ||
      document.querySelector(`li[data-occludable-job-id*="${currentJobId}"]`) ||
      document.querySelector(`a[href*="${currentJobId}"]`)?.closest('li');

    if (listCard) {
      company = safeQueryText([
        'a[href*="/company/"]',
        '.job-card-container__primary-description',
        '.artdeco-entity-lockup__subtitle',
        'span[class*="company-name"]',
        '[class*="company-name"]',
      ], listCard);
    }
  }

  // 5. Try to extract Location
  let location = '';

  if (detailPane) {
    location = safeQueryText([
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
      '[class*="topcard__flavor--bullet"]',
      '.job-details-jobs-unified-top-card__primary-description span.tvm__text',
      '.tvm__text--low-emphasis',
      '[class*="bullet"]',
      '[class*="workplace-type"]',
    ], detailPane);

    if (location && location.includes('·')) {
      location = location.split('·')[0]?.trim() || '';
    }

    // Secondary scan for "City, Country · ... " text block
    if (!location) {
      const topcardEls = Array.from(detailPane.querySelectorAll('span, li, div'));
      for (const el of topcardEls) {
        const text = (el as HTMLElement).innerText?.trim() || '';
        if (text.includes('·') && (text.includes('ago') || text.includes('applicant') || text.includes('promoted'))) {
          location = text.split('·')[0]?.trim() || '';
          break;
        }
      }
    }
  }

  if (!location && currentJobId) {
    const listCard =
      document.querySelector(`[data-job-id="${currentJobId}"]`) ||
      document.querySelector(`[data-occludable-job-id="${currentJobId}"]`) ||
      document.querySelector(`a[href*="${currentJobId}"]`)?.closest('li');

    if (listCard) {
      location = safeQueryText([
        '.job-card-container__metadata-item',
        '.artdeco-entity-lockup__caption',
        'li[class*="job-card-container__metadata-item"]',
      ], listCard);
    }
  }

  // 6. Try to extract Description
  const descEl =
    (detailPane && (
      detailPane.querySelector('#job-details') ||
      detailPane.querySelector('[id^="JobDetails_AboutTheJob_"]') ||
      detailPane.querySelector('[id*="AboutTheJob"]') ||
      detailPane.querySelector('[id*="job-details"]') ||
      detailPane.querySelector('.show-more-less-html__markup') ||
      detailPane.querySelector('.jobs-description__content .jobs-box__html-content') ||
      detailPane.querySelector('.jobs-description__content') ||
      detailPane.querySelector('.jobs-box__html-content') ||
      detailPane.querySelector('article.jobs-description__container') ||
      detailPane.querySelector('.jobs-description') ||
      detailPane.querySelector('[class*="jobs-description"]') ||
      detailPane.querySelector('article')
    )) ||
    document.querySelector('#job-details') ||
    document.querySelector('[id^="JobDetails_AboutTheJob_"]') ||
    document.querySelector('[id*="AboutTheJob"]') ||
    document.querySelector('.show-more-less-html__markup') ||
    document.querySelector('.jobs-description__content') ||
    document.querySelector('.jobs-box__html-content') ||
    document.querySelector('article');

  let description = descEl ? stripHtml((descEl as Element).innerHTML) : '';

  if (!description || description.length < 50) {
    const rootToSearch = detailPane || document;
    const headings = Array.from(rootToSearch.querySelectorAll('h2, h3, h4'));
    for (const h of headings) {
      if (/about the job/i.test(h.textContent ?? '')) {
        const parent = h.parentElement;
        if (parent) {
          const text = stripHtml(parent.innerHTML);
          if (text.length > 50) {
            description = text;
            break;
          }
        }
      }
    }
  }

  // 7. Salary
  const salaryEl = (detailPane || document).querySelector(
    '.job-details-jobs-unified-top-card__job-insight-text-v2,' +
    '[class*="compensation"],' +
    '.jobs-unified-top-card__salary-info'
  );
  const salary = salaryEl
    ? extractSalaryRegex(salaryEl.textContent ?? '')
    : extractSalaryRegex(
        safeQueryText(['.jobs-unified-top-card__job-insight'], detailPane || document)
      );

  if (!title && !description) return null;

  return {
    title: title || 'Unknown Position',
    company: company || 'Unknown Company',
    location: location || '',
    description,
    salary,
    url: window.location.href,
    platform: 'LinkedIn',
    extractedAt: Date.now(),
    extractionMethod: 'dom',
  };
}
