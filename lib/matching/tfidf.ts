/**
 * TF-IDF vectorizer in pure TypeScript.
 * Zero dependencies — runs in the extension content script.
 */

export interface TFIDFVector {
  terms: Map<string, number>;
  /** Total token count (denominator for TF) */
  totalTerms: number;
}

/**
 * Compute term frequency for a flat list of tokens.
 */
function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  return tf;
}

/**
 * Build an IDF map from a corpus of token arrays.
 * idf(t) = log((N + 1) / (df(t) + 1)) + 1  (smooth IDF)
 */
function buildIDF(corpus: string[][]): Map<string, number> {
  const N = corpus.length;
  const df = new Map<string, number>();

  for (const doc of corpus) {
    const seen = new Set<string>(doc);
    for (const term of seen) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    idf.set(term, Math.log((N + 1) / (freq + 1)) + 1);
  }
  return idf;
}

/**
 * Compute a TF-IDF vector for the given token array.
 * @param tokens   Pre-tokenized and stemmed terms for the document
 * @param corpus   Optional corpus of token arrays (for IDF); if omitted, uses pure TF
 */
export function computeTFIDF(tokens: string[], corpus?: string[][]): TFIDFVector {
  const totalTerms = tokens.length;
  const tf = computeTF(tokens);

  const idf = corpus && corpus.length > 1 ? buildIDF(corpus) : null;

  const tfidfTerms = new Map<string, number>();
  for (const [term, count] of tf) {
    const tfScore = count / Math.max(totalTerms, 1);
    const idfScore = idf ? (idf.get(term) ?? Math.log(2) + 1) : 1;
    tfidfTerms.set(term, tfScore * idfScore);
  }

  return { terms: tfidfTerms, totalTerms };
}

/**
 * Compute cosine similarity between two TF-IDF vectors.
 * Returns a value in [0, 1].
 */
export function cosineSimilarity(vecA: TFIDFVector, vecB: TFIDFVector): number {
  if (vecA.terms.size === 0 || vecB.terms.size === 0) return 0;

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const [term, weightA] of vecA.terms) {
    const weightB = vecB.terms.get(term) ?? 0;
    dotProduct += weightA * weightB;
    magA += weightA * weightA;
  }
  for (const [, weightB] of vecB.terms) {
    magB += weightB * weightB;
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  if (magnitude === 0) return 0;

  return Math.min(1, dotProduct / magnitude);
}
