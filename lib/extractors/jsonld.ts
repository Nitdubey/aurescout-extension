import { stripHtml, safeQueryText, extractSalaryRegex } from './utils';
import type { ExtractedJob } from './types';

/**
 * Tier 1 extractor — reads Schema.org JobPosting from LD+JSON script tags.
 * Most stable extractor since it reads structured data, not fragile DOM.
 */

interface JsonLDJobPosting {
  '@type'?: string;
  '@graph'?: JsonLDJobPosting[];
  title?: string;
  hiringOrganization?: { name?: string };
  jobLocation?: {
    address?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  } | Array<{
    address?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  }>;
  description?: string;
  baseSalary?: {
    value?: {
      minValue?: number | string;
      maxValue?: number | string;
      unitText?: string;
    };
    currency?: string;
  };
  employmentType?: string;
  datePosted?: string;
}

function formatSalary(salary: JsonLDJobPosting['baseSalary']): string | undefined {
  if (!salary?.value) return undefined;
  const { minValue, maxValue, unitText } = salary.value;
  const currency = salary.currency ?? '';
  const period = unitText ? `/${unitText.toLowerCase()}` : '';

  if (minValue && maxValue) {
    return `${currency}${minValue} – ${currency}${maxValue}${period}`;
  }
  if (minValue) return `${currency}${minValue}${period}`;
  return undefined;
}

function extractLocationFromLD(jobLocation: JsonLDJobPosting['jobLocation']): string {
  const addr = Array.isArray(jobLocation)
    ? jobLocation[0]?.address
    : jobLocation?.address;

  if (!addr) return '';

  const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
  return parts.join(', ');
}

function parseJobPosting(data: JsonLDJobPosting): ExtractedJob | null {
  const title = (data.title ?? '').trim();
  const company = (data.hiringOrganization?.name ?? '').trim();
  const rawDescription = data.description ?? '';
  const description = stripHtml(rawDescription);

  if (!title || !description) return null;

  return {
    title,
    company,
    location: extractLocationFromLD(data.jobLocation),
    description,
    salary: formatSalary(data.baseSalary),
    url: window.location.href,
    platform: 'Unknown',
    extractedAt: Date.now(),
    extractionMethod: 'jsonld',
  };
}

export function extractFromJsonLD(): ExtractedJob | null {
  const scripts = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]')
  );

  for (const script of scripts) {
    try {
      const raw = script.textContent;
      if (!raw) continue;

      const data = JSON.parse(raw) as JsonLDJobPosting | { '@graph': JsonLDJobPosting[] };

      // Check for @graph array (e.g. LinkedIn uses this)
      if (Array.isArray((data as { '@graph': JsonLDJobPosting[] })['@graph'])) {
        for (const item of (data as { '@graph': JsonLDJobPosting[] })['@graph']) {
          if (item['@type'] === 'JobPosting') {
            const result = parseJobPosting(item);
            if (result) return result;
          }
        }
      }

      // Check if top-level is JobPosting
      if ((data as JsonLDJobPosting)['@type'] === 'JobPosting') {
        const result = parseJobPosting(data as JsonLDJobPosting);
        if (result) return result;
      }
    } catch {
      // Malformed JSON — skip
    }
  }

  return null;
}

// ── Glassdoor fallback (also uses JSON-LD patterns + meta) ──────────────────
export function extractFromGlassdoor(): ExtractedJob | null {
  const jsonLd = extractFromJsonLD();
  if (jsonLd) return { ...jsonLd, platform: 'Glassdoor' };

  const title = safeQueryText([
    '[data-test="job-title"]',
    'h1[class*="JobDetailsHeader"]',
    '.JobDetailsHeader_jobTitle__',
    'h1',
  ]);
  const company = safeQueryText([
    '[data-test="employer-name"]',
    '.EmployerProfile_profileContainer__',
    '[class*="companyName"]',
  ]);
  const location = safeQueryText([
    '[data-test="job-location"]',
    '[class*="location"]',
  ]);
  const descEl = document.querySelector('[class*="JobDetails_jobDescription"]') ??
    document.querySelector('#JobDescriptionContainer');
  const description = descEl ? stripHtml(descEl.innerHTML) : '';

  if (!title || !description) return null;

  return {
    title, company, location, description,
    salary: extractSalaryRegex(document.body.innerText),
    url: window.location.href,
    platform: 'Glassdoor',
    extractedAt: Date.now(),
    extractionMethod: 'dom',
  };
}

export function extractFromWellfound(): ExtractedJob | null {
  const title = safeQueryText([
    'h1[class*="JobListingHeader"]',
    'h1[class*="title"]',
    '.job-posting h1',
    'h1',
  ]);
  const company = safeQueryText([
    'a[class*="startupName"]',
    '[class*="company-name"]',
    '.startup-link',
  ]);
  const location = safeQueryText([
    '[class*="location"]',
    '[data-test="location"]',
  ]);
  const descEl = document.querySelector('[class*="job-description"]') ??
    document.querySelector('.description');
  const description = descEl ? stripHtml(descEl.innerHTML) : '';

  if (!title || !description) return null;

  return {
    title, company, location, description,
    url: window.location.href,
    platform: 'Wellfound',
    extractedAt: Date.now(),
    extractionMethod: 'dom',
  };
}

export function extractFromGreenhouse(): ExtractedJob | null {
  // Greenhouse uses clean semantic HTML — very stable
  const title = safeQueryText(['h1.app-title', 'h1[class*="title"]', '.opening-title', 'h1']);
  const company = safeQueryText([
    '.company-name',
    'h2.company-name',
    '[class*="company"]',
    // Fallback: read from page title "Job at CompanyName"
  ]) || (document.title.match(/at\s+(.+)$/i)?.[1] ?? '');

  const location = safeQueryText(['.location', '[class*="location"]', '.office-location']);
  const descEl = document.querySelector('#content') ??
    document.querySelector('.section-wrapper') ??
    document.querySelector('.job-post');
  const description = descEl ? stripHtml(descEl.innerHTML) : '';

  if (!title || !description) return null;

  return {
    title, company, location, description,
    url: window.location.href,
    platform: 'Greenhouse',
    extractedAt: Date.now(),
    extractionMethod: 'dom',
  };
}

export function extractFromLever(): ExtractedJob | null {
  // Lever job pages are very clean and semantic
  const title = safeQueryText(['.posting-headline h2', 'h2[class*="posting"]', 'h2']);
  const imgEl = document.querySelector('.main-header-logo img') as HTMLImageElement | null;
  const company = safeQueryText(['.main-header-logo img[alt]']) ||
    (imgEl?.alt ?? '');

  const location = safeQueryText([
    '.posting-categories .location',
    '.sort-by-time .location',
    '.workplaceTypes',
  ]);
  const descEl = document.querySelector('.section-wrapper') ??
    document.querySelector('.posting-content');
  const description = descEl ? stripHtml(descEl.innerHTML) : '';

  if (!title || !description) return null;

  return {
    title, company, location, description,
    url: window.location.href,
    platform: 'Lever',
    extractedAt: Date.now(),
    extractionMethod: 'dom',
  };
}
