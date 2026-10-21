import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AureScout — AI Job Matcher & ATS Scanner',
    description: 'Instantly match your resume to any job on LinkedIn, Indeed & Naukri. AI ATS scoring, skill gap analysis & 1-click resume tailoring.',
    version: '1.0.0',
    permissions: ['storage', 'sidePanel', 'scripting', 'tabs', 'cookies', 'alarms'],
    host_permissions: [
      'https://*.linkedin.com/*',
      'https://*.indeed.com/*',
      'https://*.naukri.com/*',
      'https://*.glassdoor.com/*',
      'https://*.wellfound.com/*',
      'https://*.boards.greenhouse.io/*',
      'https://*.jobs.lever.co/*',
      'https://*.aurescout.com/*',
      'http://localhost:3000/*'
    ],
    side_panel: {
      default_path: 'sidepanel/index.html'
    },
    action: {
      default_title: 'AureScout',
    },
    web_accessible_resources: [
      {
        resources: ['icon/*.png'],
        matches: ['<all_urls>'],
        use_dynamic_url: true
      }
    ]
  },
  runner: {
    startUrls: ['https://www.linkedin.com/jobs/'],
  },
});
