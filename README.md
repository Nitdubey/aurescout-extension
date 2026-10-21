# AureScout Chrome Extension

**AI Job Matcher, ATS Scanner & Resume Tailoring Copilot**

[![Version](https://img.shields.io/badge/version-1.0.0-indigo)](.)
[![WXT](https://img.shields.io/badge/WXT-0.21.4-violet)](https://wxt.dev)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)

## Overview

AureScout Chrome Extension gives you instant AI-powered job match scores as you browse LinkedIn, Indeed, Naukri, Glassdoor, and more — no copy-pasting required.

### Features

- **⚡ Offline Match Badge** — Instant ATS score badge injected next to every job title (TF-IDF + skill lexicon, <15ms)
- **🎯 Should Apply?** — AI verdict on whether you should apply (requires login)
- **✍️ 1-Click Resume Tailoring** — Stream your resume being rewritten for the job in real-time (1 credit)
- **💾 Job Tracker** — Save jobs locally, sync to aurescout.com tracker
- **🔒 No Login Required** — Offline matching works without signing in; AI features sync with your aurescout.com session

### Supported Sites

- LinkedIn Jobs
- Indeed
- Naukri
- Glassdoor
- Wellfound (AngelList)
- Greenhouse ATS (`boards.greenhouse.io`)
- Lever ATS (`jobs.lever.co`)

---

## Development Setup

### Prerequisites

- Node.js 20+
- npm 9+

### Install

```bash
cd aurescout-extension
npm install
```

### Development

```bash
npm run dev
```

Open `chrome://extensions`, enable Developer Mode, click "Load unpacked" → select `.output/chrome-mv3/`.

### Build

```bash
npm run build
```

Output: `.output/chrome-mv3/`

### Package for Chrome Web Store

```bash
npm run zip
```

---

## Architecture

```
aurescout-extension/
├── entrypoints/
│   ├── background.ts          # Service Worker (message bus, badge, alarms)
│   ├── content/
│   │   ├── linkedin.ts        # LinkedIn SPA content script
│   │   └── universal.ts       # Indeed, Naukri, Glassdoor, Greenhouse, Lever
│   ├── popup/                 # Toolbar popup (280px)
│   └── sidepanel/             # Full React side panel (360px)
├── lib/
│   ├── auth.ts                # Clerk session sync with aurescout.com
│   ├── constants.ts           # API_BASE, STORAGE_KEYS, SYNC_HOST
│   ├── api/
│   │   ├── client.ts          # Authenticated fetch + SSE streaming
│   │   ├── jd-match.ts        # POST /api/jd-match
│   │   ├── should-apply.ts    # POST /api/should-apply
│   │   ├── rewrite.ts         # POST /api/rewrite (SSE)
│   │   └── tracker.ts         # POST /api/extension/sync
│   ├── extractors/            # 3-tier job extraction (JSON-LD → DOM → fallback)
│   ├── matching/              # Offline TF-IDF matcher + 2,500+ skill lexicon
│   └── storage/               # chrome.storage.local wrappers
└── wxt.config.ts
```

## Environment Variables

Copy `.env.example` to `.env.local`:

```env
VITE_API_BASE=https://www.aurescout.com
```

---

## Privacy

This extension only reads job posting data from pages you visit on supported job boards. It never:
- Clicks buttons or interacts with job sites automatically
- Sends your resume to third parties
- Stores personally identifiable information beyond your aurescout.com account

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

---

## Tech Stack

- **WXT 0.21.4** — Chrome Extension framework
- **React 19** — Side panel & popup UI
- **Tailwind CSS 3** — Styling
- **TypeScript** — Strict type safety
- **@clerk/chrome-extension** — Auth session sync
