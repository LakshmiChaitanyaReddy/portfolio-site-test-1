/* ==========================================================================
   icons.js — every icon on the site goes through PF.icons.resolve().

   WHY THIS FILE EXISTS
   Lucide 1.x deleted its brand icons (github, linkedin, twitter, slack are
   gone; mail, globe, phone remain). Pointing a CDN at @latest meant that
   removal silently blanked the social links. So brand marks are now shipped
   inline here, and the Lucide CDN is pinned to an exact version.

   FIVE WAYS TO SPECIFY AN ICON — resolve() sniffs which one you meant:
     "github"                 a bundled brand mark (inline SVG, offline)
     "mail"                   a Lucide icon (pinned version, via CDN)
     "assets/acme.svg"        an uploaded or repo-relative image
     "https://x.test/l.png"   a remote image
     "<svg …>…</svg>"         raw inline SVG, sanitised before use
     "monogram:SN"            a lettered square, for brands with no mark

   Anything unrecognised renders nothing at all — never a broken glyph.
   ========================================================================== */
(function () {
  "use strict";
  const PF = (window.PF = window.PF || {});
  PF.modules = PF.modules || {};
  PF.provide = PF.provide || function (n, api) { PF[n] = api; PF.modules[n] = true; };

  const SVG_NS = "http://www.w3.org/2000/svg";

  /* Pin the CDN. @latest is a live dependency on someone else's release
     decisions — that is how the brand icons vanished in the first place.
     1.44.0 verified to contain every generic name used here (sun, moon,
     mail, phone, globe, shield-check, printer, map-pin, badge-check,
     file-down, download, external-link, link, refresh-cw, menu,
     layout-grid, workflow, code-2, wrench). Brands come from BRANDS below,
     so a future Lucide release can't blank the social links again. */
  const LUCIDE_VERSION = "1.44.0";
  const LUCIDE_URL = "https://unpkg.com/lucide@" + LUCIDE_VERSION + "/dist/umd/lucide.min.js";

  /* ====================================================================
     BUNDLED BRAND MARKS
     Only marks whose geometry is exact are shipped as paths. Everything
     else is either drawn from primitives or falls back to a monogram —
     a deliberate lettered square beats a mangled logo.
     `d` paths are 24×24, filled. `shapes` are primitive element specs.
     ==================================================================== */
  const BRANDS = {
    github: {
      label: "GitHub",
      d: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 " +
         "0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7" +
         "c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998" +
         ".108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22" +
         "-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405" +
         "2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92" +
         ".42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297" +
         "c0-6.627-5.373-12-12-12"
    },
    linkedin: {
      label: "LinkedIn",
      d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9" +
         "h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433" +
         "c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065z" +
         "m1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451" +
         "C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
    },

    /* Drawn from primitives — simple shapes that can't come out wrong. */
    instagram: {
      label: "Instagram",
      shapes: [
        { t: "rect", x: 2.2, y: 2.2, width: 19.6, height: 19.6, rx: 5.4, fill: "none", stroke: true, sw: 2 },
        { t: "circle", cx: 12, cy: 12, r: 4.6, fill: "none", stroke: true, sw: 2 },
        { t: "circle", cx: 17.6, cy: 6.4, r: 1.3 }
      ]
    },
    youtube: {
      label: "YouTube",
      shapes: [
        { t: "rect", x: 1.5, y: 5, width: 21, height: 14, rx: 4.2, fill: "none", stroke: true, sw: 2 },
        { t: "path", d: "M10.2 8.9v6.2l5.3-3.1z" }
      ]
    },
    medium: {
      label: "Medium",
      shapes: [
        { t: "ellipse", cx: 6.2, cy: 12, rx: 5.9, ry: 5.6 },
        { t: "ellipse", cx: 16.4, cy: 12, rx: 3, ry: 5.3 },
        { t: "ellipse", cx: 22, cy: 12, rx: 1.4, ry: 4.7 }
      ]
    },
    slack: {
      label: "Slack",
      shapes: [
        { t: "rect", x: 10.1, y: 1.6, width: 3.8, height: 10.5, rx: 1.9 },
        { t: "rect", x: 10.1, y: 11.9, width: 10.5, height: 3.8, rx: 1.9 },
        { t: "rect", x: 3.4, y: 8.3, width: 10.5, height: 3.8, rx: 1.9 },
        { t: "rect", x: 10.1, y: 8.3, width: 3.8, height: 10.5, rx: 1.9, opacity: 0 }
      ]
    },
    x: {
      label: "X",
      shapes: [
        { t: "path", d: "M3 3l18 18M21 3L3 21", fill: "none", stroke: true, sw: 2.6, cap: "round" }
      ]
    },
    mail: {
      label: "Email",
      shapes: [
        { t: "rect", x: 2, y: 4.5, width: 20, height: 15, rx: 2.6, fill: "none", stroke: true, sw: 2 },
        { t: "path", d: "M2.8 6.2 12 13l9.2-6.8", fill: "none", stroke: true, sw: 2, cap: "round" }
      ]
    },

    /* Lettered squares — honest placeholders for marks not bundled. */
    stackoverflow: { label: "Stack Overflow", mono: "SO" },
    servicenow:    { label: "ServiceNow", mono: "SN" },
    gitlab:        { label: "GitLab", mono: "GL" },
    bitbucket:     { label: "Bitbucket", mono: "BB" },
    devto:         { label: "DEV", mono: "DEV" },
    hashnode:      { label: "Hashnode", mono: "HN" },
    substack:      { label: "Substack", mono: "SS" },
    mastodon:      { label: "Mastodon", mono: "MA" },
    bluesky:       { label: "Bluesky", mono: "BS" },
    dribbble:      { label: "Dribbble", mono: "DR" },
    behance:       { label: "Behance", mono: "BE" },
    figma:         { label: "Figma", mono: "FG" },
    notion:        { label: "Notion", mono: "N" },
    npm:           { label: "npm", mono: "NPM" },
    docker:        { label: "Docker", mono: "DK" },
    scholar:       { label: "Google Scholar", mono: "GS" },
    orcid:         { label: "ORCID", mono: "iD" },
    discord:       { label: "Discord", mono: "DC" },
    telegram:      { label: "Telegram", mono: "TG" },
    whatsapp:      { label: "WhatsApp", mono: "WA" },
    reddit:        { label: "Reddit", mono: "RD" },
    twitch:        { label: "Twitch", mono: "TW" },
    youtubemusic:  { label: "YouTube Music", mono: "YM" },
    kaggle:        { label: "Kaggle", mono: "KG" }
  };

  const ALIASES = {
    twitter: "x", gh: "github", "in": "linkedin", li: "linkedin",
    ig: "instagram", yt: "youtube", so: "stackoverflow", snow: "servicenow",
    email: "mail", "dev.to": "devto", "google-scholar": "scholar"
  };

  /* ====================================================================
     ICON ANIMATIONS — CSS does the work; this only picks a class.
     `none` is the default; everything respects prefers-reduced-motion.
     ==================================================================== */
  const ANIMATIONS = [
    { id: "none",  name: "None",        blurb: "Static." },
    { id: "lift",  name: "Lift",        blurb: "Rises slightly on hover." },
    { id: "pop",   name: "Pop",         blurb: "Scales up briefly on hover." },
    { id: "spin",  name: "Spin",        blurb: "One rotation on hover." },
    { id: "swing", name: "Swing",       blurb: "Tips side to side on hover." },
    { id: "glow",  name: "Glow",        blurb: "Accent halo on hover." },
    { id: "draw",  name: "Draw in",     blurb: "Strokes draw themselves once on load." },
    { id: "float", name: "Float",       blurb: "Slow continuous bob." }
  ];

  /* ====================================================================
     BUILDERS
     ==================================================================== */
  function svgRoot(doc, viewBox) {
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", viewBox || "0 0 24 24");
    svg.setAttribute("class", "icon icon-brand");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    return svg;
  }

  function primitive(doc, spec) {
    const node = doc.createElementNS(SVG_NS, spec.t);
    Object.keys(spec).forEach(function (k) {
      if (k === "t" || k === "fill" || k === "stroke" || k === "sw" || k === "cap") return;
      node.setAttribute(k, String(spec[k]));
    });
    node.setAttribute("fill", spec.fill === "none" ? "none" : "currentColor");
    if (spec.stroke) {
      node.setAttribute("stroke", "currentColor");
      node.setAttribute("stroke-width", String(spec.sw || 2));
      if (spec.cap) { node.setAttribute("stroke-linecap", spec.cap); node.setAttribute("stroke-linejoin", spec.cap); }
    }
    return node;
  }

  function brandNode(doc, brand) {
    const svg = svgRoot(doc, brand.viewBox);
    if (brand.d) {
      const p = doc.createElementNS(SVG_NS, "path");
      p.setAttribute("d", brand.d);
      p.setAttribute("fill", "currentColor");
      svg.appendChild(p);
      return svg;
    }
    if (brand.shapes) {
      brand.shapes.forEach(function (s) {
        if (s.opacity === 0) return;              // spacer shapes in the spec
        svg.appendChild(primitive(doc, s));
      });
      return svg;
    }
    if (brand.mono) return monogramNode(doc, brand.mono);
    return null;
  }

  function monogramNode(doc, letters) {
    const text = String(letters || "?").slice(0, 3).toUpperCase();
    const svg = svgRoot(doc, "0 0 24 24");
    svg.setAttribute("class", "icon icon-mono");
    const rect = doc.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", "1.6"); rect.setAttribute("y", "1.6");
    rect.setAttribute("width", "20.8"); rect.setAttribute("height", "20.8");
    rect.setAttribute("rx", "5");
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", "currentColor");
    rect.setAttribute("stroke-width", "1.7");
    svg.appendChild(rect);
    const label = doc.createElementNS(SVG_NS, "text");
    label.setAttribute("x", "12");
    label.setAttribute("y", "12");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "central");
    label.setAttribute("font-size", text.length >= 3 ? "7.4" : (text.length === 2 ? "9.4" : "12"));
    label.setAttribute("font-weight", "700");
    label.setAttribute("fill", "currentColor");
    label.setAttribute("font-family", "inherit");
    label.textContent = text;
    svg.appendChild(label);
    return svg;
  }

  /* Raw SVG from data.json is the site owner's own content, but parse and
     strip anyway: no <script>, no <foreignObject>, no on* handlers, no
     javascript: URLs. Cheap, and means a pasted snippet can't run. */
  const BANNED_TAGS = { script: 1, foreignobject: 1, iframe: 1, object: 1, embed: 1, use: 1, animate: 1, set: 1 };
  function sanitiseSvg(markup, doc) {
    let parsed;
    try { parsed = new DOMParser().parseFromString(String(markup), "image/svg+xml"); }
    catch (e) { return null; }
    const root = parsed && parsed.documentElement;
    if (!root || root.nodeName.toLowerCase() !== "svg" || parsed.querySelector("parsererror")) return null;

    (function walk(node) {
      const kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (child) {
        if (child.nodeType !== 1) return;
        if (BANNED_TAGS[child.nodeName.toLowerCase()]) { node.removeChild(child); return; }
        Array.prototype.slice.call(child.attributes || []).forEach(function (a) {
          const n = a.name.toLowerCase();
          const v = String(a.value || "").replace(/\s/g, "").toLowerCase();
          if (n.indexOf("on") === 0 || v.indexOf("javascript:") === 0) child.removeAttribute(a.name);
        });
        walk(child);
      });
    })(root);

    Array.prototype.slice.call(root.attributes).forEach(function (a) {
      if (a.name.toLowerCase().indexOf("on") === 0) root.removeAttribute(a.name);
    });
    root.setAttribute("class", "icon icon-brand");
    root.setAttribute("aria-hidden", "true");
    root.setAttribute("focusable", "false");
    if (!root.getAttribute("viewBox")) root.setAttribute("viewBox", "0 0 24 24");
    root.removeAttribute("width");
    root.removeAttribute("height");
    return (doc || document).importNode(root, true);
  }

  const IMG_RE = /\.(svg|png|jpe?g|webp|gif|avif|ico)(\?|#|$)/i;
  const URL_RE = /^(https?:)?\/\//i;

  function imageNode(doc, src, alt) {
    const img = doc.createElement("img");
    img.setAttribute("src", src);
    img.setAttribute("alt", alt || "");
    img.setAttribute("class", "icon icon-img");
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    return img;
  }

  function lucideNode(doc, name) {
    const i = doc.createElement("i");
    i.setAttribute("class", "icon");
    i.setAttribute("data-lucide", name);
    i.setAttribute("aria-hidden", "true");
    return i;
  }

  /* ====================================================================
     resolve(spec, opts) → a DOM node, or null
     opts: { doc, anim, label, className }
     ==================================================================== */
  function resolve(spec, opts) {
    opts = opts || {};
    const doc = opts.doc || document;
    if (spec == null) return null;

    let node = null;
    let raw = spec;

    /* Object form: { src, alt } or { svg } or { name } */
    if (typeof spec === "object") {
      if (spec.svg) node = sanitiseSvg(spec.svg, doc);
      else if (spec.src) node = imageNode(doc, spec.src, spec.alt);
      else if (spec.name) raw = spec.name;
      else return null;
      if (node) return decorate(node, opts);
      if (typeof raw !== "string") return null;
    }

    const value = String(raw).trim();
    if (!value) return null;

    if (value.slice(0, 4).toLowerCase() === "<svg") node = sanitiseSvg(value, doc);
    else if (value.slice(0, 9).toLowerCase() === "monogram:") node = monogramNode(doc, value.slice(9));
    else if (URL_RE.test(value) || IMG_RE.test(value) || value.indexOf("data:image") === 0) {
      node = imageNode(doc, value, opts.label || "");
    } else {
      const key = value.toLowerCase().replace(/[\s_]+/g, "");
      const brand = BRANDS[ALIASES[key] || key];
      node = brand ? brandNode(doc, brand) : lucideNode(doc, value);
    }

    return node ? decorate(node, opts) : null;
  }

  function decorate(node, opts) {
    const cls = [node.getAttribute("class") || ""];
    if (opts.className) cls.push(opts.className);
    if (opts.anim && opts.anim !== "none") cls.push("ia-" + opts.anim);
    node.setAttribute("class", cls.join(" ").trim());
    return node;
  }

  /* Best-guess icon for a link whose icon field is empty. */
  function guess(label, url) {
    const hay = (String(label || "") + " " + String(url || "")).toLowerCase();
    const keys = Object.keys(BRANDS).concat(Object.keys(ALIASES));
    for (let i = 0; i < keys.length; i++) {
      if (hay.indexOf(keys[i]) !== -1) return ALIASES[keys[i]] || keys[i];
    }
    if (/^mailto:/.test(String(url))) return "mail";
    if (/^tel:/.test(String(url))) return "phone";
    return "link";
  }

  /* Called after a render pass so Lucide can swap its <i> placeholders. */
  function paint() {
    if (window.lucide && window.lucide.createIcons) {
      try { window.lucide.createIcons(); } catch (e) { /* CDN half-loaded; ignore */ }
    }
  }

  /* Load the pinned Lucide build. Kept here rather than as a <script> tag in
     the HTML so the version lives in exactly one place. Brand marks don't
     depend on it, so a blocked CDN costs generic glyphs and nothing else. */
  let installed = false;
  function install() {
    if (installed || window.lucide) { paint(); return; }
    installed = true;
    const s = document.createElement("script");
    s.src = LUCIDE_URL;
    s.async = true;
    s.onload = paint;
    s.onerror = function () {
      if (window.console && console.warn) {
        console.warn("[portfolio] Lucide (" + LUCIDE_URL + ") didn't load. Brand marks still work; " +
                     "generic glyphs will be missing.");
      }
    };
    document.head.appendChild(s);
  }

  PF.provide("icons", {
    LUCIDE_VERSION: LUCIDE_VERSION,
    LUCIDE_URL: LUCIDE_URL,
    BRANDS: BRANDS,
    ALIASES: ALIASES,
    ANIMATIONS: ANIMATIONS,
    brandNames: function () { return Object.keys(BRANDS).sort(); },
    resolve: resolve,
    guess: guess,
    monogram: monogramNode,
    sanitiseSvg: sanitiseSvg,
    paint: paint,
    install: install
  });
})();
