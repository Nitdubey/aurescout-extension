// ── AureScout Offline Matching Engine: Tokenizer & Stemmer ─────────────────────
// Runs 100% client-side in extension content script (<1ms latency).
// Preserves technical symbols (C++, C#, .NET, Node.js, Next.js, React.js, CI/CD, AWS, K8s).

export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'not', 'this', 'that',
  'these', 'those', 'i', 'we', 'you', 'he', 'she', 'it', 'they', 'my',
  'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'so', 'yet',
  'either', 'neither', 'one', 'two', 'than', 'too', 'very', 'just', 'also'
]);

/**
 * Lightweight Porter Stemmer implementing key inflectional suffix removal rules.
 * Keeps stems concise, deterministic, and effective for ATS text matching.
 */
export function stem(word: string): string {
  if (word.length <= 2) return word;

  let s = word;

  // Step 1: Plurals and 's' endings
  if (s.endsWith('sses')) {
    s = s.slice(0, -2);
  } else if (s.endsWith('ies') && s.length > 4) {
    s = s.slice(0, -3) + 'y';
  } else if (s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us') && !s.endsWith('is') && s.length > 3) {
    s = s.slice(0, -1);
  }

  // Step 2: Multi-character derivational and inflectional suffixes (longest first)
  if (s.endsWith('ation') && s.length > 6) {
    s = s.slice(0, -5);
  } else if (s.endsWith('tion') && s.length > 5) {
    s = s.slice(0, -4);
  } else if (s.endsWith('ment') && s.length > 5) {
    s = s.slice(0, -4);
  } else if (s.endsWith('ness') && s.length > 5) {
    s = s.slice(0, -4);
  } else if (s.endsWith('ing') && s.length > 4) {
    s = s.slice(0, -3);
    // Remove duplicate trailing consonant if applicable (e.g. running -> runn -> run)
    if (s.length > 3 && s[s.length - 1] === s[s.length - 2] && !s.endsWith('ll') && !s.endsWith('ss')) {
      s = s.slice(0, -1);
    }
  } else if (s.endsWith('ed') && s.length > 4) {
    s = s.slice(0, -2);
    if (s.length > 3 && s[s.length - 1] === s[s.length - 2] && !s.endsWith('ll') && !s.endsWith('ss')) {
      s = s.slice(0, -1);
    }
  } else if (s.endsWith('er') && s.length > 4) {
    s = s.slice(0, -2);
  } else if (s.endsWith('ly') && s.length > 4) {
    s = s.slice(0, -2);
  }

  return s;
}

/**
 * Normalizes technical symbols before punctuation stripping.
 */
export function normalizeTechnicalTokens(text: string): string {
  if (!text) return '';
  return text
    .replace(/\bc\+\+/gi, ' cpp ')
    .replace(/\bc#/gi, ' csharp ')
    .replace(/\.net\b/gi, ' dotnet ')
    .replace(/\bnode\.js\b/gi, ' nodejs ')
    .replace(/\bnext\.js\b/gi, ' nextjs ')
    .replace(/\breact\.js\b/gi, ' reactjs ')
    .replace(/\bvue\.js\b/gi, ' vuejs ')
    .replace(/\bnuxt\.js\b/gi, ' nuxtjs ')
    .replace(/\bthree\.js\b/gi, ' threejs ')
    .replace(/\bd3\.js\b/gi, ' d3js ')
    .replace(/\bci\/cd\b/gi, ' cicd ')
    .replace(/\bk8s\b/gi, ' k8s ')
    .replace(/\baws\b/gi, ' aws ');
}

/**
 * Tokenizes raw text:
 * - Normalizes special tech abbreviations (C++, C#, .NET, Node.js, Next.js, React.js, CI/CD, AWS, K8s)
 * - Lowercases and strips punctuation
 * - Removes stop words
 * - Applies lightweight stemming
 */
export function tokenize(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  // Protect key programming tokens before punctuation stripping
  const normalized = normalizeTechnicalTokens(text).toLowerCase();

  // Strip non-alphanumeric punctuation and split on whitespace
  const rawWords = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const tokens: string[] = [];
  for (const word of rawWords) {
    if (word.length < 2) continue;
    if (STOP_WORDS.has(word)) continue;
    tokens.push(stem(word));
  }

  return tokens;
}

/**
 * Extracts n-grams (contiguous sequence of n tokens) from token array.
 */
export function extractNgrams(tokens: string[], n: number): string[] {
  if (!tokens || n <= 0 || tokens.length < n) return [];
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}
