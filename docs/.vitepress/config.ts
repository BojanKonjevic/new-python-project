import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'zenit',
  description: 'Scaffold Python projects without lock-in',
  base: '/',
  cleanUrls: true,

  themeConfig: {
    logo: { text: 'zenit' },

    nav: [
      { text: 'Docs', link: '/getting-started' },
      { text: 'GitHub', link: 'https://github.com/BojanKonjevic/zenit' },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/BojanKonjevic/zenit' },
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
        text: 'Templates & Addons',
        collapsed: false,
        items: [
          { text: 'Templates', link: '/templates/' },
          { text: 'Addons', link: '/addons/' },
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
    // Validate all internal links at build time
  },

  vite: {
    build: {
      // Treat dead links as errors during build
    },
  },
})
