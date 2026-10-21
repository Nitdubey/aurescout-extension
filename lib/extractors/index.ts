import type { ExtractedJob, ExtractionResult, Platform } from './types';
import { extractFromJsonLD, extractFromGlassdoor, extractFromWellfound, extractFromGreenhouse, extractFromLever } from './jsonld';
import { extractFromLinkedIn } from './linkedin';
import { extractFromIndeed } from './indeed';
import { extractFromNaukri } from './naukri';
import { safeQueryText, safeGetMetaContent, stripHtml, isJobPage, detectPlatform } from './utils';

export { isJobPage, detectPlatform };
export type { ExtractedJob, ExtractionResult, Platform };

/**
 * Generic fallback extractor — uses meta tags and semantic HTML structure.
 * Last resort when platform-specific extractors fail.
 */
function extractFallback(platform: Platform): ExtractedJob | null {
  // Title: og:title > twitter:title > <title>
  const title = safeGetMetaContent(['og:title', 'twitter:title']) ||
    (document.title?.replace(/\s*[-|].*$/, '').trim() ?? '');

  // Company: og:site_name > meta author
  const company = safeGetMetaContent(['og:site_name', 'author', 'twitter:site']) || '';

  // Description: og:description > meta description
  const rawDesc = safeGetMetaContent(['og:description', 'description', 'twitter:description']);

  // Also try to find the main content area
  const mainEl =
    document.querySelector('main') ??
    document.querySelector('[role="main"]') ??
    document.querySelector('article');
  const bodyDescription = mainEl ? stripHtml(mainEl.innerHTML) : '';

  const description = bodyDescription.length > rawDesc.length
    ? bodyDescription.slice(0, 8000)
    : rawDesc;

  if (!title || !description) return null;

  return {
    title,
    company,
    location: safeQueryText(['.location', '[class*="location"]', '[data-location]']),
    description,
    url: window.location.href,
    platform,
    extractedAt: Date.now(),
    extractionMethod: 'fallback',
  };
}

/**
 * Master job extraction orchestrator.
 *
 * Strategy:
 * 1. JSON-LD (most stable — uses structured data)
 * 2. Platform-specific DOM extractor
 * 3. Generic meta + semantic fallback
 */
export async function extractJob(): Promise<ExtractionResult> {
  const platform = detectPlatform();

  // Tier 1: JSON-LD
  try {
    const jsonLdResult = extractFromJsonLD();
    if (jsonLdResult && jsonLdResult.description.length > 50) {
      return { success: true, job: { ...jsonLdResult, platform } };
    }
  } catch (err) {
    // Fall through to DOM
  }

  // Tier 2: Platform-specific DOM
  try {
    let domResult: ExtractedJob | null = null;

    switch (platform) {
      case 'LinkedIn':
        domResult = extractFromLinkedIn();
        break;
      case 'Indeed':
        domResult = extractFromIndeed();
        break;
      case 'Naukri':
        domResult = extractFromNaukri();
        break;
      case 'Glassdoor':
        domResult = extractFromGlassdoor();
        break;
      case 'Wellfound':
        domResult = extractFromWellfound();
        break;
      case 'Greenhouse':
        domResult = extractFromGreenhouse();
        break;
      case 'Lever':
        domResult = extractFromLever();
        break;
      default:
        break;
    }

    if (domResult && domResult.description.length > 50) {
      return { success: true, job: domResult };
    }
  } catch (err) {
    // Fall through to generic fallback
  }

  // Tier 3: Generic fallback
  try {
    const fallback = extractFallback(platform);
    if (fallback) {
      return { success: true, job: fallback };
    }
  } catch (err) {
    // Nothing works
  }

  return {
    success: false,
    error: 'Could not extract job data from this page.',
  };
}
