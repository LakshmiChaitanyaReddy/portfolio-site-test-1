/* ==========================================================================
   site.js — boots site.html (the portfolio renderer). Load last.

   Responsibilities: check every module arrived, apply the theme, fetch
   data.json (or take it over postMessage in preview mode), wire the chrome,
   and build the printable resume on demand.
   ========================================================================== */
(function () {
  "use strict";

  const PF = window.PF;
  const REQUIRED = ["core", "icons", "themes", "skeletons", "layouts", "resume", "render"];

  /* ------------------------------------------------------------------
     0. Did every file actually load? A missing script used to degrade
        silently; now it says which file is missing, by name.
     ------------------------------------------------------------------ */
  function bootFailure(missing) {
    const main = document.getElementById("main");
    const status = document.getElementById("load-status");
    if (status) status.textContent = "The page could not start.";
    if (!main) return;
    while (main.firstChild) main.removeChild(main.firstChild);
    main.setAttribute("aria-busy", "false");

    const section = document.createElement("section");
    section.className = "hero";
    const box = document.createElement("div");
    box.className = "container";
    const panel = document.createElement("div");
    panel.className = "error-panel";
    panel.setAttribute("role", "alert");

    const h = document.createElement("h2");
    h.textContent = missing.length === 1 ? "A script file is missing" : missing.length + " script files are missing";
    const p = document.createElement("p");
    p.textContent = "The page loaded but these files didn't. Deploy them in a js/ folder next to this page:";
    const list = document.createElement("p");
    list.className = "error-detail";
    list.textContent = missing.map(function (m) { return (PF && PF.FILE_OF && PF.FILE_OF[m]) || m; }).join("\n");

    panel.appendChild(h); panel.appendChild(p); panel.appendChild(list);
    box.appendChild(panel); section.appendChild(box); main.appendChild(section);
  }

  if (!PF || !PF.need) { bootFailure(["core"]); return; }
  const missing = PF.need(REQUIRED);
  if (missing.length) { bootFailure(missing); return; }

  const D = PF.dom, F = PF.fmt, TH = PF.themes, R = PF.render, RES = PF.resume;
  const el = D.el, has = D.has, clear = D.clear;

  /* ------------------------------------------------------------------
     1. State + refs
     ------------------------------------------------------------------ */
  /* Preview mode: the builder drives this page with postMessage — from a
     frame it embeds, or from a tab it opened ("Open in new tab"), so unsaved
     edits show in both. Only that one window is listened to. */
  const PREVIEW_HOST = window.parent !== window ? window.parent : (window.opener || null);
  const PREVIEW = !!PREVIEW_HOST && new URLSearchParams(window.location.search).has("preview");
  /* Static deploys (GitHub Pages) fetch the local data.json next to this
     file, same as always. A hosted deploy of the service can instead set
     <meta name="pf-data-url" content="/api/public/sites/SLUG"> in the HTML
     it serves, and this page will fetch that URL instead — no other change
     needed, because the API returns the exact same data.json shape. */
  const DATA_META = document.querySelector('meta[name="pf-data-url"]');
  const DATA_URL = (DATA_META && DATA_META.content) || "data.json";
  const SLUG_META = document.querySelector('meta[name="pf-hosted-slug"]');
  const HOSTED_SLUG = SLUG_META ? SLUG_META.content : "";
  const HOSTED = !!(DATA_META && HOSTED_SLUG);                  // served by the service at /u/:slug

  let DATA = null;
  let themeMode = "dark";
  let revealObserver = null, sectionObserver = null;

  const refs = {
    doc: document,
    main: document.getElementById("main"),
    navList: document.getElementById("nav-links"),
    mobileList: document.getElementById("mobile-links"),
    footer: document.getElementById("contact"),
    brand: document.getElementById("brand"),
    guard: guardDownload
  };
  const loadStatus = document.getElementById("load-status");
  const resumeRoot = document.getElementById("resume-root");
  const toast = document.getElementById("toast");

  /* Inject the resume stylesheet once, from the module that owns it. */
  (function injectResumeCss() {
    if (document.getElementById("resume-css")) return;
    const style = el("style", { id: "resume-css" });
    style.textContent = RES.css();
    document.head.appendChild(style);
  })();

  /* ------------------------------------------------------------------
     2. Toast + guarded download
        A bare <a download> saves whatever bytes come back, including a
        404 page, under the .pdf name you asked for. Check first.
     ------------------------------------------------------------------ */
  let toastTimer = null;
  function showToast(msg, isError, ms) {
    if (!toast) return;
    if (toastTimer) { window.clearTimeout(toastTimer); toastTimer = null; }
    clear(toast);
    D.append(toast, [msg]);
    toast.classList.toggle("is-error", !!isError);
    toast.setAttribute("role", isError ? "alert" : "status");
    toast.hidden = false;
    if (ms) toastTimer = window.setTimeout(function () { toast.hidden = true; }, ms);
  }
  function hideToast() {
    if (!toast) return;
    if (toastTimer) { window.clearTimeout(toastTimer); toastTimer = null; }
    toast.hidden = true;
  }

  function guardDownload(anchor, url) {
    if (!PF.util.sameOrigin(url)) return anchor;   // cross-origin: `download` is ignored anyway
    anchor.addEventListener("click", function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      showToast("Preparing the file…", false, 0);
      fetch(url, { cache: "no-store" }).then(function (res) {
        const type = (res.headers.get("content-type") || "").toLowerCase();
        if (!res.ok) {
          throw new Error("There's no file at " + url + " (HTTP " + res.status +
            "). It has to be committed to the repo at exactly that path — filenames are case-sensitive.");
        }
        if (type.indexOf("pdf") === -1 && /\.pdf($|\?)/i.test(url)) {
          throw new Error(url + " returned " + (type.split(";")[0] || "an unknown type") +
            " rather than a PDF. Check resumeUrl in data.json.");
        }
        return res.blob();
      }).then(function (blob) {
        PF.util.download(PF.util.fileNameFrom(url, "resume.pdf"), blob);
        hideToast();
      }).catch(function (err) {
        // A TypeError means the request never completed (offline, CORS,
        // file://) — not evidence the file is missing. Let the browser try.
        if (err && err.name === "TypeError") { hideToast(); window.location.href = url; return; }
        showToast(String((err && err.message) || err), true, 12000);
      });
    });
    return anchor;
  }

  /* ------------------------------------------------------------------
     3. Theme
     ------------------------------------------------------------------ */
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", themeMode);
    const resolved = TH.resolveTheme((DATA && DATA.theme) || {});
    TH.applyTheme(document, resolved, themeMode);
    const meta = document.head.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", (resolved.vars[themeMode] || {})["--bg"] || "#0d1117");
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", String(themeMode === "light"));
      btn.setAttribute("aria-label", themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  function setMode(next) {
    themeMode = next === "light" ? "light" : "dark";
    applyTheme();
  }

  /* ------------------------------------------------------------------
     4. Printable resume — built on demand, never left in the DOM
        (a second copy of the content would give the page two <h1>s)
     ------------------------------------------------------------------ */
  let printChoice = { template: "compact", paper: "a4" };

  function buildResume(template, paper) {
    if (!resumeRoot) return;
    clear(resumeRoot);
    printChoice = {
      template: template || printChoice.template,
      paper: paper === "letter" ? "letter" : (paper || printChoice.paper)
    };
    resumeRoot.appendChild(RES.build(DATA || {}, { template: printChoice.template }));
    let pageStyle = document.getElementById("page-size");
    if (!pageStyle) {
      pageStyle = el("style", { id: "page-size" });
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = "@page { size: " + (printChoice.paper === "letter" ? "Letter" : "A4") + "; margin: 14mm; }";
  }

  window.addEventListener("beforeprint", function () {
    if (resumeRoot && !resumeRoot.firstChild) buildResume();
  });

  function setResumePreview(on, template, paper) {
    document.body.classList.toggle("resume-preview", !!on);
    document.body.classList.toggle("paper-letter", !!on && paper === "letter");
    if (on) { buildResume(template, paper); markPages(paper); }
    else if (resumeRoot) clear(resumeRoot);
  }

  /* PDF-like pages: the sheet grows in whole pages, with a break drawn where
     each printed page ends (the same 14mm margins the PDF uses), and the
     builder is told the page count so it can warn when "one page" runs over. */
  function markPages(paper) {
    if (!resumeRoot) return;
    const run = function () {
      Array.prototype.forEach.call(resumeRoot.querySelectorAll(".page-break-guide"), function (n) { n.remove(); });
      const mm = 96 / 25.4, pageMm = paper === "letter" ? 279.4 : 297, inner = (pageMm - 28) * mm;
      const content = resumeRoot.firstElementChild ? resumeRoot.firstElementChild.getBoundingClientRect().height : 0;
      const pages = Math.max(1, Math.ceil((content - 2) / inner));
      /* One continuous sheet: content breaks every (page − margins), so the
         guides sit there; the sheet is sized to finish on a whole page. */
      resumeRoot.style.minHeight = (28 + pages * (pageMm - 28)) + "mm";
      for (let i = 1; i < pages; i++) {
        resumeRoot.appendChild(el("div", { class: "page-break-guide", style: "top:" + (14 + i * (pageMm - 28)) + "mm", "aria-hidden": "true" }, el("span", { text: "Page " + (i + 1) })));
      }
      if (PREVIEW && content) PREVIEW_HOST.postMessage({ type: "portfolio:resume-pages", pages: pages, exact: content / inner }, "*");
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run, run); else run();
  }

  /* ------------------------------------------------------------------
     5. Render / error / load
     ------------------------------------------------------------------ */
  function draw(data) {
    DATA = R.normalise(data);
    themeMode = (DATA.theme && DATA.theme.mode) === "light" ? "light" : "dark";
    applyTheme();

    const pdf = DATA.pdf || {};
    printChoice = {
      template: has(pdf.template) ? pdf.template : "compact",
      paper: pdf.paper === "letter" ? "letter" : "a4"
    };

    if (revealObserver) revealObserver.disconnect();
    if (sectionObserver) sectionObserver.disconnect();

    const result = R.paint(data, refs);
    if (/^\/template-previews\/(?!blank(?:\/|$))/.test(window.location.pathname)) {
      refs.main.prepend(el("p", { class: "sample-notice", text: "Fictional example portfolio — names, organisations, credentials and outcomes are sample content. Replace them with your own before publishing." }));
    }
    if (resumeRoot) clear(resumeRoot);

    refs.main.setAttribute("aria-busy", "false");
    if (loadStatus) loadStatus.textContent = "Portfolio loaded.";
    if (HOSTED && !PREVIEW) hostedChrome();
    const label = document.querySelector('meta[name="pf-preview-label"]');
    if (label && !document.getElementById("pf-preview-ribbon")) document.body.appendChild(el("div", { id: "pf-preview-ribbon", role: "note", text: label.content }));
    setupReveal();
    setupActiveNav(result.sections);
    fitNav();
  }

  /* A template can have many sections (custom ones included), and label
     lengths are the customer's. When the desktop links don't fit beside the
     brand and the controls, the header falls back to the menu button rather
     than wrapping onto two lines or pushing the controls off screen. */
  function fitNav() {
    const header = document.getElementById("site-header");
    const list = refs.navList;
    if (!header || !list) return;
    header.classList.remove("nav-overflow");
    if (document.body.classList.contains("is-sidenav") && window.innerWidth >= 960) return;
    if (window.getComputedStyle(list).display === "none") return;
    const links = list.querySelectorAll("a");
    const actions = header.querySelector(".nav-actions");
    if (!links.length || !actions) return;
    const first = links[0].getBoundingClientRect(), last = links[links.length - 1].getBoundingClientRect();
    const room = actions.getBoundingClientRect().left - 8;
    if (Math.abs(last.top - first.top) > 2 || last.right > room || list.scrollWidth > list.clientWidth + 1) header.classList.add("nav-overflow");
  }
  let fitFrame = 0;
  window.addEventListener("resize", function () {
    if (fitFrame) return;
    fitFrame = window.requestAnimationFrame(function () { fitFrame = 0; fitNav(); });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitNav(); });

  /* Hosted pages carry a "report" link (we're the host, so abuse is ours to
     act on) and a view beacon. The beacon sends no personal data: the
     server counts uniques from a salted daily hash and keeps daily totals. */
  let viewSent = false;
  function hostedChrome() {
    /* Every published portfolio is seen by exactly the audience most likely
       to want one, so the way in has to be visible in the header rather than
       only as a footer credit.

       Deliberately NOT personalised: telling a signed-in owner "My sites"
       instead of "Log in" would cost an API call on every public page view
       (the refresh cookie is httpOnly, so the page cannot read it) to fix a
       label for the one visitor who already knows the way. "Log in" lands a
       signed-in owner in their workspace regardless. */
    const actions = document.querySelector(".site-header .nav-actions");
    if (actions && !actions.querySelector(".pf-cta")) {
      const signup = el("a", { class: "btn btn-primary pf-cta", href: "/app.html#signup", text: "Build yours free" });
      const login = el("a", { class: "btn btn-ghost pf-cta pf-cta-login", href: "/app.html#login", text: "Log in" });
      actions.insertBefore(signup, actions.firstChild);
      actions.insertBefore(login, signup);
    }
    // Mobile keeps the portfolio's own name and navigation usable; product
    // links remain available inside the menu instead of overflowing it.
    if (!refs.mobileList.querySelector(".pf-mobile-cta")) {
      [["Log in", "/app.html#login"], ["Build yours free", "/app.html#signup"]].forEach(function (link) {
        refs.mobileList.appendChild(el("li", { class: "pf-mobile-cta" }, el("a", { href: link[1], text: link[0] })));
      });
    }

    const bottom = refs.footer.querySelector(".footer-bottom");
    if (bottom && !bottom.querySelector(".report-link")) {
      bottom.appendChild(el("a", { class: "report-link", href: "/#faq", text: "Report this page",
        onclick: function (e) {
          e.preventDefault();
          reportPage();
        } }));
      bottom.appendChild(el("a", { class: "pf-made", href: "/", text: "Built with portfolio.dev — make yours free" }));
    }
    if (viewSent) return;
    viewSent = true;
    trackEvents();
    try {
      const payload = JSON.stringify({ referrer: document.referrer || "" });
      const url = "/api/public/sites/" + encodeURIComponent(HOSTED_SLUG) + "/view";
      if (!(navigator.sendBeacon && navigator.sendBeacon(url, new Blob([payload], { type: "application/json" })))) {
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(function () {});
      }
    } catch (e) { /* analytics must never break the page */ }
  }

  /* Click and section counters for the owner's dashboard. Batched, sent
     with sendBeacon, and skipped entirely when the browser asks not to be
     tracked. The payload is a kind plus a section id or a link's host —
     never a full URL, a cookie or an identifier. */
  const SOCIAL = /(^|\.)(linkedin|github|gitlab|twitter|x|instagram|dribbble|behance|youtube|medium|mastodon|bsky|threads|facebook|tiktok|kaggle|scholar\.google|orcid|researchgate)\./i;
  let queue = [], flushTimer = null;
  function track(kind, target) {
    queue.push({ kind: kind, target: target || "" });
    if (!flushTimer) flushTimer = window.setTimeout(flush, 2000);
  }
  function flush() {
    window.clearTimeout(flushTimer); flushTimer = null;
    if (!queue.length) return;
    const body = JSON.stringify({ events: queue.splice(0, 20) });
    const url = "/api/public/sites/" + encodeURIComponent(HOSTED_SLUG) + "/event";
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))))
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function () {});
    } catch (e) { /* analytics must never break the page */ }
  }
  function trackEvents() {
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
    document.addEventListener("click", function (e) {
      const a = e.target && e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const resume = DATA && DATA.profile && DATA.profile.resumeUrl;
      if (/^mailto:/i.test(href)) track("click_email");
      else if (/^tel:/i.test(href)) track("click_phone");
      else if ((resume && href === resume) || /\.pdf($|\?)/i.test(href)) track("click_resume");
      else if (/^https?:\/\//i.test(href) && !PF.util.sameOrigin(href)) {
        let host = "";
        try { host = new URL(href).hostname.replace(/^www\./, ""); } catch (_) { return; }
        track(SOCIAL.test(host + ".") ? "click_social" : "click_link", host);
      }
    }, true);
    window.addEventListener("beforeprint", function () { track("download_pdf"); flush(); });
    window.addEventListener("pagehide", flush);
    if ("IntersectionObserver" in window) {
      const seen = {};
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting || seen[en.target.id]) return;
          seen[en.target.id] = true; io.unobserve(en.target);
          track("section_view", en.target.id);
        });
      }, { threshold: 0.35 });
      Array.prototype.forEach.call(document.querySelectorAll("main section[id]"), function (sec) { io.observe(sec); });
    }
  }

  function reportPage() {
    const reason = window.prompt("Why are you reporting this page? Type one of: impersonation, phishing, spam, illegal, copyright, harassment, other");
    if (!reason) return;
    const details = window.prompt("Anything else we should know? (optional)") || "";
    fetch("/api/public/sites/" + encodeURIComponent(HOSTED_SLUG) + "/report", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: String(reason).trim().toLowerCase(), details: details })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { showToast(r.ok ? (j.message || "Thanks, we'll review it.") : (j.error || "Couldn't send the report."), !r.ok, 6000); }); })
      .catch(function () { showToast("Couldn't send the report right now.", true, 6000); });
  }

  function showError(err) {
    clear(refs.main);
    refs.main.setAttribute("aria-busy", "false");
    if (loadStatus) loadStatus.textContent = "The portfolio content failed to load.";

    const isFile = window.location.protocol === "file:";
    refs.main.appendChild(el("section", { class: "hero", "aria-labelledby": "err-title" },
      el("div", { class: "container" },
        el("div", { class: "error-panel", role: "alert" },
          el("p", { class: "eyebrow", text: "Content unavailable" }),
          el("h2", { id: "err-title", text: HOSTED ? "This portfolio isn't available right now" : "Couldn't load data.json" }),
          el("p", { text: HOSTED
            ? "It may have been unpublished by its owner, or the service is having trouble. Try again in a moment."
            : "The page loaded, but the content file behind it didn't. Everything below is generated from that file." }),
          el("p", { class: "error-detail", text: String((err && err.message) || err) }),
          HOSTED ? null : isFile
            ? el("p", null, "You opened this file directly from disk, and browsers block ",
                el("code", { text: "fetch()" }), " on ", el("code", { text: "file://" }),
                " URLs. Serve the folder over HTTP instead — for example ",
                el("code", { text: "python3 -m http.server" }), " — or view it on GitHub Pages.")
            : (HOSTED ? null : el("p", null, "Check that ", el("code", { text: "data.json" }), " sits next to this page and contains valid JSON.")),
          el("div", { class: "hero-cta", style: "margin-top:1.5rem" },
            el("button", { class: "btn btn-primary", type: "button", onclick: load }, "Try again"))))));
  }

  function load() {
    if (loadStatus) loadStatus.textContent = "Loading portfolio…";
    refs.main.setAttribute("aria-busy", "true");
    fetch(DATA_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error(HOSTED && res.status === 404 ? "No published portfolio at this address." : "HTTP " + res.status + " " + (res.statusText || "") + " while fetching " + DATA_URL);
        return res.text();
      })
      .then(function (body) {
        let data;
        try { data = JSON.parse(body); }
        catch (e) { throw new Error((HOSTED ? "The content" : "data.json") + " is not valid JSON — " + e.message); }
        draw(data);
        /* Signed preview links (/preview/…) can ask for the resume view and
           a watermark the same way the builder's frame does, via meta tags. */
        const meta = function (n) { const m = document.querySelector('meta[name="' + n + '"]'); return m ? m.content : ""; };
        if (meta("pf-view") === "resume") setResumePreview(true, meta("pf-resume-template") || (data.pdf && data.pdf.template), meta("pf-paper") || (data.pdf && data.pdf.paper));
        if (meta("pf-watermark")) setWatermark(meta("pf-watermark"));
      })
      .catch(showError);
  }

  /* ------------------------------------------------------------------
     6. Preview bridge (the builder's Preview tab)
     ------------------------------------------------------------------ */
  function onPreviewMessage(event) {
    if (event.source !== PREVIEW_HOST) return;
    const msg = event.data;
    if (!msg) return;

    /* Compare mode keeps two frames at the same place in the page. */
    if (msg.type === "portfolio:scroll") {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      syncing = true; window.scrollTo(0, Math.max(0, max) * (Number(msg.ratio) || 0));
      window.setTimeout(function () { syncing = false; }, 60);
      return;
    }

    if (msg.type === "portfolio:data") {
      try {
        draw(msg.data);
        if (msg.mode === "light" || msg.mode === "dark") setMode(msg.mode);
        setResumePreview(msg.view === "resume", msg.template, msg.paper);
        setWatermark(msg.watermark);
      } catch (e) { showError(e); }
      return;
    }

    /* The builder drives PDF export through here so the print CSS only has
       to exist in one document. */
    if (msg.type === "portfolio:print") {
      try {
        buildResume(msg.template, msg.paper);
        window.setTimeout(function () { window.print(); }, 80);
      } catch (e) { /* nothing sensible to do in a preview frame */ }
    }
  }

  /* A support agent previewing a customer's site gets a watermark over it,
     so a screenshot of a borrowed account is never mistaken for the real
     page. Driven by the parent frame; absent for everyone else. */
  function setWatermark(label) {
    const existing = document.getElementById("pf-watermark");
    if (!label) { if (existing) existing.remove(); return; }
    const node = existing || el("div", { id: "pf-watermark", "aria-hidden": "true" });
    node.setAttribute("data-label", String(label).slice(0, 40));
    if (!existing) document.body.appendChild(node);
  }

  /* ------------------------------------------------------------------
     7. Chrome
     ------------------------------------------------------------------ */
  function setupReveal() {
    const nodes = document.querySelectorAll(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(nodes, function (n) { n.classList.add("is-visible"); });
      return;
    }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(nodes, function (n) { revealObserver.observe(n); });
  }

  function setupActiveNav(sections) {
    const anchors = Array.prototype.slice.call(document.querySelectorAll("#nav-links a, #mobile-links a"));
    const targets = sections.map(function (s) { return document.getElementById(s.id); }).filter(Boolean);
    if (!("IntersectionObserver" in window) || !targets.length) return;
    const ratios = {};
    sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { ratios[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
      let best = null, bestRatio = 0;
      Object.keys(ratios).forEach(function (id) { if (ratios[id] > bestRatio) { bestRatio = ratios[id]; best = id; } });
      anchors.forEach(function (a) {
        a.classList.toggle("is-active", !!best && a.getAttribute("href") === "#" + best);
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] });
    targets.forEach(function (t) { sectionObserver.observe(t); });
  }

  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    setMode(themeMode === "dark" ? "light" : "dark");
  });

  const menuBtn = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  function closeMenu() {
    mobileMenu.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Open navigation menu");
  }
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", function () {
      const open = mobileMenu.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    });
    mobileMenu.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileMenu.classList.contains("is-open")) { closeMenu(); menuBtn.focus(); }
    });
  }

  const header = document.getElementById("site-header");
  function onScroll() { if (header) header.classList.toggle("is-stuck", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  PF.icons.install();   // pinned Lucide build; brand marks are already inline
  document.addEventListener("DOMContentLoaded", function () { PF.icons.paint(); });
  window.addEventListener("load", function () { PF.icons.paint(); });

  /* ------------------------------------------------------------------
     8. Go
     ------------------------------------------------------------------ */
  applyTheme();   // so the loading skeleton is already themed

  let syncing = false, scrollTimer = null;
  if (PREVIEW) {
    window.addEventListener("message", onPreviewMessage);
    window.addEventListener("scroll", function () {
      if (syncing || scrollTimer) return;
      scrollTimer = window.setTimeout(function () {
        scrollTimer = null;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        PREVIEW_HOST.postMessage({ type: "portfolio:scrolled", ratio: max > 0 ? window.scrollY / max : 0 }, "*");
      }, 50);
    }, { passive: true });
    PREVIEW_HOST.postMessage({ type: "portfolio:preview-ready" }, "*");
    if (loadStatus) loadStatus.textContent = "Waiting for preview data…";
  } else {
    load();
  }
})();
