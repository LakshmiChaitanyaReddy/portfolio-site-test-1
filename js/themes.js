/* ==========================================================================
   themes.js — the theme registry.

   A theme is a bag of CSS custom properties applied inline on <html> at
   runtime, plus a `style` name written to html[data-theme-style]. site.html
   and app.html both declare sane defaults for every property, so a missing
   theme degrades to the default look.

   Ten themes, each a different MOOD rather than a colour swap. Every theme
   authors all of:
     colour      twelve colours per mode (light AND dark — see mode())
     typography  display / body / mono families from FONTS, weight, tracking,
                 case, scale and line height
     buttons     --button-radius (site.html's signature rules add fill/outline)
     cards       --radius, --card-shadow, --card-border-width, --card-backdrop
     rhythm      --section-y, --gap, --maxw
     background  --page-pattern
     accent      --accent, plus the per-style signature rules in site.html
                 (html[data-theme-style=…]) — rules, gradients, underlines
   Derived at runtime:
     --accent-strong   accent mixed toward white (dark) / black (light)
     --accent-soft     accent at 12% alpha
     --header-bg       page background at 80% alpha
     --on-accent       black or white, chosen by luminance for contrast

   COMPATIBILITY: customer sites store a theme id. The 28 retired ids resolve
   through ALIASES to the new theme with the closest mood; an unknown id falls
   back to minimal-light. THEMES only lists the ten current themes.

   ADDING A PRESET: append one object to THEMES. Nothing else to touch —
   the builder's gallery, the var editor and the validator all read this list.
   ========================================================================== */
(function () {
  "use strict";
  const PF = (window.PF = window.PF || {});
  PF.modules = PF.modules || {};
  PF.provide = PF.provide || function (n, api) { PF[n] = api; PF.modules[n] = true; };

  /* ------------------------------------------------------------------
     FONT CATALOGUE — `spec` is the exact Google Fonts css2 family string.
     Weights matter: Space Mono has no 500, Instrument Serif only has 400.
     Retired themes' families stay here: saved custom themes still use them.
     ------------------------------------------------------------------ */
  const FONTS = {
    "Space Grotesk":         { spec: "Space+Grotesk:wght@500;600;700", kind: "sans" },
    "Inter":                 { spec: "Inter:wght@400;500;600;700", kind: "sans" },
    "Manrope":               { spec: "Manrope:wght@400;500;600;700", kind: "sans" },
    "Outfit":                { spec: "Outfit:wght@400;500;600;700", kind: "sans" },
    "Archivo":               { spec: "Archivo:wght@400;500;600;700", kind: "sans" },
    "Sora":                  { spec: "Sora:wght@400;500;600;700", kind: "sans" },
    "Bricolage Grotesque":   { spec: "Bricolage+Grotesque:wght@500;600;700;800", kind: "sans" },
    "Syne":                  { spec: "Syne:wght@500;600;700;800", kind: "sans" },
    "Work Sans":             { spec: "Work+Sans:wght@400;500;600", kind: "sans" },
    "Karla":                 { spec: "Karla:wght@400;500;600;700", kind: "sans" },
    "Figtree":               { spec: "Figtree:wght@400;500;600;700", kind: "sans" },
    "Source Sans 3":         { spec: "Source+Sans+3:wght@400;500;600;700", kind: "sans" },
    "IBM Plex Sans":         { spec: "IBM+Plex+Sans:wght@400;500;600;700", kind: "sans" },
    "Nunito Sans":           { spec: "Nunito+Sans:wght@400;500;600;700", kind: "sans" },
    "DM Sans":               { spec: "DM+Sans:wght@400;500;700", kind: "sans" },
    "Atkinson Hyperlegible": { spec: "Atkinson+Hyperlegible:wght@400;700", kind: "sans" },

    "Fraunces":              { spec: "Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700", kind: "serif" },
    "Playfair Display":      { spec: "Playfair+Display:wght@500;600;700;800", kind: "serif" },
    "Instrument Serif":      { spec: "Instrument+Serif", kind: "serif" },
    "Newsreader":            { spec: "Newsreader:wght@400;500;600", kind: "serif" },
    "Lora":                  { spec: "Lora:wght@400;500;600;700", kind: "serif" },
    "Source Serif 4":        { spec: "Source+Serif+4:wght@400;600;700", kind: "serif" },
    "EB Garamond":           { spec: "EB+Garamond:wght@400;500;600;700", kind: "serif" },
    "Libre Baskerville":     { spec: "Libre+Baskerville:wght@400;700", kind: "serif" },

    "JetBrains Mono":        { spec: "JetBrains+Mono:wght@400;500;600;700", kind: "mono" },
    "IBM Plex Mono":         { spec: "IBM+Plex+Mono:wght@400;500;600", kind: "mono" },
    "Space Mono":            { spec: "Space+Mono:wght@400;700", kind: "mono" },
    "Fira Code":             { spec: "Fira+Code:wght@400;500", kind: "mono" },
    "Roboto Mono":           { spec: "Roboto+Mono:wght@400;500", kind: "mono" }
  };

  const STACKS = {
    sans:  'system-ui, -apple-system, "Segoe UI", sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono:  'ui-monospace, "SF Mono", Menlo, monospace'
  };

  /* The twelve colours a mode needs, in a fixed order. */
  function mode(accent, bg, bgAlt, surface, surface2, text, textMid, textDim, border, border2, danger, warn) {
    return {
      "--accent": accent,
      "--bg": bg, "--bg-alt": bgAlt, "--surface": surface, "--surface-2": surface2,
      "--text": text, "--text-mid": textMid, "--text-dim": textDim,
      "--border": border, "--border-2": border2,
      "--danger": danger, "--warn": warn
    };
  }

  /* Every common token, with the neutral default. A theme passes only what
     it changes, but resolveTheme always starts from the full set, so every
     theme defines every token in both modes. */
  function shape(opts) {
    return Object.assign({
      "--maxw": "1080px",
      "--radius": "12px",
      "--radius-sm": "8px",
      "--chip-radius": "6px",
      "--gap": "1.2rem",
      "--section-y": "clamp(4.5rem, 9vw, 7rem)",
      "--fs-scale": "1",
      "--h-scale": "1",
      "--line-height": "1.7",
      "--h-weight": "600",
      "--h-tracking": "-0.02em",
      "--card-shadow": "none", "--card-border-width": "1px", "--card-backdrop": "none",
      "--page-pattern": "none", "--h-case": "none", "--eyebrow-tracking": ".14em",
      "--button-radius": "var(--radius-sm)", "--card-lift": "-3px"
    }, opts || {});
  }

  const THEMES = [
    {
      id: "minimal-light", name: "Minimal Light", category: "Minimal", style: "minimal-light", defaultMode: "light",
      blurb: "The default. Quiet neutral paper, one emerald accent and hairline structure — nothing competes with the content.",
      fonts: { display: "Inter", body: "Inter", mono: "JetBrains Mono" },
      vars: {
        common: shape({ "--radius": "10px", "--radius-sm": "8px", "--maxw": "1040px", "--gap": "1.25rem",
          "--h-tracking": "-0.028em", "--button-radius": "8px", "--card-lift": "-2px", "--eyebrow-tracking": ".12em" }),
        light: mode("#047857", "#fafaf9", "#f3f3f1", "#ffffff", "#f0f0ee", "#18181b", "#3f3f46", "#5f5f67", "#e4e4e1", "#cfcfca", "#b42318", "#8a5a00"),
        dark:  mode("#4fd1a5", "#0e0f10", "#131416", "#17181b", "#1f2124", "#f2f2f3", "#c6c7cb", "#9c9ea5", "#26282c", "#36393e", "#ff7b72", "#e3b341")
      }
    },
    {
      id: "editorial-bw", name: "Editorial Black & White", category: "Editorial", style: "editorial-bw", defaultMode: "light",
      blurb: "Magazine layout in pure black and white: high-contrast Playfair headlines, a reading serif, heavy rules instead of boxes.",
      fonts: { display: "Playfair Display", body: "Newsreader", mono: "IBM Plex Mono" },
      vars: {
        common: shape({ "--radius": "0px", "--radius-sm": "0px", "--chip-radius": "0px", "--maxw": "1120px", "--gap": "2rem",
          "--h-scale": "1.2", "--h-weight": "700", "--h-tracking": "-0.018em", "--line-height": "1.72", "--fs-scale": "1.04",
          "--card-border-width": "0px", "--eyebrow-tracking": ".22em", "--button-radius": "0px", "--card-lift": "0px",
          "--section-y": "clamp(4rem, 8vw, 6.5rem)" }),
        light: mode("#111111", "#ffffff", "#f5f4f1", "#ffffff", "#f0efeb", "#0a0a0a", "#2b2b2b", "#595959", "#e2e1dd", "#111111", "#b3261e", "#7a5900"),
        dark:  mode("#f5f5f5", "#0b0b0b", "#121212", "#0b0b0b", "#1b1b1b", "#fafafa", "#d4d4d4", "#a6a6a6", "#2a2a2a", "#f5f5f5", "#ff8a80", "#e3b341")
      }
    },
    {
      id: "technical-dark", name: "Technical Dark", category: "Technical", style: "technical-dark", defaultMode: "dark",
      blurb: "Warm charcoal, amber phosphor accent, monospace headings and a faint engineering grid. Built for developers.",
      fonts: { display: "JetBrains Mono", body: "IBM Plex Sans", mono: "JetBrains Mono" },
      vars: {
        common: shape({ "--radius": "4px", "--radius-sm": "3px", "--chip-radius": "3px", "--maxw": "1120px", "--gap": "1rem",
          "--h-scale": "0.94", "--h-tracking": "-0.035em", "--line-height": "1.65", "--eyebrow-tracking": ".06em",
          "--button-radius": "3px", "--card-lift": "0px", "--section-y": "clamp(3.5rem, 7vw, 5.5rem)",
          "--page-pattern": "repeating-linear-gradient(0deg,transparent 0 47px,var(--border) 47px 48px),repeating-linear-gradient(90deg,transparent 0 47px,var(--border) 47px 48px)" }),
        dark:  mode("#ffb547", "#0d0e10", "#111316", "#15181b", "#1c2024", "#ece9e2", "#c2beb4", "#948f85", "#262a2f", "#3b4047", "#ff6b6b", "#e3c16f"),
        light: mode("#8a4b00", "#f6f5f1", "#eeece6", "#fffefb", "#e9e6de", "#16140f", "#3b3831", "#5d5950", "#dcd8cd", "#c3bdae", "#b3261e", "#6f4a00")
      }
    },
    {
      id: "warm-professional", name: "Warm Professional", category: "Professional", style: "warm-professional", defaultMode: "light",
      blurb: "Linen and rust with soft Fraunces headings, rounded cards and gentle shadows. Approachable, still serious.",
      fonts: { display: "Fraunces", body: "Manrope", mono: "IBM Plex Mono" },
      vars: {
        common: shape({ "--radius": "16px", "--radius-sm": "10px", "--chip-radius": "999px", "--maxw": "1080px", "--gap": "1.4rem",
          "--h-scale": "1.08", "--h-weight": "600", "--h-tracking": "-0.018em", "--line-height": "1.75",
          "--card-shadow": "0 1px 2px rgba(64,40,20,.05), 0 12px 32px -14px rgba(64,40,20,.18)",
          "--button-radius": "999px", "--eyebrow-tracking": ".14em" }),
        light: mode("#9c3f22", "#faf6ef", "#f3ece1", "#fffdf9", "#f1e9dc", "#2a1f17", "#4b3e34", "#6b5c50", "#e6dccd", "#d2c3ae", "#a8261b", "#7a5200"),
        dark:  mode("#eea47e", "#1b1512", "#211a16", "#261e19", "#30261f", "#f5ece3", "#d8cabc", "#ad9d8e", "#3a2e26", "#54443a", "#ff8f80", "#e3b86a")
      }
    },
    {
      id: "bold-gradient", name: "Bold Gradient", category: "Bold", style: "bold-gradient", defaultMode: "dark",
      blurb: "Near-black stage, raspberry-to-amber gradient, oversized Bricolage type and pill buttons. Loud on purpose.",
      fonts: { display: "Bricolage Grotesque", body: "Figtree", mono: "Space Mono" },
      vars: {
        common: shape({ "--radius": "22px", "--radius-sm": "14px", "--chip-radius": "999px", "--maxw": "1180px", "--gap": "1.4rem",
          "--h-scale": "1.2", "--h-weight": "700", "--h-tracking": "-0.04em", "--line-height": "1.65",
          "--card-shadow": "0 28px 60px -34px color-mix(in srgb, var(--accent) 60%, transparent)",
          "--page-pattern": "radial-gradient(60rem 38rem at 88% -8%,var(--accent-soft),transparent 70%),radial-gradient(46rem 30rem at -6% 18%,#ffb34717,transparent 70%)",
          "--button-radius": "999px", "--card-lift": "-6px", "--eyebrow-tracking": ".16em", "--section-y": "clamp(5rem, 10vw, 8rem)" }),
        dark:  mode("#ff5c8a", "#0d0c0f", "#141217", "#18151c", "#221e27", "#fbf7f4", "#d8d0d5", "#a9a0a7", "#2a2530", "#3e3746", "#ff7a6b", "#ffc857"),
        light: mode("#c81d56", "#fffaf7", "#fff0e9", "#ffffff", "#fbe8e0", "#1b0f14", "#43323a", "#68565e", "#f1dcd3", "#e2c1b5", "#b3261e", "#8a5a00")
      }
    },
    {
      id: "executive-navy", name: "Executive Navy", category: "Executive", style: "executive-navy", defaultMode: "light",
      blurb: "Ivory and deep navy with gold hairlines and Baskerville headings. Boardroom-grade restraint; gold on navy in dark mode.",
      fonts: { display: "Libre Baskerville", body: "IBM Plex Sans", mono: "IBM Plex Mono" },
      vars: {
        common: shape({ "--radius": "3px", "--radius-sm": "2px", "--chip-radius": "2px", "--maxw": "1120px", "--gap": "1.5rem",
          "--h-scale": "1.02", "--h-weight": "400", "--h-tracking": "-0.012em", "--line-height": "1.72",
          "--eyebrow-tracking": ".22em", "--button-radius": "2px", "--card-lift": "0px",
          "--section-y": "clamp(4.5rem, 9vw, 7.5rem)" }),
        light: mode("#1c3a64", "#fbfaf7", "#f3f1ea", "#ffffff", "#eeebe2", "#0f1c2e", "#33415a", "#586476", "#e3dfd4", "#c4b48f", "#a8261b", "#7a5a10"),
        dark:  mode("#d4b474", "#0b1526", "#0f1b2f", "#13213a", "#1a2a47", "#f3f1ea", "#cfd5df", "#9eaabd", "#22324f", "#6d5d3c", "#ff8a80", "#e3c16f")
      }
    },
    {
      id: "creative-colorful", name: "Creative Colorful", category: "Creative", style: "creative-colorful", defaultMode: "light",
      blurb: "Cream paper, ink outlines, offset shadows and a rotating sunflower–mint–sky–rose palette. Playful, never messy.",
      fonts: { display: "Syne", body: "DM Sans", mono: "Space Mono" },
      vars: {
        common: shape({ "--radius": "18px", "--radius-sm": "12px", "--chip-radius": "999px", "--maxw": "1160px", "--gap": "1.5rem",
          "--h-scale": "1.16", "--h-weight": "700", "--h-tracking": "-0.03em", "--line-height": "1.65",
          "--card-shadow": "5px 5px 0 var(--border-2)", "--card-border-width": "2px",
          "--button-radius": "999px", "--card-lift": "-4px", "--eyebrow-tracking": ".08em" }),
        light: mode("#c2330f", "#fff8ec", "#fdefd7", "#ffffff", "#fbe6c8", "#161311", "#3b342e", "#5f564e", "#ecdcc2", "#161311", "#a8261b", "#7a5200"),
        dark:  mode("#ff8a5c", "#16120f", "#1d1813", "#221c17", "#2c241d", "#fff5e8", "#e5d7c5", "#b5a593", "#3a3027", "#f3e6d4", "#ff8f80", "#ffd166")
      }
    },
    {
      id: "academic-paper", name: "Academic Paper", category: "Academic", style: "academic-paper", defaultMode: "light",
      blurb: "Off-white paper, Garamond headings over a Source Serif text face, burgundy ink and thin rules. Reads like a journal.",
      fonts: { display: "EB Garamond", body: "Source Serif 4", mono: "IBM Plex Mono" },
      vars: {
        common: shape({ "--radius": "2px", "--radius-sm": "2px", "--chip-radius": "2px", "--maxw": "1000px", "--gap": "1rem",
          "--h-scale": "1.12", "--h-weight": "600", "--h-tracking": "-0.005em", "--line-height": "1.68", "--fs-scale": "1.02",
          "--card-border-width": "0px", "--eyebrow-tracking": ".16em", "--button-radius": "2px", "--card-lift": "0px",
          "--section-y": "clamp(2.75rem, 6vw, 4.25rem)" }),
        light: mode("#7a1f2e", "#fdfcf8", "#f6f3ea", "#fffefa", "#efebe0", "#1d1a16", "#3d3832", "#5f584e", "#e5dfd1", "#c9c0ad", "#a8261b", "#7a5a10"),
        dark:  mode("#e3a0a8", "#171513", "#1c1a17", "#201d1a", "#2a2622", "#efe9dd", "#d1c8b8", "#a59c8c", "#33302a", "#4b463d", "#ff8f80", "#e3c16f")
      }
    },
    {
      id: "soft-modern", name: "Soft Modern", category: "Modern", style: "soft-modern", defaultMode: "light",
      blurb: "Lilac-tinted greys, borderless floating cards, big soft radii and a periwinkle glow. Friendly product-studio calm.",
      fonts: { display: "Outfit", body: "Nunito Sans", mono: "Fira Code" },
      vars: {
        common: shape({ "--radius": "24px", "--radius-sm": "14px", "--chip-radius": "999px", "--maxw": "1100px", "--gap": "1.25rem",
          "--h-weight": "600", "--h-tracking": "-0.03em", "--line-height": "1.72",
          "--card-shadow": "0 1px 2px rgba(26,24,48,.05), 0 16px 40px -18px rgba(26,24,48,.22)", "--card-border-width": "0px",
          "--page-pattern": "radial-gradient(52rem 34rem at 100% 0%, var(--accent-soft), transparent 70%)",
          "--button-radius": "999px", "--card-lift": "-4px", "--eyebrow-tracking": ".12em" }),
        light: mode("#5a4bd1", "#f7f6fb", "#efedf8", "#ffffff", "#eeebfa", "#1a1830", "#423f5c", "#605c7b", "#e4e1f0", "#cfcae6", "#b42318", "#8a5a00"),
        dark:  mode("#b4a9ff", "#121120", "#17162a", "#1c1b31", "#25233d", "#f1effa", "#d0cce6", "#a5a1c2", "#2c2a45", "#3d3a5c", "#ff8a9a", "#e3c16f")
      }
    },
    {
      id: "high-contrast", name: "High Contrast", category: "Accessible", style: "high-contrast", defaultMode: "light",
      blurb: "Accessibility first: pure black and white, Atkinson Hyperlegible, bigger type, underlined links, 2px outlines, no fades.",
      fonts: { display: "Atkinson Hyperlegible", body: "Atkinson Hyperlegible", mono: "IBM Plex Mono" },
      vars: {
        common: shape({ "--radius": "6px", "--radius-sm": "6px", "--chip-radius": "6px", "--maxw": "1040px", "--gap": "1.25rem",
          "--fs-scale": "1.08", "--h-scale": "1.04", "--h-weight": "700", "--h-tracking": "-0.01em", "--line-height": "1.7",
          "--card-border-width": "2px", "--eyebrow-tracking": ".1em", "--button-radius": "6px", "--card-lift": "0px",
          "--section-y": "clamp(4rem, 8vw, 6rem)" }),
        light: mode("#0030c4", "#ffffff", "#f2f2f2", "#ffffff", "#ededed", "#000000", "#141414", "#3a3a3a", "#6b6b6b", "#000000", "#b00020", "#6b4b00"),
        dark:  mode("#ffe14d", "#000000", "#0d0d0d", "#000000", "#1a1a1a", "#ffffff", "#f0f0f0", "#d0d0d0", "#8a8a8a", "#ffffff", "#ff8a80", "#ffd166")
      }
    }
  ];

  /* ------------------------------------------------------------------
     RETIRED IDS → the current theme with the closest mood. Every id a
     customer site may have stored, including the pre-2026 "default".
     ------------------------------------------------------------------ */
  const ALIASES = {
    graphite: "minimal-light", "default": "minimal-light", mint: "minimal-light", frost: "minimal-light",
    folio: "editorial-bw", ink: "editorial-bw", press: "editorial-bw", newsroom: "editorial-bw",
    terminal: "technical-dark", solar: "technical-dark", blueprint: "technical-dark",
    orchard: "warm-professional", terracotta: "warm-professional", rose: "warm-professional",
    cobalt: "bold-gradient", crimson: "bold-gradient", aurora: "bold-gradient",
    sapphire: "executive-navy", ocean: "executive-navy",
    bubble: "creative-colorful", chromatic: "creative-colorful",
    sage: "academic-paper", vellum: "academic-paper",
    lavender: "soft-modern", violet: "soft-modern", glass: "soft-modern",
    noir: "high-contrast", slate: "high-contrast", carbon: "high-contrast"
  };
  const FALLBACK = "minimal-light";

  /* The signature marker travels inside vars.common so a custom theme the
     builder freezes from a preset (it copies vars, not arbitrary keys) keeps
     its signature rules. applyTheme turns it into html[data-theme-style]
     and never writes it as a CSS property. */
  const STYLE_KEY = "--theme-style";
  THEMES.forEach(function (t) { t.vars.common[STYLE_KEY] = t.style; });

  /* Structural hover/border hooks shared by every theme, portfolio and
     builder alike. The per-style signature rules live in site.html. */
  const TREATMENTS = `
html[data-preset] body { background-image:var(--page-pattern); }
html[data-preset] :is(.project-card,.skill-card,.cert-card,.edu-card,.item-card,.feature-card,.pricing-card) { border-width:var(--card-border-width);box-shadow:var(--card-shadow);backdrop-filter:var(--card-backdrop); }
html[data-preset] :is(.hero h1,.section-head h2,.page-hero h1) { text-transform:var(--h-case); }
html[data-preset] .eyebrow { letter-spacing:var(--eyebrow-tracking); }
html[data-preset] .btn { border-radius:var(--button-radius); }
html[data-preset] :is(.project-card,.feature-card):hover { transform:translateY(var(--card-lift)); }
@media(prefers-reduced-motion:reduce){html[data-preset] :is(.project-card,.feature-card):hover {transform:none;}html[data-preset] *{scroll-behavior:auto;animation:none;transition:none;}}
`;

  /* ------------------------------------------------------------------
     WHAT THE THEME BUILDER EXPOSES
     scope "mode"   → edited separately for dark and light
     scope "common" → shared by both modes
     ------------------------------------------------------------------ */
  const VAR_GROUPS = [
    {group:'Surface & ornament',scope:'common',vars:[
      {key:'--card-shadow',label:'Card shadow',type:'raw'},{key:'--card-border-width',label:'Card border width',type:'raw'},
      {key:'--card-backdrop',label:'Card backdrop filter',type:'raw'},{key:'--page-pattern',label:'Page pattern / gradient',type:'raw'},
      {key:'--h-case',label:'Heading case',type:'raw'},{key:'--eyebrow-tracking',label:'Eyebrow tracking',type:'raw'},
      {key:'--button-radius',label:'Button radius',type:'raw'},{key:'--card-lift',label:'Hover lift',type:'raw'}]},
    {
      group: "Accent", scope: "mode",
      note: "Hover, tint and on-accent text colours are derived from this automatically.",
      vars: [{ key: "--accent", label: "Accent", type: "color" }]
    },
    {
      group: "Surfaces", scope: "mode",
      vars: [
        { key: "--bg", label: "Page", type: "color" },
        { key: "--bg-alt", label: "Alt band", type: "color" },
        { key: "--surface", label: "Card", type: "color" },
        { key: "--surface-2", label: "Chip / input", type: "color" }
      ]
    },
    {
      group: "Text", scope: "mode",
      vars: [
        { key: "--text", label: "Headings", type: "color" },
        { key: "--text-mid", label: "Body", type: "color" },
        { key: "--text-dim", label: "Muted", type: "color" }
      ]
    },
    {
      group: "Lines", scope: "mode",
      vars: [
        { key: "--border", label: "Border", type: "color" },
        { key: "--border-2", label: "Border (strong)", type: "color" }
      ]
    },
    {
      group: "Shape", scope: "common",
      vars: [
        { key: "--radius", label: "Card radius", type: "px", min: 0, max: 28, step: 1 },
        { key: "--radius-sm", label: "Button radius", type: "px", min: 0, max: 20, step: 1 },
        { key: "--chip-radius", label: "Chip radius", type: "px", min: 0, max: 999, step: 1 },
        { key: "--maxw", label: "Content width", type: "px", min: 820, max: 1400, step: 20 }
      ]
    },
    {
      group: "Type", scope: "common",
      vars: [
        { key: "--fs-scale", label: "Overall size", type: "ratio", min: 0.85, max: 1.25, step: 0.01 },
        { key: "--h-scale", label: "Heading size", type: "ratio", min: 0.85, max: 1.35, step: 0.01 },
        { key: "--line-height", label: "Line height", type: "ratio", min: 1.4, max: 2, step: 0.02 },
        { key: "--h-weight", label: "Heading weight", type: "select", options: ["400", "500", "600", "700", "800"] },
        { key: "--h-tracking", label: "Heading tracking", type: "em", min: -0.05, max: 0.04, step: 0.005 }
      ]
    },
    {
      group: "Density", scope: "common",
      vars: [
        { key: "--section-y", label: "Section padding", type: "raw" },
        { key: "--gap", label: "Grid gap", type: "raw" }
      ]
    }
  ];

  /* ------------------------------------------------------------------
     HELPERS
     ------------------------------------------------------------------ */
  const INDEX = {};
  THEMES.forEach(function (t) { INDEX[t.id] = t; });

  /* The current id an id stands for: itself, its alias, or null. */
  function canonical(id) {
    if (typeof id !== "string" || !id) return null;
    if (INDEX[id]) return id;
    return ALIASES[id] && INDEX[ALIASES[id]] ? ALIASES[id] : null;
  }

  /* A saved custom theme wins over a built-in id (custom ids are
     "custom-…", so they never collide); then aliases; then the default. */
  function themeById(id, custom) {
    const list = Array.isArray(custom) ? custom : [];
    for (let i = 0; i < list.length; i++) if (list[i] && list[i].id === id && list[i].vars) return list[i];
    return INDEX[canonical(id) || FALLBACK];
  }

  const styleOf = function (v) { return typeof v === "string" && INDEX[v.trim()] ? v.trim() : ""; };

  /* Merge a data.json theme block over its preset. Never mutates either. */
  function resolveTheme(cfg) {
    cfg = cfg && typeof cfg === "object" ? cfg : {};
    const base = themeById(cfg.preset, Array.isArray(cfg.customThemes) && cfg.customThemes.length ? cfg.customThemes : cfg.templates);
    const bv = base.vars || {};
    const cv = cfg.vars && typeof cfg.vars === "object" ? cfg.vars : {};
    return {
      id: base.id,
      name: base.name,
      blurb: base.blurb,
      /* The signature (site.html's [data-theme-style] rules): the
         --theme-style marker, so custom themes frozen from a preset keep it. */
      style: styleOf(Object.assign({}, bv.common, cv.common || {})[STYLE_KEY]) || styleOf(base.style),
      defaultMode: base.defaultMode === "dark" ? "dark" : "light",
      iconAnimation: typeof cfg.iconAnimation === "string" ? cfg.iconAnimation : "lift",
      fonts: Object.assign({ display: "Inter", body: "Inter", mono: "JetBrains Mono" }, base.fonts, cfg.fonts || {}),
      vars: {
        common: Object.assign({}, shape(), bv.common, cv.common || {}),
        dark: Object.assign({}, bv.dark, cv.dark || {}),
        light: Object.assign({}, bv.light, cv.light || {})
      }
    };
  }

  function fontStack(name) {
    const meta = FONTS[name];
    const fallback = STACKS[(meta && meta.kind) || "sans"];
    return name ? '"' + name + '", ' + fallback : fallback;
  }

  /* One <link> for all three families, each requested once. */
  function fontHref(fonts) {
    const wanted = [];
    ["display", "body", "mono"].forEach(function (role) {
      const meta = FONTS[fonts[role]];
      if (meta && wanted.indexOf(meta.spec) === -1) wanted.push(meta.spec);
    });
    if (!wanted.length) return null;
    return "https://fonts.googleapis.com/css2?family=" + wanted.join("&family=") + "&display=swap";
  }

  function luminance(hex) {
    const m = String(hex || "").trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return 0;
    let h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const channel = function (v) {
      const c = parseInt(v, 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(h.slice(0, 2)) + 0.7152 * channel(h.slice(2, 4)) + 0.0722 * channel(h.slice(4, 6));
  }

  /* Black or white on the accent, whichever actually contrasts more.
     0.1791 is where the two are equal: 1.05/(L+.05) == (L+.05)/.05.
     Guessing a threshold here is how you get white-on-olive at 2.3:1. */
  const CONTRAST_CROSSOVER = 0.1791;
  const onAccent = function (accent) { return luminance(accent) > CONTRAST_CROSSOVER ? "#0a0f0d" : "#ffffff"; };

  /* Inline styles on <html> beat the stylesheet defaults, so this wins
     without !important. Called again on every light/dark toggle. */
  function applyTheme(doc, resolved, themeMode) {
    if (!doc || !resolved) return null;
    const el = doc.documentElement;
    el.setAttribute("data-preset", resolved.id);
    if (resolved.style) el.setAttribute("data-theme-style", resolved.style);
    else el.removeAttribute("data-theme-style");
    let treatments=doc.getElementById('theme-treatments');
    if(!treatments){treatments=doc.createElement('style');treatments.id='theme-treatments';treatments.textContent=TREATMENTS;doc.head.appendChild(treatments);}
    const m = themeMode === "light" ? "light" : "dark";
    const vars = Object.assign({}, resolved.vars.common, resolved.vars[m] || {});

    vars["--font-display"] = fontStack(resolved.fonts.display);
    vars["--font-body"] = fontStack(resolved.fonts.body);
    vars["--font-mono"] = fontStack(resolved.fonts.mono);
    vars["--accent-lift"] = m === "dark" ? "#ffffff" : "#000000";
    vars["--on-accent"] = onAccent(vars["--accent"]);

    Object.keys(vars).forEach(function (k) {
      if (k === STYLE_KEY || vars[k] == null || vars[k] === "") return;
      el.style.setProperty(k, String(vars[k]));
    });

    const href = fontHref(resolved.fonts);
    if (href) {
      let link = doc.getElementById("theme-fonts");
      if (!link) {
        link = doc.createElement("link");
        link.id = "theme-fonts";
        link.rel = "stylesheet";
        doc.head.appendChild(link);
      }
      if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    }
    return vars;
  }

  function clearTheme(doc) {
    doc.documentElement.removeAttribute("data-preset");
    doc.documentElement.removeAttribute("data-theme-style");
    const style = doc.documentElement.style;
    for (let i = style.length - 1; i >= 0; i--) {
      const prop = style[i];
      if (prop.indexOf("--") === 0) style.removeProperty(prop);
    }
  }

  PF.provide("themes", {
    FONTS: FONTS,
    THEMES: THEMES,
    ALIASES: ALIASES,
    DEFAULT: FALLBACK,
    STYLE_KEY: STYLE_KEY,
    VAR_GROUPS: VAR_GROUPS,
    canonical: canonical,
    themeById: themeById,
    resolveTheme: resolveTheme,
    applyTheme: applyTheme,
    clearTheme: clearTheme,
    fontStack: fontStack,
    fontHref: fontHref,
    onAccent: onAccent,
    luminance: luminance,
    defaultShape: shape
  });
})();
