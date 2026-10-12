(() => {
  const DATA = window.__VAULT__;
  if (!DATA || !DATA.appliances) {
    document.body.innerHTML = "<p style='padding:2rem;font-family:system-ui;color:#e2e8f0;background:#0f172a'>Missing vault data. Run build.py.</p>";
    return;
  }

  const STORE_KEY = "home-vault-v1";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function todayYMD() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function parseYMD(s) {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function daysUntil(ymd) {
    const t = parseYMD(ymd);
    if (!t) return null;
    const now = parseYMD(todayYMD());
    return Math.round((t - now) / 86400000);
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  let store = loadStore();
  if (!store.filterDue) store.filterDue = {};
  if (!store.service) store.service = null;

  // Seed filter dues from JSON defaults once
  DATA.filters.forEach((f) => {
    if (!store.filterDue[f.id] && f.defaultNextDue) {
      store.filterDue[f.id] = f.defaultNextDue;
    }
  });
  if (!store.service) {
    store.service = (DATA.serviceSeed || []).map((e) => ({ ...e }));
    store.seeded = true;
  }
  saveStore(store);

  function applianceById(id) {
    return DATA.appliances.find((a) => a.id === id);
  }

  function filterStatus(ymd) {
    const d = daysUntil(ymd);
    if (d == null) return { cls: "", label: "Set due date", card: "" };
    if (d < 0) return { cls: "late", label: `${Math.abs(d)}d overdue`, card: "overdue" };
    if (d <= 30) return { cls: "soon", label: `Due in ${d}d`, card: "due-soon" };
    return { cls: "ok", label: `Due in ${d}d`, card: "" };
  }

  function setView(name) {
    $$(".tab").forEach((t) => {
      const on = t.dataset.view === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
  }

  function renderStats() {
    const dueSoon = DATA.filters.filter((f) => {
      const st = filterStatus(store.filterDue[f.id]);
      return st.cls === "soon" || st.cls === "late";
    }).length;
    const activeW = DATA.warranties.filter((w) => daysUntil(w.ends) >= 0).length;
    $("#statRow").innerHTML = `
      <div class="stat"><div class="n">${DATA.appliances.length}</div><div class="l">Appliances</div></div>
      <div class="stat"><div class="n">${DATA.filters.length}</div><div class="l">Filters</div></div>
      <div class="stat"><div class="n">${activeW}</div><div class="l">Active warranties</div></div>
      <div class="stat"><div class="n">${(store.service || []).length}</div><div class="l">Service entries</div></div>
    `;
    const pill = $("#duePill");
    if (dueSoon > 0) {
      pill.textContent = `${dueSoon} filter due`;
      pill.className = "pill warn";
    } else {
      pill.textContent = "Filters OK";
      pill.className = "pill accent";
    }
  }

  function renderAppliances() {
    $("#applianceRoot").innerHTML = DATA.appliances.map((a) => `
      <article class="ap-card">
        <div class="cat">${escapeHtml(a.category)}</div>
        <h3>${escapeHtml(a.name)} <span class="badge-ex">EXAMPLE</span></h3>
        <p class="meta"><strong>${escapeHtml(a.brand)}</strong> · ${escapeHtml(a.model)}</p>
        <p class="meta">Serial <span class="serial">${escapeHtml(a.serial)}</span></p>
        <p class="meta">Installed ${escapeHtml(a.installed)} · ${escapeHtml(a.location)}</p>
        <p class="hint">${escapeHtml(a.manualHint)}</p>
        <p class="hint">${escapeHtml(a.notes)}</p>
      </article>
    `).join("");
  }

  function renderFilters() {
    $("#filterRoot").innerHTML = DATA.filters.map((f) => {
      const due = store.filterDue[f.id] || "";
      const st = filterStatus(due);
      const ap = applianceById(f.applianceId);
      return `
        <article class="filter-card ${st.card}" data-id="${escapeHtml(f.id)}">
          <div class="filter-head">
            <div>
              <h3>${escapeHtml(f.name)} <span class="badge-ex">EXAMPLE</span></h3>
              <p class="meta">${ap ? escapeHtml(ap.name) : ""} · every ~${f.intervalMonths} mo</p>
            </div>
            <span class="size-pill">${escapeHtml(f.size)}</span>
          </div>
          <p class="hint">${escapeHtml(f.notes)}</p>
          <div class="due-row">
            <label>Next due
              <input type="date" class="due-input" value="${escapeHtml(due)}" data-filter="${escapeHtml(f.id)}">
            </label>
            <span class="due-status ${st.cls}">${escapeHtml(st.label)}</span>
            <button type="button" class="btn sm ghost bump-due" data-filter="${escapeHtml(f.id)}" data-months="${f.intervalMonths}">Mark done → +${f.intervalMonths}mo</button>
          </div>
        </article>
      `;
    }).join("");

    $$(".due-input").forEach((inp) => {
      inp.addEventListener("change", () => {
        store.filterDue[inp.dataset.filter] = inp.value;
        saveStore(store);
        renderFilters();
        renderStats();
      });
    });
    $$(".bump-due").forEach((btn) => {
      btn.addEventListener("click", () => {
        const months = Number(btn.dataset.months) || 3;
        const base = parseYMD(todayYMD());
        base.setMonth(base.getMonth() + months);
        const ymd = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
        store.filterDue[btn.dataset.filter] = ymd;
        saveStore(store);
        renderFilters();
        renderStats();
      });
    });
  }

  function renderWarranties() {
    const sorted = [...DATA.warranties].sort((a, b) => (a.ends || "").localeCompare(b.ends || ""));
    $("#warrantyRoot").innerHTML = sorted.map((w) => {
      const d = daysUntil(w.ends);
      let dot = "";
      let status = "";
      if (d == null) { status = ""; }
      else if (d < 0) { dot = "expired"; status = `Expired ${Math.abs(d)}d ago`; }
      else if (d <= 90) { dot = "soon"; status = `Expires in ${d}d`; }
      else { status = `Expires in ${d}d`; }
      const ap = applianceById(w.applianceId);
      return `
        <div class="tl-item">
          <div class="tl-date">${escapeHtml(w.ends)}</div>
          <div class="tl-dot ${dot}"></div>
          <div class="tl-body">
            <h3>${escapeHtml(w.label)} <span class="badge-ex">EXAMPLE</span></h3>
            <p>${ap ? escapeHtml(ap.name) : ""} · ${escapeHtml(w.provider)}</p>
            <p>${escapeHtml(w.starts)} → ${escapeHtml(w.ends)} · ${escapeHtml(status)}</p>
            <p>${escapeHtml(w.notes)}</p>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderService() {
    const sel = $("#svcAppliance");
    sel.innerHTML = DATA.appliances.map((a) =>
      `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}</option>`
    ).join("");
    if (!$("#svcDate").value) $("#svcDate").value = todayYMD();

    const entries = [...(store.service || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    $("#serviceRoot").innerHTML = entries.length
      ? entries.map((e) => {
          const ap = applianceById(e.applianceId);
          return `
            <article class="svc-card">
              <div class="when">${escapeHtml(e.date)}</div>
              <h3>${escapeHtml(e.title)}</h3>
              <div class="who">${ap ? escapeHtml(ap.name) : escapeHtml(e.applianceId)}</div>
              <p class="hint">${escapeHtml(e.detail || "")}</p>
              <button type="button" class="btn sm ghost danger del-svc" data-id="${escapeHtml(e.id)}">Remove</button>
            </article>
          `;
        }).join("")
      : `<p class="hint">No service entries yet.</p>`;

    $$(".del-svc").forEach((btn) => {
      btn.addEventListener("click", () => {
        store.service = store.service.filter((e) => e.id !== btn.dataset.id);
        saveStore(store);
        renderService();
        renderStats();
      });
    });
  }

  $("#serviceForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const entry = {
      id: `svc-${Date.now()}`,
      date: $("#svcDate").value,
      applianceId: $("#svcAppliance").value,
      title: $("#svcTitle").value.trim(),
      detail: $("#svcDetail").value.trim(),
    };
    if (!entry.title) return;
    store.service = store.service || [];
    store.service.push(entry);
    saveStore(store);
    $("#svcTitle").value = "";
    $("#svcDetail").value = "";
    renderService();
    renderStats();
  });

  $("#btnExport").addEventListener("click", () => {
    const payload = { vault: DATA, local: store, exportedAt: new Date().toISOString() };
    const box = $("#exportBox");
    box.textContent = JSON.stringify(payload, null, 2);
    box.classList.remove("hidden");
  });

  $("#btnReset").addEventListener("click", () => {
    if (!confirm("Reset local filter dues and service log to EXAMPLE seeds?")) return;
    localStorage.removeItem(STORE_KEY);
    store = { filterDue: {}, service: null };
    DATA.filters.forEach((f) => {
      if (f.defaultNextDue) store.filterDue[f.id] = f.defaultNextDue;
    });
    store.service = (DATA.serviceSeed || []).map((e) => ({ ...e }));
    saveStore(store);
    renderAll();
    $("#exportBox").classList.add("hidden");
  });

  $$(".tab").forEach((t) => t.addEventListener("click", () => setView(t.dataset.view)));

  window.addEventListener("hashchange", () => {
    const h = (location.hash || "#appliances").slice(1);
    if (["appliances", "filters", "warranties", "service", "about"].includes(h)) setView(h);
  });

  function renderAll() {
    renderStats();
    renderAppliances();
    renderFilters();
    renderWarranties();
    renderService();
  }

  renderAll();
  const start = (location.hash || "#appliances").slice(1);
  setView(["appliances", "filters", "warranties", "service", "about"].includes(start) ? start : "appliances");
})();
