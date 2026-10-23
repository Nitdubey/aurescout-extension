import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: ({ mode }) => ({
    name: 'AureScout — AI Job Matcher & ATS Scanner',
    description: 'Instantly match your resume to any job on LinkedIn, Indeed & Naukri. AI ATS scoring, skill gap analysis & 1-click resume tailoring.',
    version: '1.0.0',
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    permissions: ['storage', 'sidePanel', 'tabs', 'cookies', 'alarms'],
    host_permissions: [
      'https://*.linkedin.com/*',
      'https://*.indeed.com/*',
      'https://*.naukri.com/*',
      'https://*.glassdoor.com/*',
      'https://*.wellfound.com/*',
      'https://*.boards.greenhouse.io/*',
      'https://*.jobs.lever.co/*',
      'https://*.aurescout.com/*',
      ...(mode === 'development' ? ['http://localhost:3000/*'] : []),
    ],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    action: {
      default_title: 'AureScout',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
    web_accessible_resources: [
      {
        resources: ['icons/*.png', 'icons/*.svg'],
        matches: ['<all_urls>'],
        use_dynamic_url: true,
      },
    ],
  }),
});
