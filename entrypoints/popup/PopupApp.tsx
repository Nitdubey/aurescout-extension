import React, { useEffect, useState } from 'react';
import { ExternalLink, Bookmark, Zap, Settings } from 'lucide-react';
import { getUserProfile, isLoggedIn } from '@/lib/auth';
import type { UserProfile } from '@/lib/auth';
import { SYNC_HOST } from '@/lib/constants';
import type { SavedJob } from '@/lib/storage/jobs';

export default function PopupApp() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [currentJobScore, setCurrentJobScore] = useState<number | null>(null);
  const [currentJobTier, setCurrentJobTier] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const [logIn, userProfile] = await Promise.all([
        isLoggedIn(),
        getUserProfile(),
      ]);
      setLoggedIn(logIn);
      setProfile(userProfile);

      // Get saved jobs count
      const response = await chrome.runtime.sendMessage({ type: 'GET_SAVED_JOBS' });
      if (response?.ok && response.data) {
        setSavedCount((response.data as SavedJob[]).length);
      }

      // Get current tab match data
      const matchResponse = await chrome.runtime.sendMessage({ type: 'GET_MATCH_DATA' });
      if (matchResponse?.ok && matchResponse.data) {
        const data = matchResponse.data as {
          matchResult: { score: number; tier: string };
        };
        setCurrentJobScore(data.matchResult.score);
        setCurrentJobTier(data.matchResult.tier);
      }
    }
    init().catch(() => undefined);
  }, []);

  function openSidePanel() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL', tabId: tabs[0].id });
        window.close();
      }
    });
  }

  const tierColors: Record<string, string> = {
    'STRONG FIT': 'bg-green-500',
    'PARTIAL FIT': 'bg-amber-500',
    'NOT A FIT': 'bg-red-500',
  };

  return (
    <div className="bg-white min-h-[280px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-base">⚡ AureScout</span>
          <a
            href={`${SYNC_HOST}/app/command-center`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-200 hover:text-white transition-colors"
          >
            <Settings size={14} />
          </a>
        </div>
        {profile && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-indigo-200 text-xs">{profile.name}</span>
            <span className="text-white text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
              {profile.credits} credits
            </span>
          </div>
        )}
      </div>

      {/* Current match score */}
      {currentJobScore !== null && currentJobScore > 0 && currentJobTier && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Current Job Match</p>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${tierColors[currentJobTier] ?? 'bg-gray-400'}`}>
              {currentJobScore}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{currentJobScore}% Match</p>
              <p className="text-xs text-gray-400">{currentJobTier}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 space-y-2 flex-1">
        <button
          onClick={openSidePanel}
          className="flex items-center gap-2 w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Zap size={14} />
          Open Side Panel
        </button>

        <a
          href={`${SYNC_HOST}/app/tracker`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 w-full py-2 px-4 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Bookmark size={14} />
          <span>Saved Jobs</span>
          {savedCount > 0 && (
            <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {savedCount}
            </span>
          )}
        </a>

        {!loggedIn && loggedIn !== null && (
          <a
            href={`${SYNC_HOST}/sign-in`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full py-2 px-4 text-sm text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            <ExternalLink size={14} />
            Sign In to AureScout
          </a>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100">
        <a
          href={`${SYNC_HOST}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          aurescout.com <ExternalLink size={9} />
        </a>
      </div>
    </div>
  );
}
