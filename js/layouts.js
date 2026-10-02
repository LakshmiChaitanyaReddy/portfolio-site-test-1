/* ==========================================================================
   layouts.js — how a custom section draws itself.

   A layout is one object: { id, name, blurb, fields, render(section, ctx) }.
   Add one here and it immediately appears in the builder's layout picker and
   becomes usable from data.json. Nothing else to wire up.

   Every item supports the same optional fields, and each layout uses the
   ones it cares about:
     title  subtitle  meta  value  body  bullets[]  tags[]
     image { src, alt }   links [{ label, url, icon }]   icon

   ctx (supplied by render.js) provides:
     el  has  arr  rich  plain  chips  image  links  icon
   ========================================================================== */
(function () {
  "use strict";
  const PF = (window.PF = window.PF || {});
  PF.modules = PF.modules || {};
  PF.provide = PF.provide || function (n, api) { PF[n] = api; PF.modules[n] = true; };

  const delay = function (i, cap) { return "--delay:" + Math.min(i, cap == null ? 6 : cap) * 80 + "ms"; };

  const LAYOUTS = [
    /* ------------------------------------------------------------------ */
    {
      id: "cards",
      name: "Cards",
      blurb: "Grid of cards. Talks, awards, side projects, open-source work.",
      fields: ["title", "subtitle", "meta", "body", "bullets", "tags", "image", "links"],
      render: function (sec, c) {
        return c.el("div", { class: "custom-grid" }, c.arr(sec.items).map(function (it, i) {
          return c.el("article", { class: "custom-card reveal", style: delay(i) },
            c.image(it.image, "custom-cover"),
            c.has(it.meta) && c.el("p", { class: "custom-meta", text: it.meta }),
            c.el("h3", { text: it.title || "Entry" }),
            c.has(it.subtitle) && c.el("p", { class: "custom-sub", text: it.subtitle }),
            c.has(it.body) && c.el("p", { class: "custom-body" }, c.rich(it.body)),
            c.has(it.bullets) && c.el("ul", { class: "tl-list", role: "list", style: "margin-bottom:.9rem" },
              c.arr(it.bullets).map(function (b) { return c.el("li", null, c.rich(b)); })),
            c.links(it.links, "custom-links"),
            c.chips(it.tags, it.title));
        }));
      }
    },

    /* ------------------------------------------------------------------ */
    {
      id: "timeline",
      name: "Timeline",
      blurb: "Dated vertical run, like Experience. Milestones, volunteering, a second track.",
      fields: ["title", "subtitle", "meta", "body", "bullets", "tags", "links"],
      render: function (sec, c) {
        return c.el("ol", { class: "timeline" }, c.arr(sec.items).map(function (it, i) {
          return c.el("li", { class: "tl-item reveal", style: delay(i) },
            c.el("div", { class: "tl-head" },
              c.el("h3", { text: it.title || "Entry" }),
              c.has(it.meta) && c.el("p", { class: "tl-date", text: it.meta })),
            c.has(it.subtitle) && c.el("p", { class: "tl-sub" },
              c.el("span", { class: "tl-company", text: it.subtitle })),
            c.has(it.body) && c.el("p", { class: "tl-summary" }, c.rich(it.body)),
            c.has(it.bullets) && c.el("ul", { class: "tl-list", role: "list" },
              c.arr(it.bullets).map(function (b) { return c.el("li", null, c.rich(b)); })),
            c.links(it.links, "custom-links"),
            c.chips(it.tags, it.title));
        }));
      }
    },

    /* ------------------------------------------------------------------ */
    {
      id: "list",
      name: "List",
      blurb: "Compact rows with the date on the right. Publications, mentions, courses.",
      fields: ["title", "subtitle", "meta", "body", "bullets", "tags", "links"],
      render: function (sec, c) {
        return c.el("div", { class: "row-list" }, c.arr(sec.items).map(function (it, i) {
          return c.el("article", { class: "row-item reveal", style: delay(i, 8) },
            c.el("div", { class: "row-top" },
              c.el("h3", { text: it.title || "Entry" }),
              c.has(it.meta) && c.el("p", { class: "row-meta", text: it.meta })),
            c.has(it.subtitle) && c.el("p", { class: "row-sub", text: it.subtitle }),
            c.has(it.body) && c.el("p", { class: "row-body" }, c.rich(it.body)),
            c.has(it.bullets) && c.el("ul", { class: "tl-list", role: "list", style: "margin-top:.5rem" },
              c.arr(it.bullets).map(function (b) { return c.el("li", null, c.rich(b)); })),
            c.links(it.links, "custom-links"),
            c.chips(it.tags, it.title));
        }));
      }
    },

    /* ------------------------------------------------------------------ */
    {
      id: "prose",
      name: "Prose",
      blurb: "Plain paragraphs. A longer narrative, a statement, a philosophy.",
      fields: ["title", "subtitle", "body", "bullets", "links"],
      render: function (sec, c) {
        return c.el("div", { class: "prose-block about-body reveal" }, c.arr(sec.items).map(function (it) {
          return [
            c.has(it.title) && c.el("h3", { text: it.title }),
            c.has(it.subtitle) && c.el("p", { class: "custom-sub", text: it.subtitle }),
            c.has(it.body) && c.el("p", null, c.rich(it.body)),
            c.has(it.bullets) && c.el("ul", { class: "tl-list", role: "list" },
              c.arr(it.bullets).map(function (b) { return c.el("li", null, c.rich(b)); })),
            c.links(it.links, "custom-links")
          ];
        }));
      }
    },

    /* ------------------------------------------------------------------ */
    {
      id: "gallery",
      name: "Gallery",
      blurb: "Image grid with captions. Screenshots, diagrams, certificates.",
      fields: ["title", "meta", "body", "image", "links"],
      render: function (sec, c) {
        return c.el("div", { class: "gallery-grid" }, c.arr(sec.items).map(function (it, i) {
          const img = c.image(it.image, null);
          if (!img && !c.has(it.title)) return null;
          return c.el("figure", { class: "gallery-figure reveal", style: delay(i, 8) },
            img,
            (c.has(it.title) || c.has(it.body) || c.has(it.meta)) && c.el("figcaption", null,
              c.has(it.title) && c.el("strong", { text: it.title }),
              c.has(it.body) && c.el("span", { text: c.plain(it.body) }),
              c.has(it.meta) && c.el("span", { text: (c.has(it.body) ? " · " : "") + it.meta })));
        }).filter(Boolean));
      }
    },

    /* ------------------------------------------------------------------ */
    {
      id: "stats",
      name: "Stats",
      blurb: "Big numbers with labels. Impact metrics, volumes, uptime, scale.",
      fields: ["value", "title", "body"],
      render: function (sec, c) {
        return c.el("dl", { class: "stat-grid reveal" }, c.arr(sec.items).map(function (it) {
          if (!c.has(it.value) && !c.has(it.title)) return null;
          return c.el("div", { class: "stat-cell" },
            c.el("dt", { text: c.has(it.value) ? it.value : it.title }),
            c.el("dd", null,
              c.has(it.value) && c.has(it.title) && c.el("strong", { text: it.title }),
              c.has(it.body) && c.el("span", { text: c.plain(it.body) })));
        }).filter(Boolean));
      }
    },

    /* ------------------------------------------------------------------ */
    {
      id: "quotes",
      name: "Quotes",
      blurb: "Pull quotes with attribution. Recommendations, feedback, testimonials.",
      fields: ["body", "title", "subtitle", "image", "links"],
      render: function (sec, c) {
        return c.el("div", { class: "quote-grid" }, c.arr(sec.items).map(function (it, i) {
          if (!c.has(it.body) && !c.has(it.title)) return null;
          return c.el("figure", { class: "quote-card reveal", style: delay(i, 5) },
            c.has(it.body) && c.el("blockquote", null, c.el("p", null, c.rich(it.body))),
            (c.has(it.title) || c.has(it.subtitle)) && c.el("figcaption", null,
              c.image(it.image, "quote-avatar"),
              c.el("span", null,
                c.has(it.title) && c.el("strong", { text: it.title }),
                c.has(it.subtitle) && c.el("span", { text: it.subtitle }))),
            c.links(it.links, "custom-links"));
        }).filter(Boolean));
      }
    },

    /* ------------------------------------------------------------------ */
    {
      id: "table",
      name: "Table",
      blurb: "Two-column rows. Tooling matrices, language levels, availability, rates.",
      fields: ["title", "body", "meta", "tags"],
      render: function (sec, c) {
        const rows = c.arr(sec.items).filter(function (it) { return c.has(it.title) || c.has(it.body); });
        if (!rows.length) return null;
        return c.el("div", { class: "kv-table reveal", role: "table" },
          rows.map(function (it) {
            return c.el("div", { class: "kv-row", role: "row" },
              c.el("span", { class: "kv-key", role: "cell", text: it.title || "" }),
              c.el("span", { class: "kv-val", role: "cell" },
                c.has(it.body) && c.el("span", null, c.rich(it.body)),
                c.chips(it.tags, it.title)),
              c.has(it.meta) && c.el("span", { class: "kv-meta", role: "cell", text: it.meta }));
          }));
      }
    }
  ];

  const INDEX = {};
  /* ====================================================================
     MARKETING LAYOUTS (2026-09-12). Same registry, same section shape, so
     the platform's own pages and customer portfolios share one renderer.
     All of these are pure-content and available to customers too — except
     the pricing table, which renders the platform's live plans and is
     platform-only by decision (PLAN.md).
     ==================================================================== */

  /* ── Horizontal rails ────────────────────────────────────────────────
     Where a section has many items, stacking them all down the page buries
     everything after the third one. A rail keeps EVERY item in the DOM, in
     order, so a crawler and a screen reader read the whole list while a
     sighted user scrolls it — which is why this is a scroll container and
     not a slideshow that mounts one item at a time.

     Nothing auto-advances, ever. That removes the main reduced-motion
     hazard, but not all of it: a CSS `scroll-behavior: auto` override
     CANNOT defeat an explicit `behavior: "smooth"` passed to scrollBy, so
     the JS has to ask matchMedia itself. It previously did not, and
     reduced-motion users got animated scrolling from the arrow buttons.
     ------------------------------------------------------------------ */
  /* Past this many items, a wall or grid becomes a rail. */
  var RAIL_AT = 6;

  function prefersReducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch (e) { return false; }
  }

  /* One item's width plus the real gap, read from the DOM rather than
     hardcoded — the old version assumed 14px and silently drifted from the
     stylesheet's .9rem. */
  function railStep(track) {
    var first = track.querySelector(".rail-item");
    if (!first) return 300;
    var gap = parseFloat(window.getComputedStyle(track).columnGap || window.getComputedStyle(track).gap || "0") || 0;
    return first.getBoundingClientRect().width + gap;
  }

  function railScroll(track, dir) {
    track.scrollBy({ left: dir * railStep(track), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  /* Build the track + arrow controls once, for any layout with many items.
     `label` names the region for assistive tech; `count` is the honest
     "12 templates" line beside the arrows. */
  function rail(c, label, count, items) {
    var track = c.el("div", {
      class: "rail-track", role: "list", tabindex: "0",
      "aria-label": label + ", scrollable"
    }, items);
    var prev = c.el("button", { class: "rail-btn", type: "button", "aria-label": "Show previous", onclick: function () { railScroll(track, -1); } }, "‹");
    var next = c.el("button", { class: "rail-btn", type: "button", "aria-label": "Show more", onclick: function () { railScroll(track, 1); } }, "›");
    /* Arrows are a convenience on top of a natively scrollable, focusable
       region: hidden from assistive tech, which already has the list. */
    [prev, next].forEach(function (b) { b.setAttribute("aria-hidden", "true"); b.tabIndex = -1; });
    return c.el("div", { class: "rail" }, track,
      c.el("div", { class: "rail-controls" }, prev, next,
        count ? c.el("span", { class: "rail-count", text: count }) : null));
  }

  /* The hero's optional picture (item.image). A /template-previews/<id>
     address is a LIVE example site, drawn in a browser frame — a real
     rendered portfolio, not a screenshot someone could have retouched.
     Anything else is an ordinary image. item.subtitle, if set, is the
     address shown in the frame's bar. */
  function heroVisual(c, it) {
    var img = it.image;
    if (!img || !img.src) return null;
    if (/^\/template-previews\/[a-z0-9-]+$/.test(img.src)) {
      return c.el("div", { class: "mk-hero-visual reveal", style: "--delay:140ms" },
        c.el("div", { class: "mk-browser" },
          c.el("div", { class: "mk-browser-bar", "aria-hidden": "true" }, c.el("i"), c.el("i"), c.el("i"),
            c.has(it.subtitle) ? c.el("span", { class: "mk-browser-url", text: it.subtitle }) : null),
          c.el("div", { class: "mk-browser-view" },
            c.el("iframe", { src: img.src, title: img.alt || "Example portfolio", tabindex: "-1", scrolling: "no" }))),
        c.el("div", { class: "mk-hero-doc", "aria-hidden": "true" },
          c.el("span", { class: "mk-hero-doc-label", text: "resume.pdf" }),
          c.el("i"), c.el("i"), c.el("i"), c.el("i"), c.el("i")));
    }
    return c.el("div", { class: "mk-hero-visual reveal" }, c.image(img, "mk-hero-img"));
  }

  LAYOUTS.push({
    id: "hero",
    name: "Hero",
    blurb: "Big opening statement: headline, supporting line, buttons.",
    fields: ["title", "body", "links"],
    render: function (sec, c) {
      var it = c.arr(sec.items)[0] || {};
      var copy = [
        c.has(it.meta) && c.el("p", { class: "eyebrow", text: it.meta }),
        c.el("h1", { class: "mk-hero-title" }, c.rich(it.title || sec.title || "")),
        c.has(it.body) && c.el("p", { class: "mk-hero-lead" }, c.rich(it.body)),
        c.arr(it.links).length ? c.el("div", { class: "mk-cta-row" }, c.arr(it.links).map(function (l, i) {
          return c.el("a", { class: i === 0 ? "btn btn-primary btn-lg" : "btn btn-ghost btn-lg", href: l.url || "#", text: l.label || "Learn more" });
        })) : null,
        /* tags: a quiet line of plain facts under the buttons */
        c.arr(it.tags).length ? c.el("ul", { class: "mk-hero-notes", role: "list" }, c.arr(it.tags).map(function (t) { return c.el("li", { text: t }); })) : null
      ];
      var visual = heroVisual(c, it);
      if (!visual) return c.el("div", { class: "mk-hero reveal" }, copy);
      return c.el("div", { class: "mk-hero has-visual" }, c.el("div", { class: "mk-hero-copy reveal" }, copy), visual);
    }
  });

  LAYOUTS.push({
    id: "feature_grid",
    name: "Feature grid",
    blurb: "Icon, heading and a line each — the classic what-you-get grid.",
    fields: ["title", "body", "icon"],
    render: function (sec, c) {
      return c.el("div", { class: "mk-grid" }, c.arr(sec.items).map(function (it) {
        return c.el("div", { class: "mk-feature reveal" },
          it.icon ? c.el("span", { class: "mk-fi" }, c.icon(it.icon)) : null,
          c.el("h3", { text: it.title || "" }),
          c.has(it.body) && c.el("p", null, c.rich(it.body)));
      }));
    }
  });

  LAYOUTS.push({
    id: "pricing_table",
    name: "Pricing table",
    blurb: "Live plans from the billing tables — platform pages only.",
    platformOnly: true,
    fields: [],
    render: function (sec, c) {
      var plans = c.platformPlans || [];
      if (!plans.length) return c.el("p", { class: "mk-note", text: "Plans appear here when this page is served by the platform." });
      var money = PF.money(c.platformCurrencies || {});
      var region = c.platformPricingRegion || null;

      /* The old version divided price_cents by 12 and by 100 and prefixed a
         "$": three assumptions (a 12-month year, two decimal places, the
         dollar) baked into a layout file. Amounts now arrive already
         resolved for the visitor's region, so this only formats them. */
      var grid = c.el("div", { class: "mk-price-grid" }, plans.map(function (p) {
        var free = p.price_cents === 0;
        var perMonth = p.interval === "year";
        /* compact: the headline number reads "$9", not "$9.00". */
        var shown = money(p.price_cents, p.currency, true);
        return c.el("div", { class: "mk-price reveal" + (p.tier !== "free" ? " featured" : "") },
          c.el("h3", { text: p.name }),
          c.el("p", { class: "mk-price-n" },
            c.el("strong", { text: free ? "Free" : shown }),
            free ? null : c.el("span", { text: perMonth ? " billed yearly" : "/month" })),
          /* Tax is part of the price, so say which it is. A region quoting
             inclusive shows a number the customer actually pays; exclusive
             means tax lands at checkout, and not saying so is the complaint. */
          free || !region || !region.taxRateBp ? null : c.el("p", { class: "mk-note mk-tax" , text:
            region.taxMode === "inclusive"
              ? "Includes " + (region.taxLabel || "tax") + " at " + (region.taxRateBp / 100) + "%"
              : (region.taxLabel || "Tax") + " added at checkout" }),
          /* Display currency is not always the charge currency. Telling
             someone at the point of decision beats surprising them on a
             statement. */
          !free && p.chargeDiffers && p.charge ? c.el("p", { class: "mk-note mk-charge", text:
            "Your card is charged " + money(p.charge.amountMinor, p.charge.currency) + " " + String(p.charge.currency).toUpperCase() + "." }) : null,
          !free && p.purchasable === false ? c.el("p", { class: "mk-note mk-unavailable", text: "Not available in your region yet." }) : null,
          c.el("ul", { class: "mk-price-list" }, c.arr(p.features).map(function (f) { return c.el("li", null, c.rich(String(f))); })),
          p.purchasable === false && !free
            ? c.el("span", { class: "btn btn-ghost is-disabled", "aria-disabled": "true", text: "Unavailable here" })
            : c.el("a", { class: "btn " + (p.tier === "free" ? "btn-ghost" : "btn-primary"), href: "/app.html#signup", text: free ? "Start free" : "Go " + p.name }));
      }));

      if (!region) return grid;
      return c.el("div", null, grid, c.el("p", { class: "mk-note mk-region", text:
        "Prices shown for " + region.name + "." + (region.basis === "edge_hint"
          ? " Based on where you appear to be — the country on your account is what decides what you're charged." : "") }));
    }
  });

  LAYOUTS.push({
    id: "faq",
    name: "FAQ accordion",
    blurb: "Question and answer pairs that expand in place.",
    fields: ["title", "body"],
    render: function (sec, c) {
      return c.el("div", { class: "mk-faq" }, c.arr(sec.items).map(function (it) {
        return c.el("details", { class: "mk-faq-item reveal" },
          c.el("summary", { text: it.title || "Question" }),
          c.el("div", { class: "mk-faq-a" }, c.rich(it.body || "")));
      }));
    }
  });

  LAYOUTS.push({
    id: "logo_wall",
    name: "Logo wall",
    blurb: "A quiet row of logos or names. Becomes a scrollable rail past six.",
    fields: ["title", "image"],
    render: function (sec, c) {
      var items = c.arr(sec.items);
      var logos = items.map(function (it) {
        return it.image && it.image.src
          ? c.el("span", { class: "mk-logo rail-item", role: "listitem" }, c.image(it.image, "mk-logo-img"))
          : c.el("span", { class: "mk-logo mk-logo-text rail-item", role: "listitem", text: it.title || "" });
      });
      /* Six or fewer sit on one line comfortably; a wrapped wall of twenty
         is the "stacked all the way down the page" problem in miniature.
         The threshold is here rather than a setting because the right answer
         is a function of the layout, not of anyone's preference. */
      if (items.length <= RAIL_AT) return c.el("div", { class: "mk-logos" }, logos);
      return rail(c, sec.title || "Logos", items.length + " logos", logos);
    }
  });

  /* ── The ATS checker, as a section ──────────────────────────────────────
     This is the one interactive marketing layout: the front door has to
     WORK on the page a stranger landed on, not link them to an app they
     have no account for.

     Self-contained on purpose. site.html loads core, icons, themes, layouts
     and render — not js/api.js or js/ats.js — so rather than adding two
     scripts to the platform shell for one section, this talks to
     /api/ats/try with fetch and renders its own result. The score, the
     breakdown and the withheld counts all come from the server; nothing
     here decides what a stranger may see.

     Progressive enhancement: with no JavaScript the section still renders
     its heading, its explanation and a link to the app, so the page is
     never a blank box for a crawler or a reader without scripts.
     ------------------------------------------------------------------ */
  LAYOUTS.push({
    id: "ats_widget",
    name: "ATS checker (interactive)",
    blurb: "The live resume checker: upload or paste, plus a job description. Platform pages only.",
    platformOnly: true,
    fields: [],
    render: function (sec, c) {
      var el = c.el;
      var root = el("div", { class: "ats-widget" });
      var fileName = el("p", { class: "ats-file hint" });
      var status = el("p", { class: "ats-status", role: "status", "aria-live": "polite" });
      var out = el("div", { class: "ats-out" });
      var picked = null;

      var file = el("input", { type: "file", id: "ats-file", accept: ".pdf,.docx,.txt,application/pdf,text/plain", class: "ats-file-input" });
      var paste = el("textarea", { rows: 5, id: "ats-paste", placeholder: "\u2026or paste your resume text here instead" });
      var jd = el("textarea", { rows: 8, id: "ats-jd", placeholder: "Paste the whole job description \u2014 requirements, nice-to-haves and all" });
      var role = el("input", { type: "text", id: "ats-role", class: "ats-role-input", maxlength: "120", placeholder: "e.g. Senior Data Analyst", autocomplete: "off" });
      var go = el("button", { class: "btn btn-primary", type: "button" }, "Check my resume");

      file.addEventListener("change", function () {
        picked = file.files && file.files[0] ? file.files[0] : null;
        fileName.textContent = picked ? picked.name + " \u2014 read in your browser, sent once, never stored" : "";
      });
      var clearFile = el("button", { type: "button", class: "btn btn-ghost", text: "Remove file" });
      clearFile.addEventListener("click", function () {
        picked = null;
        file.value = "";
        fileName.textContent = "File removed.";
      });

      function readBase64(f) {
        return new Promise(function (resolve, reject) {
          var fr = new FileReader();
          fr.onerror = function () { reject(new Error("That file could not be read.")); };
          fr.onload = function () { resolve(String(fr.result).replace(/^data:[^;]+;base64,/, "")); };
          fr.readAsDataURL(f);
        });
      }

      function label(k) {
        return { hasContactInfo: "Contact details", hasSummary: "Summary", hasWorkExperience: "Experience",
                 hasEducation: "Education", hasSkills: "Skills" }[k] || k;
      }
      function list(v) { return Array.isArray(v) ? v.filter(Boolean) : []; }
      var SUBS = [["keywords", "Keywords"], ["skills", "Skills"], ["experience", "Experience"], ["seniority", "Seniority"],
        ["title", "Title"], ["education", "Education"], ["sections", "Sections"], ["readability", "Readability"]];
      var WHERE = { bullet: "shown in experience", project: "shown in a project", "skills-only": "listed only" };
      function bandOf(n) { return n >= 75 ? "is-ok" : n >= 50 ? "is-mid" : "is-low"; }
      function block(title, kids, cls) {
        return el("section", { class: "atsw-block" + (cls ? " " + cls : "") }, el("h3", { text: title }), kids);
      }

      /* Draws the server's result, whatever it holds. The anonymous view
         carries every number and the first few of each list; a member's
         carries all of it. Nothing here decides what may be shown. */
      function draw(d) {
        while (out.firstChild) out.removeChild(out.firstChild);
        var r = d.result || {};
        var s = typeof r.score === "number" ? r.score : 0;
        var na = list(r.notApplicable);
        var req = r.requirements || {}, you = r.candidate || {};

        out.appendChild(el("div", { class: "atsw-head " + bandOf(s) },
          el("div", { class: "ats-score " + bandOf(s), role: "img", "aria-label": "Match score " + s + " out of 100" },
            el("strong", { text: String(s) }), el("span", { text: "/ 100" })),
          el("div", { class: "atsw-head-text" },
            r.verdict ? el("p", { class: "atsw-verdict", text: r.verdict }) : null,
            r.summary ? el("p", { class: "atsw-summary", text: r.summary }) : null)));

        /* What the posting asks for, next to what the resume shows. */
        var asks = [
          ["Role", req.title, you.title],
          ["Level", req.seniority, you.seniority],
          ["Experience", req.years ? req.years + "+ years" : null, you.years != null ? you.years + " years in dated roles" : null],
          ["Degree", req.degree ? req.degree.label + (req.degree.field ? " in " + req.degree.field : "") + (req.degree.equivalentOk ? " or equivalent" : "") + (req.degree.preferred ? " (preferred)" : "") : null, you.degree],
          ["Certifications", list(req.certifications).join(", ") || null, list(you.certifications).join(", ") || null]
        ].filter(function (x) { return x[1]; });
        if (asks.length) {
          out.appendChild(block("What the posting asks for", el("dl", { class: "atsw-asks" }, asks.map(function (x) {
            return el("div", { class: "atsw-ask" }, el("dt", { text: x[0] }),
              el("dd", null, el("span", { class: "atsw-want", text: x[1] }), el("span", { class: "atsw-have", text: "You: " + (x[2] || "not found") })));
          }))));
        }

        if (r.subscores) {
          out.appendChild(block("How the score adds up", el("ul", { class: "atsw-bars" }, SUBS.map(function (x) {
            var v = r.subscores[x[0]];
            if (typeof v !== "number") return null;
            var off = na.indexOf(x[0]) !== -1;
            return el("li", { class: "atsw-bar-row " + (off ? "is-na" : bandOf(v)) },
              el("span", { class: "atsw-bar-label", text: x[1] }),
              el("span", { class: "atsw-bar", role: "img", "aria-label": x[1] + (off ? ": not stated in the posting" : ": " + v + " out of 100") },
                el("i", { style: "width:" + (off ? 0 : Math.max(2, v)) + "%" })),
              el("span", { class: "atsw-bar-value", text: off ? "n/a" : String(v) }));
          }))));
        }

        var fixes = list(r.fixes).slice(0, 5);
        if (fixes.length) {
          out.appendChild(block(d.full ? "Top " + fixes.length + " fixes" : "Your first fixes", el("ol", { class: "atsw-fixes" }, fixes.map(function (f) {
            return el("li", { class: "atsw-fix is-" + (f.impact || "low") },
              el("span", { class: "atsw-impact", text: (f.impact || "low") + " impact" }),
              el("strong", { text: f.title || "" }),
              f.detail ? el("p", { text: f.detail }) : null);
          }))));
        }

        var cats = r.missingByCategory || {};
        var catNames = Object.keys(cats).filter(function (k) { return list(cats[k]).length; });
        if (catNames.length || r.missingWithheld) {
          out.appendChild(block("Missing from your resume", [
            catNames.map(function (k) {
              return el("div", { class: "atsw-cat" }, el("h4", { text: k }),
                el("ul", { class: "chips" }, list(cats[k]).map(function (t) { return el("li", { class: "chip is-missing", text: t }); })));
            }),
            r.missingWithheld ? el("p", { class: "hint", text: "+ " + r.missingWithheld + " more with a free account." }) : null,
            el("p", { class: "hint", text: "Add these only if they're true — ideally in a bullet that shows where you used them." })
          ]));
        }

        var found = list(r.matched);
        if (found.length) {
          var ev = r.evidence || {};
          out.appendChild(el("details", { class: "atsw-block atsw-found" },
            el("summary", { text: "Found in your resume (" + found.length + ")" }),
            el("ul", { class: "atsw-evidence" }, found.map(function (t) {
              var w = ev[t] || "skills-only";
              return el("li", { class: "is-" + w }, el("span", { class: "atsw-term", text: t }), el("span", { class: "atsw-where", text: WHERE[w] || w }));
            }))));
        }

        var weak = list(r.weakBullets).filter(function (b) { return b.text; });
        if (weak.length) {
          out.appendChild(block("Bullets to strengthen", [el("ul", { class: "atsw-bullets" }, weak.slice(0, 5).map(function (b) {
            return el("li", null,
              el("p", { class: "atsw-original", text: b.text }),
              el("p", { class: "atsw-reasons", text: list(b.reasons).join(" · ") }),
              b.rewrite ? el("p", { class: "atsw-rewrite" }, el("span", { text: "Same facts, stronger: " }), el("strong", { text: b.rewrite })) : null,
              b.suggestion ? el("p", { class: "atsw-suggest", text: b.suggestion }) : null);
          })), r.weakBulletsWithheld ? el("p", { class: "hint", text: "+ " + r.weakBulletsWithheld + " more with a free account." }) : null]));
        }

        var fmt = list(r.formatting);
        var checks = r.sectionChecks || {};
        out.appendChild(block("Sections and formatting", [
          el("ul", { class: "atsw-checks" }, Object.keys(checks).map(function (k) {
            return el("li", { class: checks[k] ? "is-ok" : "is-missing" },
              el("span", { "aria-hidden": "true", text: checks[k] ? "✓" : "✗" }), " " + label(k) + (checks[k] ? "" : " missing"));
          })),
          fmt.length ? el("ul", { class: "atsw-format" }, fmt.map(function (f) {
            return el("li", { class: f.severity === "warn" ? "is-warn" : "is-info", text: f.message });
          })) : null,
          r.readability && list(r.readability.notes).length ? el("p", { class: "hint", text: list(r.readability.notes).join(" ") }) : null
        ]));

        /* The ask, stated as what is actually behind it — with the real
           counts, so it is a fact rather than a tease. */
        if (!d.full) {
          var more = [];
          if (r.missingWithheld > 0) more.push(r.missingWithheld + " more missing keyword" + (r.missingWithheld === 1 ? "" : "s"));
          if (r.fixesWithheld > 0) more.push(r.fixesWithheld + " more fix" + (r.fixesWithheld === 1 ? "" : "es"));
          if (r.weakBulletsWithheld > 0) more.push(r.weakBulletsWithheld + " more bullet" + (r.weakBulletsWithheld === 1 ? "" : "s") + " to strengthen");
          out.appendChild(el("div", { class: "ats-gate" },
            el("p", null, el("strong", { text: "That is your real score." }),
              more.length ? " A free account shows " + more.join(", ").replace(/, ([^,]*)$/, " and $1") + ", saves this run so you can compare it with the next one, and lets you fix the gaps in the builder."
                          : " A free account saves this run so you can compare it with the next one, and lets you fix the gaps in the builder."),
            el("a", { class: "btn btn-primary", href: "/app.html#signup?ats=1" }, "See everything — free"),
            el("p", { class: "hint", text: "Your result is held for an hour so signing up keeps it." })));
        }

        out.appendChild(el("p", { class: "ats-honest atsw-honesty", text: r.honesty || "This is an internal heuristic, not an employer's real ATS." }));
        if (d.disclaimer) out.appendChild(el("p", { class: "hint atsw-disclaimer", text: d.disclaimer }));
        if (d.scanned === false && d.source && d.source !== "text") {
          out.appendChild(el("p", { class: "hint", text: "This upload was not virus-scanned — no scanner is configured on this deployment. Your file was read in memory and not stored." }));
        }
        /* Keep the token where signup can pick it up, without writing the
           result itself anywhere: it is signed, and it expires. */
        if (d.claimToken) root.setAttribute("data-claim", d.claimToken);
        if (out.scrollIntoView && out.getBoundingClientRect && out.getBoundingClientRect().top > (window.innerHeight || 800)) {
          out.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        }
      }

      go.addEventListener("click", function () {
        var body = { jobDescription: jd.value };
        if (role.value.trim()) body.targetRole = role.value.trim();
        var pastedText = paste.value.trim();
        status.textContent = "";
        if (!body.jobDescription || body.jobDescription.trim().length < 40) {
          status.textContent = "Paste the job description first \u2014 a few sentences at least.";
          return;
        }
        if (!picked && !pastedText) {
          status.textContent = "Choose a resume file, or paste the text.";
          return;
        }
        go.disabled = true;
        status.textContent = "Reading and scoring\u2026";

        var prep = picked && !pastedText
          ? readBase64(picked).then(function (b64) { body.file = { name: picked.name, mime: picked.type || "", base64: b64 }; })
          : Promise.resolve().then(function () { body.resumeText = pastedText; });

        prep.then(function () {
          return window.fetch("/api/ats/try", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Requested-With": "portfolio-app" },
            body: JSON.stringify(body)
          });
        }).then(function (res) {
          return res.json().then(function (j) { return { ok: res.ok, j: j }; });
        }).then(function (x) {
          go.disabled = false;
          if (!x.ok) { status.textContent = (x.j && x.j.error) || "That did not work. Try pasting the text instead."; return; }
          status.textContent = "";
          draw(x.j);
        }).catch(function (e) {
          go.disabled = false;
          status.textContent = e && e.message ? e.message : "Something went wrong. Try again.";
        });
      });

      root.appendChild(el("div", { class: "ats-form" },
        el("label", { class: "ats-label", for: "ats-file" }, "Your resume"),
        file, el("div", { class: "ats-actions" }, clearFile), fileName,
        paste,
        el("label", { class: "ats-label", for: "ats-jd" }, "The job description"),
        jd,
        el("label", { class: "ats-label", for: "ats-role" }, "The role you're applying for ", el("span", { class: "hint", text: "(optional)" })),
        role,
        el("div", { class: "ats-actions" }, go, status),
        el("p", { class: "hint", text: "PDF, Word .docx or plain text. Read in memory, scored, and dropped \u2014 we never store the file. This is our own heuristic, not an employer's ATS." })));
      root.appendChild(out);
      return root;
    }
  });

  /* A showcase rail: templates, skeletons, example sites. Always a rail,
     whatever the count, because the point of the section is "there are many
     of these" and a three-wide grid of twelve buries nine of them.

     Deliberately NOT the portfolio `gallery` layout turned into a rail: that
     one renders a customer's own screenshots on their own site, where a grid
     is the right answer and changing it would alter already-published pages. */
  LAYOUTS.push({
    id: "template_gallery",
    name: "Template gallery",
    blurb: "Templates or examples as a scrollable rail, with a caption each.",
    fields: ["title", "subtitle", "body", "image", "links"],
    render: function (sec, c) {
      var items = c.arr(sec.items);
      if (!items.length) return c.el("p", { class: "mk-note", text: "Add a few templates to show them here." });
      var cards = items.map(function (it) {
        var preview = c.arr(it.links)[0] && c.arr(it.links)[0].url;
        return c.el("figure", { class: "rail-item mk-template", role: "listitem" },
          /^\/template-previews\/[a-z0-9-]+$/.test(preview || "")
            ? c.el("div", { class: "mk-template-preview" }, c.el("iframe", { src: preview, title: "Live preview of " + (it.title || "template"), loading: "lazy", tabindex: "-1" }))
            : c.image(it.image, "mk-template-img"),
          c.el("figcaption", null,
            c.el("strong", { text: it.title || "Template" }),
            c.has(it.subtitle) ? c.el("span", { class: "mk-template-sub", text: it.subtitle }) : null,
            c.has(it.body) ? c.el("span", { class: "mk-template-body" }, c.rich(it.body)) : null),
          c.links(it.links, "custom-links"));
      });
      return rail(c, sec.title || "Templates",
        items.length + " template" + (items.length === 1 ? "" : "s"), cards);
    }
  });

  LAYOUTS.push({
    id: "cta_band",
    name: "CTA band",
    blurb: "One line and one button, full width. The closer.",
    fields: ["title", "body", "links"],
    render: function (sec, c) {
      var it = c.arr(sec.items)[0] || {};
      var ls = c.arr(it.links).filter(function (l) { return l && l.url; });
      if (!ls.length) ls = [{ url: "/app.html#signup", label: "Start free" }];
      /* The first link is the button; any others sit beside it, quieter. */
      return c.el("div", { class: "mk-band reveal" },
        c.el("div", null,
          c.el("h3", { text: it.title || sec.title || "" }),
          c.has(it.body) && c.el("p", null, c.rich(it.body))),
        ls.length === 1
          ? c.el("a", { class: "btn btn-primary btn-lg", href: ls[0].url || "#", text: ls[0].label || "Start free" })
          : c.el("div", { class: "mk-cta-row" }, ls.map(function (l, i) {
            return c.el("a", { class: "btn btn-lg " + (i === 0 ? "btn-primary" : "btn-ghost"), href: l.url, text: l.label || "Learn more" });
          })));
    }
  });

  LAYOUTS.push({
    id: "testimonials",
    name: "Testimonials",
    blurb: "Quotes with names — like the Quotes layout, styled for marketing.",
    fields: ["title", "subtitle", "body"],
    render: function (sec, c) {
      return c.el("div", { class: "mk-grid" }, c.arr(sec.items).map(function (it) {
        return c.el("figure", { class: "mk-quote reveal" },
          c.el("blockquote", null, c.rich(it.body || "")),
          c.el("figcaption", null,
            c.el("strong", { text: it.title || "" }),
            c.has(it.subtitle) && c.el("span", { text: " — " + it.subtitle })));
      }));
    }
  });

  /* Approved customer reviews, from the public_reviews view via
     ctx.platformReviews — the same live-data route pricing_table uses.
     platformOnly, because a customer's own portfolio has no business
     rendering the platform's reviews.

     Presented as a horizontally scrollable rail rather than a tall stack:
     · every item is in the DOM, in order, so crawlers and Reader mode get
       all of them and none are behind a "next" click
     · the rail is a focusable region with arrow buttons, so it is reachable
       without a trackpad gesture
     · nothing auto-advances, ever — there is no timer in here to disable,
       which is the only honest way to respect prefers-reduced-motion
     · JSON-LD is NOT emitted here. Crawlers don't run this file; the
       schema.org/Review markup is injected server-side in
       service/src/index.js's platformShell(). */
  LAYOUTS.push({
    id: "reviews",
    name: "Customer reviews",
    blurb: "Approved reviews, newest first, as a scrollable rail. Platform pages only.",
    platformOnly: true,
    fields: [],
    render: function (sec, c) {
      var items = c.arr(c.platformReviews);
      if (!items.length) {
        return c.el("p", { class: "mk-note", text: "Reviews appear here once customers have left them and a person has checked them." });
      }
      var cards = items.map(function (r) {
        var stars = Math.max(1, Math.min(5, Number(r.rating) || 5));
        return c.el("figure", { class: "rail-item mk-quote", role: "listitem" },
          c.el("div", { class: "stars", "aria-label": stars + " out of 5" },
            c.el("span", { "aria-hidden": "true", text: "★★★★★".slice(0, stars) + "☆☆☆☆☆".slice(0, 5 - stars) })),
          c.el("blockquote", null, c.rich(r.review_text || "")),
          c.el("figcaption", null,
            c.el("strong", { text: r.display_name || "A customer" }),
            r.display_role ? c.el("span", { text: " — " + r.display_role }) : null));
      });
      return rail(c, sec.title || "Customer reviews",
        items.length + " review" + (items.length === 1 ? "" : "s"), cards);
    }
  });

  LAYOUTS.push({
    id: "steps",
    name: "How-it-works steps",
    blurb: "Numbered steps, left to right.",
    fields: ["title", "body"],
    render: function (sec, c) {
      return c.el("ol", { class: "mk-steps" }, c.arr(sec.items).map(function (it, i) {
        return c.el("li", { class: "mk-step reveal" },
          c.el("span", { class: "mk-step-n", text: String(i + 1) }),
          c.el("h3", { text: it.title || "" }),
          c.has(it.body) && c.el("p", null, c.rich(it.body)));
      }));
    }
  });

  LAYOUTS.push({
    id: "comparison",
    name: "Comparison table",
    blurb: "Us-versus-that, row by row. Item title = the row; value = ours; meta = theirs.",
    fields: ["title", "value", "meta"],
    render: function (sec, c) {
      return c.el("div", { class: "mk-compare tw" },
        c.el("table", { class: "custom-table" },
          c.el("thead", null, c.el("tr", null,
            c.el("th", { text: "" }), c.el("th", { text: sec.eyebrow || "portfolio.dev" }), c.el("th", { text: sec.blurb || "The usual way" }))),
          c.el("tbody", null, c.arr(sec.items).map(function (it) {
            return c.el("tr", null,
              c.el("th", { text: it.title || "" }),
              c.el("td", { class: "mk-ours" }, c.rich(it.value || "")),
              c.el("td", null, c.rich(it.meta || "")));
          }))));
    }
  });

  /* ══════════════════════════════════════════════════════════════════════
     LANDING PRESENTATION LAYOUTS (2026-10-01). Pure content, but
     platformOnly: their styles live in /assets/platform.css, which customer
     portfolios never load, so offering them to a customer would hand out a
     section that renders unstyled.

     The three "split" layouts (doc_preview, versions, match_preview) put
     the section heading and a short list of points on one side and a
     picture on the other. Their FIRST item is the side column (bullets =
     the points, links = the buttons); every later item draws the picture.
     ══════════════════════════════════════════════════════════════════════ */
  function points(c, it) {
    it = it || {};
    var ls = c.arr(it.links).filter(function (l) { return l && l.url; });
    return c.el("div", { class: "mk-split-aside reveal" },
      c.has(it.body) ? c.el("p", { class: "mk-split-lead" }, c.rich(it.body)) : null,
      c.arr(it.bullets).length ? c.el("ul", { class: "mk-points", role: "list" }, c.arr(it.bullets).map(function (b) {
        return c.el("li", null, c.el("span", { class: "mk-point-mark", "aria-hidden": "true" }), c.el("span", null, c.rich(b)));
      })) : null,
      ls.length ? c.el("div", { class: "mk-cta-row" }, ls.map(function (l, i) {
        return c.el("a", { class: "btn " + (i === 0 ? "btn-primary" : "btn-ghost"), href: l.url, text: l.label || "Learn more" });
      })) : null);
  }
  function exampleTag(c, text) {
    return c.el("span", { class: "mk-example-tag", text: text || "Example" });
  }

  LAYOUTS.push({
    id: "before_after",
    name: "Before / after",
    blurb: "Two panels: a plain document (first item) and what it becomes (second item). Title = label, meta = badge, subtitle = name line, body = second line, bullets = lines (after: cards, split at ' — '), tags = skills, first link label = address. Platform pages only.",
    platformOnly: true,
    fields: ["title", "subtitle", "meta", "body", "bullets", "tags", "links"],
    render: function (sec, c) {
      var items = c.arr(sec.items), a = items[0] || {}, b = items[1] || {};
      var label = function (it, cls) {
        return c.el("figcaption", { class: "mk-ba-label" },
          c.el("span", { class: "mk-ba-dot " + cls, "aria-hidden": "true" }),
          c.el("strong", { text: it.title || "" }),
          c.has(it.meta) ? c.el("span", { class: "mk-ba-badge", text: it.meta }) : null);
      };
      var before = c.el("figure", { class: "mk-ba-panel mk-ba-before reveal" }, label(a, "is-before"),
        c.el("div", { class: "mk-paper" },
          c.has(a.subtitle) ? c.el("p", { class: "mk-paper-name", text: a.subtitle }) : null,
          c.has(a.body) ? c.el("p", { class: "mk-paper-sub", text: c.plain(a.body) }) : null,
          c.el("ul", { class: "mk-paper-lines", role: "list" }, c.arr(a.bullets).map(function (x) {
            /* ALL-CAPS lines are headings; "Role, Employer · 2019 – 2021" lines are role lines */
            var line = String(x).trim();
            var cls = /^[A-Z][A-Z &/]{2,}$/.test(line) ? "is-head" : /·\s*(?:19|20)\d{2}\b/.test(line) ? "is-role" : null;
            return c.el("li", { class: cls, text: x });
          })),
          c.arr(a.tags).length ? c.el("p", { class: "mk-paper-skills", text: "Skills: " + c.arr(a.tags).join(", ") }) : null));
      var addr = (c.arr(b.links)[0] || {}).label;
      var after = c.el("figure", { class: "mk-ba-panel mk-ba-after reveal", style: "--delay:120ms" }, label(b, "is-after"),
        c.el("div", { class: "mk-site" },
          c.el("div", { class: "mk-site-bar", "aria-hidden": "true" }, c.el("i"), c.el("i"), c.el("i"),
            addr ? c.el("span", { class: "mk-site-url", text: addr }) : null),
          c.el("div", { class: "mk-site-body" },
            c.el("div", { class: "mk-site-hero" },
              c.has(b.subtitle) ? c.el("p", { class: "mk-site-name", text: b.subtitle }) : null,
              c.has(b.body) ? c.el("p", { class: "mk-site-lead" }, c.rich(b.body)) : null),
            c.arr(b.bullets).length ? c.el("ul", { class: "mk-site-cards", role: "list" }, c.arr(b.bullets).map(function (x) {
              var parts = String(x).split(/\s+[—–]\s+/);
              return c.el("li", null, c.el("strong", { text: parts[0] }), parts[1] ? c.el("span", { text: parts.slice(1).join(" — ") }) : null);
            })) : null,
            c.arr(b.tags).length ? c.el("ul", { class: "mk-site-chips", role: "list" }, c.arr(b.tags).map(function (t) { return c.el("li", { text: t }); })) : null)));
      return c.el("div", { class: "mk-ba" }, before,
        c.el("div", { class: "mk-ba-arrow", "aria-hidden": "true" }, c.el("span")),
        after);
    }
  });

  LAYOUTS.push({
    id: "doc_preview",
    name: "Resume page preview",
    blurb: "Heading and points beside a resume page. First item: points (bullets) and buttons (links). Second: the page header (title = name, subtitle = headline, meta = contact, value = badge). Later items: page sections (title = heading, subtitle = entry, meta = dates, bullets, body). Platform pages only.",
    platformOnly: true,
    fields: ["title", "subtitle", "meta", "value", "body", "bullets", "links"],
    render: function (sec, c) {
      var items = c.arr(sec.items), head = items[1] || {};
      var page = c.el("div", { class: "mk-doc" },
        c.el("div", { class: "mk-doc-head" },
          c.el("p", { class: "mk-doc-name", text: head.title || "" }),
          c.has(head.subtitle) ? c.el("p", { class: "mk-doc-role", text: head.subtitle }) : null,
          c.has(head.meta) ? c.el("p", { class: "mk-doc-contact", text: head.meta }) : null),
        items.slice(2).map(function (s) {
          return c.el("div", { class: "mk-doc-sec" },
            c.has(s.title) ? c.el("p", { class: "mk-doc-h", text: s.title }) : null,
            (c.has(s.subtitle) || c.has(s.meta)) ? c.el("p", { class: "mk-doc-entry" },
              c.el("strong", { text: s.subtitle || "" }), c.has(s.meta) ? c.el("span", { text: s.meta }) : null) : null,
            c.has(s.body) ? c.el("p", { class: "mk-doc-p", text: c.plain(s.body) }) : null,
            c.arr(s.bullets).length ? c.el("ul", { class: "mk-doc-list", role: "list" }, c.arr(s.bullets).map(function (x) { return c.el("li", { text: x }); })) : null);
        }));
      return c.el("div", { class: "mk-split" }, points(c, items[0]),
        c.el("div", { class: "mk-split-visual reveal", style: "--delay:120ms" },
          c.el("div", { class: "mk-doc-stack" },
            c.el("div", { class: "mk-doc mk-doc-behind", "aria-hidden": "true" }),
            page,
            c.has(head.value) ? c.el("span", { class: "mk-doc-badge", text: head.value }) : null)));
    }
  });

  LAYOUTS.push({
    id: "versions",
    name: "Job versions",
    blurb: "Heading and points beside a stack of resume versions. First item: points and buttons. Later items: one version each (title = label, subtitle = line, tags = skills in order, value = how many lead skills to highlight, bullets = notes). Platform pages only.",
    platformOnly: true,
    fields: ["title", "subtitle", "value", "tags", "bullets", "links"],
    render: function (sec, c) {
      var items = c.arr(sec.items);
      var cards = items.slice(1).map(function (v, i) {
        var lead = Math.max(0, parseInt(v.value, 10) || 0);
        return c.el("div", { class: "mk-version" + (i === 0 ? " is-base" : ""), style: "--i:" + i },
          c.el("div", { class: "mk-version-top" },
            c.el("span", { class: "mk-version-dot", "aria-hidden": "true" }),
            c.el("strong", { text: v.title || "" }),
            c.has(v.subtitle) ? c.el("span", { class: "mk-version-sub", text: v.subtitle }) : null),
          c.arr(v.tags).length ? c.el("ul", { class: "mk-version-skills", role: "list" }, c.arr(v.tags).map(function (t, k) {
            return c.el("li", { class: k < lead ? "is-lead" : null, text: t });
          })) : null,
          c.arr(v.bullets).length ? c.el("ul", { class: "mk-version-notes", role: "list" }, c.arr(v.bullets).map(function (n) { return c.el("li", null, c.rich(n)); })) : null);
      });
      return c.el("div", { class: "mk-split is-flip" }, points(c, items[0]),
        c.el("div", { class: "mk-split-visual reveal", style: "--delay:120ms" }, c.el("div", { class: "mk-versions" }, cards)));
    }
  });

  LAYOUTS.push({
    id: "match_preview",
    name: "Job-match preview",
    blurb: "Heading and points beside an example match result. First item: points and buttons. Second: the result (value = score, title = verdict, body = one line, meta = small label). Later items with a value: bars (title = label). An item with bullets: the fixes list (title = its heading). Platform pages only.",
    platformOnly: true,
    fields: ["title", "value", "meta", "body", "bullets", "links"],
    render: function (sec, c) {
      var items = c.arr(sec.items), res = items[1] || {};
      var score = Math.max(0, Math.min(100, parseInt(res.value, 10) || 0));
      var rest = items.slice(2);
      var bars = rest.filter(function (x) { return c.has(x.value) && !c.arr(x.bullets).length; });
      var fixes = rest.filter(function (x) { return c.arr(x.bullets).length; })[0];
      var card = c.el("div", { class: "mk-match" },
        c.has(res.meta) ? exampleTag(c, res.meta) : null,
        c.el("div", { class: "mk-match-head" },
          c.el("div", { class: "mk-match-ring", style: "--pct:" + score, role: "img", "aria-label": "Example score " + score + " out of 100" },
            c.el("strong", { text: String(score) })),
          c.el("div", null,
            c.el("p", { class: "mk-match-verdict", text: res.title || "" }),
            c.has(res.body) ? c.el("p", { class: "mk-match-line" }, c.rich(res.body)) : null)),
        bars.length ? c.el("ul", { class: "mk-match-bars", role: "list" }, bars.map(function (b) {
          var v = Math.max(0, Math.min(100, parseInt(b.value, 10) || 0));
          return c.el("li", null, c.el("span", { text: b.title || "" }),
            c.el("span", { class: "mk-match-bar", "aria-hidden": "true" }, c.el("i", { style: "width:" + v + "%" })),
            c.el("span", { class: "mk-match-n", text: String(v) }));
        })) : null,
        fixes ? c.el("div", { class: "mk-match-fixes" },
          c.has(fixes.title) ? c.el("p", { class: "mk-match-fixes-h", text: fixes.title }) : null,
          c.el("ol", null, c.arr(fixes.bullets).map(function (f) { return c.el("li", null, c.rich(f)); }))) : null);
      return c.el("div", { class: "mk-split" }, points(c, items[0]),
        c.el("div", { class: "mk-split-visual reveal", style: "--delay:120ms" }, card));
    }
  });

  LAYOUTS.push({
    id: "teaser",
    name: "Teaser band",
    blurb: "A compact band of two or three short columns (title, body) with one row of links underneath — for a pricing or feature teaser. Platform pages only.",
    platformOnly: true,
    fields: ["title", "value", "body", "links"],
    render: function (sec, c) {
      var items = c.arr(sec.items);
      var ls = [];
      items.forEach(function (it) { c.arr(it.links).forEach(function (l) { if (l && l.url) ls.push(l); }); });
      return c.el("div", { class: "mk-teaser reveal" },
        c.el("div", { class: "mk-teaser-cols" }, items.map(function (it) {
          return c.el("div", { class: "mk-teaser-col" },
            c.el("p", { class: "mk-teaser-title" }, c.el("strong", { text: it.title || "" }), c.has(it.value) ? c.el("span", { text: it.value }) : null),
            c.has(it.body) ? c.el("p", { class: "mk-teaser-body" }, c.rich(it.body)) : null);
        })),
        ls.length ? c.el("p", { class: "mk-teaser-links" }, ls.map(function (l) {
          return c.el("a", { class: "mk-arrow-link", href: l.url, text: l.label || "Learn more" });
        })) : null);
    }
  });

  LAYOUTS.forEach(function (l) { INDEX[l.id] = l; });

  function render(sec, ctx) {
    const layout = INDEX[sec && sec.layout] || INDEX.cards;
    try { return layout.render(sec, ctx); }
    catch (e) {
      if (window.console && console.error) console.error("[portfolio] layout '" + layout.id + "' failed", e);
      return null;
    }
  }

  PF.provide("layouts", {
    LIST: LAYOUTS,
    /* what a CUSTOMER may pick: everything that isn't platform-only */
    customer: function () { return LAYOUTS.filter(function (l) { return !l.platformOnly; }); },
    byId: function (id) { return INDEX[id] || null; },
    ids: function () { return LAYOUTS.map(function (l) { return l.id; }); },
    render: render
  });
})();
