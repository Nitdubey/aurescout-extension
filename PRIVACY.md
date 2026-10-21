# Privacy Policy — AureScout Chrome Extension

**Last Updated:** October 2026

## What We Collect

The AureScout Chrome Extension collects and processes the following data:

### Job Posting Data
- Job title, company name, location, and job description text from job pages you visit
- This data is processed **locally on your device** to compute match scores
- When you use AI features (Should Apply, Resume Tailoring), job description text is sent to aurescout.com's API

### Resume Data
- If you upload a resume on aurescout.com, a cached plain-text copy is stored in your browser's local storage (`chrome.storage.local`)
- Your resume is never sent to third parties — only to aurescout.com's own API

### Authentication
- The extension reads your aurescout.com session cookie to authenticate API requests
- Session tokens are stored locally and expire automatically

### Saved Jobs
- Job bookmarks you save are stored locally in `chrome.storage.local`
- With your permission, saved jobs sync to your aurescout.com account

## What We Do NOT Collect

- We never collect passwords
- We never track your browsing history
- We never interact with LinkedIn/Indeed/Naukri on your behalf (read-only)
- We never sell data to third parties
- We do not use Google Analytics or any third-party analytics in the extension

## Data Storage

- **Local:** `chrome.storage.local` — resume text, saved jobs, auth session
- **Cloud:** aurescout.com servers — only when you use authenticated AI features

## Permissions Justification

| Permission | Reason |
|------------|---------|
| `storage` | Store resume, saved jobs, auth session locally |
| `sidePanel` | Show the analysis side panel |
| `tabs` | Detect when you navigate to a job page |
| `cookies` | Read aurescout.com session cookie for auth |
| `scripting` | Inject match badge into job pages |
| `alarms` | Periodic background sync (every 30 min) |

## Contact

For privacy inquiries: privacy@aurescout.com
