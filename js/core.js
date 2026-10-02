/* ==========================================================================
   core.js — the shared foundation. Load this first.

   Everything hangs off one global, PF. Each module calls PF.provide(name, api)
   to register itself, so index.html and app.html can check at boot that every
   file actually arrived and name the missing one — instead of silently
   half-working, which is what happened when themes.js wasn't pushed.

   Contents
     PF.provide / PF.need   module registry + load check
     PF.dom                 el / append / clear / has — optional-safe builders
     PF.fmt                 dates, durations, {{tokens}}, **bold**, slugs
     PF.b64                 UTF-8 safe base64 both ways
     PF.util                download, same-origin check, filename from URL
   ========================================================================== */
(function () {
  "use strict";

  const PF = (window.PF = window.PF || {});
  PF.modules = PF.modules || {};
  PF.provide = PF.provide || function (name, api) { PF[name] = api; PF.modules[name] = true; };
  PF.need = function (names) { return names.filter(function (n) { return !PF.modules[n]; }); };
  PF.FILE_OF = {
    core: "js/core.js", icons: "js/icons.js", themes: "js/themes.js", skeletons: "js/skeletons.js",
    layouts: "js/layouts.js", resume: "js/resume.js", render: "js/render.js",
    site: "js/site.js", app: "js/app.js", packs: "js/packs.js",
    api: "js/api.js", auth: "js/auth.js", billing: "js/billing.js", ats: "js/ats.js", publish: "js/publish.js",
    looks: "js/looks.js", insights: "js/insights.js", wizard: "js/wizard.js", ai: "js/ai.js", analytics: "js/analytics.js", preview: "js/preview.js"
  };

  /* ====================================================================
     DOM — the optional-safe builder used everywhere.
     `has(x) && el(...)` is the standard pattern: a false/null child is
     dropped, so a missing field renders nothing rather than "undefined".
     ==================================================================== */
  function has(v) {
    if (v == null || v === false) return false;
    if (Array.isArray(v)) return v.filter(has).length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return String(v).trim() !== "";
  }

  function append(node, children) {
    children.forEach(function add(child) {
      if (child == null || child === false || child === "" || child === true) return;
      if (Array.isArray(child)) return child.forEach(add);
      node.appendChild(child.nodeType ? child : node.ownerDocument.createTextNode(String(child)));
    });
  }

  function el(tag, attrs) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        const v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    append(node, Array.prototype.slice.call(arguments, 2));
    return node;
  }

  const clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); };
  const arr = function (v) { return Array.isArray(v) ? v.filter(Boolean) : []; };

  PF.provide("dom", { el: el, append: append, clear: clear, has: has, arr: arr });

  /* ====================================================================
     FORMATTING
     ==================================================================== */
  const MONTHS = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  let TOTAL_MONTHS = 0, TOTAL_YEARS = "";

  function parseYM(value) {
    if (!has(value)) return null;
    const m = String(value).trim().match(/^(\d{4})(?:-(\d{1,2}))?/);
    if (!m) return null;
    return { y: +m[1], m: m[2] ? Math.min(12, Math.max(1, +m[2])) : null };
  }

  const ymIndex = function (d) { return d.y * 12 + ((d.m || 1) - 1); };

  function fmtYM(value, short) {
    const d = parseYM(value);
    if (!d) return has(value) ? String(value).trim() : "";   // pass odd formats through untouched
    return d.m ? (short ? SHORT : MONTHS)[d.m - 1] + " " + d.y : String(d.y);
  }

  /* A missing/null end means "Present". */
  function fmtRange(start, end, short) {
    const s = fmtYM(start, short);
    const e = has(end) ? fmtYM(end, short) : "Present";
    if (!s) return has(end) ? e : "";
    return s + " – " + e;
  }

  /* Inclusive month count, the way a CV counts it (May–Sep = 5 mo). */
  function monthsBetween(start, end) {
    const s = parseYM(start);
    if (!s) return 0;
    const now = new Date();
    const e = has(end) ? parseYM(end) : { y: now.getFullYear(), m: now.getMonth() + 1 };
    if (!e) return 0;
    return Math.max(0, ymIndex(e) - ymIndex(s)) + 1;
  }

  function fmtDuration(months) {
    if (!months) return "";
    const y = Math.floor(months / 12), m = months % 12, out = [];
    if (y) out.push(y + " yr");
    if (m) out.push(m + " mo");
    return out.join(" ");
  }

  /* ── THE HEADLINE NUMBER ────────────────────────────────────────────────
     Months are counted inclusively, the way LinkedIn counts them: Jun 2022
     → Sep 2026 reads as 52 months, not 51. Divide that by 12 and you get
     4.333…, and how you'd like that written is taste rather than arithmetic
     — so it's a choice here instead of a hardcoded Math call.

     Worked example at 52 months:
       half   4.5   nearest half — how people actually say it, can round up
       exact  4.3   one decimal, always rounded down — never overstates
       down   4     whole years, rounded down
       near   4     nearest whole year
     ───────────────────────────────────────────────────────────────────── */
  const ROUNDINGS = [
    { id: "half",  name: "Nearest half year", example: "4.5",
      blurb: "How people say it out loud. Can round up by a month or two.",
      fn: function (m) { return Math.round(m / 6) / 2; } },
    { id: "exact", name: "One decimal, rounded down", example: "4.3",
      blurb: "Never claims a month you haven't worked.",
      fn: function (m) { return Math.floor((m / 12) * 10) / 10; } },
    { id: "down",  name: "Whole years, rounded down", example: "4",
      blurb: "The conservative read — pairs well with a “+” after it.",
      fn: function (m) { return Math.floor(m / 12); } },
    { id: "near",  name: "Nearest whole year", example: "4",
      blurb: "No decimal point anywhere.",
      fn: function (m) { return Math.round(m / 12); } }
  ];

  const R_INDEX = {};
  ROUNDINGS.forEach(function (r) { R_INDEX[r.id] = r; });

  /* String, not a number: it goes straight into copy. 4.0 prints as "4". */
  function roundYears(months, id) {
    if (!months || months < 0) return "";
    const v = (R_INDEX[id] || ROUNDINGS[0]).fn(months);
    return v > 0 ? String(v) : "";
  }

  /* Total experience from the earliest start date, so it never goes stale.
     profile.experienceYears overrides the computed figure verbatim — set it
     when the number has to match a CV exactly ("4.5", "~4.5"), and accept
     that it then stops updating itself. Blank means "keep computing it".
     profile.yearsRounding picks a ROUNDINGS entry; default nearest-half. */
  function useTotals(experience, profile) {
    const p = profile || {};
    const starts = arr(experience).map(function (j) { return parseYM(j.startDate); }).filter(Boolean);
    const earliest = starts.length
      ? starts.reduce(function (a, b) { return ymIndex(a) <= ymIndex(b) ? a : b; })
      : null;

    TOTAL_MONTHS = earliest
      ? monthsBetween(earliest.m ? earliest.y + "-" + earliest.m : String(earliest.y), null)
      : 0;
    TOTAL_YEARS = has(p.experienceYears)
      ? String(p.experienceYears).trim()
      : roundYears(TOTAL_MONTHS, p.yearsRounding);

    return { months: TOTAL_MONTHS, years: TOTAL_YEARS, since: earliest };
  }

  /* Plain-English account of where the number came from — the builder shows
     this under the field so it's never a mystery. */
  function explainTotals(experience, profile) {
    const p = profile || {};
    const t = useTotals(experience, p);
    if (!t.months && !has(p.experienceYears)) return "No start dates yet, so there's nothing to count.";
    const from = t.since ? fmtYM(t.since.m ? t.since.y + "-" + t.since.m : String(t.since.y)) : "";
    const counted = t.months ? fmtDuration(t.months) + (from ? " since " + from : "") : "";
    if (has(p.experienceYears)) {
      return "Overridden: renders as “" + t.years + "”" + (counted ? " · computed would be " + counted : "") + ".";
    }
    const r = R_INDEX[p.yearsRounding] || ROUNDINGS[0];
    return counted + " → " + r.name.toLowerCase() + " → renders as “" + t.years + "”.";
  }

  const totals = function () { return { months: TOTAL_MONTHS, years: TOTAL_YEARS }; };

  function tokens(str) {
    return String(str)
      .replace(/\{\{\s*years\s*\}\}/g, TOTAL_YEARS)
      .replace(/\{\{\s*months\s*\}\}/g, String(TOTAL_MONTHS));
  }

  /* **bold** → <strong>, as real nodes. No innerHTML anywhere in this app. */
  function rich(str, doc) {
    if (!has(str)) return [];
    const d = doc || document;
    return tokens(str).split(/\*\*([^*]+)\*\*/g).map(function (part, i) {
      if (!part) return null;
      if (i % 2 === 0) return d.createTextNode(part);
      const strong = d.createElement("strong");
      strong.textContent = part;
      return strong;
    });
  }

  const plain = function (str) { return has(str) ? tokens(str).replace(/\*\*/g, "") : ""; };

  const slug = function (s) {
    return String(s || "").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
  };

  /* Sort a copy, newest first; undated entries fall to the end, in order. */
  function byStartDesc(list, key) {
    return arr(list).slice().sort(function (a, b) {
      const A = parseYM(a[key]), B = parseYM(b[key]);
      if (!A && !B) return 0;
      if (!A) return 1;
      if (!B) return -1;
      return ymIndex(B) - ymIndex(A);
    });
  }

  PF.provide("fmt", {
    MONTHS: MONTHS, SHORT: SHORT,
    parseYM: parseYM, ymIndex: ymIndex, fmtYM: fmtYM, fmtRange: fmtRange,
    monthsBetween: monthsBetween, fmtDuration: fmtDuration,
    ROUNDINGS: ROUNDINGS, roundYears: roundYears,
    useTotals: useTotals, totals: totals, explainTotals: explainTotals,
    tokens: tokens, rich: rich, plain: plain, slug: slug, byStartDesc: byStartDesc
  });

  /* ====================================================================
     BASE64 — UTF-8 safe, chunked so large images don't blow the stack
     ==================================================================== */
  function bytesToBase64(bytes) {
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }
  const encode = function (str) { return bytesToBase64(new TextEncoder().encode(str)); };
  function decode(b64) {
    const bin = atob(String(b64).replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  PF.provide("b64", { encode: encode, decode: decode, bytes: bytesToBase64 });

  /* ====================================================================
     MISC
     ==================================================================== */
  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function sameOrigin(url) {
    try { return new URL(url, window.location.href).origin === window.location.origin; }
    catch (e) { return false; }
  }

  function fileNameFrom(url, fallback) {
    try {
      const last = new URL(url, window.location.href).pathname.split("/").filter(Boolean).pop();
      return last ? decodeURIComponent(last) : (fallback || "download");
    } catch (e) { return fallback || "download"; }
  }

  PF.provide("util", { download: download, sameOrigin: sameOrigin, fileNameFrom: fileNameFrom });

  /* ====================================================================
     MONEY

     One formatter, because there were four: layouts.js hardcoded "$" and
     never read the currency at all, billing.js keyed its symbol table on
     lowercase codes, marketing.js keyed an almost-identical table on
     UPPERCASE ones (so the same 'usd' took the symbol branch in one and the
     fallback branch in the other), and console.js pinned Intl to en-US. The
     same plan could render four ways on four screens.

     It takes a CURRENCY ROW, not a code: the symbol, the number of decimal
     places and which side the symbol goes on are data from the currencies
     table, served alongside the prices. That is what makes ¥900 render as
     ¥900 rather than ¥9.00 — "/100" is not a currency-agnostic conversion,
     it is an assumption about the dollar. Identical logic lives in
     service/src/lib/pricing.js's formatWith for receipt emails.

     currencies is the map from the API payload: { usd: {symbol, minor_units,
     symbol_position}, ... }. Unknown code, or no map yet: fall back to a
     plain two-decimal number with the code after it — visibly unstyled
     rather than confidently wrong.

     `compact` drops a fractional part that is all zeros, so a headline plan
     price reads "$9" and not "$9.00". That is a presentation choice about
     ONE place — the big number on a pricing card — and it is a parameter
     rather than a second function because the alternative is what this
     module replaced: two implementations that also disagreed about the
     symbol. Amounts that are charged, receipted or reconciled (payment
     history, receipt emails, the console) always pass it as false, because
     "$9" on an invoice next to "$9.00" on a statement is a support ticket.
     ==================================================================== */
  /* Spelled out rather than typed: an invisible U+00A0 in a string literal is
     a trap, and the same constant has to exist in js/console.js and
     service/src/lib/pricing.js for the three copies to agree. */
  const NBSP = "\u00a0";

  function moneyFrom(currencies, amountMinor, code, compact) {
    if (amountMinor === null || amountMinor === undefined || amountMinor === "") return "—";
    const n = Number(amountMinor);
    if (!isFinite(n)) return "—";
    const cur = currencies && code ? currencies[String(code).toLowerCase()] : null;
    const units = cur ? Number(cur.minor_units) : 2;
    const frac = compact && units > 0 && n % Math.pow(10, units) === 0 ? 0 : units;
    const body = (n / Math.pow(10, units)).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac });
    if (!cur) return body + (code ? " " + String(code).toUpperCase() : "");
    return cur.symbol_position === "after" ? body + NBSP + cur.symbol : cur.symbol + body;
  }

  /* Curried for the common case: a page holds one currency map and formats
     many amounts against it. PF.money(payload.currencies) → fn(minor, code) */
  function money(currencies) {
    return function (amountMinor, code, compact) { return moneyFrom(currencies, amountMinor, code, compact); };
  }
  money.from = moneyFrom;

  PF.provide("money", money);
  PF.modules.core = true;
})();
