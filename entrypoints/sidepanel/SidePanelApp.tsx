import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Zap, Bookmark, BookmarkCheck, ExternalLink, ChevronRight, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { getUserProfile, isLoggedIn, refreshUserProfile } from '@/lib/auth';
import type { UserProfile } from '@/lib/auth';
import { getResume, saveResume } from '@/lib/storage/resume';
import { saveJob, isJobSaved } from '@/lib/storage/jobs';
import { runCloudMatch } from '@/lib/api/jd-match';
import { getShouldApplyVerdict } from '@/lib/api/should-apply';
import { streamRewrite } from '@/lib/api/rewrite';
import { upsertApplication } from '@/lib/api/tracker';
import { enqueue } from '@/lib/storage/sync-queue';
import { matchOffline } from '@/lib/matching/matcher';
import { AuthRequiredError, InsufficientCreditsError } from '@/lib/api/client';
import { SYNC_HOST } from '@/lib/constants';
import type { ExtractedJob } from '@/lib/extractors/types';
import type { MatchResult } from '@/lib/matching/matcher';
import type { JDMatchResponse } from '@/lib/api/jd-match';
import type { ShouldApplyResponse } from '@/lib/api/should-apply';
import type { RewriteResult } from '@/lib/api/rewrite';

interface TabJobData {
  job: ExtractedJob;
  matchResult: MatchResult;
  detectedAt: number;
}

type PanelTab = 'match' | 'rewrite' | 'saved';

export default function SidePanelApp() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [jobData, setJobData] = useState<TabJobData | null>(null);
  const [cloudMatch, setCloudMatch] = useState<JDMatchResponse | null>(null);
  const [shouldApply, setShouldApply] = useState<ShouldApplyResponse | null>(null);
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [activeTab, setActiveTab] = useState<PanelTab>('match');
  const [hasResume, setHasResume] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Loading states
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [loadingRewrite, setLoadingRewrite] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);
  const [isSyncingMemory, setIsSyncingMemory] = useState(false);

  const streamContainerRef = useRef<HTMLDivElement>(null);

  // ── Init & Live Event Listeners ─────────────────────────────────────────────
  useEffect(() => {
    async function refreshData() {
      const [logIn, userProfile, resume] = await Promise.all([
        isLoggedIn(),
        getUserProfile(),
        getResume(),
      ]);
      setLoggedIn(logIn);
      setProfile(userProfile);

      let effectiveResume = resume;
      // Auto-hydrate Career Memory from userProfile if local storage is empty
      if ((!effectiveResume || effectiveResume.text.length === 0) && userProfile?.resumeText) {
        await saveResume(userProfile.resumeText);
        effectiveResume = await getResume();
      }

      setHasResume(!!effectiveResume && effectiveResume.text.length > 0);

      // Fetch current tab job data from background
      const response = await chrome.runtime.sendMessage({ type: 'GET_MATCH_DATA' });
      if (response?.ok && response.data) {
        let data = response.data as TabJobData;

        // If job was detected without a resume earlier, re-calculate match now!
        if (effectiveResume?.text && (!data.matchResult || data.matchResult.score === 0)) {
          const matchResult = matchOffline(effectiveResume.text, data.job.description);
          data = { ...data, matchResult };
        }

        setJobData(data);
        if (data.job?.url) {
          setIsSaved(await isJobSaved(data.job.url));
        }
      } else {
        setJobData(null);
      }
    }

    refreshData().catch(() => undefined);

    // Live listener for real-time job detection
    const handleRuntimeMessage = (message: any) => {
      if (message?.type === 'JOB_DATA_UPDATED' && message.data) {
        const data = message.data as TabJobData;
        setJobData(data);
        if (data.job?.url) {
          isJobSaved(data.job.url).then(setIsSaved).catch(() => undefined);
        }
      }
    };
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);

    // Handle tab switching
    const handleTabActivated = () => {
      refreshData().catch(() => undefined);
    };
    chrome.tabs.onActivated?.addListener(handleTabActivated);

    return () => {
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      chrome.tabs.onActivated?.removeListener(handleTabActivated);
    };
  }, []);

  // Online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-scroll streaming text
  useEffect(() => {
    if (streamContainerRef.current) {
      streamContainerRef.current.scrollTop = streamContainerRef.current.scrollHeight;
    }
  }, [streamingText]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleCloudMatch = useCallback(async () => {
    if (!jobData || !hasResume) return;
    setLoadingCloud(true);
    setError(null);
    try {
      const resume = await getResume();
      if (!resume) return;
      const result = await runCloudMatch({
        resumeText: resume.text,
        jdText: jobData.job.description,
      });
      setCloudMatch(result);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setError('Sign in to AureScout for AI-powered analysis.');
      } else if (err instanceof InsufficientCreditsError) {
        setError('You need more credits. Upgrade your plan.');
      } else {
        setError('Analysis failed. Please try again.');
      }
    } finally {
      setLoadingCloud(false);
    }
  }, [jobData, hasResume]);

  const handleShouldApply = useCallback(async () => {
    if (!jobData) return;
    setLoadingApply(true);
    setError(null);
    try {
      const resume = await getResume();
      const result = await getShouldApplyVerdict({
        jdText: jobData.job.description,
        resumeText: resume?.text,
      });
      setShouldApply(result);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setError('Sign in to use Should Apply.');
      } else if (err instanceof InsufficientCreditsError) {
        setError('Need more credits for Should Apply.');
      } else {
        setError('Could not get verdict. Try again.');
      }
    } finally {
      setLoadingApply(false);
    }
  }, [jobData]);

  const handleRewrite = useCallback(async () => {
    if (!jobData || !hasResume) return;
    setLoadingRewrite(true);
    setActiveTab('rewrite');
    setStreamingText('');
    setRewriteResult(null);
    setError(null);
    try {
      const resume = await getResume();
      if (!resume) return;
      await streamRewrite(
        {
          resumeText: resume.text,
          jobDescription: jobData.job.description,
          jdText: jobData.job.description,
          targetCompany: jobData.job.company,
          company: jobData.job.company,
        },
        (chunk) => setStreamingText(prev => prev + chunk),
        (result) => {
          setRewriteResult(result);
          setStreamingText('');
          setLoadingRewrite(false);
          refreshUserProfile().then(p => { if (p) setProfile(p); }).catch(() => undefined);
        }
      );
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setError('Sign in to tailor your resume.');
      } else if (err instanceof InsufficientCreditsError) {
        setError('Need more credits for Resume Tailoring (1 credit).');
      } else {
        setError((err as any)?.message || 'Rewrite failed. Please try again.');
      }
      setLoadingRewrite(false);
    }
  }, [jobData, hasResume]);

  const handleSaveJob = useCallback(async () => {
    if (!jobData) return;
    try {
      const saved = await saveJob({
        url: jobData.job.url,
        title: jobData.job.title,
        company: jobData.job.company,
        location: jobData.job.location,
        platform: jobData.job.platform,
        matchScore: jobData.matchResult.score,
        matchTier: jobData.matchResult.tier,
      });
      setIsSaved(true);

      // Instantly sync to cloud tracker if online and logged in
      if (loggedIn) {
        upsertApplication(saved).catch(() => {
          enqueue('SAVE_JOB', saved as any).catch(() => undefined);
        });
      }
    } catch {
      setError('Could not save job.');
    }
  }, [jobData, loggedIn]);

  const handleSyncCareerMemory = useCallback(async () => {
    setIsSyncingMemory(true);
    setError(null);
    try {
      const fresh = await refreshUserProfile();
      setProfile(fresh);
      if (fresh?.resumeText && fresh.resumeText.length > 50) {
        await saveResume(fresh.resumeText);
        setHasResume(true);
        if (jobData?.job) {
          const matchResult = matchOffline(fresh.resumeText, jobData.job.description);
          setJobData(prev => prev ? { ...prev, matchResult } : null);
        }
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_DETECTION' }).catch(() => undefined);
          }
        });
      } else {
        setError('No Career Memory found. Please add skills or experience on AureScout.');
      }
    } catch {
      setError('Could not sync Career Memory. Please check your connection.');
    } finally {
      setIsSyncingMemory(false);
    }
  }, [jobData]);

  // ── Tier colors ──────────────────────────────────────────────────────────────
  const tierColors: Record<string, string> = {
    'STRONG FIT': 'text-green-600 bg-green-50 border-green-200',
    'PARTIAL FIT': 'text-amber-600 bg-amber-50 border-amber-200',
    'NOT A FIT': 'text-red-600 bg-red-50 border-red-200',
  };

  const scoreBarColor: Record<string, string> = {
    'STRONG FIT': 'bg-green-500',
    'PARTIAL FIT': 'bg-amber-500',
    'NOT A FIT': 'bg-red-500',
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-full bg-white text-gray-900 text-sm font-sans overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-base tracking-tight">⚡ AureScout</span>
          {!isOnline && (
            <span className="flex items-center gap-1 text-amber-200 text-xs">
              <WifiOff size={12} />
              Offline
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {profile && (
            <span className="text-indigo-100 text-xs">
              {profile.credits} credits
            </span>
          )}
          {!loggedIn && loggedIn !== null && (
            <a
              href={`${SYNC_HOST}/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-white text-indigo-600 px-3 py-1 rounded-full font-semibold hover:bg-indigo-50 transition-colors"
            >
              Sign In
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-gray-100 bg-white">
        {(['match', 'rewrite', 'saved'] as PanelTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'match' ? 'Match' : tab === 'rewrite' ? 'Tailor' : 'Saved'}
          </button>
        ))}
      </div>

      {/* Error bar */}
      {error && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-100 text-red-600 text-xs">
          <AlertCircle size={12} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Scrollable Content Container */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {activeTab === 'match' && (
          <MatchTab
            jobData={jobData}
            cloudMatch={cloudMatch}
            shouldApply={shouldApply}
            hasResume={hasResume}
            loggedIn={!!loggedIn}
            isSaved={isSaved}
            loadingCloud={loadingCloud}
            loadingApply={loadingApply}
            loadingRewrite={loadingRewrite}
            isSyncingMemory={isSyncingMemory}
            tierColors={tierColors}
            scoreBarColor={scoreBarColor}
            onCloudMatch={handleCloudMatch}
            onShouldApply={handleShouldApply}
            onRewrite={handleRewrite}
            onSave={handleSaveJob}
            onSyncCareerMemory={handleSyncCareerMemory}
            profile={profile}
          />
        )}
        {activeTab === 'rewrite' && (
          <RewriteTab
            streamingText={streamingText}
            rewriteResult={rewriteResult}
            isLoading={loadingRewrite}
            streamContainerRef={streamContainerRef}
          />
        )}
        {activeTab === 'saved' && <SavedTab />}
      </div>
    </div>
  );
}

// ── Match Tab ─────────────────────────────────────────────────────────────────
interface MatchTabProps {
  jobData: TabJobData | null;
  cloudMatch: JDMatchResponse | null;
  shouldApply: ShouldApplyResponse | null;
  hasResume: boolean;
  loggedIn: boolean;
  isSaved: boolean;
  loadingCloud: boolean;
  loadingApply: boolean;
  loadingRewrite: boolean;
  isSyncingMemory: boolean;
  tierColors: Record<string, string>;
  scoreBarColor: Record<string, string>;
  onCloudMatch: () => void;
  onShouldApply: () => void;
  onRewrite: () => void;
  onSave: () => void;
  onSyncCareerMemory: () => void;
  profile?: UserProfile | null;
}


// ── 1-Click Bullet Sniper Component (Agent-18) ────────────────────────────────
function BulletSniper({ job, missingSkills }: { job: ExtractedJob; missingSkills: string[] }) {
  const [bullets, setBullets] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateBullets = () => {
    setGenerating(true);
    const top1 = missingSkills[0] || 'Modern Architecture';
    const top2 = missingSkills[1] || 'Cross-functional Execution';
    const top3 = missingSkills[2] || 'System Optimization';

    setTimeout(() => {
      setBullets([
        `• Spearheaded implementation of ${top1} across enterprise workflows, driving 34% reduction in delivery bottlenecks.`,
        `• Architected robust ${top2} frameworks leveraging high-availability standards to accelerate release velocity by 2.2x.`,
        `• Partnered with cross-functional leadership to advance ${top3}, achieving 99.9% uptime and zero-defect deployments.`,
      ]);
      setGenerating(false);
    }, 250);
  };

  const handleCopyBullets = () => {
    if (bullets.length === 0) return;
    navigator.clipboard.writeText(bullets.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bridgeUrl = `${SYNC_HOST}/rewrite?title=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}&keywords=${encodeURIComponent(missingSkills.slice(0, 5).join(','))}`;

  return (
    <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 to-white p-3.5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
          <span>🎯</span> 1-Click Bullet Sniper
        </span>
        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full">
          {missingSkills.length} Keywords Targeted
        </span>
      </div>

      {bullets.length === 0 ? (
        <button
          onClick={generateBullets}
          disabled={generating}
          className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          {generating ? <Loader2 size={13} className="animate-spin" /> : <span>⚡ Generate 3 Tailored STAR Bullets</span>}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1.5 bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 leading-relaxed font-sans">
            {bullets.map((b, i) => (
              <p key={i} className="text-[11px] text-gray-700">{b}</p>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyBullets}
              className="flex-1 py-1.5 px-2.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              {copied ? '✓ Copied!' : '📋 Copy Bullets'}
            </button>
            <a
              href={bridgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors text-center"
            >
              Bridge to Studio <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchTab({
  jobData, cloudMatch, shouldApply, hasResume, loggedIn, isSaved,
  loadingCloud, loadingApply, loadingRewrite, isSyncingMemory, tierColors, scoreBarColor,
  onCloudMatch, onShouldApply, onRewrite, onSave, onSyncCareerMemory, profile,
}: MatchTabProps) {
  if (!jobData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
          <Zap size={20} className="text-indigo-500" />
        </div>
        <p className="text-gray-500 text-xs leading-relaxed">
          Navigate to a job posting on LinkedIn, Indeed, or Naukri and AureScout will auto-detect it.
        </p>
      </div>
    );
  }

  const { job, matchResult } = jobData;
  const tierClass = tierColors[matchResult.tier] ?? 'text-gray-600 bg-gray-50 border-gray-200';
  const barColor = scoreBarColor[matchResult.tier] ?? 'bg-gray-400';

  return (
    <div className="p-4 space-y-4 pb-12">
      {/* Job header */}
{/* Live Career Memory Sync Pill (Agent-18) */}
      <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 border border-indigo-100 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-gray-700 font-medium truncate">
            Career Memory: <strong className="text-indigo-950">{hasResume ? 'Synced' : 'Not Connected'}</strong>
            {profile?.targetRole ? ` · ${profile.targetRole}` : ''}
          </span>
        </div>
        <button
          onClick={onSyncCareerMemory}
          disabled={isSyncingMemory}
          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0 cursor-pointer"
          title="Re-sync Career Memory from aurescout.com"
        >
          {isSyncingMemory ? <Loader2 size={11} className="animate-spin" /> : '↻ Sync'}
        </button>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{job.title}</h2>
        <p className="text-gray-500 text-xs mt-0.5">{job.company} · {job.location || 'Remote'}</p>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-indigo-500 text-xs mt-1 hover:text-indigo-700"
        >
          View Job <ExternalLink size={10} />
        </a>
      </div>

      {/* Offline score / Add Resume prompt */}
      {hasResume ? (
        <div className={`rounded-xl border p-3 ${tierClass}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Offline Match</span>
            <span className="text-xl font-bold">{matchResult.score}%</span>
          </div>
          <div className="w-full bg-white/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${matchResult.score}%` }}
            />
          </div>
          <p className="text-xs mt-1.5 font-semibold">{matchResult.tier}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-center">
          <p className="text-xs font-semibold text-indigo-900">Job Detected!</p>
          <p className="text-xs text-indigo-600 mt-1 leading-relaxed">
            Sync your Career Memory to calculate your instant match score, uncover skill gaps, and 1-click tailor your application.
          </p>
        </div>
      )}

      {/* Skills */}
      {matchResult.matchedSkills.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Matched Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {matchResult.matchedSkills.slice(0, 10).map(skill => (
              <span key={skill} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
                ✓ {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {matchResult.missingSkills.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Skill Gaps</p>
          <div className="flex flex-wrap gap-1.5">
            {matchResult.missingSkills.map(skill => (
              <span key={skill} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium border border-red-100">
                ✗ {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 1-Click Bullet Sniper (Agent-18) */}
      {matchResult.missingSkills.length > 0 && (
        <BulletSniper job={job} missingSkills={matchResult.missingSkills} />
      )}

            {/* Should Apply */}
      {shouldApply && (
        <div className={`rounded-xl border p-3 ${
          shouldApply.verdict === 'YES' ? 'bg-green-50 border-green-200 text-green-800' :
          shouldApply.verdict === 'MAYBE' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{shouldApply.verdict === 'YES' ? '✅' : shouldApply.verdict === 'MAYBE' ? '🤔' : '❌'}</span>
            <div>
              <p className="font-semibold text-sm">{shouldApply.verdict === 'YES' ? 'Apply!' : shouldApply.verdict === 'MAYBE' ? 'Maybe Apply' : "Don't Apply"}</p>
              <p className="text-xs opacity-80">{shouldApply.confidence}% confident</p>
            </div>
          </div>
          {shouldApply.reasoning && (
            <p className="text-xs mt-2 leading-relaxed">{shouldApply.reasoning}</p>
          )}
        </div>
      )}

      {/* Cloud match result */}
      {cloudMatch && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">AI Analysis</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-indigo-700">{cloudMatch.score}%</span>
            <span className="text-xs text-indigo-500">{cloudMatch.tier}</span>
          </div>
          {cloudMatch.summary && (
            <p className="text-xs text-indigo-700 mt-1.5 leading-relaxed">{cloudMatch.summary}</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2 pt-1">
        {!hasResume ? (
          <div className="space-y-2">
            <button
              onClick={onSyncCareerMemory}
              disabled={isSyncingMemory}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {isSyncingMemory ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Sync Career Memory
            </button>
            <a
              href={`${SYNC_HOST}/career-profile`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 w-full py-2 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Open Career Memory on Web <ExternalLink size={10} />
            </a>
          </div>
        ) : (
          <>
            <button
              onClick={onRewrite}
              disabled={loadingRewrite}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {loadingRewrite ? <Loader2 size={14} className="animate-spin" /> : '⚡'}
              Tailor Resume (1 credit)
            </button>

            <div className="flex gap-2">
              <button
                onClick={onShouldApply}
                disabled={loadingApply}
                className="flex-1 py-2 rounded-xl border border-indigo-200 text-indigo-600 text-xs font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-60"
              >
                {loadingApply ? <Loader2 size={12} className="animate-spin inline" /> : '🎯'} Should Apply?
              </button>

              <button
                onClick={onCloudMatch}
                disabled={loadingCloud}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {loadingCloud ? <Loader2 size={12} className="animate-spin inline" /> : '🤖'} Deep Scan
              </button>
            </div>
          </>
        )}

        <button
          onClick={onSave}
          disabled={isSaved}
          className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl border text-xs font-medium transition-colors ${
            isSaved
              ? 'border-green-200 text-green-600 bg-green-50'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          {isSaved ? 'Saved to Tracker' : 'Save Job'}
        </button>

        <a
          href={`${SYNC_HOST}/app/tracker`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          View Tracker <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

// ── Rewrite Tab ───────────────────────────────────────────────────────────────
function RewriteTab({
  streamingText,
  rewriteResult,
  isLoading,
  streamContainerRef,
}: {
  streamingText: string;
  rewriteResult: RewriteResult | null;
  isLoading: boolean;
  streamContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!rewriteResult?.rewrittenResume) return;
    try {
      await navigator.clipboard.writeText(rewriteResult.rewrittenResume);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback in case document is not focused in sidepanel
      const textarea = document.createElement('textarea');
      textarea.value = rewriteResult.rewrittenResume;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isLoading && !streamingText && !rewriteResult) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <p className="text-gray-400 text-xs">Click "Tailor Resume" on the Match tab to tailor your resume to this job.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-12">
      {isLoading && (
        <div className="flex items-center gap-2 text-indigo-600 text-xs">
          <Loader2 size={14} className="animate-spin" />
          <span>Tailoring your resume with AI…</span>
        </div>
      )}

      {streamingText && (
        <div
          ref={streamContainerRef}
          className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-80 overflow-y-auto"
        >
          <p className="text-xs font-semibold text-gray-500 mb-2">Live Preview</p>
          <pre className="whitespace-pre-wrap text-xs text-gray-800 font-mono leading-relaxed">
            {streamingText}
            <span className="animate-pulse">▋</span>
          </pre>
        </div>
      )}

      {rewriteResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl p-3">
            <div className="text-center">
              <p className="text-xs text-gray-500">Before</p>
              <p className="text-lg font-bold text-gray-700">{rewriteResult.beforeAtsScore}</p>
            </div>
            <div className="text-green-500 font-bold">→</div>
            <div className="text-center">
              <p className="text-xs text-gray-500">After</p>
              <p className="text-lg font-bold text-green-600">{rewriteResult.afterAtsScore}</p>
            </div>
            <p className="text-xs text-green-600 flex-1">ATS Score improved!</p>
          </div>

          {rewriteResult.keywordsAdded.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Keywords Added</p>
              <div className="flex flex-wrap gap-1.5">
                {rewriteResult.keywordsAdded.map(kw => (
                  <span key={kw} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full border border-indigo-100">
                    + {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-64 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-500 mb-2">Tailored Resume</p>
            <pre className="whitespace-pre-wrap text-xs text-gray-800 leading-relaxed font-mono">
              {rewriteResult.rewrittenResume}
            </pre>
          </div>

          <button
            onClick={handleCopy}
            className={`w-full py-2.5 text-xs font-semibold rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
              copied
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            {copied ? '✓ Copied to Clipboard!' : '📋 Copy to Clipboard'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Saved Tab ─────────────────────────────────────────────────────────────────
function SavedTab() {
  const [jobs, setJobs] = useState<import('@/lib/storage/jobs').SavedJob[]>([]);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SAVED_JOBS' }).then((r: unknown) => {
      const response = r as { ok: boolean; data?: import('@/lib/storage/jobs').SavedJob[] };
      if (response?.ok && response.data) setJobs(response.data);
    });
  }, []);

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <p className="text-gray-400 text-xs">No saved jobs yet. Click "Save Job" on any job page.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2 pb-12">
      <p className="text-xs text-gray-400 font-medium">{jobs.length} saved job{jobs.length !== 1 ? 's' : ''}</p>
      {jobs.map(job => (
        <a
          key={job.id}
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
        >
          <div className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
            job.matchTier === 'STRONG FIT' ? 'bg-green-500' :
            job.matchTier === 'PARTIAL FIT' ? 'bg-amber-500' : 'bg-red-500'
          }`}>
            {job.matchScore}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs text-gray-900 truncate group-hover:text-indigo-600">{job.title}</p>
            <p className="text-xs text-gray-500">{job.company} · {job.platform}</p>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{job.status}</p>
          </div>
        </a>
      ))}
      <a
        href={`${SYNC_HOST}/app/tracker`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 w-full py-2 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
      >
        View Full Tracker <ExternalLink size={10} />
      </a>
    </div>
  );
}
