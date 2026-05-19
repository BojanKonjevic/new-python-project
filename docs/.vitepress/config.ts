@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500;600&display=swap');

/* ─── Tokens ──────────────────────────────────────────────────────────────── */

/*
  Default (dark) — rich warm dark, amber accents.
  Light is an opt-in via .light class / prefers-color-scheme override.
*/

:root {
  --vp-font-family-base: 'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --vp-font-family-mono: 'Geist Mono', 'JetBrains Mono', monospace;

  /* Dark palette — default */
  --vp-c-brand-1: #d4a264;
  --vp-c-brand-2: #c49050;
  --vp-c-brand-3: #e8bc84;
  --vp-c-brand-soft: rgba(212, 162, 100, 0.14);

  --vp-c-bg: #0f0e0c;
  --vp-c-bg-soft: #181612;
  --vp-c-bg-elv: #1c1a16;
  --vp-c-bg-alt: #181612;

  --vp-c-text-1: #e8e3da;
  --vp-c-text-2: #b8b0a0;
  --vp-c-text-3: #7a7268;

  --vp-c-divider: #2a2620;
  --vp-c-border: #2a2620;
  --vp-c-gutter: #0f0e0c;

  --vp-nav-height: 52px;
  --vp-nav-bg-color: #0f0e0c;
  --vp-sidebar-bg-color: #0f0e0c;

  /* Inline code */
  --vp-c-code-inline: #d4a264;

  /* Code block surface */
  --vp-code-block-bg: #100f0d;
}

/* ─── Light theme overrides ───────────────────────────────────────────────── */

/*
  Light palette — warm editorial: cream background, dark ink, high-contrast
  amber accent. Minimum contrast ratio 4.5:1 on all text/bg pairs.
*/

.light,
html.light {
  --vp-c-brand-1: #8a5c2e;
  --vp-c-brand-2: #7a4e22;
  --vp-c-brand-3: #a06830;
  --vp-c-brand-soft: rgba(138, 92, 46, 0.10);

  --vp-c-bg: #faf8f4;
  --vp-c-bg-soft: #f2ede5;
  --vp-c-bg-elv: #ffffff;
  --vp-c-bg-alt: #f2ede5;

  --vp-c-text-1: #1a1714;
  --vp-c-text-2: #3d3830;
  --vp-c-text-3: #6b6358;

  --vp-c-divider: #d8d0c4;
  --vp-c-border: #d8d0c4;
  --vp-c-gutter: #faf8f4;

  --vp-nav-bg-color: #faf8f4;
  --vp-sidebar-bg-color: #faf8f4;

  --vp-c-code-inline: #7a4e22;

  --vp-code-block-bg: #1a1714;
}

/* ─── Typography ──────────────────────────────────────────────────────────── */

.vp-doc h1 {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: 2rem;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.vp-doc h2 {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: 1.35rem;
  letter-spacing: -0.015em;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 1.25rem;
  margin-top: 2rem;
}

.vp-doc h3,
.vp-doc h4,
.vp-doc h5,
.vp-doc h6 {
  font-family: 'Instrument Sans', sans-serif;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* ─── Nav ─────────────────────────────────────────────────────────────────── */

.VPNav {
  border-bottom: 1px solid var(--vp-c-divider) !important;
  background-color: var(--vp-nav-bg-color) !important;
}

.VPNavBarTitle .title {
  font-family: 'Geist Mono', monospace !important;
  font-weight: 600 !important;
  font-size: 0.9rem !important;
  letter-spacing: -0.025em !important;
  color: var(--vp-c-text-1) !important;
}

/* ─── Sidebar ─────────────────────────────────────────────────────────────── */

.VPSidebar {
  background-color: var(--vp-sidebar-bg-color) !important;
  border-right: 1px solid var(--vp-c-divider) !important;
}

.VPSidebarItem .text {
  font-size: 13px !important;
  line-height: 1.5 !important;
}

.VPSidebarItem.level-0 > .item > .text {
  font-size: 11px !important;
  font-weight: 600 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  color: var(--vp-c-text-3) !important;
}

/* ─── Links ───────────────────────────────────────────────────────────────── */

.vp-doc a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 500;
}

.vp-doc a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ─── Inline code ─────────────────────────────────────────────────────────── */

.vp-doc :not(pre) > code {
  font-family: 'Geist Mono', monospace !important;
  font-size: 0.875em !important;
  color: var(--vp-c-code-inline) !important;
  background-color: transparent !important;
  border: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
  font-variant-ligatures: none !important;
  font-feature-settings: 'liga' 0, 'calt' 0 !important;
}

/* ─── Code blocks ─────────────────────────────────────────────────────────── */

/*
  Both themes use a near-black code surface so syntax colors are consistent
  regardless of which theme is active. Light theme page is cream; code blocks
  are dark — this is intentional and matches the editorial aesthetic.
*/

.vp-doc div[class*='language-'] {
  background-color: var(--vp-code-block-bg) !important;
  border: 1px solid #2a2620 !important;
  border-radius: 8px !important;
}

.vp-doc div[class*='language-'] pre {
  background-color: transparent !important;
}

.vp-doc div[class*='language-'] > span.lang {
  font-family: 'Geist Mono', monospace !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  color: #6a6460 !important;
  letter-spacing: 0.04em !important;
}

.vp-doc div[class*='language-'] > button.copy {
  border-color: #2a2620 !important;
}

.vp-doc div[class*='language-'] > button.copy:hover {
  border-color: #d4a264 !important;
}

.vp-doc div[class*='language-'] code {
  font-family: 'Geist Mono', monospace !important;
  font-size: 0.85rem !important;
  line-height: 1.7 !important;
  color: #d4cfc8 !important;
  font-variant-ligatures: none !important;
  font-feature-settings: 'liga' 0, 'calt' 0 !important;
}

/* Syntax token overrides — warm amber keywords, sage strings, dim comments */

.vp-doc div[class*='language-'] .token.keyword,
.vp-doc div[class*='language-'] span[style*='color:#569CD6'],
.vp-doc div[class*='language-'] span[style*='color:#C586C0'],
.vp-doc div[class*='language-'] span[style*='color:#4EC9B0'] {
  color: #d4a264 !important;
}

.vp-doc div[class*='language-'] .token.string,
.vp-doc div[class*='language-'] span[style*='color:#CE9178'] {
  color: #8faa8b !important;
}

.vp-doc div[class*='language-'] .token.comment,
.vp-doc div[class*='language-'] span[style*='color:#6A9955'] {
  color: #5a5450 !important;
  font-style: italic !important;
}

.vp-doc div[class*='language-'] .token.number,
.vp-doc div[class*='language-'] .token.boolean,
.vp-doc div[class*='language-'] span[style*='color:#B5CEA8'] {
  color: #9fb3c8 !important;
}

/* ─── Callouts ────────────────────────────────────────────────────────────── */

.vp-doc .custom-block {
  border-radius: 6px !important;
  border-left-width: 3px !important;
}

.vp-doc .custom-block.tip {
  background-color: var(--vp-c-brand-soft) !important;
  border-color: var(--vp-c-brand-1) !important;
}

.vp-doc .custom-block.warning {
  background-color: rgba(160, 100, 48, 0.08) !important;
}

.vp-doc .custom-block.info {
  background-color: var(--vp-c-bg-soft) !important;
}

/* ─── Tables ──────────────────────────────────────────────────────────────── */

.vp-doc table {
  font-size: 0.9rem !important;
}

.vp-doc thead th {
  font-family: 'Instrument Sans', sans-serif !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  color: var(--vp-c-text-3) !important;
}

/* ─── Default to dark ─────────────────────────────────────────────────────── */

/*
  VitePress ships light as default. We override the html element's color
  scheme so the page renders dark unless the user explicitly has a light
  preference or has toggled to light via the theme switcher.

  The `.dark` class is what VitePress applies when the user picks dark in
  the switcher. We still define the same tokens there for completeness,
  but the :root defaults above already cover it.
*/

html:not(.light) {
  color-scheme: dark;
}

html.light {
  color-scheme: light;
}
