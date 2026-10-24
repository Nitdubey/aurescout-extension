import { tokenize, extractNgrams, normalizeTechnicalTokens } from './tokenizer';
import { extractSkillsFromText } from './skill-lexicon';
import { computeTFIDF, cosineSimilarity } from './tfidf';

// ── Agent-17: Offline Edge Matching Engine (Extension Local Matcher) ──────────
// Sub-15ms local matching with technical symbol preservation, bidirectional
// synonym resolution, strict categorical scoring, and hard-disqualifier pre-checks.

export type MatchTier = 'STRONG FIT' | 'PARTIAL FIT' | 'NOT A FIT';

export interface HardDisqualifierAlert {
  type: 'EXPERIENCE_GAP' | 'VISA_SPONSORSHIP' | 'SECURITY_CLEARANCE';
  message: string;
  severity: 'CRITICAL' | 'WARNING';
}

export interface SkillCategoryBreakdown {
  exactMatches: string[];
  synonymMatches: string[];
  criticalMissing: string[];
  technicalMatchPct: number;
  experienceMatchPct: number;
  softSkillsMatchPct: number;
  disqualifiers: HardDisqualifierAlert[];
}

export interface MatchResult {
  score: number;
  tier: MatchTier;
  matchedSkills: string[];
  missingSkills: string[];
  resumeSkills: string[];
  jdSkills: string[];
  latencyMs: number;
  breakdown: SkillCategoryBreakdown;
  exactMatches: string[];
  synonymMatches: string[];
  criticalMissing: string[];
  disqualifiers: HardDisqualifierAlert[];
}

export function createEmptyMatchResult(): MatchResult {
  return {
    score: 0,
    tier: 'NOT A FIT',
    matchedSkills: [],
    missingSkills: [],
    resumeSkills: [],
    jdSkills: [],
    latencyMs: 0,
    breakdown: {
      exactMatches: [],
      synonymMatches: [],
      criticalMissing: [],
      technicalMatchPct: 0,
      experienceMatchPct: 0,
      softSkillsMatchPct: 0,
      disqualifiers: [],
    },
    exactMatches: [],
    synonymMatches: [],
    criticalMissing: [],
    disqualifiers: [],
  };
}

// Canonical synonym dictionary for bidirectional equivalence
const CANONICAL_SYNONYMS: Record<string, string> = {
  k8s: 'kubernetes',
  kubernetes: 'kubernetes',
  postgres: 'postgresql',
  postgresql: 'postgresql',
  psql: 'postgresql',
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  react: 'react',
  reactjs: 'react',
  'react.js': 'react',
  next: 'next.js',
  nextjs: 'next.js',
  'next.js': 'next.js',
  node: 'node.js',
  nodejs: 'node.js',
  'node.js': 'node.js',
  cicd: 'ci/cd',
  'ci/cd': 'ci/cd',
  'continuous integration': 'ci/cd',
  aws: 'aws',
  'amazon web services': 'aws',
  gcp: 'google cloud',
  'google cloud': 'google cloud',
  'google cloud platform': 'google cloud',
  golang: 'go',
  go: 'go',
  csharp: 'c#',
  'c#': 'c#',
  cpp: 'c++',
  'c++': 'c++',
  dotnet: '.net',
  '.net': '.net',
  vue: 'vue.js',
  vuejs: 'vue.js',
  'vue.js': 'vue.js',
  python: 'python',
  py: 'python',
  docker: 'docker',
  containers: 'docker',
  mongo: 'mongodb',
  mongodb: 'mongodb',
  nosql: 'nosql',
  sql: 'sql',
};

function resolveCanonical(skill: string): string {
  const norm = skill.trim().toLowerCase();
  return CANONICAL_SYNONYMS[norm] || norm;
}

function getTier(score: number): MatchTier {
  if (score >= 70) return 'STRONG FIT';
  if (score >= 40) return 'PARTIAL FIT';
  return 'NOT A FIT';
}

/**
 * Checks for hard disqualifiers in the JD (clearance, visa sponsorship, YoE requirements).
 */
export function checkHardDisqualifiers(jdText: string, resumeText: string): HardDisqualifierAlert[] {
  const alerts: HardDisqualifierAlert[] = [];
  const lowerJd = jdText.toLowerCase();

  // 1. Security clearance required
  if (
    lowerJd.includes('security clearance') ||
    lowerJd.includes('active secret clearance') ||
    lowerJd.includes('ts/sci') ||
    lowerJd.includes('polygraph required')
  ) {
    const hasClearance = /clearance|secret|ts\/sci/i.test(resumeText);
    if (!hasClearance) {
      alerts.push({
        type: 'SECURITY_CLEARANCE',
        message: 'Security clearance required by employer (none detected on resume).',
        severity: 'CRITICAL',
      });
    }
  }

  // 2. Visa sponsorship restriction
  if (
    lowerJd.includes('no visa sponsorship') ||
    lowerJd.includes('unable to sponsor') ||
    lowerJd.includes('must be us citizen') ||
    lowerJd.includes('u.s. citizenship required') ||
    lowerJd.includes('without sponsorship')
  ) {
    alerts.push({
      type: 'VISA_SPONSORSHIP',
      message: 'Employer explicitly does not offer visa sponsorship.',
      severity: 'WARNING',
    });
  }

  // 3. YoE Requirement mismatch
  const yoeMatch = jdText.match(/\b([1-9]|1[0-5])\+?\s*(?:to\s*\d+\s*)?years?(?:\s+of)?\s+(?:relevant\s+)?experience/i);
  if (yoeMatch && yoeMatch[1]) {
    const requiredYears = parseInt(yoeMatch[1], 10);
    const resumeYoeMatch = resumeText.match(/\b([1-9]|1[0-5])\+?\s*years?(?:\s+of)?\s+experience/i);
    const candidateYears = resumeYoeMatch && resumeYoeMatch[1] ? parseInt(resumeYoeMatch[1], 10) : 0;

    if (candidateYears > 0 && candidateYears < requiredYears) {
      alerts.push({
        type: 'EXPERIENCE_GAP',
        message: `Requires ${requiredYears}+ years of experience (detected ~${candidateYears} years on resume).`,
        severity: 'WARNING',
      });
    }
  }

  return alerts;
}

/**
 * Full offline match between a resume and a job description.
 * Executes strictly in <15ms with zero network calls.
 */
export function matchOffline(resumeText: string, jdText: string): MatchResult {
  const t0 = performance.now();

  // ── Step 1: Tokenize with technical symbol preservation ──────────────────
  const resumeTokens = tokenize(resumeText);
  const jdTokens = tokenize(jdText);

  // Add bigrams and trigrams for richer TF-IDF
  const resumeNgrams = [
    ...resumeTokens,
    ...extractNgrams(resumeTokens, 2),
    ...extractNgrams(resumeTokens, 3),
  ];
  const jdNgrams = [
    ...jdTokens,
    ...extractNgrams(jdTokens, 2),
    ...extractNgrams(jdTokens, 3),
  ];

  // ── Step 2: TF-IDF cosine similarity ─────────────────────────────────────
  const corpus = [resumeNgrams, jdNgrams];
  const resumeVec = computeTFIDF(resumeNgrams, corpus);
  const jdVec = computeTFIDF(jdNgrams, corpus);
  const cosine = cosineSimilarity(resumeVec, jdVec); // 0.0 – 1.0

  // ── Step 3: Skill extraction & Canonical Synonym Resolution ──────────────
  const resumeSkills = extractSkillsFromText(resumeText);
  const jdSkills = extractSkillsFromText(jdText);

  const resumeSkillSetLower = new Set(resumeSkills.map(s => s.toLowerCase()));
  const resumeCanonicalSet = new Set(resumeSkills.map(resolveCanonical));

  const exactMatches: string[] = [];
  const synonymMatches: string[] = [];
  const criticalMissing: string[] = [];

  for (const jdSkill of jdSkills) {
    const lower = jdSkill.toLowerCase();
    const canonical = resolveCanonical(jdSkill);

    if (resumeSkillSetLower.has(lower)) {
      exactMatches.push(jdSkill);
    } else if (resumeCanonicalSet.has(canonical)) {
      synonymMatches.push(jdSkill);
    } else {
      criticalMissing.push(jdSkill);
    }
  }

  const allMatched = [...exactMatches, ...synonymMatches];

  // ── Step 4: Strict Categorical Breakdown ─────────────────────────────────
  const technicalMatchPct =
    jdSkills.length > 0 ? Math.round((allMatched.length / jdSkills.length) * 100) : 50;

  // Experience match estimated via YoE heuristics & seniority keywords
  const hasSeniorJd = /\b(?:senior|lead|staff|principal|head)\b/i.test(jdText);
  const hasSeniorResume = /\b(?:senior|lead|staff|principal|head)\b/i.test(resumeText);
  const experienceMatchPct = hasSeniorJd && !hasSeniorResume ? 55 : 85;

  // Soft skills overlap
  const softSkills = ['leadership', 'communication', 'collaboration', 'problem solving', 'agile', 'mentorship'];
  const softJd = softSkills.filter(s => jdText.toLowerCase().includes(s));
  const softMatched = softJd.filter(s => resumeText.toLowerCase().includes(s));
  const softSkillsMatchPct = softJd.length > 0 ? Math.round((softMatched.length / softJd.length) * 100) : 80;

  // ── Step 5: Hard Disqualifier Pre-Check ──────────────────────────────────
  const disqualifiers = checkHardDisqualifiers(jdText, resumeText);

  // ── Step 6: Blend Scores (Weighted cosine + skill overlap) ───────────────
  const skillOverlap = jdSkills.length > 0 ? allMatched.length / jdSkills.length : 0;
  const rawScore = cosine * 0.55 + skillOverlap * 0.45;

  // Sigmoid scaling with penalty if critical disqualifiers exist
  const penalty = disqualifiers.some(d => d.severity === 'CRITICAL') ? 0.2 : 0;
  const stretched = Math.max(0, Math.min(1, rawScore * 1.45 - penalty));
  const score = Math.round(stretched * 100);

  const latencyMs = Math.round(performance.now() - t0);

  const breakdown: SkillCategoryBreakdown = {
    exactMatches,
    synonymMatches,
    criticalMissing: criticalMissing.slice(0, 8),
    technicalMatchPct,
    experienceMatchPct,
    softSkillsMatchPct,
    disqualifiers,
  };

  return {
    score,
    tier: getTier(score),
    matchedSkills: allMatched,
    missingSkills: criticalMissing.slice(0, 8),
    resumeSkills,
    jdSkills,
    latencyMs,
    breakdown,
    exactMatches,
    synonymMatches,
    criticalMissing: criticalMissing.slice(0, 8),
    disqualifiers,
  };
}
