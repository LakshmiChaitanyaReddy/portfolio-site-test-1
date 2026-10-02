/* ==========================================================================
   render.js — draws the public site from data.json.

   Built-in sections live here; anything custom is handed to PF.layouts.
   paint() is idempotent: it clears and rebuilds, which is what lets the
   builder's Preview tab re-render on every keystroke.

   TEMPLATES. js/skeletons.js names eight templates; each one gets its own
   hero and, where the structure really differs, its own section renderers
   in VIEWS below (a CV row is not a recoloured card). Anything a template
   does not override falls through to the default renderers, so a custom
   section, an unknown template or a missing registry still paints. Every
   template keeps the same anchors other code relies on: #top/#hero-title,
   one <section id> per built-in or custom section, #nav-links /
   #mobile-links, the #contact footer and the .reveal hooks.

   HONESTY. Figures a template shows (KPI strips, chart bars, "seen in"
   links) are derived from the customer's own data — counts and dates —
   never invented. A template never writes back into data.

   The "Save as PDF" button is deliberately NOT here. Resume export lives in
   the builder — the public page just links to the hosted PDF.
   ========================================================================== */
(function () {
  "use strict";
  const PF = (window.PF = window.PF || {});
  PF.modules = PF.modules || {};
  PF.provide = PF.provide || function (n, api) { PF[n] = api; PF.modules[n] = true; };

  const D = PF.dom, F = PF.fmt;
  const el = D.el, has = D.has, arr = D.arr, append = D.append, clear = D.clear;

  let ANIM = "lift";   // icon animation, set from the theme on each paint

  /* ====================================================================
     SHARED PIECES — also handed to custom layouts as their ctx
     ==================================================================== */
  function icon(spec, opts) {
    if (!has(spec)) return null;
    return PF.icons ? PF.icons.resolve(spec, Object.assign({ anim: ANIM }, opts || {})) : null;
  }

  function image(img, cls) {
    if (!img || !has(img.src)) return null;
    return el("img", {
      class: cls || null, src: img.src, alt: has(img.alt) ? img.alt : "",
      loading: "lazy", decoding: "async"
    });
  }

  function chips(items, label) {
    if (!has(items)) return null;
    return el("ul", { class: "chips", role: "list", "aria-label": label || null },
      arr(items).map(function (t) { return el("li", { class: "chip", text: t }); }));
  }

  function links(list, cls) {
    const usable = arr(list).filter(function (l) { return has(l.url); });
    if (!usable.length) return null;
    return el("p", { class: cls },
      usable.map(function (l) {
        return el("a", { href: l.url, target: "_blank", rel: "noopener noreferrer" },
          icon(l.icon || (PF.icons ? PF.icons.guess(l.label, l.url) : null)),
          el("span", { text: l.label || l.url }));
      }));
  }

  const CTX = {
    el: el, has: has, arr: arr, chips: chips, image: image, links: links, icon: icon,
    rich: function (s) { return F.rich(s); },
    plain: F.plain
  };

  /* A profession pack writes concrete strings into data.sectionLabels once,
     at apply time (js/packs.js, builder-only); this just reads whatever is
     there, so a user's later rename is never overwritten by re-paint. */
  function label(d, id, fallback) {
    const custom = d.sectionLabels && d.sectionLabels[id];
    return has(custom) ? custom : fallback;
  }

  const DEFAULT_LABELS = { about: "About", skills: "Skills", experience: "Experience", projects: "Projects", certifications: "Certifications", education: "Education" };
  /* Nav + eyebrow text: the customer's label, else the template's, else the default. */
  function navLabel(d, sk, id) { return label(d, id, (sk.labels && sk.labels[id]) || DEFAULT_LABELS[id] || id); }
  /* Section heading: the customer's label, else the template's heading, else fallback. */
  function heading(d, sk, id, fallback) { return label(d, id, (sk.headings && sk.headings[id]) || fallback || navLabel(d, sk, id)); }

  function sectionHead(eyebrow, title, id, blurb) {
    return el("div", { class: "section-head reveal" },
      has(eyebrow) && el("p", { class: "eyebrow", text: eyebrow }),
      el("h2", { id: id, text: title }),
      has(blurb) && el("p", null, F.tokens(blurb)));
  }

  function wrap(id, cls, labelledBy, children) {
    return el("section", { id: id, class: "section" + (cls ? " " + cls : ""), "aria-labelledby": labelledBy },
      el("div", { class: "container" }, children));
  }

  const pad2 = function (n) { return String(n).padStart(2, "0"); };
  const joinDot = function (parts) { return parts.filter(has).join(" · "); };

  /* ====================================================================
     FACTS — every figure a template shows comes from here
     ==================================================================== */
  function skillCount(d) { return arr(d.skills).reduce(function (s, g) { return s + arr(g.items).length; }, 0); }

  function currentRole(d) {
    return arr(d.experience).filter(function (j) { return !has(j.endDate) && has(j.startDate); })[0] ||
           F.byStartDesc(d.experience, "startDate")[0] || null;
  }

  /* The four headline figures, in a fixed order. F.totals() is what the
     About panel, the {{years}} token and the resume read too. */
  function heroStats(d) {
    const t = F.totals(), nP = arr(d.projects).length, nC = arr(d.certifications).length, nS = skillCount(d);
    return [
      has(t.years) && { key: "years", n: t.years, label: "Years of experience" },
      nP > 0 && { key: "projects", n: String(nP), label: nP === 1 ? "Project delivered" : "Projects delivered" },
      nC > 0 && { key: "certifications", n: String(nC), label: nC === 1 ? "Certification" : "Certifications" },
      nS > 0 && { key: "skills", n: String(nS), label: "Skills and tools" }
    ].filter(Boolean);
  }

  function statList(stats, cls) {
    if (!stats.length) return null;
    return el("dl", { class: "hero-stats reveal" + (cls ? " " + cls : ""), style: "--delay:300ms" },
      stats.map(function (s) {
        return el("div", { "data-stat": s.key || null }, el("dt", { text: s.n }), el("dd", { text: s.label }));
      }));
  }

  function certShort(d) { return arr(d.certifications).map(function (c) { return c.abbr || c.name; }).filter(has); }

  function resumeButton(p, refs, cls, text) {
    if (!has(p.resumeUrl)) return null;
    let btn = el("a", { class: cls || "btn btn-ghost", href: p.resumeUrl, download: true }, icon("download"), text || "Download Resume");
    if (refs && typeof refs.guard === "function") btn = refs.guard(btn, p.resumeUrl);
    return btn;
  }

  function mailButton(p, text, cls) {
    if (!has(p.email)) return null;
    return el("a", { class: cls || "btn btn-primary", href: "mailto:" + p.email }, icon("mail"), text || "Get in touch");
  }

  /* Up to `max` accomplishment lines, taken verbatim from the roles: the
     first highlight of each role, newest first, then the rest in order. */
  function achievements(d, max) {
    const roles = F.byStartDesc(d.experience, "startDate");
    const out = [], seen = {};
    const push = function (h, job) {
      if (!has(h) || seen[h] || out.length >= max) return;
      seen[h] = true; out.push({ text: h, job: job });
    };
    roles.forEach(function (j) { push(arr(j.highlights)[0], j); });
    roles.forEach(function (j) { arr(j.highlights).slice(1).forEach(function (h) { push(h, j); }); });
    return out;
  }

  /* technology → number of projects using it, most used first */
  function techUsage(projects) {
    const counts = new Map();
    arr(projects).forEach(function (p) {
      const seen = {};
      arr(p.tech).forEach(function (t) { if (!seen[t]) { seen[t] = true; counts.set(t, (counts.get(t) || 0) + 1); } });
    });
    return Array.from(counts.keys()).sort(function (a, b) { return counts.get(b) - counts.get(a) || a.localeCompare(b); })
      .map(function (t) { return { name: t, n: counts.get(t) }; });
  }

  function orderedProjects(d) {
    return arr(d.projects).slice().sort(function (a, b) { return (b.featured === true) - (a.featured === true); });
  }

  function papRows(p, labels) {
    const L = labels || ["Problem", "Approach", "Result"];
    return [
      has(p.problem) && [L[0], p.problem, "is-problem"],
      has(p.approach) && [L[1], p.approach, "is-approach"],
      has(p.result) && [L[2], p.result, "is-result"]
    ].filter(Boolean);
  }

  function papList(p, labels, cls) {
    const rows = papRows(p, labels);
    if (!rows.length) return null;
    return el("dl", { class: "pap" + (cls ? " " + cls : "") }, rows.map(function (row) {
      return el("div", { class: row[2] }, el("dt", { text: row[0] }), el("dd", null, F.rich(row[1])));
    }));
  }

  /* The technology filter, shared by every template that offers it. Returns
     { bar, status } (both null when there is nothing to filter by). */
  function filterBar(cards, techs) {
    if (!techs.length) return { bar: null, status: null };
    const status = el("p", { class: "filter-status", role: "status", "aria-live": "polite" });
    const buttons = [];
    function applyFilter(tech, pressed) {
      let shown = 0;
      cards.forEach(function (c) {
        const match = tech === null || c.tech.indexOf(tech) !== -1;
        c.node.hidden = !match;
        if (match) shown++;
      });
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === pressed)); });
      status.textContent = "Showing " + shown + " of " + cards.length + " projects" +
        (tech ? " tagged “" + tech + "”" : "");
    }
    const bar = el("div", { class: "filter-bar reveal", role: "group", "aria-label": "Filter projects by technology" },
      [null].concat(techs).map(function (tech) {
        const btn = el("button", {
          type: "button", class: "filter-btn", "aria-pressed": String(tech === null),
          text: tech === null ? "All" : tech,
          onclick: function () { applyFilter(tech, btn); }
        });
        buttons.push(btn);
        return btn;
      }));
    applyFilter(null, buttons[0]);
    return { bar: bar, status: status };
  }

  /* ====================================================================
     DEFAULT SECTIONS — the fallback for anything a template doesn't draw
     ==================================================================== */
  function hero(d, refs, sk) {
    const p = d.profile;
    const stats = sk.showStatBand !== false ? heroStats(d) : [];
    const certs = certShort(d);
    const resumeBtn = resumeButton(p, refs);

    return el("section", { id: "top", class: "hero", "aria-labelledby": "hero-title" },
      el("div", { class: "container" },
        image(p.photo, "hero-photo reveal"),
        has(p.status) && el("p", { class: "hero-tag reveal" },
          el("span", { class: "pulse", "aria-hidden": "true" }), p.status),
        el("h1", { id: "hero-title", class: "reveal", style: "--delay:60ms", text: p.name || "" }),
        has(p.title) && el("p", { class: "hero-role reveal", style: "--delay:120ms", text: p.title }),
        has(p.tagline) && el("p", { class: "hero-pitch reveal", style: "--delay:180ms" }, F.rich(p.tagline)),
        (has(p.location) || certs.length > 0) && el("p", { class: "hero-meta reveal", style: "--delay:220ms" },
          has(p.location) && el("span", null, icon("map-pin"), p.location),
          certs.length > 0 && el("span", null, icon("badge-check"), certs.join(" · "))),
        (has(p.email) || resumeBtn) && el("div", { class: "hero-cta reveal", style: "--delay:280ms" },
          mailButton(p), resumeBtn),
        statList(stats)));
  }

  function aboutFacts(d) {
    const p = d.profile;
    const current = currentRole(d);
    const t = F.totals();
    return [
      has(p.location) && ["Based in", p.location],
      current && has(current.company) && ["Current role", [current.role, current.company].filter(has).join(", ")],
      arr(d.skills).length > 0 && ["Focus areas", arr(d.skills).map(function (g) { return g.category; }).filter(has).slice(0, 3).join(" · ")],
      arr(d.certifications).length > 0 && ["Certified", certShort(d).join(", ")],
      /* Same figure as the hero stat and the {{years}} token — never a second
         opinion. This row used to print the raw duration ("4 yr 4 mo") while
         the hero said "4.5", and ignored the experienceYears override. */
      has(t.years) && ["Experience", t.years + "+ years"]
    ].filter(Boolean);
  }

  function factsBox(facts, title, cls) {
    if (!facts.length) return null;
    return el("aside", { class: "facts reveal" + (cls ? " " + cls : ""), style: "--delay:120ms", "aria-label": title || "Quick facts" },
      has(title) && el("h3", { text: title }),
      el("dl", null, facts.map(function (f) {
        return el("div", null, el("dt", { text: f[0] }), el("dd", { text: f[1] }));
      })));
  }

  function aboutParas(d, cls) {
    return el("div", { class: "about-body reveal" + (cls ? " " + cls : "") }, arr(d.profile.about).map(function (x) { return el("p", null, F.rich(x)); }));
  }

  function aboutTitle(d, sk) {
    return has(d.profile.aboutTitle) ? d.profile.aboutTitle : ((sk && sk.headings && sk.headings.about) || "About me");
  }

  function about(d, sk) {
    return wrap("about", "section-alt", "about-title", [
      sectionHead(label(d, "about", "About"), aboutTitle(d), "about-title"),
      el("div", { class: "about-grid" }, aboutParas(d), factsBox(aboutFacts(d), "Quick facts"))
    ]);
  }

  function skills(d) {
    return wrap("skills", null, "skills-title", [
      sectionHead(label(d, "skills", "Skills"), label(d, "skills", "What I work with"), "skills-title"),
      el("div", { class: "skill-grid" },
        arr(d.skills).map(function (g, i) {
          return el("article", { class: "skill-card reveal", style: "--delay:" + i * 80 + "ms" },
            el("h3", null, icon(g.icon), g.category || "Skills"),
            chips(g.items, g.category));
        }))
    ]);
  }

  function jobMeta(job) {
    const dur = F.fmtDuration(F.monthsBetween(job.startDate, job.endDate));
    return [
      has(job.company) && el("span", { class: "tl-company", text: job.company }),
      has(dur) && el("span", { class: "tl-dur", text: dur }),
      has(job.location) && el("span", { text: job.location })
    ].filter(Boolean);
  }

  function experience(d) {
    return wrap("experience", "section-alt", "experience-title", [
      sectionHead(label(d, "experience", "Experience"), label(d, "experience", "Professional journey"), "experience-title"),
      el("ol", { class: "timeline" },
        F.byStartDesc(d.experience, "startDate").map(function (job, i) {
          const current = !has(job.endDate) && has(job.startDate);
          const range = F.fmtRange(job.startDate, job.endDate);
          const meta = jobMeta(job);
          return el("li", {
              class: "tl-item reveal" + (current ? " is-current" : ""),
              style: "--delay:" + i * 100 + "ms"
            },
            el("div", { class: "tl-head" },
              el("h3", { text: job.role || job.company || "Role" }),
              has(range) && el("p", { class: "tl-date", text: range })),
            meta.length > 0 && el("p", { class: "tl-sub" },
              meta.reduce(function (acc, node, idx) {
                return acc.concat(idx ? [el("span", { class: "tl-sep", text: "·" }), node] : [node]);
              }, [])),
            has(job.summary) && el("p", { class: "tl-summary" }, F.rich(job.summary)),
            has(job.highlights) && el("ul", { class: "tl-list", role: "list" },
              arr(job.highlights).map(function (h) { return el("li", null, F.rich(h)); })),
            chips(job.tech, (job.company || "Role") + " technologies"));
        }))
    ]);
  }

  function projects(d) {
    const ordered = orderedProjects(d);
    const techs = techUsage(ordered).map(function (t) { return t.name; });
    const cards = [];
    const grid = el("div", { class: "project-grid" }, ordered.map(function (p, i) {
      const node = el("article", {
          class: "project-card reveal" + (p.featured ? " is-featured" : ""),
          style: "--delay:" + Math.min(i, 4) * 80 + "ms"
        },
        image(p.image, "project-cover"),
        el("div", { class: "project-top" },
          el("span", { class: "project-num", text: pad2(i + 1) }),
          p.featured === true && el("span", { class: "featured-flag", text: "Featured" })),
        el("h3", { text: p.title || "Project" }),
        has(p.blurb) && el("p", { class: "project-blurb" }, F.rich(p.blurb)),
        papList(p),
        links(p.links, "project-links"),
        chips(p.tech, (p.title || "Project") + " technologies"));
      cards.push({ node: node, tech: arr(p.tech) });
      return node;
    }));
    const f = filterBar(cards, techs);
    return wrap("projects", null, "projects-title", [
      sectionHead(label(d, "projects", "Projects"), label(d, "projects", "Selected work"), "projects-title",
        "A selection of work, with the context, approach and outcome behind each project."),
      f.bar, f.status, grid
    ]);
  }

  function certifications(d) {
    return wrap("certifications", "section-alt", "certifications-title", [
      sectionHead(label(d, "certifications", "Certifications"), label(d, "certifications", "Qualifications & credentials"), "certifications-title"),
      el("div", { class: "cert-grid" }, arr(d.certifications).map(function (c, i) {
        const sub = [c.abbr, c.issuer, c.year].filter(has);
        return el("article", { class: "cert-card reveal", style: "--delay:" + i * 80 + "ms" },
          el("span", { class: "cert-badge", "aria-hidden": "true" }, icon(c.icon || "shield-check")),
          el("div", null,
            el("h3", { text: c.name || "Certification" }),
            sub.length > 0 && el("p", null,
              has(c.abbr) && el("span", { class: "cert-code", text: c.abbr }),
              sub.slice(has(c.abbr) ? 1 : 0).map(function (s, j) {
                return (j || has(c.abbr) ? " · " : "") + s;
              }).join("")),
            verifyLink(c)));
      }))
    ]);
  }

  function verifyLink(c) {
    return has(c.credentialUrl) && el("a", {
        class: "cert-verify", href: c.credentialUrl, target: "_blank", rel: "noopener noreferrer"
      }, icon("external-link"), "Verify credential",
      el("span", { class: "visually-hidden", text: " — " + (c.name || "certification") }));
  }

  function education(d) {
    return wrap("education", null, "education-title", [
      sectionHead(label(d, "education", "Education"), label(d, "education", "Academic background"), "education-title"),
      el("div", { class: "edu-list" }, F.byStartDesc(d.education, "startYear").map(function (e, i) {
        const range = F.fmtRange(e.startYear, e.endYear);
        return el("article", { class: "edu-card reveal", style: "--delay:" + i * 80 + "ms" },
          el("div", { class: "edu-top" },
            el("h3", { text: e.degree || e.institution || "Education" }),
            has(range) && el("p", { class: "edu-date", text: range })),
          has(e.degree) && has(e.institution) && el("p", { text: e.institution }),
          has(e.detail) && el("p", { class: "edu-detail", text: e.detail }));
      }))
    ]);
  }

  const CITATIONS = /publication|paper|article|preprint|journal|citation/i;
  const SERVICES = /(^|[^a-z])(services?|offer(ing)?s?|what-?i-?do|packages?|engagements?)([^a-z]|$)/i;
  const QUOTES = /testimonial|quote|recommendation|review|kind-?words/i;

  function customSection(sec, id, eyebrow) {
    const titleId = id + "-title";
    const kind = [
      CITATIONS.test(id + " " + sec.title) && "is-citations",
      SERVICES.test(id + " " + sec.title) && "is-services",
      (sec.layout === "quotes" || sec.layout === "testimonials" || QUOTES.test(id + " " + sec.title)) && "is-quotes",
      sec.layout === "stats" && "is-stats"
    ].filter(Boolean).join(" ");
    return wrap(id, [sec.altBackground === true ? "section-alt" : "", "section-custom", "layout-" + (sec.layout || "cards"), kind].filter(Boolean).join(" "), titleId, [
      sectionHead(eyebrow !== undefined ? eyebrow : (sec.eyebrow || sec.title), sec.title || "Section", titleId, sec.blurb),
      PF.layouts ? PF.layouts.render(sec, CTX) : null
    ]);
  }

  function contactItems(p) {
    return [
      has(p.email) && { href: "mailto:" + p.email, icon: "mail", text: p.email, kind: "email" },
      has(p.phone) && { href: "tel:" + String(p.phone).replace(/[^\d+]/g, ""), icon: "phone", text: p.phone, kind: "phone" }
    ].filter(Boolean)
     .concat(arr(p.links).filter(function (l) { return has(l.url); }).map(function (l) {
        return { href: l.url, icon: l.icon || (PF.icons ? PF.icons.guess(l.label, l.url) : "link"),
                 text: l.label || l.url, external: true, kind: "link" };
     }))
     .concat(has(p.resumeUrl)
        ? [{ href: p.resumeUrl, icon: "file-down", text: "Download Resume (PDF)", download: true, guard: true, kind: "resume" }] : []);
  }

  function contactAnchor(it, refs) {
    const a = el("a", {
      href: it.href,
      target: it.external ? "_blank" : null,
      rel: it.external ? "noopener noreferrer" : null,
      download: it.download ? true : null
    }, icon(it.icon), el("span", { text: it.text }));
    return (it.guard && refs && typeof refs.guard === "function") ? refs.guard(a, it.href) : a;
  }

  function contact(d, footer, refs, sk) {
    const p = d.profile;
    const items = contactItems(p);
    const fallback = (sk && sk.contact) || {};
    const primary = sk && sk.id === "freelancer-services" ? mailButton(p, "Email " + (String(p.shortName || p.name || "").trim().split(/\s+/)[0] || "me"), "btn btn-primary btn-lg") : null;
    const eyebrow = sk && sk.id === "technical-terminal" ? "$ ./contact --now" : "Contact";

    append(footer, [el("div", { class: "container" },
      el("div", { class: "footer-cta reveal" },
        el("p", { class: "eyebrow", text: eyebrow }),
        el("h2", { id: "contact-title", text: has(p.contactHeading) ? p.contactHeading : (fallback.heading || "Let's talk") }),
        el("p", { text: has(p.contactBlurb) ? p.contactBlurb : (fallback.blurb || "Happy to discuss work, ideas or a role — the inbox is the fastest way to reach me.") }),
        primary && el("div", { class: "hero-cta footer-action" }, primary)),
      items.length > 0 && el("ul", { class: "contact-list reveal", role: "list", style: "--delay:80ms" },
        items.map(function (it) { return el("li", { "data-kind": it.kind }, contactAnchor(it, refs)); })),
      el("div", { class: "footer-bottom" },
        el("p", { text: "© " + new Date().getFullYear() + (has(p.name) ? " " + p.name : "") }),
        el("a", { href: "#top", text: "Back to top ↑" })))]);
    footer.setAttribute("aria-labelledby", "contact-title");
    footer.hidden = false;
  }

  /* ====================================================================
     TEMPLATE VIEWS
     Each takes (d, sk, refs, n) — n is the section's 1-based position in
     the painted order, for templates that number their chapters.
     ==================================================================== */

  /* ---------- Clean Recruiter: a resume set as a web page ------------- */
  const recruiter = {
    hero: function (d, refs, sk) {
      const p = d.profile;
      const contactBits = [
        has(p.location) && el("span", null, icon("map-pin"), p.location),
        has(p.email) && el("a", { href: "mailto:" + p.email }, icon("mail"), p.email),
        has(p.phone) && el("a", { href: "tel:" + String(p.phone).replace(/[^\d+]/g, "") }, icon("phone"), p.phone)
      ].concat(arr(p.links).filter(function (l) { return has(l.url); }).slice(0, 3).map(function (l) {
        return el("a", { href: l.url, target: "_blank", rel: "noopener noreferrer" }, icon(l.icon || (PF.icons ? PF.icons.guess(l.label, l.url) : null)), l.label || l.url);
      })).filter(Boolean);
      return el("section", { id: "top", class: "hero hero--recruiter", "aria-labelledby": "hero-title" },
        el("div", { class: "container" },
          el("div", { class: "rc-id reveal" },
            image(p.photo, "hero-photo"),
            el("div", { class: "rc-name" },
              el("h1", { id: "hero-title", text: p.name || "" }),
              has(p.title) && el("p", { class: "hero-role", text: p.title }))),
          has(p.tagline) && el("p", { class: "hero-pitch reveal", style: "--delay:80ms" }, F.rich(p.tagline)),
          contactBits.length > 0 && el("p", { class: "hero-meta reveal", style: "--delay:140ms" }, contactBits),
          (has(p.email) || has(p.resumeUrl)) && el("div", { class: "hero-cta reveal", style: "--delay:200ms" },
            mailButton(p), resumeButton(p, refs)),
          has(p.status) && el("p", { class: "hero-tag reveal", style: "--delay:240ms" }, el("span", { class: "pulse", "aria-hidden": "true" }), p.status),
          statList(heroStats(d), "rc-stats")));
    },
    about: function (d, sk) {
      return wrap("about", null, "about-title", [
        sectionHead(null, aboutTitle(d, sk), "about-title"),
        aboutParas(d),
        factsBox(aboutFacts(d), null, "rc-facts")
      ]);
    },
    experience: function (d, sk) {
      return wrap("experience", null, "experience-title", [
        sectionHead(null, heading(d, sk, "experience"), "experience-title"),
        el("ol", { class: "cv-list" }, F.byStartDesc(d.experience, "startDate").map(function (job, i) {
          const range = F.fmtRange(job.startDate, job.endDate, true);
          const dur = F.fmtDuration(F.monthsBetween(job.startDate, job.endDate));
          return el("li", { class: "cv-item reveal" + (!has(job.endDate) && has(job.startDate) ? " is-current" : ""), style: "--delay:" + Math.min(i, 4) * 60 + "ms" },
            el("div", { class: "cv-row" },
              el("div", { class: "cv-main" },
                el("h3", { text: job.role || job.company || "Role" }),
                el("p", { class: "cv-org", text: joinDot([job.company, job.location]) })),
              el("p", { class: "cv-when" }, has(range) && el("span", { text: range }), has(dur) && el("span", { class: "tl-dur", text: dur }))),
            has(job.summary) && el("p", { class: "tl-summary" }, F.rich(job.summary)),
            has(job.highlights) && el("ul", { class: "tl-list", role: "list" }, arr(job.highlights).map(function (h) { return el("li", null, F.rich(h)); })),
            has(job.tech) && el("p", { class: "cv-tech" }, el("span", { class: "cv-k", text: "Tools" }), arr(job.tech).join(", ")));
        }))
      ]);
    },
    skills: function (d, sk) {
      return wrap("skills", null, "skills-title", [
        sectionHead(null, heading(d, sk, "skills"), "skills-title"),
        el("dl", { class: "skill-rows reveal" }, arr(d.skills).map(function (g) {
          return el("div", null, el("dt", { text: g.category || "Skills" }),
            el("dd", null, el("ul", { class: "inline-list", role: "list", "aria-label": g.category || "Skills" }, arr(g.items).map(function (t) { return el("li", { text: t }); }))));
        }))
      ]);
    },
    projects: function (d, sk) {
      return wrap("projects", null, "projects-title", [
        sectionHead(null, heading(d, sk, "projects"), "projects-title"),
        el("div", { class: "proj-list" }, orderedProjects(d).map(function (p, i) {
          return el("article", { class: "project-card proj-row reveal" + (p.image && has(p.image.src) ? " has-thumb" : ""), style: "--delay:" + Math.min(i, 4) * 60 + "ms" },
            el("div", { class: "proj-body" },
              el("h3", { text: p.title || "Project" }),
              has(p.blurb) && el("p", { class: "project-blurb" }, F.rich(p.blurb)),
              papList(p, null, "pap-inline"),
              links(p.links, "project-links"),
              has(p.tech) && el("p", { class: "cv-tech" }, el("span", { class: "cv-k", text: "Stack" }), arr(p.tech).join(", "))),
            image(p.image, "proj-thumb"));
        }))
      ]);
    },
    certifications: function (d, sk) { return simpleRows(d, sk, "cv-simple"); },
    education: function (d, sk) { return eduRows(d, sk, "cv-simple"); }
  };

  /* Compact row lists shared by several templates. */
  function simpleRows(d, sk, cls, eyebrow) {
    return wrap("certifications", null, "certifications-title", [
      sectionHead(eyebrow || null, heading(d, sk, "certifications"), "certifications-title"),
      el("ul", { class: "row-rows " + (cls || ""), role: "list" }, arr(d.certifications).map(function (c, i) {
        return el("li", { class: "cert-row reveal", style: "--delay:" + Math.min(i, 5) * 50 + "ms" },
          el("div", { class: "rr-main" },
            el("h3", { text: c.name || "Certification" }),
            el("p", { class: "rr-sub", text: joinDot([c.abbr, c.issuer]) }),
            verifyLink(c)),
          has(c.year) && el("p", { class: "rr-when", text: c.year }));
      }))
    ]);
  }

  function eduRows(d, sk, cls, eyebrow) {
    return wrap("education", null, "education-title", [
      sectionHead(eyebrow || null, heading(d, sk, "education"), "education-title"),
      el("ul", { class: "row-rows " + (cls || ""), role: "list" }, F.byStartDesc(d.education, "startYear").map(function (e, i) {
        const range = F.fmtRange(e.startYear, e.endYear);
        return el("li", { class: "edu-row reveal", style: "--delay:" + Math.min(i, 5) * 50 + "ms" },
          el("div", { class: "rr-main" },
            el("h3", { text: e.degree || e.institution || "Education" }),
            has(e.degree) && has(e.institution) && el("p", { class: "rr-sub", text: e.institution }),
            has(e.detail) && el("p", { class: "rr-detail", text: e.detail })),
          has(range) && el("p", { class: "rr-when", text: range }));
      }))
    ]);
  }

  /* ---------- Technical Terminal ------------------------------------- */
  const handle = function (d) {
    const n = String(d.profile.shortName || d.profile.name || "").trim().replace(/^(Dr|Prof|Mr|Ms|Mrs)\.\s+/i, "").split(/\s+/)[0];
    return F.slug(n || "portfolio") === "section" ? "portfolio" : F.slug(n || "portfolio");
  };
  const termHead = function (cmd, title, id) {
    return el("div", { class: "section-head reveal" },
      el("p", { class: "eyebrow term-cmd" }, el("span", { class: "term-prompt", "aria-hidden": "true", text: "$" }), " " + cmd),
      el("h2", { id: id, text: title }));
  };
  const terminal = {
    hero: function (d, refs, sk) {
      const p = d.profile, who = handle(d);
      const stats = heroStats(d);
      return el("section", { id: "top", class: "hero hero--terminal", "aria-labelledby": "hero-title" },
        el("div", { class: "container" },
          el("div", { class: "term-window reveal" },
            el("div", { class: "term-bar", "aria-hidden": "true" },
              el("span", { class: "term-dots" }, el("i"), el("i"), el("i")),
              el("span", { class: "term-title", text: who + "@portfolio: ~" })),
            el("div", { class: "term-body" },
              image(p.photo, "hero-photo"),
              el("p", { class: "term-line", "aria-hidden": "true" }, el("span", { class: "term-prompt", text: "$" }), " whoami"),
              el("h1", { id: "hero-title", text: p.name || "" }),
              has(p.title) && el("p", { class: "hero-role" }, el("span", { class: "term-comment", "aria-hidden": "true", text: "# " }), p.title),
              has(p.tagline) && el("p", { class: "hero-pitch" }, F.rich(p.tagline)),
              (has(p.status) || has(p.location)) && el("p", { class: "hero-meta" },
                has(p.status) && el("span", { class: "term-ok" }, el("span", { class: "pulse", "aria-hidden": "true" }), p.status),
                has(p.location) && el("span", null, icon("map-pin"), p.location)),
              stats.length > 0 && el("p", { class: "term-line", "aria-hidden": "true" }, el("span", { class: "term-prompt", text: "$" }), " stats --summary"),
              statList(stats, "term-stats"),
              (has(p.email) || has(p.resumeUrl)) && el("div", { class: "hero-cta" },
                mailButton(p), resumeButton(p, refs, "btn btn-ghost", "resume.pdf"))))));
    },
    about: function (d, sk) {
      const facts = aboutFacts(d);
      return wrap("about", null, "about-title", [
        termHead("cat README.md", aboutTitle(d, sk), "about-title"),
        el("div", { class: "readme reveal" },
          aboutParas(d),
          facts.length > 0 && el("dl", { class: "facts kv-lines" }, facts.map(function (f) {
            return el("div", null, el("dt", { text: F.slug(f[0]).replace(/-/g, "_") }), el("dd", { text: f[1] }));
          })))
      ]);
    },
    projects: function (d, sk) {
      const ordered = orderedProjects(d), cards = [];
      const grid = el("div", { class: "repo-grid" }, ordered.map(function (p, i) {
        const node = el("article", { class: "project-card repo-card reveal" + (p.featured ? " is-featured" : ""), style: "--delay:" + Math.min(i, 4) * 60 + "ms" },
          image(p.image, "project-cover"),
          el("div", { class: "project-top" },
            icon("folder-git-2"),
            el("span", { class: "repo-path", text: handle(d) + "/" + F.slug(p.title || "project-" + (i + 1)) }),
            p.featured === true && el("span", { class: "featured-flag", text: "pinned" })),
          el("h3", { text: p.title || "Project" }),
          has(p.blurb) && el("p", { class: "project-blurb" }, F.rich(p.blurb)),
          papList(p, null, "pap-code"),
          links(p.links, "project-links"),
          chips(p.tech, (p.title || "Project") + " technologies"));
        cards.push({ node: node, tech: arr(p.tech) });
        return node;
      }));
      const f = filterBar(cards, techUsage(ordered).map(function (t) { return t.name; }));
      return wrap("projects", null, "projects-title", [
        termHead("ls ./" + F.slug(navLabel(d, sk, "projects")), heading(d, sk, "projects", navLabel(d, sk, "projects")), "projects-title"),
        f.bar, f.status, grid
      ]);
    },
    skills: function (d, sk) {
      return wrap("skills", null, "skills-title", [
        termHead("cat " + F.slug(navLabel(d, sk, "skills")) + ".yml", heading(d, sk, "skills", navLabel(d, sk, "skills")), "skills-title"),
        el("div", { class: "code-file reveal" },
          el("p", { class: "code-name", "aria-hidden": "true", text: F.slug(navLabel(d, sk, "skills")) + ".yml" }),
          el("dl", { class: "config" }, arr(d.skills).map(function (g) {
            return el("div", { class: "config-row" },
              el("dt", { text: g.category || "skills" }),
              el("dd", null, el("ul", { class: "config-list", role: "list" }, arr(g.items).map(function (t) { return el("li", { text: t }); }))));
          })))
      ]);
    },
    experience: function (d, sk) {
      return wrap("experience", null, "experience-title", [
        termHead("git log --" + F.slug(navLabel(d, sk, "experience")), heading(d, sk, "experience", navLabel(d, sk, "experience")), "experience-title"),
        el("ol", { class: "git-log" }, F.byStartDesc(d.experience, "startDate").map(function (job, i) {
          const current = !has(job.endDate) && has(job.startDate);
          const start = F.parseYM(job.startDate);
          const dur = F.fmtDuration(F.monthsBetween(job.startDate, job.endDate));
          return el("li", { class: "commit reveal" + (current ? " is-current" : ""), style: "--delay:" + Math.min(i, 4) * 60 + "ms" },
            el("p", { class: "commit-ref" },
              el("span", { class: "commit-hash", text: start ? start.y + (start.m ? "-" + pad2(start.m) : "") : "—" }),
              current && el("span", { class: "commit-head", text: "HEAD → current" })),
            el("h3", null, job.role || job.company || "Role", has(job.company) && el("span", { class: "commit-at", text: " @ " + job.company })),
            el("p", { class: "commit-meta", text: joinDot([F.fmtRange(job.startDate, job.endDate, true), dur, job.location]) }),
            has(job.summary) && el("p", { class: "tl-summary" }, F.rich(job.summary)),
            has(job.highlights) && el("ul", { class: "diff", role: "list" }, arr(job.highlights).map(function (h) { return el("li", null, F.rich(h)); })),
            chips(job.tech, (job.company || "Role") + " technologies"));
        }))
      ]);
    },
    certifications: function (d, sk) { return simpleRows(d, sk, "ls-rows", "$ ls ./" + F.slug(navLabel(d, sk, "certifications"))); },
    education: function (d, sk) { return eduRows(d, sk, "ls-rows", "$ ls ./" + F.slug(navLabel(d, sk, "education"))); }
  };

  /* ---------- Executive Dossier -------------------------------------- */
  const chapter = function (n, title, id, kicker) {
    return el("div", { class: "section-head reveal" },
      el("p", { class: "eyebrow chapter-no", text: pad2(n) + (has(kicker) ? " — " + kicker : "") }),
      el("h2", { id: id, text: title }));
  };
  const dossier = {
    hero: function (d, refs, sk) {
      const p = d.profile, t = F.totals(), cur = currentRole(d);
      const school = F.byStartDesc(d.education, "startYear")[0];
      const glance = [
        cur && has(cur.company) && ["Current", [cur.role, cur.company].filter(has).join(", ")],
        has(p.location) && ["Based in", p.location],
        has(t.years) && ["Experience", t.years + "+ years"],
        certShort(d).length > 0 && ["Credentials", certShort(d).slice(0, 4).join(" · ")],
        school && has(school.degree) && ["Education", [school.degree, school.institution].filter(has).join(", ")]
      ].filter(Boolean);
      return el("section", { id: "top", class: "hero hero--dossier", "aria-labelledby": "hero-title" },
        el("div", { class: "container" },
          el("div", { class: "dossier-grid" + (image(p.photo) || glance.length ? " has-aside" : "") },
            el("div", { class: "dossier-intro" },
              has(p.title) && el("p", { class: "hero-role reveal", text: p.title }),
              el("h1", { id: "hero-title", class: "reveal", style: "--delay:60ms", text: p.name || "" }),
              has(p.tagline) && el("p", { class: "hero-pitch reveal", style: "--delay:120ms" }, F.rich(p.tagline)),
              (has(p.email) || has(p.resumeUrl)) && el("div", { class: "hero-cta reveal", style: "--delay:180ms" },
                mailButton(p, "Contact"), resumeButton(p, refs, "btn btn-ghost", "Download CV")),
              has(p.status) && el("p", { class: "hero-tag reveal", style: "--delay:220ms", text: p.status })),
            (image(p.photo) || glance.length > 0) && el("aside", { class: "dossier-card reveal", style: "--delay:160ms", "aria-label": "At a glance" },
              image(p.photo, "hero-photo"),
              glance.length > 0 && el("div", { class: "glance" },
                el("p", { class: "glance-title", text: "At a glance" }),
                el("dl", null, glance.map(function (g) { return el("div", null, el("dt", { text: g[0] }), el("dd", { text: g[1] })); })))))));
    },
    about: function (d, sk, refs, n) {
      const wins = achievements(d, 4);
      return wrap("about", null, "about-title", [
        chapter(n, aboutTitle(d, sk), "about-title", navLabel(d, sk, "about")),
        el("div", { class: "chapter-body" },
          aboutParas(d, "lede"),
          wins.length > 0 && el("div", { class: "achievements reveal" },
            el("h3", { text: "Selected achievements" }),
            el("ol", { class: "win-list", role: "list" }, wins.map(function (w) {
              return el("li", null, el("p", null, F.rich(w.text)), el("p", { class: "win-src", text: joinDot([w.job.role, w.job.company]) }));
            }))))
      ]);
    },
    experience: function (d, sk, refs, n) {
      return wrap("experience", null, "experience-title", [
        chapter(n, heading(d, sk, "experience"), "experience-title"),
        el("ol", { class: "chapter-body career" }, F.byStartDesc(d.experience, "startDate").map(function (job, i) {
          const dur = F.fmtDuration(F.monthsBetween(job.startDate, job.endDate));
          return el("li", { class: "career-item reveal" + (!has(job.endDate) && has(job.startDate) ? " is-current" : ""), style: "--delay:" + Math.min(i, 4) * 60 + "ms" },
            el("div", { class: "career-when" }, el("span", { text: F.fmtRange(job.startDate, job.endDate, true) }), has(dur) && el("span", { class: "tl-dur", text: dur })),
            el("div", { class: "career-what" },
              has(job.company) && el("p", { class: "career-org", text: joinDot([job.company, job.location]) }),
              el("h3", { text: job.role || job.company || "Role" }),
              has(job.summary) && el("p", { class: "tl-summary" }, F.rich(job.summary)),
              has(job.highlights) && el("ul", { class: "tl-list", role: "list" }, arr(job.highlights).map(function (h) { return el("li", null, F.rich(h)); }))));
        }))
      ]);
    },
    projects: function (d, sk, refs, n) {
      return wrap("projects", null, "projects-title", [
        chapter(n, heading(d, sk, "projects"), "projects-title"),
        el("div", { class: "chapter-body cases" }, orderedProjects(d).map(function (p, i) {
          return el("article", { class: "project-card case reveal" + (p.image && has(p.image.src) ? " has-image" : ""), style: "--delay:" + Math.min(i, 3) * 60 + "ms" },
            el("div", { class: "case-head" },
              el("span", { class: "project-num", text: "Case " + pad2(i + 1) }),
              el("h3", { text: p.title || "Case study" }),
              has(p.blurb) && el("p", { class: "project-blurb" }, F.rich(p.blurb))),
            image(p.image, "project-cover"),
            papList(p, ["Challenge", "Approach", "Outcome"], "pap-cols"),
            links(p.links, "project-links"));
        }))
      ]);
    },
    skills: function (d, sk, refs, n) {
      return wrap("skills", null, "skills-title", [
        chapter(n, heading(d, sk, "skills"), "skills-title"),
        el("div", { class: "chapter-body expertise reveal" }, arr(d.skills).map(function (g) {
          return el("div", { class: "expertise-col" }, el("h3", { text: g.category || "Expertise" }),
            el("ul", { class: "inline-list", role: "list" }, arr(g.items).map(function (t) { return el("li", { text: t }); })));
        }))
      ]);
    },
    certifications: function (d, sk, refs, n) {
      const node = simpleRows(d, sk, "chapter-body ledger");
      node.querySelector(".section-head").replaceWith(chapter(n, heading(d, sk, "certifications"), "certifications-title"));
      return node;
    },
    education: function (d, sk, refs, n) {
      const node = eduRows(d, sk, "chapter-body ledger");
      node.querySelector(".section-head").replaceWith(chapter(n, heading(d, sk, "education"), "education-title"));
      return node;
    },
    custom: function (sec, id, n) {
      const node = customSection(sec, id, pad2(n) + " — " + (sec.eyebrow || sec.title));
      node.querySelector(".eyebrow") && node.querySelector(".eyebrow").classList.add("chapter-no");
      return node;
    }
  };

  /* ---------- Product Case Study ------------------------------------- */
  const caseStudy = {
    hero: function (d, refs, sk) {
      const p = d.profile, list = orderedProjects(d);
      return el("section", { id: "top", class: "hero hero--statement" + (has(p.tagline) ? " has-pitch" : " no-pitch"), "aria-labelledby": "hero-title" },
        el("div", { class: "container" },
          el("div", { class: "statement-id reveal" },
            image(p.photo, "hero-photo"),
            el("div", null,
              el("h1", { id: "hero-title", text: p.name || "" }),
              has(p.title) && el("p", { class: "hero-role", text: joinDot([p.title, p.location]) }))),
          has(p.tagline) && el("p", { class: "hero-pitch statement reveal", style: "--delay:80ms" }, F.rich(p.tagline)),
          (has(p.email) || has(p.resumeUrl) || has(p.status)) && el("div", { class: "hero-cta reveal", style: "--delay:160ms" },
            mailButton(p), list.length > 0 && el("a", { class: "btn btn-ghost", href: "#projects" }, icon("arrow-down"), "Read the case studies"), resumeButton(p, refs)),
          has(p.status) && el("p", { class: "hero-tag reveal", style: "--delay:200ms" }, el("span", { class: "pulse", "aria-hidden": "true" }), p.status),
          list.length > 0 && el("nav", { class: "case-index reveal", style: "--delay:240ms", "aria-label": "Case study index" },
            el("ol", { role: "list" }, list.map(function (pr, i) {
              return el("li", null, el("a", { href: "#case-" + (i + 1) },
                el("span", { class: "ci-num", text: pad2(i + 1) }),
                el("span", { class: "ci-title", text: pr.title || "Case study" }),
                has(pr.result) && el("span", { class: "ci-result", text: F.plain(pr.result) })));
            })))));
    },
    projects: function (d, sk) {
      return wrap("projects", null, "projects-title", [
        sectionHead(navLabel(d, sk, "projects"), heading(d, sk, "projects"), "projects-title"),
        el("div", { class: "case-list" }, orderedProjects(d).map(function (p, i) {
          const rows = papRows(p);
          return el("article", { id: "case-" + (i + 1), class: "project-card case-chapter reveal" + (p.image && has(p.image.src) ? " has-image" : " no-image") },
            el("header", { class: "case-head" },
              el("span", { class: "project-num", text: pad2(i + 1) }),
              el("div", null,
                el("h3", { text: p.title || "Case study" }),
                has(p.blurb) && el("p", { class: "project-blurb" }, F.rich(p.blurb)),
                chips(p.tech, (p.title || "Project") + " tools"))),
            image(p.image, "project-cover"),
            rows.length > 0 && el("ol", { class: "case-steps", role: "list" }, rows.map(function (r, j) {
              return el("li", { class: r[2] }, el("p", { class: "step-k" }, el("span", { class: "step-n", text: String(j + 1) }), r[0]), el("p", { class: "step-v" }, F.rich(r[1])));
            })),
            links(p.links, "project-links"));
        }))
      ]);
    },
    experience: function (d, sk) {
      return wrap("experience", null, "experience-title", [
        sectionHead(navLabel(d, sk, "experience"), heading(d, sk, "experience"), "experience-title"),
        el("ol", { class: "role-list" }, F.byStartDesc(d.experience, "startDate").map(function (job, i) {
          return el("li", { class: "role-item reveal", style: "--delay:" + Math.min(i, 4) * 60 + "ms" },
            el("p", { class: "role-when", text: F.fmtRange(job.startDate, job.endDate, true) }),
            el("div", null,
              el("h3", null, job.role || "Role", has(job.company) && el("span", { class: "role-org", text: " — " + job.company })),
              has(job.summary) && el("p", { class: "tl-summary" }, F.rich(job.summary)),
              has(job.highlights) && el("ul", { class: "tl-list", role: "list" }, arr(job.highlights).map(function (h) { return el("li", null, F.rich(h)); }))));
        }))
      ]);
    },
    about: function (d, sk) {
      return wrap("about", "section-alt", "about-title", [
        sectionHead(navLabel(d, sk, "about"), aboutTitle(d, sk), "about-title"),
        el("div", { class: "about-grid" }, aboutParas(d, "lede"), factsBox(aboutFacts(d), "Quick facts"))
      ]);
    },
    skills: function (d, sk) {
      return wrap("skills", null, "skills-title", [
        sectionHead(navLabel(d, sk, "skills"), heading(d, sk, "skills"), "skills-title"),
        el("div", { class: "toolkit reveal" }, arr(d.skills).map(function (g) {
          return el("div", { class: "toolkit-group" }, el("h3", null, icon(g.icon), g.category || "Tools"), chips(g.items, g.category));
        }))
      ]);
    },
    certifications: function (d, sk) { return simpleRows(d, sk, "clean-rows", navLabel(d, sk, "certifications")); },
    education: function (d, sk) { return eduRows(d, sk, "clean-rows", navLabel(d, sk, "education")); }
  };

  /* ---------- Academic CV -------------------------------------------- */
  const academic = {
    hero: function (d, refs, sk) {
      const p = d.profile, cur = currentRole(d);
      const ids = [
        has(p.location) && el("li", null, icon("map-pin"), el("span", { text: p.location })),
        has(p.email) && el("li", null, icon("mail"), el("a", { href: "mailto:" + p.email, text: p.email })),
        has(p.phone) && el("li", null, icon("phone"), el("a", { href: "tel:" + String(p.phone).replace(/[^\d+]/g, ""), text: p.phone }))
      ].concat(arr(p.links).filter(function (l) { return has(l.url); }).map(function (l) {
        return el("li", null, icon(l.icon || (PF.icons ? PF.icons.guess(l.label, l.url) : "link")), el("a", { href: l.url, target: "_blank", rel: "noopener noreferrer", text: l.label || l.url }));
      })).filter(Boolean);
      return el("section", { id: "top", class: "hero hero--sidebar", "aria-labelledby": "hero-title" },
        el("div", { class: "container" },
          el("div", { class: "id-card" },
            image(p.photo, "hero-photo reveal"),
            el("h1", { id: "hero-title", class: "reveal", text: p.name || "" }),
            has(p.title) && el("p", { class: "hero-role reveal", text: p.title }),
            cur && has(cur.company) && el("p", { class: "affil reveal", text: cur.company }),
            has(p.tagline) && el("p", { class: "hero-pitch reveal" }, F.rich(p.tagline)),
            ids.length > 0 && el("ul", { class: "id-list reveal", role: "list" }, ids),
            has(p.resumeUrl) && el("div", { class: "hero-cta reveal" }, resumeButton(p, refs, "btn btn-ghost", "CV (PDF)")))));
    },
    about: function (d, sk) {
      return wrap("about", null, "about-title", [sectionHead(null, aboutTitle(d, sk), "about-title"), aboutParas(d)]);
    },
    education: function (d, sk) {
      return wrap("education", null, "education-title", [
        sectionHead(null, heading(d, sk, "education"), "education-title"),
        el("ol", { class: "cv-table", role: "list" }, F.byStartDesc(d.education, "startYear").map(function (e) {
          return el("li", { class: "cv-entry reveal" },
            el("p", { class: "cv-yr", text: F.fmtRange(e.startYear, e.endYear) }),
            el("div", null,
              el("h3", { text: e.degree || e.institution || "Education" }),
              has(e.degree) && has(e.institution) && el("p", { class: "cv-inst", text: e.institution }),
              has(e.detail) && el("p", { class: "cv-note", text: e.detail })));
        }))
      ]);
    },
    experience: function (d, sk) {
      return wrap("experience", null, "experience-title", [
        sectionHead(null, heading(d, sk, "experience"), "experience-title"),
        el("ol", { class: "cv-table", role: "list" }, F.byStartDesc(d.experience, "startDate").map(function (job) {
          const s = F.parseYM(job.startDate), e = has(job.endDate) ? F.parseYM(job.endDate) : null;
          const yr = s ? s.y + "–" + (has(job.endDate) ? (e ? e.y : job.endDate) : "present") : "";
          return el("li", { class: "cv-entry reveal" },
            el("p", { class: "cv-yr", text: yr }),
            el("div", null,
              el("h3", { text: job.role || job.company || "Appointment" }),
              has(job.company) && el("p", { class: "cv-inst", text: joinDot([job.company, job.location]) }),
              has(job.summary) && el("p", { class: "cv-note" }, F.rich(job.summary)),
              has(job.highlights) && el("ul", { class: "tl-list", role: "list" }, arr(job.highlights).map(function (h) { return el("li", null, F.rich(h)); }))));
        }))
      ]);
    },
    projects: function (d, sk) {
      return wrap("projects", null, "projects-title", [
        sectionHead(null, heading(d, sk, "projects"), "projects-title"),
        el("div", { class: "research-list" }, orderedProjects(d).map(function (p) {
          return el("article", { class: "project-card research reveal" },
            el("h3", { text: p.title || "Project" }),
            has(p.blurb) && el("p", { class: "project-blurb" }, F.rich(p.blurb)),
            papList(p, sk.par, "pap-prose"),
            links(p.links, "project-links"),
            has(p.tech) && el("p", { class: "cv-note keywords" }, el("em", { text: "Keywords: " }), arr(p.tech).join(", ")));
        }))
      ]);
    },
    certifications: function (d, sk) {
      return wrap("certifications", null, "certifications-title", [
        sectionHead(null, heading(d, sk, "certifications"), "certifications-title"),
        el("ol", { class: "cv-table", role: "list" }, arr(d.certifications).map(function (c) {
          return el("li", { class: "cv-entry reveal" },
            el("p", { class: "cv-yr", text: c.year || "" }),
            el("div", null, el("h3", { text: c.name || "Award" }), has(c.issuer) && el("p", { class: "cv-inst", text: c.issuer }), verifyLink(c)));
        }))
      ]);
    },
    skills: function (d, sk) {
      return wrap("skills", null, "skills-title", [
        sectionHead(null, heading(d, sk, "skills"), "skills-title"),
        el("dl", { class: "skill-rows reveal" }, arr(d.skills).map(function (g) {
          return el("div", null, el("dt", { text: g.category || "Methods" }),
            el("dd", null, el("ul", { class: "inline-list", role: "list" }, arr(g.items).map(function (t) { return el("li", { text: t }); }))));
        }))
      ]);
    }
  };

  /* ---------- Freelancer Services ------------------------------------ */
  function servicesSection(d) {
    return arr(d.sections).filter(function (s) { return has(s.title) && arr(s.items).length > 0 && SERVICES.test((s.id || "") + " " + s.title); })[0] || null;
  }
  /* No portrait: the hero's second column lists what the person offers —
     their own services section if they wrote one, else their skill areas. */
  function offerCard(d, sk) {
    const own = servicesSection(d);
    const names = (own ? arr(own.items).map(function (it) { return it.title; }) : arr(d.skills).map(function (g) { return g.category; })).filter(has).slice(0, 5);
    if (!names.length) return null;
    const cur = currentRole(d);
    return el("aside", { class: "offer-card reveal", style: "--delay:120ms", "aria-label": "Services at a glance" },
      el("p", { class: "ob-k", text: own ? (own.title || "Services") : navLabel(d, sk, "skills") }),
      el("ol", { class: "offer-list", role: "list" }, names.map(function (n, i) {
        return el("li", null, el("span", { class: "ol-n", text: pad2(i + 1) }), el("a", { href: own ? "#" + F.slug(own.id || own.title) : "#skills", text: n }));
      })),
      cur && has(cur.company) && el("p", { class: "offer-now" }, el("span", { class: "ob-k", text: has(cur.endDate) ? "Most recently" : "Currently" }), el("span", { text: [cur.role, cur.company].filter(has).join(" · ") })));
  }
  const freelancer = {
    hero: function (d, refs, sk) {
      const p = d.profile, t = F.totals(), cur = currentRole(d), nP = arr(d.projects).length;
      const proof = [
        has(t.years) && t.years + "+ years",
        nP > 0 && nP + (nP === 1 ? " case study" : " case studies"),
        has(p.location) && p.location
      ].filter(Boolean);
      const photo = image(p.photo, "hero-photo");
      return el("section", { id: "top", class: "hero hero--offer", "aria-labelledby": "hero-title" },
        el("div", { class: "container" },
          el("div", { class: "offer-grid" + (photo ? " has-photo" : "") },
            el("div", { class: "offer-copy" },
              has(p.status) && el("p", { class: "hero-tag reveal" }, el("span", { class: "pulse", "aria-hidden": "true" }), p.status),
              el("h1", { id: "hero-title", class: "reveal", style: "--delay:60ms", text: p.name || "" }),
              has(p.title) && el("p", { class: "hero-role reveal", style: "--delay:100ms", text: p.title }),
              has(p.tagline) && el("p", { class: "hero-pitch reveal", style: "--delay:140ms" }, F.rich(p.tagline)),
              (has(p.email) || nP > 0) && el("div", { class: "hero-cta reveal", style: "--delay:200ms" },
                mailButton(p, "Start a project", "btn btn-primary btn-lg"),
                nP > 0 && el("a", { class: "btn btn-ghost btn-lg", href: "#projects" }, "See recent work"),
                resumeButton(p, refs)),
              proof.length > 0 && el("p", { class: "offer-proof reveal", style: "--delay:240ms" }, proof.map(function (x) { return el("span", { text: x }); }))),
            photo ? el("div", { class: "offer-visual reveal", style: "--delay:120ms" }, photo,
              cur && has(cur.company) && el("p", { class: "offer-badge" }, el("span", { class: "ob-k", text: has(cur.endDate) ? "Most recently" : "Currently" }), el("span", { text: [cur.role, cur.company].filter(has).join(" · ") })))
              : offerCard(d, sk))));
    },
    skills: function (d, sk) {
      const own = servicesSection(d);
      if (own) {
        /* The customer wrote their own services — skills become the toolkit. */
        const lab = label(d, "skills", "");
        const title = !has(lab) || /^(services|what i do)$/i.test(lab) ? "Toolkit" : lab;
        return wrap("skills", null, "skills-title", [
          sectionHead("Tools & skills", title, "skills-title"),
          el("div", { class: "toolkit reveal" }, arr(d.skills).map(function (g) {
            return el("div", { class: "toolkit-group" }, el("h3", { text: g.category || "Tools" }), chips(g.items, g.category));
          }))
        ]);
      }
      const usage = arr(d.projects);
      return wrap("skills", "section-alt", "skills-title", [
        sectionHead(navLabel(d, sk, "skills"), heading(d, sk, "skills"), "skills-title"),
        el("div", { class: "service-grid" }, arr(d.skills).map(function (g, i) {
          const items = arr(g.items);
          const seen = usage.filter(function (p) { return arr(p.tech).some(function (t) { return items.indexOf(t) !== -1; }); }).slice(0, 2);
          return el("article", { class: "service-card reveal", style: "--delay:" + Math.min(i, 5) * 70 + "ms" },
            el("span", { class: "service-icon", "aria-hidden": "true" }, icon(g.icon || "sparkles") || pad2(i + 1)),
            el("h3", { text: g.category || "Service" }),
            chips(items, g.category),
            seen.length > 0 && el("p", { class: "service-seen" }, el("span", { text: "Seen in " }), seen.map(function (p, j) {
              const idx = orderedProjects(d).indexOf(p);
              return [j ? ", " : "", el("a", { href: "#work-" + (idx + 1), text: p.title || "a project" })];
            })));
        }))
      ]);
    },
    projects: function (d, sk) {
      return wrap("projects", null, "projects-title", [
        sectionHead(navLabel(d, sk, "projects"), heading(d, sk, "projects"), "projects-title"),
        el("div", { class: "work-grid" }, orderedProjects(d).map(function (p, i) {
          return el("article", { id: "work-" + (i + 1), class: "project-card client-card reveal" + (p.featured ? " is-featured" : ""), style: "--delay:" + Math.min(i, 3) * 70 + "ms" },
            image(p.image, "project-cover"),
            el("div", { class: "client-body" },
              has(p.tech) && el("p", { class: "client-tags", text: arr(p.tech).slice(0, 3).join(" · ") }),
              el("h3", { text: p.title || "Project" }),
              has(p.blurb) && el("p", { class: "project-blurb" }, F.rich(p.blurb)),
              has(p.result) && el("p", { class: "client-result" }, el("span", { class: "cr-k", text: "Outcome" }), el("span", null, F.rich(p.result))),
              (has(p.problem) || has(p.approach)) && el("details", { class: "client-more" },
                el("summary", { text: "How it was done" }),
                papList({ problem: p.problem, approach: p.approach })),
              links(p.links, "project-links")));
        }))
      ]);
    },
    about: function (d, sk) {
      return wrap("about", null, "about-title", [
        sectionHead(navLabel(d, sk, "about"), aboutTitle(d, sk), "about-title"),
        el("div", { class: "about-grid" }, aboutParas(d, "lede"), factsBox(aboutFacts(d), "In brief"))
      ]);
    },
    experience: function (d, sk) {
      return wrap("experience", "section-alt", "experience-title", [
        sectionHead(navLabel(d, sk, "experience"), heading(d, sk, "experience"), "experience-title"),
        el("ol", { class: "bg-list" }, F.byStartDesc(d.experience, "startDate").map(function (job, i) {
          return el("li", { class: "bg-item reveal", style: "--delay:" + Math.min(i, 4) * 50 + "ms" },
            el("div", { class: "bg-top" },
              el("h3", null, job.role || "Role", has(job.company) && el("span", { class: "bg-org", text: " · " + job.company })),
              el("p", { class: "bg-when", text: F.fmtRange(job.startDate, job.endDate, true) })),
            has(job.summary) && el("p", { class: "tl-summary" }, F.rich(job.summary)),
            has(job.highlights) && el("ul", { class: "tl-list", role: "list" }, arr(job.highlights).map(function (h) { return el("li", null, F.rich(h)); })));
        }))
      ]);
    },
    certifications: function (d, sk) { return simpleRows(d, sk, "clean-rows", navLabel(d, sk, "certifications")); },
    education: function (d, sk) { return eduRows(d, sk, "clean-rows", navLabel(d, sk, "education")); }
  };

  /* ---------- Creative Showcase -------------------------------------- */
  /* A project without an image still gets a designed cover: its number and
     its own outcome line (or blurb), set large. Nothing here is new text. */
  function coverFallback(p, i) {
    const line = F.plain(has(p.result) ? p.result : (p.blurb || ""));
    return el("div", { class: "work-cover", "aria-hidden": "true", style: "--mix:" + [16, 28, 9, 36][i % 4] + "%" },
      el("span", { class: "wc-num", text: pad2(i + 1) }),
      has(line) && el("span", { class: "wc-title", text: line.length > 90 ? line.slice(0, 88).replace(/\s+\S*$/, "") + "…" : line }),
      has(p.tech) && el("span", { class: "wc-tags", text: arr(p.tech).slice(0, 3).join(" / ") }));
  }
  const showcase = {
    hero: function (d, refs, sk) {
      const p = d.profile;
      return el("section", { id: "top", class: "hero hero--poster", "aria-labelledby": "hero-title" },
        el("div", { class: "container" },
          el("h1", { id: "hero-title", class: "reveal", text: p.name || "" }),
          el("div", { class: "poster-row reveal", style: "--delay:100ms" },
            image(p.photo, "hero-photo"),
            el("div", { class: "poster-copy" },
              has(p.title) && el("p", { class: "hero-role", text: p.title }),
              has(p.tagline) && el("p", { class: "hero-pitch" }, F.rich(p.tagline))),
            el("div", { class: "poster-side" },
              has(p.status) && el("p", { class: "hero-tag" }, el("span", { class: "pulse", "aria-hidden": "true" }), p.status),
              has(p.location) && el("p", { class: "hero-meta" }, icon("map-pin"), p.location),
              (has(p.email) || has(p.resumeUrl)) && el("div", { class: "hero-cta" }, mailButton(p, "Say hello"), resumeButton(p, refs)))),
          arr(d.projects).length > 0 && el("a", { class: "scroll-cue reveal", href: "#projects", style: "--delay:200ms" }, "View the work", icon("arrow-down"))));
    },
    projects: function (d, sk) {
      const ordered = orderedProjects(d), cards = [];
      const wall = el("div", { class: "work-wall" + (ordered.length === 1 ? " is-single" : "") }, ordered.map(function (p, i) {
        const rows = papRows(p);
        const media = image(p.image, "work-img") || coverFallback(p, i);
        const node = el("article", { class: "project-card work-tile reveal" + (i === 0 ? " is-lead" : "") + (p.image && has(p.image.src) ? " has-image" : " no-image"), style: "--delay:" + Math.min(i % 2, 1) * 90 + "ms" },
          el("figure", { class: "work-media" }, media),
          el("div", { class: "work-caption" },
            el("p", { class: "project-num", text: pad2(i + 1) + (has(p.tech) ? " — " + arr(p.tech).slice(0, 2).join(", ") : "") }),
            el("h3", { text: p.title || "Project" }),
            has(p.blurb) && el("p", { class: "project-blurb" }, F.rich(p.blurb)),
            rows.length > 0 && el("details", { class: "work-story" }, el("summary", { text: "The story" }), papList(p)),
            links(p.links, "project-links")));
        cards.push({ node: node, tech: arr(p.tech) });
        return node;
      }));
      const f = filterBar(cards, techUsage(ordered).map(function (t) { return t.name; }));
      return wrap("projects", null, "projects-title", [
        sectionHead(null, heading(d, sk, "projects"), "projects-title"),
        f.bar, f.status, wall
      ]);
    },
    about: function (d, sk) {
      return wrap("about", null, "about-title", [
        sectionHead(navLabel(d, sk, "about"), aboutTitle(d, sk), "about-title"),
        aboutParas(d, "big-lede")
      ]);
    },
    experience: function (d, sk) {
      return wrap("experience", null, "experience-title", [
        sectionHead(null, heading(d, sk, "experience"), "experience-title"),
        el("ol", { class: "credit-list" }, F.byStartDesc(d.experience, "startDate").map(function (job, i) {
          return el("li", { class: "credit reveal", style: "--delay:" + Math.min(i, 4) * 50 + "ms" },
            el("h3", { text: job.company || job.role || "Studio" }),
            el("p", { class: "credit-role", text: job.company ? (job.role || "") : "" }),
            el("p", { class: "credit-when", text: F.fmtRange(job.startDate, job.endDate, true) }),
            has(job.summary) && el("p", { class: "credit-note" }, F.rich(job.summary)));
        }))
      ]);
    },
    skills: function (d, sk) {
      return wrap("skills", null, "skills-title", [
        sectionHead(null, heading(d, sk, "skills"), "skills-title"),
        el("div", { class: "discipline-list reveal" }, arr(d.skills).map(function (g) {
          return el("div", { class: "discipline" }, el("h3", { text: g.category || "Discipline" }),
            el("p", { text: arr(g.items).join(", ") }));
        }))
      ]);
    },
    certifications: function (d, sk) { return simpleRows(d, sk, "clean-rows"); },
    education: function (d, sk) { return eduRows(d, sk, "clean-rows"); }
  };

  /* ---------- Data Analyst Report ------------------------------------ */
  function kpis(d) {
    const t = F.totals(), nP = arr(d.projects).length, nR = arr(d.experience).length, nS = skillCount(d), nC = arr(d.certifications).length;
    const orgs = {};
    arr(d.experience).forEach(function (j) { if (has(j.company)) orgs[String(j.company).trim().toLowerCase()] = true; });
    const nO = Object.keys(orgs).length;
    return [
      has(t.years) && { key: "years", n: t.years, label: "Years of experience" },
      nO > 0 && { key: "organisations", n: String(nO), label: nO === 1 ? "Organisation" : "Organisations" },
      nP > 0 && { key: "projects", n: String(nP), label: nP === 1 ? "Case study" : "Case studies" },
      nS > 0 && { key: "skills", n: String(nS), label: "Tools & methods" },
      nC > 0 && { key: "certifications", n: String(nC), label: nC === 1 ? "Certification" : "Certifications" },
      nR > 0 && !nO && { key: "roles", n: String(nR), label: nR === 1 ? "Role" : "Roles" }
    ].filter(Boolean);
  }

  /* Horizontal bars: one series, so no legend; values and names in text
     tokens beside the mark; the bar itself is presentation only. */
  function barList(rows, unit, cls) {
    const max = rows.reduce(function (m, r) { return Math.max(m, r.n); }, 0) || 1;
    return el("ul", { class: "bar-list " + (cls || ""), role: "list" }, rows.map(function (r) {
      return el("li", { class: "bar-row", title: r.name + ": " + r.n + " " + unit },
        el("span", { class: "bar-name", text: r.name }),
        el("span", { class: "bar-track", "aria-hidden": "true" }, el("span", { class: "bar-fill", style: "--v:" + (r.n / max).toFixed(3) })),
        el("span", { class: "bar-val", text: r.n + (unit ? " " + unit : "") }),
        r.items && el("span", { class: "bar-items", text: r.items }));
    }));
  }

  /* Career timeline: each role's bar spans its real start/end months on a
     shared year axis. Undated roles are listed without a bar. */
  function ganttChart(d) {
    const jobs = F.byStartDesc(d.experience, "startDate").slice().reverse().map(function (j) {
      const s = F.parseYM(j.startDate);
      if (!s) return null;
      const now = new Date();
      const e = has(j.endDate) ? F.parseYM(j.endDate) : { y: now.getFullYear(), m: now.getMonth() + 1 };
      if (!e) return null;
      return { job: j, s: F.ymIndex(s), e: F.ymIndex(e) + 1 };
    }).filter(Boolean);
    if (!jobs.length) return null;
    const minY = Math.floor(Math.min.apply(null, jobs.map(function (j) { return j.s; })) / 12);
    const maxY = Math.ceil(Math.max.apply(null, jobs.map(function (j) { return j.e; })) / 12);
    const start = minY * 12, span = Math.max(12, maxY * 12 - start);
    const years = [];
    const step = (maxY - minY) > 12 ? 4 : (maxY - minY) > 6 ? 2 : 1;
    for (let y = minY; y <= maxY; y += step) years.push(y);
    return el("figure", { class: "chart gantt reveal" },
      el("figcaption", null, el("strong", { text: "Roles over time" }), el("span", { text: " · " + minY + "–" + (maxY - 1 >= minY ? maxY - 1 : minY) })),
      el("div", { class: "gantt-plot" },
        el("div", { class: "gantt-axis", "aria-hidden": "true" }, years.map(function (y) {
          return el("span", { class: "gantt-tick", style: "--x:" + ((y * 12 - start) / span).toFixed(4), text: String(y) });
        })),
        el("ol", { class: "gantt-rows", role: "list" }, jobs.map(function (j) {
          const range = F.fmtRange(j.job.startDate, j.job.endDate, true);
          return el("li", { class: "gantt-row" + (!has(j.job.endDate) ? " is-current" : ""), title: [j.job.role, j.job.company, range].filter(has).join(" · ") },
            el("span", { class: "gantt-label" }, el("strong", { text: j.job.role || "Role" }), has(j.job.company) && el("span", { text: j.job.company })),
            el("span", { class: "gantt-lane", "aria-hidden": "true" },
              el("span", { class: "gantt-bar", style: "--x:" + ((j.s - start) / span).toFixed(4) + ";--w:" + ((j.e - j.s) / span).toFixed(4) })),
            el("span", { class: "visually-hidden", text: range }));
        }))));
  }

  const report = {
    hero: function (d, refs, sk) {
      const p = d.profile, k = kpis(d);
      return el("section", { id: "top", class: "hero hero--report", "aria-labelledby": "hero-title" },
        el("div", { class: "container" },
          el("div", { class: "report-head reveal" },
            el("p", { class: "report-kicker" }, el("span", { text: "Portfolio report" }), has(p.location) && el("span", { text: p.location }), has(p.status) && el("span", { class: "report-status", text: p.status })),
            el("h1", { id: "hero-title", text: p.name || "" }),
            has(p.title) && el("p", { class: "hero-role", text: p.title }),
            has(p.tagline) && el("p", { class: "hero-pitch" }, F.rich(p.tagline)),
            (has(p.email) || has(p.resumeUrl)) && el("div", { class: "hero-cta" }, mailButton(p), resumeButton(p, refs))),
          k.length > 0 && el("dl", { class: "hero-stats kpi-strip reveal", style: "--delay:120ms" }, k.map(function (s) {
            return el("div", { "data-stat": s.key }, el("dt", { text: s.n }), el("dd", { text: s.label }));
          }))));
    },
    about: function (d, sk, refs, n) {
      return wrap("about", null, "about-title", [
        sectionHead("Section " + pad2(n), aboutTitle(d, sk), "about-title"),
        el("div", { class: "report-card summary-card" }, aboutParas(d), factsBox(aboutFacts(d), "Key facts", "facts-table"))
      ]);
    },
    skills: function (d, sk, refs, n) {
      const rows = arr(d.skills).filter(function (g) { return arr(g.items).length; }).map(function (g) {
        return { name: g.category || "Skills", n: arr(g.items).length, items: arr(g.items).join(", ") };
      });
      const usage = techUsage(d.projects).slice(0, 8);
      const nP = arr(d.projects).length;
      return wrap("skills", null, "skills-title", [
        sectionHead("Section " + pad2(n), heading(d, sk, "skills"), "skills-title"),
        el("div", { class: "chart-grid" + (usage.length && nP > 1 ? " two" : "") },
          rows.length > 0 && el("figure", { class: "chart reveal" },
            el("figcaption", null, el("strong", { text: "Tools per area" }), el("span", { text: " · count of listed skills" })),
            barList(rows, "", "bars-skills")),
          usage.length > 0 && nP > 1 && el("figure", { class: "chart reveal", style: "--delay:100ms" },
            el("figcaption", null, el("strong", { text: "Used across case studies" }), el("span", { text: " · of " + nP + " projects" })),
            barList(usage.map(function (u) { return { name: u.name, n: u.n }; }), "", "bars-usage")))
      ]);
    },
    experience: function (d, sk, refs, n) {
      return wrap("experience", "section-alt", "experience-title", [
        sectionHead("Section " + pad2(n), heading(d, sk, "experience"), "experience-title"),
        ganttChart(d),
        el("ol", { class: "ledger-rows" }, F.byStartDesc(d.experience, "startDate").map(function (job, i) {
          const dur = F.fmtDuration(F.monthsBetween(job.startDate, job.endDate));
          return el("li", { class: "ledger-row reveal", style: "--delay:" + Math.min(i, 4) * 50 + "ms" },
            el("div", { class: "lr-head" },
              el("h3", { text: job.role || "Role" }),
              el("p", { class: "lr-org", text: joinDot([job.company, job.location]) }),
              el("p", { class: "lr-when" }, el("span", { text: F.fmtRange(job.startDate, job.endDate, true) }), has(dur) && el("span", { class: "tl-dur", text: dur }))),
            has(job.summary) && el("p", { class: "tl-summary" }, F.rich(job.summary)),
            has(job.highlights) && el("ul", { class: "tl-list", role: "list" }, arr(job.highlights).map(function (h) { return el("li", null, F.rich(h)); })),
            chips(job.tech, (job.company || "Role") + " tools"));
        }))
      ]);
    },
    projects: function (d, sk, refs, n) {
      const ordered = orderedProjects(d), cards = [];
      const grid = el("div", { class: "finding-grid" }, ordered.map(function (p, i) {
        const rows = papRows(p, ["Question", "Approach", "Result"]);
        const node = el("article", { class: "project-card finding reveal" + (p.featured ? " is-featured" : ""), style: "--delay:" + Math.min(i % 2, 1) * 80 + "ms" },
          el("div", { class: "finding-head" },
            el("span", { class: "project-num", text: "Case " + pad2(i + 1) }),
            el("h3", { text: p.title || "Case study" }),
            has(p.blurb) && el("p", { class: "project-blurb" }, F.rich(p.blurb))),
          image(p.image, "project-cover"),
          rows.length > 0 && el("dl", { class: "finding-table" }, rows.map(function (r) {
            return el("div", { class: r[2] }, el("dt", { text: r[0] }), el("dd", null, F.rich(r[1])));
          })),
          links(p.links, "project-links"),
          chips(p.tech, (p.title || "Project") + " tools"));
        cards.push({ node: node, tech: arr(p.tech) });
        return node;
      }));
      const f = filterBar(cards, techUsage(ordered).map(function (t) { return t.name; }));
      return wrap("projects", null, "projects-title", [
        sectionHead("Section " + pad2(n), heading(d, sk, "projects"), "projects-title"),
        f.bar, f.status, grid
      ]);
    },
    certifications: function (d, sk, refs, n) { return simpleRows(d, sk, "table-rows", "Section " + pad2(n)); },
    education: function (d, sk, refs, n) { return eduRows(d, sk, "table-rows", "Section " + pad2(n)); },
    custom: function (sec, id, n) { return customSection(sec, id, "Section " + pad2(n) + (has(sec.eyebrow) ? " · " + sec.eyebrow : "")); }
  };

  const VIEWS = {
    "clean-recruiter": recruiter,
    "technical-terminal": terminal,
    "executive-dossier": dossier,
    "product-case-study": caseStudy,
    "academic-cv": academic,
    "freelancer-services": freelancer,
    "creative-showcase": showcase,
    "data-report": report
  };

  /* ====================================================================
     SECTION LIST — built-ins that have data, plus customs, ordered
     ==================================================================== */
  function sectionList(d, sk) {
    sk = sk || { id: "clean-recruiter" };
    const view = VIEWS[sk.id] || {};
    const pick = function (id, fallback) {
      return function (n, refs) { return view[id] ? view[id](d, sk, refs, n) : fallback(d, sk); };
    };
    const builtins = [
      { id: "about", when: function () { return has(d.profile.about); }, render: pick("about", about) },
      { id: "skills", when: function () { return arr(d.skills).length > 0; }, render: pick("skills", skills) },
      { id: "experience", when: function () { return arr(d.experience).length > 0; }, render: pick("experience", experience) },
      { id: "projects", when: function () { return arr(d.projects).length > 0; }, render: pick("projects", projects) },
      { id: "certifications", when: function () { return arr(d.certifications).length > 0; }, render: pick("certifications", certifications) },
      { id: "education", when: function () { return arr(d.education).length > 0; }, render: pick("education", education) }
    ].filter(function (s) { try { return s.when(); } catch (e) { return false; } })
     .map(function (s) { s.label = navLabel(d, sk, s.id); return s; });

    const used = {};
    builtins.forEach(function (b) { used[b.id] = true; });

    const customs = arr(d.sections).filter(function (s) {
      return has(s.title) && arr(s.items).length > 0;
    }).map(function (sec) {
      let id = F.slug(sec.id || sec.title);
      while (used[id]) id = id + "-x";        // never collide with a built-in
      used[id] = true;
      return { id: id, label: sec.title, custom: sec, render: function (n) { return view.custom ? view.custom(sec, id, n) : customSection(sec, id); } };
    });

    const hidden = arr(d.hiddenSections).map(String);
    const order = arr(d.sectionOrder).map(String);
    /* A template has a preferred order (a case-study page leads with
       projects) — but only as a DEFAULT: the moment the user sets their own
       sectionOrder, that's authoritative and the template's preference steps
       aside. Nothing is written back into data. */
    const pref = arr(sk.order).length ? arr(sk.order) : (sk.promote ? [sk.promote] : []);
    const rank = order.length
      ? function (s) { const i = order.indexOf(s.id); return i === -1 ? 9999 : i; }
      : function (s) { const i = pref.indexOf(s.id); return i === -1 ? (s.custom ? 500 : 400) : i; };

    const all = builtins.concat(customs)
      .filter(function (s) { return hidden.indexOf(s.id) === -1; })
      .map(function (s, i) { return { s: s, i: i }; })
      .sort(function (a, b) { return (rank(a.s) - rank(b.s)) || (a.i - b.i); })
      .map(function (x) { return x.s; });

    const p = d.profile;
    if ((has(p.email) || has(p.phone) || has(p.links)) && hidden.indexOf("contact") === -1) {
      all.push({ id: "contact", label: "Contact", footer: true });   // always last: it is the footer
    }
    return all;
  }

  /* ====================================================================
     HEAD — title, meta, Open Graph, JSON-LD
     ==================================================================== */
  function setMeta(doc, selector, attr, value) {
    const node = doc.head.querySelector(selector);
    if (node && has(value)) node.setAttribute(attr, value);
  }

  /* Crawlers want an absolute URL. Leave one alone if it already is, and
     join a repo-relative path onto siteUrl — never produce "site.com//path". */
  function absolute(path, base) {
    if (!has(path)) return "";
    const s = String(path).trim();
    if (/^(https?:)?\/\//i.test(s) || /^data:/i.test(s)) return s;
    return base ? base + "/" + s.replace(/^\/+/, "") : s;
  }

  /* The OG image is whichever shape the field was last edited in: a bare path,
     an absolute URL, or the { src, alt } object the builder's upload writes.
     Anything else (a stray object, a number) resolves to no image at all
     rather than stamping "[object Object]" into the meta tag. */
  function ogImageOf(p, base) {
    const raw = p.ogImage;
    const obj = raw && typeof raw === "object" && !Array.isArray(raw);
    const src = obj ? raw.src : (typeof raw === "string" ? raw : "");
    if (!has(src)) return { src: "", alt: "" };
    return { src: absolute(src, base), alt: obj && has(raw.alt) ? raw.alt : "" };
  }

  function head(d, doc) {
    const p = d.profile;
    const who = p.shortName || p.name;
    const desc = F.plain(p.tagline);
    const url = has(p.siteUrl) ? String(p.siteUrl).trim().replace(/\/+$/, "") : "";
    const og = ogImageOf(p, url);

    if (has(who) && has(p.title)) doc.title = who + " | " + p.title;

    setMeta(doc, 'meta[name="description"]', "content", desc);
    setMeta(doc, 'meta[name="author"]', "content", p.name);
    setMeta(doc, 'meta[property="og:title"]', "content", doc.title);
    setMeta(doc, 'meta[property="og:description"]', "content", desc);
    setMeta(doc, 'meta[property="og:url"]', "content", url);
    setMeta(doc, 'meta[property="og:image"]', "content", og.src);
    setMeta(doc, 'meta[property="og:image:alt"]', "content", og.src ? (og.alt || desc) : "");
    /* A large-image card with no image renders as an empty box on X/Twitter;
       downgrade to the text card instead. */
    setMeta(doc, 'meta[name="twitter:card"]', "content", og.src ? "summary_large_image" : "summary");
    setMeta(doc, 'meta[name="twitter:title"]', "content", doc.title);
    setMeta(doc, 'meta[name="twitter:description"]', "content", desc);
    setMeta(doc, 'meta[name="twitter:image"]', "content", og.src);
    setMeta(doc, 'link[rel="canonical"]', "href", url);

    const loc = String(p.location || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    const current = arr(d.experience).filter(function (j) { return !has(j.endDate); })[0];
    const person = { "@context": "https://schema.org", "@type": "Person" };

    if (has(p.name)) person.name = p.name;
    if (has(p.title)) person.jobTitle = p.title;
    if (has(desc)) person.description = desc;
    if (has(p.email)) person.email = "mailto:" + p.email;
    if (has(p.phone)) person.telephone = p.phone;
    if (has(url)) person.url = url;
    if (og.src) person.image = og.src;
    else if (p.photo && has(p.photo.src)) person.image = absolute(p.photo.src, url);
    if (loc.length) {
      person.address = { "@type": "PostalAddress", addressLocality: loc[0] };
      if (loc[1]) person.address.addressCountry = loc[1];
    }
    const sameAs = arr(p.links).map(function (l) { return l.url; })
      .filter(function (u) { return has(u) && /^https?:/i.test(u); });
    if (sameAs.length) person.sameAs = sameAs;
    if (current && has(current.company)) person.worksFor = { "@type": "Organization", name: current.company };
    const knows = arr(d.skills).reduce(function (a, g) { return a.concat(arr(g.items)); }, []);
    if (knows.length) person.knowsAbout = knows;
    const school = F.byStartDesc(d.education, "startYear")[0];
    if (school && has(school.institution)) person.alumniOf = { "@type": "EducationalOrganization", name: school.institution };
    if (arr(d.certifications).length) {
      person.hasCredential = arr(d.certifications).filter(function (c) { return has(c.name); }).map(function (c) {
        const cred = { "@type": "EducationalOccupationalCredential", name: c.name };
        if (has(c.issuer)) cred.recognizedBy = { "@type": "Organization", name: c.issuer };
        if (has(c.credentialUrl)) cred.url = c.credentialUrl;
        return cred;
      });
    }

    const old = doc.getElementById("ld-person");
    if (old) old.remove();
    const script = doc.createElement("script");
    script.type = "application/ld+json";
    script.id = "ld-person";
    script.textContent = JSON.stringify(person);
    doc.head.appendChild(script);
  }

  /* ====================================================================
     PAINT
     ==================================================================== */
  function normalise(data) {
    const d = data && typeof data === "object" ? data : {};
    return {
      theme: d.theme && typeof d.theme === "object" ? d.theme : {},
      pdf: d.pdf && typeof d.pdf === "object" ? d.pdf : {},
      template: d.template && typeof d.template === "object" ? d.template : {},
      sectionLabels: d.sectionLabels && typeof d.sectionLabels === "object" && !Array.isArray(d.sectionLabels) ? d.sectionLabels : {},
      profile: d.profile && typeof d.profile === "object" && !Array.isArray(d.profile) ? d.profile : {},
      experience: arr(d.experience), projects: arr(d.projects), skills: arr(d.skills),
      certifications: arr(d.certifications), education: arr(d.education), sections: arr(d.sections),
      sectionOrder: arr(d.sectionOrder), hiddenSections: arr(d.hiddenSections)
    };
  }

  const FALLBACK_SK = { id: "clean-recruiter", showStatBand: true, navMode: "top", order: [], labels: {}, headings: {} };

  function brandText(d, sk) {
    const full = String(d.profile.name || "").trim();
    const first = String(d.profile.shortName || "").trim() || full.replace(/^(Dr|Prof|Mr|Ms|Mrs)\.\s+/i, "").split(/\s+/)[0] || "";
    if (sk.brand === "full" && full) return full;
    if (sk.brand === "path") return "~/" + handle(d);
    return first || "Portfolio";
  }

  function paint(data, refs) {
    const d = normalise(data);
    const doc = refs.doc || document;
    F.useTotals(d.experience, d.profile);
    ANIM = (d.theme && typeof d.theme.iconAnimation === "string") ? d.theme.iconAnimation : "lift";
    /* Template is resolved live, every paint — same idiom as theme — since
       nobody "renames" a sidebar into a top bar the way they rename a
       section, so there's nothing to freeze. Retired ids resolve through
       PF.skeletons.ALIASES. */
    const sk = PF.skeletons ? PF.skeletons.byId(d.template.skeleton) : FALLBACK_SK;
    const view = VIEWS[sk.id] || {};

    clear(refs.main); clear(refs.navList); clear(refs.mobileList); clear(refs.footer);
    refs.footer.hidden = true;

    if (doc.body) {
      doc.body.dataset.skeleton = sk.id;
      doc.body.classList.toggle("is-sidenav", sk.navMode === "side");
      doc.body.classList.toggle("is-dense", sk.density === "dense");
    }

    if (refs.brand) {
      clear(refs.brand);
      append(refs.brand, [d.profile.brandIcon && sk.brand !== "path" && sk.brand !== "full" ? icon(d.profile.brandIcon) : brandText(d, sk)]);
      refs.brand.setAttribute("href", "#top");
      refs.brand.setAttribute("aria-label", (d.profile.name || "Home") + " — back to top");
    }

    head(d, doc);
    refs.main.appendChild(view.hero ? view.hero(d, refs, sk) : hero(d, refs, sk));

    const sectionHost = sk.sectionContainer ? el("div", { class: "portfolio-sections" }) : refs.main;
    if (sectionHost !== refs.main) refs.main.appendChild(sectionHost);

    const active = sectionList(d, sk);
    let n = 0;
    active.forEach(function (s) {
      if (s.footer) contact(d, refs.footer, refs, sk);
      else { n++; const node = s.render(n, refs); if (node) sectionHost.appendChild(node); }
    });

    [refs.navList, refs.mobileList].forEach(function (list) {
      active.forEach(function (s) {
        list.appendChild(el("li", null, el("a", { href: "#" + s.id, text: s.label })));
      });
    });
    /* Freelancer Services keeps the way to hire in the header too. */
    if (sk.id === "freelancer-services" && active.some(function (s) { return s.footer; }) && refs.navList) {
      refs.navList.appendChild(el("li", { class: "nav-cta" }, el("a", { class: "btn btn-primary", href: "#contact", text: "Start a project" })));
    }

    if (PF.icons) PF.icons.paint();
    return { sections: active, data: d, skeleton: sk };
  }

  PF.provide("render", {
    paint: paint,
    normalise: normalise,
    ctx: CTX,
    sectionList: sectionList,
    head: head,
    views: Object.keys(VIEWS)
  });
})();
