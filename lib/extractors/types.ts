// ── AureScout Job Extraction Engine — Types ────────────────────────────────────

export type Platform =
  | 'LinkedIn'
  | 'Indeed'
  | 'Naukri'
  | 'Glassdoor'
  | 'Wellfound'
  | 'Greenhouse'
  | 'Lever'
  | 'Unknown';

export type ExtractionMethod = 'jsonld' | 'dom' | 'intercepted' | 'fallback';

export interface ExtractedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  url: string;
  platform: Platform;
  extractedAt: number; // Date.now()
  extractionMethod: ExtractionMethod;
}

export interface ExtractionResult {
  success: boolean;
  job?: ExtractedJob;
  error?: string;
}

export interface ExtractorOptions {
  root?: ParentNode;
  url?: string;
}
