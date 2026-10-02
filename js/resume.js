/* ==========================================================================
   resume.js — builds a real resume document from data.json, and exports it.

   Owns three registries:
     TEMPLATES   ten print layouts (five featured)
     EXPORTS     eight output formats
     css()       the resume stylesheet, as a string

   css() is a string rather than a block in index.html because the Word, HTML
   and PNG exporters all have to embed the same styles. One source of truth.

   ── WHY THE OLD LAYOUT LEFT BIG BLANK GAPS ─────────────────────────────
   The previous version set `break-inside: avoid` on the whole job entry.
   A job with seven bullets is taller than the space left at the foot of a
   page, and an unbreakable block that doesn't fit gets pushed wholesale to
   the next page — leaving exactly the half-empty pages that showed up.

   The rule now: only the entry HEADER is unbreakable (so a role, employer
   and date never split), with `break-after: avoid` so at least one bullet
   follows it. Bullet lists flow and split freely. Nothing tall is
   unbreakable, so nothing can be pushed.
   ========================================================================== */
(function () {
  "use strict";
  const PF = (window.PF = window.PF || {});
  PF.modules = PF.modules || {};
  PF.provide = PF.provide || function (n, api) { PF[n] = api; PF.modules[n] = true; };

  const D = PF.dom, F = PF.fmt;
  const el = D.el, has = D.has, arr = D.arr, append = D.append;

  /* ====================================================================
     TEMPLATES
     `railFirst` puts the side column ahead of the main column in the DOM,
     which is what lets the sidebar layout use a plain float.
     ==================================================================== */
  /* The first five are the featured choices in the builder; the rest stay
     available for existing sites. */
  const TEMPLATES = [
    { id: "ats", name: "ATS-clean", railFirst: false, featured: true,
      blurb: "Single column, standard section names, no colour, no columns, no glyphs. Built to be parsed by applicant tracking systems, not admired.",
      sketch: ["NAME", "email | phone | city", "", "PROFESSIONAL EXPERIENCE", "Company — Role", "05/2026 - Present", "- bullet", "", "SKILLS", "Category: a, b, c"] },
    { id: "modern", name: "Modern", railFirst: false, featured: true,
      blurb: "Accent rule under the name, tighter leading, skills set in two columns.",
      sketch: ["███████████  name", "━━━━━━━━━━━━━━━━━━", "EXPERIENCE", "role         date", "  • bullet", "SKILLS  a,b │ c,d"] },
    { id: "executive", name: "Executive", railFirst: false, featured: true,
      blurb: "Serif name, leadership summary in a panel, scope and outcomes per role. Understated and senior.",
      sketch: ["      NAME", "   title · contact", "│ summary of leadership", "EXPERIENCE", "COMPANY        date", "Role", "  – outcome"] },
    { id: "technical", name: "Technical", railFirst: false, featured: true, skillsFirst: true,
      blurb: "Skills first, monospace headings and the stack on every role. For engineers and data people.",
      sketch: ["name // title", "> skills: go, sql, k8s", "## experience", "role @ company  date", "  - bullet", "  [go] [kafka]"] },
    { id: "academic", name: "Academic", railFirst: false, featured: true,
      blurb: "Serif, dense, full width. Long lists of publications, talks and courses.",
      sketch: ["      Name", "  dept · email", "", "EDUCATION", "Degree, School  2022", "PUBLICATIONS", "1. Title. Venue."] },
    { id: "compact", name: "Compact", railFirst: false,
      blurb: "One column, dense. The most content per page — good for a long history.",
      sketch: ["███████████  name", "──────────────────", "EXPERIENCE", "role ────────  date", "  • bullet", "  • bullet", "PROJECTS"] },
    { id: "sidebar", name: "Sidebar", railFirst: true,
      blurb: "Two columns. Contact, skills, certifications and education in a left rail.",
      sketch: ["████████  name", "┌────┬───────────┐", "│skil│EXPERIENCE │", "│cert│role  date │", "│edu │  • bullet │", "└────┴───────────┘"] },
    { id: "classic", name: "Classic", railFirst: false,
      blurb: "Centred header, serif headings, roomy leading. The conventional choice.",
      sketch: ["      NAME", "  title · contact", "══════════════════", "    EXPERIENCE", "role ────────  date", "  • bullet"] },
    { id: "timeline", name: "Timeline", railFirst: false,
      blurb: "Dates in a left gutter with a rule down the page. Reads as a career arc.",
      sketch: ["███████████  name", "2026 │ role", "     │  • bullet", "2022 │ role", "     │  • bullet"] },
    { id: "minimal", name: "Minimal", railFirst: false,
      blurb: "No rules, no colour, no tag lists. Text and whitespace only.",
      sketch: ["name", "title · contact", "", "EXPERIENCE", "role, company  date", "  bullet"] }
  ];

  const T_INDEX = {};
  TEMPLATES.forEach(function (t) { T_INDEX[t.id] = t; });
  const templateById = function (id) { return T_INDEX[id] || T_INDEX.compact; };
  /* Layouts that only make sense on a web page stay off the resume by default. */
  const VISUAL_LAYOUTS = ["gallery", "stats", "quotes", "testimonials", "logo_wall", "cta_band", "hero", "feature_grid", "reviews", "pricing_table", "faq", "ats_widget", "template_gallery", "steps", "comparison"];

  /* ====================================================================
     THE STYLESHEET
     ==================================================================== */
  function css() {
    return [
"/* resume.js — resume/print styles. Shared by print, Word, HTML and PNG. */",
".resume {",
"  --r-ink: #111; --r-mid: #333; --r-dim: #666; --r-line: #c9c9c9;",
"  --r-accent: var(--accent, #0f8a6a);",
"  background: #fff; color: var(--r-ink);",
"  font-family: var(--font-body, system-ui, sans-serif);",
"  font-size: 10pt; line-height: 1.45; orphans: 2; widows: 2;",
"}",
".resume * { box-sizing: border-box; }",
".resume h1, .resume h2, .resume h3 { color: var(--r-ink); margin: 0; letter-spacing: -0.01em; }",
".resume p, .resume ul { margin: 0; padding: 0; }",
".resume ul { list-style: none; }",
".resume a { color: inherit; text-decoration: none; }",
".resume::after { content: ''; display: table; clear: both; }",

"/* header */",
".r-head { margin-bottom: 5mm; }",
".r-head::after { content: ''; display: table; clear: both; }",
".r-photo { float: right; width: 19mm; height: 19mm; object-fit: cover; border-radius: 50%; margin: 0 0 2mm 4mm; }",
".r-name { font-size: 21pt; line-height: 1.08; margin-bottom: 1mm; }",
".r-title { font-size: 11pt; font-weight: 600; color: var(--r-accent); margin-bottom: 2mm; }",
".r-contact { font-size: 8.6pt; color: var(--r-mid); }",
".r-contact span + span::before { content: ' · '; color: var(--r-dim); }",
".r-summary { font-size: 9.4pt; color: var(--r-mid); margin-top: 3mm; max-width: 62em; }",

"/* sections */",
".r-sec { margin-top: 6mm; }",
".r-sec:first-child { margin-top: 0; }",
".r-sec > h2 {",
"  font-size: 9pt; text-transform: uppercase; letter-spacing: .12em;",
"  margin-bottom: 2.5mm; padding-bottom: 1mm;",
"  border-bottom: .6pt solid var(--r-line);",
"  break-after: avoid; page-break-after: avoid;",
"}",

"/* entries — only the HEAD is unbreakable, so tall jobs split instead of",
"   being pushed to the next page and leaving the previous one half empty. */",
".r-entry { margin-bottom: 3.6mm; }",
".r-entry:last-child { margin-bottom: 0; }",
".r-entry-head { break-inside: avoid; page-break-inside: avoid; break-after: avoid; page-break-after: avoid; }",
".r-entry-head::after { content: ''; display: table; clear: both; }",
".r-when { float: right; font-size: 8.4pt; color: var(--r-dim); font-variant-numeric: tabular-nums; margin-left: 4mm; }",
".r-role { font-size: 10.2pt; }",
".r-org { font-size: 9pt; color: var(--r-accent); font-weight: 600; margin-top: .4mm; }",
".r-org .r-loc { color: var(--r-dim); font-weight: 400; }",
".r-note { font-size: 9.2pt; color: var(--r-mid); margin-top: 1mm; }",
".r-bullets { margin-top: 1.2mm; }",
".r-bullets li { position: relative; padding-left: 3.6mm; font-size: 9.2pt; color: var(--r-mid); margin-bottom: .9mm; }",
".r-bullets li::before { content: '\\2022'; position: absolute; left: 0; color: var(--r-accent); }",
".r-bullets strong { color: var(--r-ink); }",
".r-tags { font-size: 8.2pt; color: var(--r-dim); margin-top: 1mm; font-family: var(--font-mono, monospace); }",
".r-kv { font-size: 9.2pt; color: var(--r-mid); margin-bottom: 1.6mm; break-inside: avoid; page-break-inside: avoid; }",
".r-kv:last-child { margin-bottom: 0; }",
".r-kv strong { color: var(--r-ink); }",

"/* sidebar — a float, not a grid: grids do not fragment across pages */",
".r-sidebar .r-rail { float: left; width: 31%; padding-right: 6mm; border-right: .6pt solid var(--r-line); }",
".r-sidebar .r-main { margin-left: 35%; }",

"/* classic */",
".r-classic .r-head { text-align: center; border-bottom: 1.2pt solid var(--r-ink); padding-bottom: 4mm; }",
".r-classic .r-summary { margin-left: auto; margin-right: auto; text-align: center; }",
".r-classic .r-name, .r-classic .r-sec > h2, .r-classic .r-role { font-family: var(--font-display, Georgia, serif); }",
".r-classic .r-sec > h2 { text-align: center; border-bottom: 0; letter-spacing: .18em; }",
".r-classic { line-height: 1.55; }",

"/* timeline — negative-margin float, which fragments cleanly */",
".r-timeline .r-entry { padding-left: 26mm; border-left: .6pt solid var(--r-line); }",
".r-timeline .r-when { float: left; width: 22mm; margin-left: -26mm; text-align: right; padding-right: 4mm; }",
".r-timeline .r-sec > h2 { border-bottom: 0; }",

"/* minimal */",
".r-minimal { --r-accent: #111; }",
".r-minimal .r-sec > h2 { border-bottom: 0; padding-bottom: 0; letter-spacing: .16em; }",
".r-minimal .r-bullets li::before { content: '\\2013'; }",
".r-minimal .r-tags { display: none; }",

"/* ats — deliberately plain: one column, no colour, no glyphs, no mono */",
".r-ats { --r-accent: #000; --r-mid: #000; --r-dim: #000; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; }",
".r-ats .r-name { font-size: 16pt; font-weight: 700; }",
".r-ats .r-title { color: #000; font-weight: 400; }",
".r-ats .r-sec > h2 { font-size: 11pt; letter-spacing: .04em; border-bottom: 1pt solid #000; font-weight: 700; }",
".r-ats .r-org, .r-ats .r-role { color: #000; font-size: 11pt; }",
".r-ats .r-bullets li { font-size: 11pt; padding-left: 5mm; }",
".r-ats .r-bullets li::before { content: '-'; }",
".r-ats .r-when { float: none; display: block; margin: 0; font-size: 10pt; }",
".r-ats .r-tags { font-family: inherit; font-size: 10pt; color: #000; }",
".r-ats .r-rail { float: none; width: auto; padding: 0; border: 0; }",
".r-ats .r-main { margin-left: 0; }",

"/* modern */",
".r-modern .r-head { border-bottom: 2.4pt solid var(--r-accent); padding-bottom: 3.5mm; }",
".r-modern { line-height: 1.4; }",
".r-modern .r-sec > h2 { color: var(--r-accent); border-bottom-color: var(--r-accent); }",
".r-modern .r-rail .r-sec .r-kv { column-count: 2; column-gap: 6mm; }",

"/* academic */",
".r-academic { font-family: var(--font-display, Georgia, serif); font-size: 10.5pt; line-height: 1.5; }",
".r-academic .r-head { text-align: center; }",
".r-academic .r-summary { text-align: left; }",
".r-academic .r-sec > h2 { letter-spacing: .1em; border-bottom-width: .4pt; }",
".r-academic .r-bullets li::before { content: '\\2022'; color: var(--r-ink); }",

"/* executive */",
".r-executive { font-size: 10.2pt; line-height: 1.5; --r-accent: #1f2a44; }",
".r-executive .r-head { text-align: center; padding-bottom: 3mm; border-bottom: 3pt double var(--r-ink); margin-bottom: 4mm; }",
".r-executive .r-name { font-family: var(--font-display, Georgia, serif); font-size: 24pt; font-weight: 400; letter-spacing: .02em; }",
".r-executive .r-title { color: var(--r-mid); font-weight: 400; letter-spacing: .12em; text-transform: uppercase; font-size: 9pt; }",
".r-executive .r-summary { text-align: left; margin: 4mm 0 0; padding: 2.5mm 4mm; border-left: 2pt solid var(--r-accent); background: #f5f6f8; color: var(--r-ink); font-size: 9.8pt; }",
".r-executive .r-sec > h2 { font-family: var(--font-display, Georgia, serif); font-variant: small-caps; text-transform: none; letter-spacing: .08em; font-size: 12pt; font-weight: 400; border-bottom: .5pt solid var(--r-ink); }",
".r-executive .r-org { text-transform: uppercase; letter-spacing: .08em; font-size: 8.6pt; color: var(--r-accent); }",
".r-executive .r-role { font-family: var(--font-display, Georgia, serif); font-size: 11pt; font-weight: 600; }",
".r-executive .r-bullets li::before { content: '\\2013'; color: var(--r-ink); }",
".r-executive .r-tags { display: none; }",

"/* technical */",
".r-technical { font-size: 9.6pt; line-height: 1.42; --r-accent: #0b6e4f; }",
".r-technical .r-name { font-family: var(--font-mono, ui-monospace, monospace); font-size: 18pt; letter-spacing: -.02em; }",
".r-technical .r-title { font-family: var(--font-mono, ui-monospace, monospace); font-size: 9.6pt; }",
".r-technical .r-title::before { content: '// '; color: var(--r-dim); }",
".r-technical .r-sec > h2 { font-family: var(--font-mono, ui-monospace, monospace); text-transform: lowercase; letter-spacing: 0; font-size: 10pt; border-bottom: .6pt dashed var(--r-line); }",
".r-technical .r-sec > h2::before { content: '## '; color: var(--r-accent); }",
".r-technical .r-tags { font-size: 7.8pt; color: var(--r-ink); margin-top: 1.2mm; }",
".r-technical .r-rail .r-kv { font-family: var(--font-mono, ui-monospace, monospace); font-size: 8.8pt; }",
".r-technical .r-bullets li::before { content: '-'; color: var(--r-accent); }",

"/* page modes — one page tightens everything; two pages breathes */",
".r-pages-1 { font-size: 9pt; line-height: 1.32; }",
".r-pages-1 .r-head { margin-bottom: 3mm; }",
".r-pages-1 .r-name { font-size: 17pt; }",
".r-pages-1 .r-sec { margin-top: 3.6mm; }",
".r-pages-1 .r-entry { margin-bottom: 2.2mm; }",
".r-pages-1 .r-bullets li { font-size: 8.6pt; margin-bottom: .4mm; }",
".r-pages-1 .r-tags { display: none; }",
".r-pages-2 { line-height: 1.52; }",
".r-pages-2 .r-sec { margin-top: 7mm; }",

"/* page-level print rules */",
"@media print {",
"  .r-entry-head { break-inside: avoid; }",
"  .r-kv { break-inside: avoid; }",
"  .resume a[href^='http']::after { content: ''; }",
"}"
    ].join("\n");
  }

  /* ====================================================================
     BUILD — data.json → a resume element
     ==================================================================== */
  function contactLine(profile) {
    return [
      has(profile.location) && profile.location,
      has(profile.email) && profile.email,
      has(profile.phone) && profile.phone
    ].filter(Boolean).concat(arr(profile.links).filter(function (l) { return has(l.url); })
      .map(function (l) { return l.label || l.url; }));
  }

  function section(title, kids) {
    const children = kids.filter(Boolean);
    if (!children.length) return null;
    return el("section", { class: "r-sec" }, el("h2", { text: title }), children);
  }

  function entry(opts) {
    return el("article", { class: "r-entry" },
      el("div", { class: "r-entry-head" },
        has(opts.when) && el("span", { class: "r-when", text: opts.when }),
        el("h3", { class: "r-role", text: opts.role || "" }),
        (has(opts.org) || has(opts.loc)) && el("p", { class: "r-org" },
          has(opts.org) && el("span", { text: opts.org }),
          has(opts.loc) && el("span", { class: "r-loc", text: (has(opts.org) ? " · " : "") + opts.loc }))),
      has(opts.note) && el("p", { class: "r-note" }, F.rich(opts.note)),
      has(opts.bullets) && el("ul", { class: "r-bullets", role: "list" },
        arr(opts.bullets).map(function (b) { return el("li", null, F.rich(b)); })),
      has(opts.tags) && el("p", { class: "r-tags", text: arr(opts.tags).join(" · ") }));
  }

  /* build(data, { template }) → element */
  function build(data, opts) {
    opts = opts || {};
    const d = data && typeof data === "object" ? data : {};
    const profile = d.profile && typeof d.profile === "object" ? d.profile : {};
    const tpl = templateById(opts.template || (d.pdf && d.pdf.template));
    const exclude = arr(opts.exclude || (d.pdf && d.pdf.exclude)).map(String);
    const skip = function (id) { return exclude.indexOf(id) !== -1; };
    const pages = String(opts.pages || (d.pdf && d.pdf.pages) || "auto");
    const includeVisual = opts.includeVisual !== undefined ? opts.includeVisual === true : !!(d.pdf && d.pdf.includeVisual);
    /* One-page mode keeps every role but only the strongest bullets of older ones. */
    const bulletCap = function (i) { return pages === "1" ? (i < 2 ? 4 : 2) : 99; };

    F.useTotals(d.experience, d.profile);

    const root = el("div", { class: "resume r-" + tpl.id + (pages === "1" || pages === "2" ? " r-pages-" + pages : "") });

    const contacts = contactLine(profile);
    root.appendChild(el("header", { class: "r-head" },
      tpl.id !== "ats" && profile.photo && has(profile.photo.src) && el("img", { class: "r-photo", src: profile.photo.src, alt: profile.photo.alt || "Profile photo" }),
      el("h1", { class: "r-name", text: profile.name || "" }),
      has(profile.title) && el("p", { class: "r-title", text: profile.title }),
      contacts.length > 0 && el("p", { class: "r-contact" },
        contacts.map(function (c) { return el("span", { text: c }); })),
      has(profile.tagline) && el("p", { class: "r-summary", text: F.plain(profile.tagline) })));

    /* main column */
    const experience = !skip("experience") && arr(d.experience).length > 0 &&
      section(tpl.id === "ats" ? "Professional Experience" : "Experience",
        F.byStartDesc(d.experience, "startDate").map(function (job, i) {
          return entry({
            when: tpl.id === "ats"
              ? atsRange(job.startDate, job.endDate)
              : F.fmtRange(job.startDate, job.endDate, true),
            role: job.role || job.company || "Role",
            org: job.company, loc: job.location,
            note: pages === "1" ? "" : job.summary, bullets: arr(job.highlights).slice(0, bulletCap(i)), tags: job.tech
          });
        }));

    const projects = !skip("projects") && arr(d.projects).length > 0 &&
      section(tpl.id === "ats" ? "Projects" : "Selected projects",
        arr(d.projects).slice().sort(function (a, b) { return (b.featured === true) - (a.featured === true); })
          .slice(0, pages === "1" ? 3 : 100)
          .map(function (p) {
            const line = [p.result, p.approach, p.blurb].filter(has)[0];
            return entry({ role: p.title || "Project", note: line, tags: p.tech });
          }));

    const custom = arr(d.sections).filter(function (s) {
      return has(s.title) && arr(s.items).length && !skip(F.slug(s.id || s.title)) &&
        (includeVisual || VISUAL_LAYOUTS.indexOf(s.layout) === -1);
    }).map(function (sec) {
      return section(sec.title, arr(sec.items).map(function (it) {
        return entry({
          when: it.meta, role: it.title || it.value || "Entry", org: it.subtitle,
          note: it.body, bullets: it.bullets, tags: it.tags
        });
      }));
    });

    /* rail column */
    const skills = !skip("skills") && arr(d.skills).length > 0 &&
      section("Skills", arr(d.skills).map(function (g) {
        return el("p", { class: "r-kv" },
          el("strong", { text: (g.category || "Skills") + ": " }), arr(g.items).join(", "));
      }));

    const certs = !skip("certifications") && arr(d.certifications).length > 0 &&
      section("Certifications", arr(d.certifications).map(function (c) {
        const tail = [c.issuer, c.year].filter(has).join(", ");
        return el("p", { class: "r-kv" },
          el("strong", { text: c.name || "" }),
          tail ? el("span", { text: " — " + tail }) : null);
      }));

    const education = !skip("education") && arr(d.education).length > 0 &&
      section("Education", F.byStartDesc(d.education, "startYear").map(function (e) {
        const bits = [F.fmtRange(e.startYear, e.endYear), e.detail].filter(has);
        return el("p", { class: "r-kv" },
          el("strong", { text: e.degree || e.institution || "" }),
          has(e.degree) && has(e.institution) ? el("span", { text: " — " + e.institution }) : null,
          bits.length ? el("span", { text: " · " + bits.join(" · ") }) : null);
      }));

    const main = el("div", { class: "r-main" }, (tpl.skillsFirst ? [skills, experience, projects] : [experience, projects]).concat(custom).filter(Boolean));
    const rail = el("div", { class: "r-rail" }, (tpl.skillsFirst ? [certs, education] : [skills, certs, education]).filter(Boolean));

    if (tpl.railFirst) { root.appendChild(rail); root.appendChild(main); }
    else { root.appendChild(main); root.appendChild(rail); }
    return root;
  }

  /* ATS parsers prefer numeric ranges to "May 2026". */
  function atsRange(start, end) {
    const fmt = function (v) {
      const p = F.parseYM(v);
      if (!p) return has(v) ? String(v) : "";
      return p.m ? String(p.m).padStart(2, "0") + "/" + p.y : String(p.y);
    };
    const s = fmt(start);
    const e = has(end) ? fmt(end) : "Present";
    return s ? s + " - " + e : (has(end) ? e : "");
  }

  /* ====================================================================
     PLAIN-TEXT / MARKDOWN / JSON SERIALISERS
     ==================================================================== */
  function toText(data) {
    const d = data || {}, p = d.profile || {}, out = [];
    F.useTotals(d.experience, d.profile);
    const rule = function (t) { out.push("", t.toUpperCase(), "".padEnd(Math.max(t.length, 8), "=")); };
    const strip = function (s) { return F.plain(s).replace(/\s+/g, " ").trim(); };

    if (has(p.name)) out.push(p.name);
    if (has(p.title)) out.push(p.title);
    out.push(contactLine(p).join(" | "));
    if (has(p.tagline)) { out.push("", strip(p.tagline)); }

    if (arr(d.experience).length) {
      rule("Professional Experience");
      F.byStartDesc(d.experience, "startDate").forEach(function (j) {
        out.push("", [j.role, j.company].filter(has).join(" — "));
        out.push([atsRange(j.startDate, j.endDate), j.location].filter(has).join(" | "));
        if (has(j.summary)) out.push(strip(j.summary));
        arr(j.highlights).forEach(function (h) { out.push("- " + strip(h)); });
        if (has(j.tech)) out.push("Technologies: " + arr(j.tech).join(", "));
      });
    }
    if (arr(d.projects).length) {
      rule("Projects");
      arr(d.projects).forEach(function (pr) {
        out.push("", pr.title || "Project");
        [pr.problem, pr.approach, pr.result].filter(has).forEach(function (x) { out.push("- " + strip(x)); });
        if (has(pr.tech)) out.push("Technologies: " + arr(pr.tech).join(", "));
      });
    }
    if (arr(d.skills).length) {
      rule("Skills");
      arr(d.skills).forEach(function (g) { out.push((g.category || "Skills") + ": " + arr(g.items).join(", ")); });
    }
    if (arr(d.certifications).length) {
      rule("Certifications");
      arr(d.certifications).forEach(function (c) {
        out.push([c.name, [c.issuer, c.year].filter(has).join(", ")].filter(has).join(" — "));
      });
    }
    if (arr(d.education).length) {
      rule("Education");
      F.byStartDesc(d.education, "startYear").forEach(function (e) {
        out.push([e.degree, e.institution].filter(has).join(" — "));
        out.push([F.fmtRange(e.startYear, e.endYear), e.detail].filter(has).join(" | "));
      });
    }
    arr(d.sections).forEach(function (sec) {
      if (!has(sec.title) || !arr(sec.items).length) return;
      rule(sec.title);
      arr(sec.items).forEach(function (it) {
        out.push("", [it.title || it.value, it.meta].filter(has).join(" — "));
        if (has(it.subtitle)) out.push(it.subtitle);
        if (has(it.body)) out.push(strip(it.body));
        arr(it.bullets).forEach(function (b) { out.push("- " + strip(b)); });
      });
    });
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function toMarkdown(data) {
    const d = data || {}, p = d.profile || {}, out = [];
    F.useTotals(d.experience, d.profile);
    const strip = function (s) { return F.tokens(s).replace(/\s+/g, " ").trim(); };

    if (has(p.name)) out.push("# " + p.name);
    if (has(p.title)) out.push("**" + p.title + "**");
    const cl = contactLine(p);
    if (cl.length) out.push(cl.join(" · "));
    if (has(p.tagline)) out.push("", strip(p.tagline));

    if (arr(d.experience).length) {
      out.push("", "## Experience");
      F.byStartDesc(d.experience, "startDate").forEach(function (j) {
        out.push("", "### " + [j.role, j.company].filter(has).join(" · "));
        out.push("`" + F.fmtRange(j.startDate, j.endDate, true) + "`" + (has(j.location) ? " · " + j.location : ""));
        if (has(j.summary)) out.push("", strip(j.summary));
        if (arr(j.highlights).length) { out.push(""); arr(j.highlights).forEach(function (h) { out.push("- " + strip(h)); }); }
        if (has(j.tech)) out.push("", "*" + arr(j.tech).join(" · ") + "*");
      });
    }
    if (arr(d.projects).length) {
      out.push("", "## Projects");
      arr(d.projects).forEach(function (pr) {
        out.push("", "### " + (pr.title || "Project"));
        if (has(pr.blurb)) out.push(strip(pr.blurb));
        [["Problem", pr.problem], ["Approach", pr.approach], ["Result", pr.result]].forEach(function (row) {
          if (has(row[1])) out.push("- **" + row[0] + ":** " + strip(row[1]));
        });
        if (has(pr.tech)) out.push("*" + arr(pr.tech).join(" · ") + "*");
      });
    }
    if (arr(d.skills).length) {
      out.push("", "## Skills");
      arr(d.skills).forEach(function (g) { out.push("- **" + (g.category || "Skills") + ":** " + arr(g.items).join(", ")); });
    }
    if (arr(d.certifications).length) {
      out.push("", "## Certifications");
      arr(d.certifications).forEach(function (c) {
        out.push("- **" + (c.name || "") + "**" + ([c.issuer, c.year].filter(has).length ? " — " + [c.issuer, c.year].filter(has).join(", ") : ""));
      });
    }
    if (arr(d.education).length) {
      out.push("", "## Education");
      F.byStartDesc(d.education, "startYear").forEach(function (e) {
        out.push("- **" + [e.degree, e.institution].filter(has).join(", ") + "** — " +
          [F.fmtRange(e.startYear, e.endYear), e.detail].filter(has).join(" · "));
      });
    }
    arr(d.sections).forEach(function (sec) {
      if (!has(sec.title) || !arr(sec.items).length) return;
      out.push("", "## " + sec.title);
      arr(sec.items).forEach(function (it) {
        out.push("", "### " + (it.title || it.value || "Entry"));
        if (has(it.meta) || has(it.subtitle)) out.push([it.subtitle, it.meta].filter(has).join(" · "));
        if (has(it.body)) out.push("", strip(it.body));
        arr(it.bullets).forEach(function (b) { out.push("- " + strip(b)); });
      });
    });
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  /* jsonresume.org schema */
  function toJsonResume(data) {
    const d = data || {}, p = d.profile || {};
    F.useTotals(d.experience, d.profile);
    const iso = function (v) {
      const x = F.parseYM(v);
      if (!x) return undefined;
      return x.m ? x.y + "-" + String(x.m).padStart(2, "0") : String(x.y);
    };
    const loc = String(p.location || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    const out = { $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json", basics: {} };

    if (has(p.name)) out.basics.name = p.name;
    if (has(p.title)) out.basics.label = p.title;
    if (has(p.email)) out.basics.email = p.email;
    if (has(p.phone)) out.basics.phone = p.phone;
    if (has(p.siteUrl)) out.basics.url = p.siteUrl;
    if (has(p.tagline)) out.basics.summary = F.plain(p.tagline);
    if (p.photo && has(p.photo.src)) out.basics.image = p.photo.src;
    if (loc.length) { out.basics.location = { city: loc[0] }; if (loc[1]) out.basics.location.countryCode = loc[1]; }
    const profiles = arr(p.links).filter(function (l) { return has(l.url); })
      .map(function (l) { return { network: l.label || l.icon || "web", url: l.url }; });
    if (profiles.length) out.basics.profiles = profiles;

    if (arr(d.experience).length) {
      out.work = F.byStartDesc(d.experience, "startDate").map(function (j) {
        const w = {};
        if (has(j.company)) w.name = j.company;
        if (has(j.role)) w.position = j.role;
        if (has(j.location)) w.location = j.location;
        if (iso(j.startDate)) w.startDate = iso(j.startDate);
        if (iso(j.endDate)) w.endDate = iso(j.endDate);
        if (has(j.summary)) w.summary = F.plain(j.summary);
        if (arr(j.highlights).length) w.highlights = arr(j.highlights).map(F.plain);
        if (arr(j.tech).length) w.keywords = arr(j.tech);
        return w;
      });
    }
    if (arr(d.projects).length) {
      out.projects = arr(d.projects).map(function (p2) {
        const pr = {};
        if (has(p2.title)) pr.name = p2.title;
        if (has(p2.blurb)) pr.description = F.plain(p2.blurb);
        const hl = [p2.problem, p2.approach, p2.result].filter(has).map(F.plain);
        if (hl.length) pr.highlights = hl;
        if (arr(p2.tech).length) pr.keywords = arr(p2.tech);
        return pr;
      });
    }
    if (arr(d.education).length) {
      out.education = F.byStartDesc(d.education, "startYear").map(function (e) {
        const ed = {};
        if (has(e.institution)) ed.institution = e.institution;
        if (has(e.degree)) ed.studyType = e.degree;
        if (iso(e.startYear)) ed.startDate = iso(e.startYear);
        if (iso(e.endYear)) ed.endDate = iso(e.endYear);
        if (has(e.detail)) ed.score = e.detail;
        return ed;
      });
    }
    if (arr(d.certifications).length) {
      out.certificates = arr(d.certifications).map(function (c) {
        const cert = {};
        if (has(c.name)) cert.name = c.name;
        if (has(c.issuer)) cert.issuer = c.issuer;
        if (has(c.year)) cert.date = String(c.year);
        if (has(c.credentialUrl)) cert.url = c.credentialUrl;
        return cert;
      });
    }
    if (arr(d.skills).length) {
      out.skills = arr(d.skills).map(function (g) {
        const s = {};
        if (has(g.category)) s.name = g.category;
        if (arr(g.items).length) s.keywords = arr(g.items);
        return s;
      });
    }
    return JSON.stringify(out, null, 2) + "\n";
  }

  /* Rough inverse of toJsonResume, for the builder's Import feature
     (js/app.js). Only basics/work/projects/education/certificates/skills
     have a canonical home; anything else (publications, awards,
     volunteer, languages, interests, references) becomes one new
     sections[] entry per array, using the existing "list" layout, so it
     goes through the same validateSite() path as everything else rather
     than growing new top-level fields. */
  function fromJsonResume(json) {
    const j = json || {}, b = j.basics || {};
    const out = { profile: {} };

    if (has(b.name)) out.profile.name = b.name;
    if (has(b.label)) out.profile.title = b.label;
    if (has(b.email)) out.profile.email = b.email;
    if (has(b.phone)) out.profile.phone = b.phone;
    if (has(b.url)) out.profile.siteUrl = b.url;
    if (has(b.summary)) out.profile.tagline = b.summary;
    if (has(b.image)) out.profile.photo = { src: b.image, alt: "" };
    if (b.location && (has(b.location.city) || has(b.location.countryCode))) {
      out.profile.location = [b.location.city, b.location.countryCode].filter(has).join(", ");
    }
    if (arr(b.profiles).length) {
      out.profile.links = arr(b.profiles).filter(function (p) { return has(p.url); })
        .map(function (p) { return { label: p.network || "", url: p.url }; });
    }

    if (arr(j.work).length) {
      out.experience = arr(j.work).map(function (w) {
        return {
          company: w.name || "", role: w.position || "", location: w.location || "",
          startDate: w.startDate || "", endDate: w.endDate || "",
          summary: w.summary || "", highlights: arr(w.highlights), tech: arr(w.keywords)
        };
      });
    }
    if (arr(j.projects).length) {
      out.projects = arr(j.projects).map(function (p) {
        return { title: p.name || "", blurb: p.description || "", tech: arr(p.keywords) };
      });
    }
    if (arr(j.education).length) {
      out.education = arr(j.education).map(function (e) {
        return { institution: e.institution || "", degree: e.studyType || "", startYear: (e.startDate || "").slice(0, 4), endYear: (e.endDate || "").slice(0, 4), detail: e.score || "" };
      });
    }
    if (arr(j.certificates).length) {
      out.certifications = arr(j.certificates).map(function (c) {
        return { name: c.name || "", issuer: c.issuer || "", year: (c.date || "").slice(0, 4), credentialUrl: c.url || "" };
      });
    }
    if (arr(j.skills).length) {
      out.skills = arr(j.skills).map(function (s) { return { category: s.name || "", items: arr(s.keywords) }; });
    }

    /* Anything with no canonical home in data.json. */
    const extras = [
      ["publications", "Publications", function (p) { return { title: p.name, meta: p.releaseDate, subtitle: p.publisher, links: p.url ? [{ label: "View", url: p.url }] : [] }; }],
      ["awards", "Awards", function (a) { return { title: a.title, meta: a.date, subtitle: a.awarder, body: a.summary }; }],
      ["volunteer", "Volunteering", function (v) { return { title: v.position, meta: v.startDate, subtitle: v.organization, body: v.summary }; }],
      ["languages", "Languages", function (l) { return { title: l.language, subtitle: l.fluency }; }],
      ["interests", "Interests", function (i) { return { title: i.name, tags: arr(i.keywords) }; }],
      ["references", "References", function (r) { return { title: r.name, body: r.reference }; }]
    ];
    out.sections = [];
    extras.forEach(function (spec) {
      const list = arr(j[spec[0]]);
      if (!list.length) return;
      out.sections.push({ id: spec[0], title: spec[1], layout: "list", items: list.map(spec[2]) });
    });

    return out;
  }

  /* ====================================================================
     STANDALONE HTML / WORD
     ==================================================================== */
  function pageCss(paper) {
    const size = paper === "letter" ? "Letter" : "A4";
    return "@page { size: " + size + "; margin: 14mm; }\n" +
           "body { margin: 0; background: #fff; }\n" +
           "@media screen { body { padding: 14mm; max-width: " + (paper === "letter" ? "216mm" : "210mm") + "; margin: 0 auto; } }";
  }

  function toHtml(data, opts) {
    opts = opts || {};
    const node = build(data, opts);
    const name = (data && data.profile && data.profile.name) || "Resume";
    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n" +
      "<title>" + escapeHtml(name) + "</title>\n<style>\n" + pageCss(opts.paper) + "\n" + css() + "\n</style>\n" +
      "</head>\n<body>\n" + node.outerHTML + "\n</body>\n</html>\n";
  }

  /* Word opens HTML with these namespaces as a real, editable document. */
  function toWord(data, opts) {
    opts = opts || {};
    const node = build(data, opts);
    const name = (data && data.profile && data.profile.name) || "Resume";
    const inches = opts.paper === "letter" ? "8.5in 11.0in" : "21.0cm 29.7cm";
    return "<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" " +
      "xmlns:w=\"urn:schemas-microsoft-com:office:word\" xmlns=\"http://www.w3.org/TR/REC-html40\">\n" +
      "<head>\n<meta charset=\"utf-8\">\n<title>" + escapeHtml(name) + "</title>\n" +
      "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View>" +
      "<w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->\n" +
      "<style>\n@page { size: " + inches + "; margin: 1.6cm; }\n" +
      "body { font-family: Calibri, Arial, sans-serif; }\n" + css() + "\n</style>\n</head>\n" +
      "<body>\n" + node.outerHTML + "\n</body>\n</html>\n";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  /* ====================================================================
     IMAGE EXPORT (PNG / JPEG)
     Renders via an SVG <foreignObject>. Two honest limitations:
       · web fonts are not embedded, so text falls back to system faces
       · cross-origin images can't be inlined and are dropped
     Same-origin images are inlined as data URLs so they do appear.
     ==================================================================== */
  function inlineImages(node) {
    const imgs = Array.prototype.slice.call(node.querySelectorAll("img"));
    if (!imgs.length) return Promise.resolve({ dropped: 0 });
    let dropped = 0;
    return Promise.all(imgs.map(function (img) {
      const src = img.getAttribute("src") || "";
      if (src.indexOf("data:") === 0) return Promise.resolve();
      if (!PF.util.sameOrigin(src)) { img.parentNode.removeChild(img); dropped++; return Promise.resolve(); }
      return fetch(src).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.blob();
      }).then(function (blob) {
        return new Promise(function (res, rej) {
          const fr = new FileReader();
          fr.onload = function () { img.setAttribute("src", String(fr.result)); res(); };
          fr.onerror = function () { rej(fr.error); };
          fr.readAsDataURL(blob);
        });
      }).catch(function () {
        if (img.parentNode) img.parentNode.removeChild(img);
        dropped++;
      });
    })).then(function () { return { dropped: dropped }; });
  }

  function toImage(data, opts) {
    opts = opts || {};
    const mime = opts.mime || "image/png";
    const scale = opts.scale || 2;
    const widthMm = opts.paper === "letter" ? 216 : 210;
    const pxWidth = Math.round(widthMm * 3.7795);          // mm → CSS px

    const holder = el("div", {
      style: "position:absolute;left:-99999px;top:0;width:" + pxWidth + "px;background:#fff;padding:53px;"
    });
    const node = build(data, opts);
    holder.appendChild(node);
    document.body.appendChild(holder);

    return inlineImages(holder).then(function (info) {
      const height = Math.max(holder.scrollHeight, Math.round(pxWidth * 1.414));
      const serialised = new XMLSerializer().serializeToString(holder);
      const inner = serialised
        .replace(/^<div[^>]*>/, "")
        .replace(/<\/div>$/, "");
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + pxWidth + '" height="' + height + '">' +
        '<foreignObject width="100%" height="100%">' +
        '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + pxWidth + 'px;background:#fff;padding:53px;box-sizing:border-box;">' +
        '<style>' + css().replace(/</g, "&lt;") + '</style>' + inner +
        '</div></foreignObject></svg>';

      document.body.removeChild(holder);

      return new Promise(function (resolve, reject) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement("canvas");
          canvas.width = pxWidth * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("This browser can't render to a canvas."));
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          let url;
          try { url = canvas.toDataURL(mime, 0.92); }
          catch (e) { return reject(new Error("The canvas was blocked — usually a cross-origin image. " + e.message)); }
          resolve({ dataUrl: url, dropped: info.dropped, width: canvas.width, height: canvas.height });
        };
        img.onerror = function () {
          reject(new Error("The browser refused to rasterise the resume. Use PDF or Word instead."));
        };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      });
    }).catch(function (err) {
      if (holder.parentNode) document.body.removeChild(holder);
      throw err;
    });
  }

  function dataUrlToBlob(dataUrl) {
    const parts = String(dataUrl).split(",");
    const mime = (parts[0].match(/:(.*?);/) || [])[1] || "image/png";
    const bin = atob(parts[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  /* ====================================================================
     EXPORT REGISTRY
     run(data, opts) → { text, mime, ext } | Promise of the same | {print:true}
     ==================================================================== */
  const EXPORTS = [
    { id: "pdf", name: "PDF", ext: "pdf", kind: "print",
      blurb: "Opens the print dialog — choose “Save as PDF”. Selectable text, working links, real page breaks.",
      run: function () { return { print: true }; } },

    { id: "doc", name: "Word", ext: "doc", mime: "application/msword", kind: "file",
      blurb: "Opens and edits natively in Word or Pages. Use this when a recruiter asks for “a Word copy”.",
      run: function (data, opts) { return { text: toWord(data, opts), mime: "application/msword", ext: "doc" }; } },

    { id: "txt", name: "Plain text", ext: "txt", mime: "text/plain;charset=utf-8", kind: "file",
      blurb: "No formatting at all. The safest thing to paste into an application form or an ATS box.",
      run: function (data) { return { text: toText(data), mime: "text/plain;charset=utf-8", ext: "txt" }; } },

    { id: "md", name: "Markdown", ext: "md", mime: "text/markdown;charset=utf-8", kind: "file",
      blurb: "For a GitHub profile README, Notion, or anywhere that renders Markdown.",
      run: function (data) { return { text: toMarkdown(data), mime: "text/markdown;charset=utf-8", ext: "md" }; } },

    { id: "html", name: "HTML", ext: "html", mime: "text/html;charset=utf-8", kind: "file",
      blurb: "One self-contained file with the styles inlined. Email it or host it anywhere.",
      run: function (data, opts) { return { text: toHtml(data, opts), mime: "text/html;charset=utf-8", ext: "html" }; } },

    { id: "json", name: "JSON Resume", ext: "json", mime: "application/json", kind: "file",
      blurb: "jsonresume.org schema — importable by other CV tools and some job boards.",
      run: function (data) { return { text: toJsonResume(data), mime: "application/json", ext: "json" }; } },

    { id: "png", name: "PNG image", ext: "png", mime: "image/png", kind: "image",
      blurb: "A picture of the resume. Web fonts fall back to system fonts and remote images are dropped.",
      run: function (data, opts) {
        return toImage(data, Object.assign({}, opts, { mime: "image/png" }))
          .then(function (r) { return { blob: dataUrlToBlob(r.dataUrl), mime: "image/png", ext: "png", note: imageNote(r) }; });
      } },

    { id: "jpeg", name: "JPEG image", ext: "jpg", mime: "image/jpeg", kind: "image",
      blurb: "Smaller than PNG, no transparency. Same font and image caveats.",
      run: function (data, opts) {
        return toImage(data, Object.assign({}, opts, { mime: "image/jpeg" }))
          .then(function (r) { return { blob: dataUrlToBlob(r.dataUrl), mime: "image/jpeg", ext: "jpg", note: imageNote(r) }; });
      } }
  ];

  function imageNote(r) {
    const bits = [r.width + "×" + r.height + "px"];
    if (r.dropped) bits.push(r.dropped + " remote image" + (r.dropped === 1 ? "" : "s") + " dropped");
    bits.push("web fonts fall back to system fonts in images");
    return bits.join(" · ");
  }

  const E_INDEX = {};
  EXPORTS.forEach(function (e) { E_INDEX[e.id] = e; });

  function fileBase(data) {
    const p = (data && data.profile) || {};
    const name = F.slug(p.name || "resume");
    const role = has(p.title) ? "-" + F.slug(p.title) : "";
    return name + role;
  }

  PF.provide("resume", {
    TEMPLATES: TEMPLATES,
    EXPORTS: EXPORTS,
    templateById: templateById,
    exportById: function (id) { return E_INDEX[id] || null; },
    css: css,
    pageCss: pageCss,
    build: build,
    toText: toText,
    toMarkdown: toMarkdown,
    toJsonResume: toJsonResume,
    fromJsonResume: fromJsonResume,
    toHtml: toHtml,
    toWord: toWord,
    toImage: toImage,
    atsRange: atsRange,
    fileBase: fileBase
  });
})();
