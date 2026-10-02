/* ==========================================================================
   skeletons.js — the template (structure) registry.

   A template is page STRUCTURE and storytelling: nav placement, hero
   composition, how each section presents (cards, lists, tables, charts),
   default section order, density and typographic hierarchy. Colour and font
   families stay in js/themes.js; a template never touches section wording
   the customer wrote or which custom sections exist — that's content, or a
   profession pack (js/packs.js, builder-only).

   render.js resolves the active template on every paint() the same way it
   resolves the active theme, so it ships identically to the builder Preview,
   the GitHub Pages export and the hosted /u/:slug page. Each template has
   its own hero and section renderers in render.js (TEMPLATE_VIEWS) and its
   own block in site.html (body[data-skeleton="…"]).

   Fields render.js reads:
     navMode      "top" | "side"          side = vertical rail at ≥960px
     density      "normal" | "dense"
     showStatBand whether the hero carries the computed-figures strip
     order        default section order, used only while the customer has
                  not set data.sectionOrder themselves
     labels       fallback eyebrow/nav labels for the built-ins, used only
                  when data.sectionLabels has no entry of its own
     headings     fallback section headings (same rule)
     contact      fallback footer heading/blurb (profile fields win)
     brand        "first" | "full" | "path" — how the header names the person
     filters      whether Projects gets the technology filter bar

   COMPATIBILITY: sites store a skeleton id. The sixteen retired ids resolve
   through ALIASES; an unknown id falls back to clean-recruiter.
   ========================================================================== */
(function () {
  "use strict";
  const PF = (window.PF = window.PF || {});
  PF.modules = PF.modules || {};
  PF.provide = PF.provide || function (n, api) { PF[n] = api; PF.modules[n] = true; };

  const SKELETONS = [
    {
      id: "clean-recruiter", name: "Clean Recruiter",
      blurb: "Calm single column that reads like a well-set resume: strong summary, experience first, skills as plain lists. ATS-friendly and quick to scan.",
      navMode: "top", heroVariant: "recruiter", showStatBand: true, density: "normal", brand: "full", filters: false,
      order: ["about", "experience", "skills", "projects", "education", "certifications"],
      labels: {}, headings: { about: "Summary", experience: "Experience", skills: "Skills", projects: "Selected projects", education: "Education", certifications: "Certifications" },
      sketch: [
        "┌──────────────────────┐",
        "│ Name            nav  │",
        "├──────────────────────┤",
        "│ Name                 │",
        "│ Role · City          │",
        "│ Summary paragraph…   │",
        "│ 4.5 yrs · 5 projects │",
        "├──────────────────────┤",
        "│ EXPERIENCE ───────── │",
        "│ Role, Company   2024 │",
        "│ • achievement        │",
        "│ SKILLS ───────────── │",
        "└──────────────────────┘"
      ]
    },
    {
      id: "technical-terminal", name: "Technical Terminal",
      blurb: "Command-line inspired: a file-tree side rail, a terminal-window hero, projects as repositories, skills as a config file and experience as a commit log.",
      navMode: "side", heroVariant: "terminal", showStatBand: true, density: "dense", brand: "path", filters: true,
      order: ["projects", "skills", "experience", "about", "certifications", "education"],
      labels: {}, headings: { projects: "projects/", skills: "stack.yml", experience: "git log --career", about: "README.md", certifications: "certs/", education: "education/" },
      sketch: [
        "┌──────┬───────────────┐",
        "│ ~/   │ ● ● ●  zsh    │",
        "│ ./   │ $ whoami      │",
        "│ proj │ Name — Role   │",
        "│ stack├───────────────┤",
        "│ log  │ [repo] [repo] │",
        "│      │ stack.yml     │",
        "│      │ git log       │",
        "└──────┴───────────────┘"
      ]
    },
    {
      id: "executive-dossier", name: "Executive Dossier",
      blurb: "A premium leadership profile: portrait and at-a-glance panel, selected achievements, index-numbered chapters and case studies told as challenge, approach and outcome.",
      navMode: "top", heroVariant: "dossier", showStatBand: false, density: "normal", brand: "full", filters: false,
      order: ["about", "experience", "projects", "certifications", "education", "skills"],
      labels: {}, headings: { about: "Leadership profile", experience: "Career", projects: "Selected case studies", certifications: "Credentials", education: "Education", skills: "Areas of expertise" },
      sketch: [
        "┌──────────────────────┐",
        "│ NAME            nav  │",
        "├────────────┬─────────┤",
        "│ Name       │ PORTRAIT│",
        "│ Leadership │ at a    │",
        "│ summary    │ glance  │",
        "├────┬───────┴─────────┤",
        "│ 01 │ Achievements    │",
        "│ 02 │ Career          │",
        "│ 03 │ Case studies    │",
        "└────┴─────────────────┘"
      ]
    },
    {
      id: "product-case-study", name: "Product Case Study",
      blurb: "Your positioning line is the headline and each project is a full chapter — problem, approach, result — with a numbered case index up front. For designers, PMs and product people.",
      navMode: "top", heroVariant: "statement", showStatBand: false, density: "normal", brand: "first", filters: false,
      order: ["projects", "about", "experience", "skills", "education", "certifications"],
      labels: {}, headings: { projects: "Case studies", about: "How I work", experience: "Experience", skills: "Toolkit", education: "Education", certifications: "Certifications" },
      sketch: [
        "┌──────────────────────┐",
        "│ Name · Role     nav  │",
        "├──────────────────────┤",
        "│ A BIG POSITIONING    │",
        "│ STATEMENT.           │",
        "│ 01 Case · 02 Case    │",
        "├──────────────────────┤",
        "│ 01  Case title       │",
        "│ [      cover       ] │",
        "│ Problem│Approach│Res │",
        "└──────────────────────┘"
      ]
    },
    {
      id: "academic-cv", name: "Academic CV",
      blurb: "The classic academic homepage: a sticky identity column with affiliation and links beside a CV — research, publications as numbered citations, education and appointments by date.",
      navMode: "top", heroVariant: "sidebar", showStatBand: false, density: "dense", brand: "full", filters: false, sectionContainer: true,
      order: ["about", "education", "experience", "projects", "certifications", "skills"],
      labels: {}, headings: { about: "Research statement", education: "Education", experience: "Appointments", projects: "Research projects", certifications: "Grants, awards & training", skills: "Methods & tools" },
      par: ["Question", "Method", "Outcome"],
      sketch: [
        "┌───────┬──────────────┐",
        "│ PHOTO │ Research     │",
        "│ Name  │ statement…   │",
        "│ Title │ EDUCATION    │",
        "│ Dept  │ 2022 PhD …   │",
        "│ email │ PUBLICATIONS │",
        "│ links │ [1] Title…   │",
        "│       │ [2] Title…   │",
        "└───────┴──────────────┘"
      ]
    },
    {
      id: "freelancer-services", name: "Freelancer Services",
      blurb: "Built to win work: a clear offer and call to action, what you do as service cards (drawn from your skills when you haven't written services), case studies, testimonials and a strong contact band.",
      navMode: "top", heroVariant: "offer", showStatBand: false, density: "normal", brand: "first", filters: false,
      order: ["skills", "projects", "about", "experience", "certifications", "education"],
      labels: { skills: "Services", projects: "Case studies", experience: "Background" },
      headings: { skills: "What I do", projects: "Recent work", about: "About", experience: "Background", certifications: "Credentials", education: "Education" },
      contact: { heading: "Have a project in mind?", blurb: "Tell me what you're working on — I'll reply with how I can help and what it would take." },
      sketch: [
        "┌──────────────────────┐",
        "│ Name     nav [Hire]  │",
        "├──────────┬───────────┤",
        "│ Offer    │ portrait  │",
        "│ [Start a project]    │",
        "├──────────┴───────────┤",
        "│ ▢ service ▢ service  │",
        "│ Case study │ Case    │",
        "│ “Testimonial”        │",
        "│ ███ LET'S TALK ███   │",
        "└──────────────────────┘"
      ]
    },
    {
      id: "creative-showcase", name: "Creative Showcase",
      blurb: "The work is the headline: poster-size name, then an asymmetric wall of projects with big imagery (typographic covers when there's no image), and the words kept short.",
      navMode: "top", heroVariant: "poster", showStatBand: false, density: "normal", brand: "first", filters: true,
      order: ["projects", "about", "experience", "skills", "education", "certifications"],
      labels: { projects: "Work" }, headings: { projects: "Selected work", about: "About", experience: "Clients & roles", skills: "Disciplines", education: "Education", certifications: "Recognition" },
      sketch: [
        "┌──────────────────────┐",
        "│ name            nav  │",
        "│ NAME IN              │",
        "│ POSTER TYPE          │",
        "├──────────────────────┤",
        "│ [   big project    ] │",
        "│ [ proj   ][ proj ]   │",
        "│ [ proj ][  proj    ] │",
        "│ about · clients      │",
        "└──────────────────────┘"
      ]
    },
    {
      id: "data-report", name: "Data Analyst Report",
      blurb: "Reads like a well-built dashboard: a KPI strip computed from your own data, a career timeline chart, skill-coverage bars, and case studies laid out as findings.",
      navMode: "top", heroVariant: "report", showStatBand: true, density: "normal", brand: "first", filters: true,
      order: ["about", "projects", "skills", "experience", "certifications", "education"],
      labels: {}, headings: { about: "Executive summary", projects: "Case studies", skills: "Skill coverage", experience: "Career timeline", certifications: "Certifications", education: "Education" },
      sketch: [
        "┌──────────────────────┐",
        "│ REPORT · Name   nav  │",
        "├──────────────────────┤",
        "│ [4.5][5][24][3] KPIs │",
        "│ ▇▇▇▇▇▇   ▇▇▇         │",
        "│    ▇▇▇▇▇▇▇▇ timeline │",
        "├──────────┬───────────┤",
        "│ ▇▇▇▇ SQL │ Finding   │",
        "│ ▇▇ Viz   │ Finding   │",
        "└──────────┴───────────┘"
      ]
    }
  ];

  /* Every retired structure id → the template with the closest intent. */
  const ALIASES = {
    classic: "clean-recruiter", sidenav: "clean-recruiter", "timeline-led": "clean-recruiter",
    "dense-cv": "clean-recruiter", "center-card": "clean-recruiter",
    terminal: "technical-terminal",
    dossier: "executive-dossier", editorial: "executive-dossier",
    "case-study": "product-case-study", storyboard: "product-case-study",
    "publication-list": "academic-cv",
    "project-board": "freelancer-services",
    "gallery-first": "creative-showcase", poster: "creative-showcase", "split-profile": "creative-showcase", exhibition: "creative-showcase",
    directory: "data-report"
  };
  const FALLBACK = "clean-recruiter";

  const INDEX = {};
  SKELETONS.forEach(function (s) { INDEX[s.id] = s; });

  function canonical(id) {
    if (typeof id !== "string" || !id) return null;
    if (INDEX[id]) return id;
    return ALIASES[id] && INDEX[ALIASES[id]] ? ALIASES[id] : null;
  }
  function byId(id) { return INDEX[canonical(id) || FALLBACK]; }
  function ids() { return SKELETONS.map(function (s) { return s.id; }); }

  PF.provide("skeletons", {
    LIST: SKELETONS,
    ALIASES: ALIASES,
    DEFAULT: FALLBACK,
    canonical: canonical,
    byId: byId,
    ids: ids
  });
})();
