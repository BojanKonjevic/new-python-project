import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'zenit',
  description: 'Scaffold Python projects without lock-in',
  base: '/zenit/docs/',
  cleanUrls: true,

  themeConfig: {
    logo: { text: 'zenit' },

    nav: [
      { text: 'Home', link: 'https://bojankonjevic.github.io/zenit/' },
      { text: 'GitHub', link: 'https://github.com/BojanKonjevic/zenit' },
      { text: 'Docs', link: '' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started' },
        ],
      },
      {
        text: 'Architecture',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/architecture/' },
          { text: 'The Manifest', link: '/architecture/manifest' },
          { text: 'Code Injection', link: '/architecture/injection' },
          { text: 'Addons & Templates', link: '/architecture/addons-and-templates' },
        ],
      },
      {
        text: 'Commands',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/commands/' },
          { text: 'zenit create', link: '/commands/create' },
          { text: 'zenit add', link: '/commands/add' },
          { text: 'zenit remove', link: '/commands/remove' },
          { text: 'zenit doctor', link: '/commands/doctor' },
          { text: 'zenit list', link: '/commands/list' },
        ],
      },
      {
        text: 'Templates',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/templates/' },
          { text: 'blank', link: '/templates/blank' },
          { text: 'fastapi', link: '/templates/fastapi' },
        ],
      },
      {
        text: 'Addons',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/addons/' },
          { text: 'auth-manual', link: '/addons/auth-manual' },
          { text: 'celery', link: '/addons/celery' },
          { text: 'docker', link: '/addons/docker' },
          { text: 'github-actions', link: '/addons/github-actions' },
          { text: 'redis', link: '/addons/redis' },
          { text: 'sentry', link: '/addons/sentry' },
        ],
      },
      {
        text: 'Contributing',
        items: [
          { text: 'Contributing Guide', link: '/contributing' },
        ],
      },
    ],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/your-org/zenit/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the <a href="https://github.com/your-org/zenit/blob/main/LICENSE">MIT License</a>.',
      copyright: 'Copyright © 2024–present zenit contributors',
    },
  },

    markdown: {
      // Force dark Shiki theme in both light & dark site modes so
      // inline syntax colors are always light-on-dark, matching the
      // CSS code-block surface that stays near-black in both themes.
      theme: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },

  vite: {
    build: {
      // Treat dead links as errors during build
    },
  },
})
