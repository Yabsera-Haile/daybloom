// Daybloom prototype shell: header, bottom tabs, "+ Add" button and the add chooser.
// Configure per page with <body data-tab data-title data-back data-fab data-add-for>.
(function () {
  const cfg = document.body.dataset;

  const logo = `<svg viewBox="0 0 100 100" class="w-8 h-8 shrink-0" aria-hidden="true">
    <rect width="100" height="100" rx="24" fill="#5B7E67"/>
    <path d="M50 20 C50 20 62 34 62 48 C62 56 56 62 50 62 C44 62 38 56 38 48 C38 34 50 20 50 20 Z" fill="#FDFBF7"/>
    <circle cx="50" cy="50" r="7" fill="#E08D79"/>
    <path d="M32 60 C38 55 45 66 50 62 C55 66 62 55 68 60 C72 64 68 74 60 76 C52 78 48 76 40 76 C32 74 28 64 32 60 Z" fill="#F4EAE0" opacity="0.9"/>
    <path d="M50 62 L50 82" fill="none" stroke="#FDFBF7" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M50 72 C44 70 40 72 38 75" fill="none" stroke="#FDFBF7" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M50 68 C56 66 60 68 62 71" fill="none" stroke="#FDFBF7" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;

  const search = `<a href="../search/code.html" aria-label="Search your plans" class="w-12 h-12 flex items-center justify-center">
      <span class="w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center">
        <span class="material-symbols-outlined text-[22px]">search</span>
      </span>
    </a>`;

  // Header
  const header = document.createElement("header");
  header.className = "fixed top-0 frame-x z-40 bg-surface/90 backdrop-blur-xl";
  if (cfg.back) {
    header.innerHTML = `<div class="h-16 pl-1 pr-margin flex items-center justify-between">
      <div class="flex items-center gap-1 min-w-0">
        <a href="${cfg.back}" aria-label="Back" class="w-12 h-12 flex items-center justify-center rounded-full text-on-surface">
          <span class="material-symbols-outlined text-[22px]">arrow_back</span>
        </a>
        <h1 class="font-serif text-headline-md text-on-surface truncate">${cfg.title}</h1>
      </div>
    </div>`;
  } else {
    header.innerHTML = `<div class="h-16 px-margin pr-2 flex items-center justify-between">
      <a href="../today/code.html" class="flex items-center gap-space-sm" aria-label="Daybloom, go to Today">
        ${logo}
        <span class="flex flex-col">
          <span class="font-serif text-headline-sm text-primary leading-none">Daybloom</span>
          <span class="text-label-sm text-on-surface-variant">${cfg.title}</span>
        </span>
      </a>
      ${search}
    </div>`;
  }
  if (cfg.header !== "none") document.body.prepend(header);

  // Bottom tabs
  if (cfg.tab) {
    const tabs = [
      ["today", "Today", "today"],
      ["week", "Week", "view_week"],
      ["month", "Month", "calendar_month"],
      ["habits", "Habits", "spa"],
      ["more", "More", "menu"]
    ];
    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Main");
    nav.className = "fixed bottom-0 frame-x z-40 bg-surface/95 backdrop-blur-xl shadow-[0_-2px_12px_rgba(45,41,38,0.06)]";
    nav.innerHTML = `<div class="flex items-center justify-around h-[72px] px-1">${tabs.map(([id, label, icon]) => {
      const active = id === cfg.tab;
      return `<a href="../${id}/code.html" ${active ? 'aria-current="page"' : ""}
        class="flex flex-col items-center justify-center gap-0.5 min-w-[64px] h-14 rounded-2xl ${active ? "bg-primary-fixed/60 text-primary" : "text-on-surface-variant"}">
        <span class="material-symbols-outlined text-[24px] ${active ? "icon-fill" : ""}">${icon}</span>
        <span class="text-label-sm">${label}</span>
      </a>`;
    }).join("")}</div>`;
    document.body.append(nav);
  }

  // "+ Add" button and chooser (fix I7: one add button on Today, Week, Month)
  if (cfg.fab) {
    const fab = document.createElement("div");
    fab.className = "fixed bottom-[88px] frame-x z-30 px-margin flex justify-end pointer-events-none";
    fab.innerHTML = `<a href="#add" class="pointer-events-auto h-14 pl-5 pr-6 rounded-full bg-primary text-on-primary shadow-float flex items-center gap-2 active:scale-95 transition-transform">
        <span class="material-symbols-outlined text-[24px]">add</span>
        <span class="text-label-lg">Add</span>
      </a>`;
    document.body.append(fab);

    const option = (href, icon, iconCls, title, text) => `<a href="${href}" class="flex items-center gap-space-md p-space-md rounded-2xl bg-surface-container-low min-h-touch">
        <span class="w-12 h-12 rounded-full ${iconCls} flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[24px]">${icon}</span>
        </span>
        <span class="flex flex-col min-w-0">
          <span class="text-body-lg font-semibold text-on-surface">${title}</span>
          <span class="text-body-md text-on-surface-variant">${text}</span>
        </span>
        <span class="material-symbols-outlined text-[22px] text-on-surface-variant ml-auto">chevron_right</span>
      </a>`;

    const sheet = document.createElement("div");
    sheet.dataset.sheet = "add";
    sheet.hidden = true;
    sheet.className = "fixed inset-0 z-50";
    sheet.innerHTML = `<a href="#close" aria-label="Close" class="absolute inset-0 bg-scrim/30"></a>
      <div role="dialog" aria-modal="true" aria-labelledby="add-title" class="absolute bottom-0 frame-x bg-surface-container-lowest rounded-t-2xl shadow-float px-margin pt-3 pb-8 sheet-in">
        <div class="w-12 h-1.5 rounded-full bg-surface-variant mx-auto mb-space-md"></div>
        <div class="flex items-center justify-between mb-space-md">
          <div>
            <h2 id="add-title" class="font-serif text-headline-md text-on-surface">What would you like to add?</h2>
            <p class="text-body-md text-on-surface-variant">For ${cfg.addFor || "Wednesday, Oct 23"}</p>
          </div>
          <a href="#close" aria-label="Close" class="w-12 h-12 flex items-center justify-center">
            <span class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center"><span class="material-symbols-outlined text-[20px]">close</span></span>
          </a>
        </div>
        <div class="flex flex-col gap-space-sm">
          ${option("../event/code.html#new", "event", "bg-primary-fixed text-on-primary-fixed", "Event", "Something at a set time, like a class or a meeting")}
          ${option(cfg.fab === "add-week" ? "#add-priority" : "../today/code.html#add-task", "task_alt", "bg-tertiary-fixed text-on-tertiary-fixed", "To-do", cfg.fab === "add-week" ? "Something to finish this week" : "Something to get done that day")}
        </div>
      </div>`;
    document.body.append(sheet);
  }

  // Hash-driven state: [data-sheet="x"] and [data-show-on="x"] appear when the URL ends in #x.
  function sync() {
    const h = location.hash.slice(1);
    document.querySelectorAll("[data-sheet]").forEach((el) => { el.hidden = el.dataset.sheet !== h; });
    document.querySelectorAll("[data-show-on]").forEach((el) => { el.hidden = !el.dataset.showOn.split(" ").includes(h); });
    document.querySelectorAll("[data-hide-on]").forEach((el) => { el.hidden = el.dataset.hideOn.split(" ").includes(h); });
    document.documentElement.style.overflow = document.querySelector("[data-sheet]:not([hidden])") ? "hidden" : "";
    // Inline forms (e.g. #add-task) scroll into view and focus their field.
    const reveal = document.querySelector("[data-reveal]:not([hidden])");
    if (reveal) {
      reveal.scrollIntoView({ block: "center" });
      reveal.querySelector("input")?.focus({ preventScroll: true });
    }
  }
  window.addEventListener("hashchange", sync);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && location.hash) location.hash = "close"; });
  sync();
})();
