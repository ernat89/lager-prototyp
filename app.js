// 1) HIER EINTRAGEN
const SUPABASE_URL = "https://fiwatlffqgevxvmrsmvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd2F0bGZmcWdldnh2bXJzbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODY1MDYsImV4cCI6MjA4MTI2MjUwNn0.5jQBokoo25GFMBWgluBLN5Yy_NitrvYas8Pyxsj8AZA";
const EDIT_PIN = "81243"; // dein PIN

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PIN_STORAGE_KEY = "lager_edit_pin_ok";

// Views
const homeView = document.getElementById("homeView");
const detailView = document.getElementById("detailView");
const pageTitle = document.getElementById("pageTitle");
const statusLine = document.getElementById("statusLine");

// Home UI
const itemsContainer = document.getElementById("itemsContainer");
const emptyHint = document.getElementById("emptyHint");
const homeMessage = document.getElementById("homeMessage");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const newItemBtn = document.getElementById("newItemBtn");
const goHomeBtn = document.getElementById("goHomeBtn");

// Detail UI
const backBtn = document.getElementById("backBtn");
const detailId = document.getElementById("detailId");
const detailImg = document.getElementById("detailImg");
const detailImgPlaceholder = document.getElementById("detailImgPlaceholder");
const uploadBtn = document.getElementById("uploadBtn");
const imageFile = document.getElementById("imageFile");

const nameInput = document.getElementById("nameInput");
const categoryInput = document.getElementById("categoryInput");
const targetInput = document.getElementById("targetInput");
const currentQtyText = document.getElementById("currentQtyText");
const actorInput = document.getElementById("actorInput");
const statusPill = document.getElementById("statusPill");
const metaLine = document.getElementById("metaLine");
const logsList = document.getElementById("logsList");
const hint = document.getElementById("hint");
const saveMetaBtn = document.getElementById("saveMetaBtn");
const deleteBtn = document.getElementById("deleteBtn");
const qrLink = document.getElementById("qrLink");

// New item dialog
const newItemDialog = document.getElementById("newItemDialog");
const newItemForm = document.getElementById("newItemForm");
const cancelNewBtn = document.getElementById("cancelNewBtn");
const newId = document.getElementById("newId");
const newName = document.getElementById("newName");
const newCategorySelect = document.getElementById("newCategorySelect");
const newCategoryFree = document.getElementById("newCategoryFree");
const newTarget = document.getElementById("newTarget");
const newCurrent = document.getElementById("newCurrent");
const newHint = document.getElementById("newHint");

// PIN dialog
const pinDialog = document.getElementById("pinDialog");
const pinDialogInput = document.getElementById("pinDialogInput");
const pinOkBtn = document.getElementById("pinOkBtn");
const pinCancelBtn = document.getElementById("pinCancelBtn");
const pinHint = document.getElementById("pinHint");

let allItems = [];
let currentItem = null;

// ---------- Helpers ----------
function setHint(el, msg) { el.textContent = msg || ""; }
function showHomeMessage(msg) {
  if (!msg) { homeMessage.style.display = "none"; homeMessage.textContent = ""; return; }
  homeMessage.style.display = "block";
  homeMessage.textContent = msg;
}
function setStatus(msg) { statusLine.textContent = msg || ""; }

function escapeHtml(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s); }

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return iso; }
}

function statusFrom(target, current) {
  if ((current ?? 0) <= 0) return { label: "LEER", color: "var(--bad)" };
  if ((current ?? 0) < (target ?? 0)) return { label: "ZU WENIG", color: "var(--warn)" };
  return { label: "OK", color: "var(--ok)" };
}

function normalizeId(raw) {
  const s = (raw || "").trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z0-9_-]+$/.test(s)) return null;
  return s;
}
function normalizeCategory(raw) {
  const s = (raw || "").trim();
  if (!s) return null;
  return s.slice(0, 40);
}

function showHome() {
  homeView.style.display = "block";
  detailView.style.display = "none";
  pageTitle.textContent = "Übersicht";
  setHint(hint, "");
}

function showDetail() {
  homeView.style.display = "none";
  detailView.style.display = "block";
}

function setRoute(hash) { window.location.hash = hash; }
function getRoute() { return window.location.hash || "#/"; }

// ---------- PIN ----------
async function ensurePin() {
  const ok = localStorage.getItem(PIN_STORAGE_KEY) === "1";
  if (ok) return true;

  setHint(pinHint, "");
  pinDialogInput.value = "";
  pinDialog.showModal();

  return await new Promise((resolve) => {
    const onOk = () => {
      const p = (pinDialogInput.value || "").trim();
      if (p !== EDIT_PIN) { setHint(pinHint, "Falsche PIN."); return; }
      localStorage.setItem(PIN_STORAGE_KEY, "1");
      cleanup();
      pinDialog.close();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      pinDialog.close();
      resolve(false);
    };
    function cleanup() {
      pinOkBtn.removeEventListener("click", onOk);
      pinCancelBtn.removeEventListener("click", onCancel);
    }
    pinOkBtn.addEventListener("click", onOk);
    pinCancelBtn.addEventListener("click", onCancel);
  });
}

function requireActor() {
  const actor = (actorInput.value || "").trim();
  if (actor.length < 2) {
    setHint(hint, "Bitte 'Wer war das?' ausfüllen (mind. 2 Zeichen).");
    actorInput.focus();
    return null;
  }
  return actor;
}

function clearActor() {
  actorInput.value = "";
}

// ---------- Data ----------
async function refreshCategoryLists() {
  const cats = Array.from(new Set(
    (allItems || [])
      .map(x => (x.category || "").trim())
      .filter(Boolean)
  )).sort((a,b) => a.localeCompare(b, "de"));

  const current = categoryFilter.value || "";
  categoryFilter.innerHTML = `<option value="">Alle Kategorien</option>` + cats.map(c =>
    `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`
  ).join("");
  categoryFilter.value = cats.includes(current) ? current : "";

  newCategorySelect.innerHTML = `<option value="">Kategorie wählen…</option>` + cats.map(c =>
    `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`
  ).join("");
}

async function loadItems() {
  showHomeMessage(null);
  itemsContainer.innerHTML = `<div class="muted">Lade Daten …</div>`;
  emptyHint.style.display = "none";

  const { data, error } = await supabase
    .from("items")
    .select("id,name,category,target_qty,current_qty,image_url,created_at,updated_at,deleted_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    itemsContainer.innerHTML = "";
    showHomeMessage(`Fehler beim Laden: ${error.message}`);
    setStatus("Supabase nicht erreichbar oder blockiert.");
    return;
  }

  setStatus(`Aktualisiert: ${new Date().toLocaleTimeString("de-DE")}`);
  allItems = data || [];
  await refreshCategoryLists();
  renderItems();
}

function renderItems() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const cat = (categoryFilter.value || "").trim();

  const items = (allItems || []).filter(it => {
    if (cat && (it.category || "").trim() !== cat) return false;
    if (!q) return true;
    return (it.name || "").toLowerCase().includes(q) || (it.id || "").toLowerCase().includes(q);
  });

  itemsContainer.innerHTML = "";
  emptyHint.style.display = items.length === 0 ? "block" : "none";

  const groups = new Map();
  for (const it of items) {
    const k = (it.category || "").trim() || "Allgemein";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }

  const groupNames = Array.from(groups.keys()).sort((a,b) => a.localeCompare(b, "de"));

  for (const g of groupNames) {
    const title = document.createElement("div");
    title.className = "groupTitle";
    title.textContent = g;
    itemsContainer.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "grid";

    for (const it of groups.get(g)) {
      const st = statusFrom(it.target_qty, it.current_qty);

      const card = document.createElement("div");
      card.className = "card itemCard";
      card.addEventListener("click", () => setRoute(`#/item/${encodeURIComponent(it.id)}`));

      const thumb = document.createElement("div");
      thumb.className = "thumb";
      if (it.image_url) thumb.innerHTML = `<img src="${escapeAttr(it.image_url)}" alt="Bild">`;
      else thumb.textContent = "Kein Bild";

      const main = document.createElement("div");
      main.className = "itemMain";

      const name = document.createElement("div");
      name.className = "itemName";
      name.textContent = it.name;

      const meta = document.createElement("div");
      meta.className = "itemMeta";
      meta.innerHTML = `
        <div><strong>${it.current_qty}</strong> / ${it.target_qty}</div>
        <div class="pill" style="border-color:${st.color};color:${st.color};">${st.label}</div>
      `;

      const sub = document.createElement("div");
      sub.className = "muted small";
      sub.style.marginTop = "8px";
      sub.textContent = `Zuletzt: ${fmtDate(it.updated_at)}`;

      main.appendChild(name);
      main.appendChild(meta);
      main.appendChild(sub);

      card.appendChild(thumb);
      card.appendChild(main);
      grid.appendChild(card);
    }

    itemsContainer.appendChild(grid);
  }
}

async function loadItem(id) {
  setHint(hint, "");
  clearActor();

  const { data: item, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    showHome();
    showHomeMessage(`Artikel nicht gefunden oder nicht ladbar: ${error.message}`);
    return;
  }

  currentItem = item;
  renderItem(item);
  await loadLogs(id);
}

function renderItem(item) {
  showDetail();
  pageTitle.textContent = item.name;

  detailId.textContent = `ID: ${item.id}`;
  nameInput.value = item.name || "";
  categoryInput.value = (item.category || "").trim();
  targetInput.value = item.target_qty ?? 0;
  currentQtyText.textContent = item.current_qty ?? 0;

  const st = statusFrom(item.target_qty, item.current_qty);
  statusPill.textContent = st.label;
  statusPill.style.borderColor = st.color;
  statusPill.style.color = st.color;

  const created = fmtDate(item.created_at);
  const updated = fmtDate(item.updated_at);
  metaLine.textContent = `Angelegt: ${created} | Letzte Änderung: ${updated}`;

  if (item.image_url) {
    detailImg.src = item.image_url;
    detailImg.style.display = "block";
    detailImgPlaceholder.style.display = "none";
  } else {
    detailImg.style.display = "none";
    detailImgPlaceholder.style.display = "flex";
  }

  const fullLink = `${window.location.origin}${window.location.pathname}#/item/${encodeURIComponent(item.id)}`;
  qrLink.textContent = fullLink;

  clearActor();
}

async function loadLogs(itemId) {
  const { data, error } = await supabase
    .from("logs")
    .select("actor, delta, action, created_at")
    .eq("item_id", itemId)
    .order("id", { ascending: false })
    .limit(25);

  if (error) {
    logsList.innerHTML = `<div class="muted">Fehler beim Laden der Logs: ${escapeHtml(error.message)}</div>`;
    return;
  }

  logsList.innerHTML = "";
  if (!data?.length) {
    logsList.innerHTML = `<div class="muted">Noch keine Änderungen.</div>`;
    return;
  }

  for (const l of data) {
    const row = document.createElement("div");
    row.className = "logRow";
    const delta = l.delta > 0 ? `+${l.delta}` : `${l.delta}`;
    row.innerHTML = `
      <div class="logLeft">
        <div><strong>${escapeHtml(l.actor)}</strong> <span class="muted small">(${escapeHtml(l.action || "adjust")})</span></div>
        <div class="muted small">${fmtDate(l.created_at)}</div>
      </div>
      <div style="font-weight:1000;white-space:nowrap;">${escapeHtml(delta)}</div>
    `;
    logsList.appendChild(row);
  }
}

// ---------- Actions ----------
async function adjust(delta) {
  setHint(hint, "");
  const ok = await ensurePin();
  if (!ok) return;

  const actor = requireActor();
  if (!actor) return;
  if (!currentItem) return;

  const newQty = Math.max(0, (currentItem.current_qty ?? 0) + delta);

  const { error: upErr } = await supabase
    .from("items")
    .update({ current_qty: newQty, last_actor: actor })
    .eq("id", currentItem.id);

  if (upErr) { setHint(hint, `Fehler: ${upErr.message}`); return; }

  const { error: logErr } = await supabase
    .from("logs")
    .insert({ item_id: currentItem.id, actor, delta, action: "adjust" });

  if (logErr) { setHint(hint, `Log-Fehler: ${logErr.message}`); return; }

  await loadItem(currentItem.id);
  await loadItems();
  setHint(hint, "Gespeichert.");
  clearActor();
  setTimeout(() => setHint(hint, ""), 1000);
}

async function saveMeta() {
  setHint(hint, "");
  const ok = await ensurePin();
  if (!ok) return;

  const actor = requireActor();
  if (!actor) return;
  if (!currentItem) return;

  const name = (nameInput.value || "").trim().slice(0, 80) || currentItem.name;
  const target = parseInt(targetInput.value, 10);
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0;
  const cat = normalizeCategory(categoryInput.value) || "Allgemein";

  const { error } = await supabase
    .from("items")
    .update({ name, target_qty: safeTarget, category: cat, last_actor: actor })
    .eq("id", currentItem.id);

  if (error) { setHint(hint, `Fehler: ${error.message}`); return; }

  const { error: logErr } = await supabase
    .from("logs")
    .insert({ item_id: currentItem.id, actor, delta: 0, action: "meta" });

  if (logErr) { setHint(hint, `Log-Fehler: ${logErr.message}`); return; }

  await loadItem(currentItem.id);
  await loadItems();
  setHint(hint, "Gespeichert.");
  clearActor();
  setTimeout(() => setHint(hint, ""), 1000);
}

async function uploadImage(file) {
  setHint(hint, "");
  const ok = await ensurePin();
  if (!ok) return;

  const actor = requireActor();
  if (!actor) return;
  if (!currentItem || !file) { setHint(hint, "Bitte zuerst einen Artikel öffnen."); return; }

  setHint(hint, "Upload läuft …");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg","jpeg","png","webp","heic"].includes(ext) ? ext : "jpg";
  const filePath = `${currentItem.id}/${Date.now()}.${safeExt}`;

  const { error: upErr } = await supabase.storage
    .from("images")
    .upload(filePath, file, { upsert: true });

  if (upErr) { setHint(hint, `Upload-Fehler: ${upErr.message}`); return; }

  const { data } = supabase.storage.from("images").getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  const { error: dbErr } = await supabase
    .from("items")
    .update({ image_url: publicUrl, last_actor: actor })
    .eq("id", currentItem.id);

  if (dbErr) { setHint(hint, `DB-Fehler: ${dbErr.message}`); return; }

  const { error: logErr } = await supabase
    .from("logs")
    .insert({ item_id: currentItem.id, actor, delta: 0, action: "upload" });

  if (logErr) { setHint(hint, `Log-Fehler: ${logErr.message}`); return; }

  await loadItem(currentItem.id);
  await loadItems();
  setHint(hint, "Bild gespeichert.");
  clearActor();
  setTimeout(() => setHint(hint, ""), 1200);
}

async function softDeleteItem() {
  setHint(hint, "");
  const ok = await ensurePin();
  if (!ok) return;

  const actor = requireActor();
  if (!actor) return;
  if (!currentItem) return;

  const confirmText = `Artikel wirklich löschen?\n\n${currentItem.name} (${currentItem.id})\n\nHinweis: Wird nur ausgeblendet (soft delete).`;
  if (!window.confirm(confirmText)) return;

  const { error } = await supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString(), last_actor: actor })
    .eq("id", currentItem.id);

  if (error) { setHint(hint, `Fehler: ${error.message}`); return; }

  const { error: logErr } = await supabase
    .from("logs")
    .insert({ item_id: currentItem.id, actor, delta: 0, action: "delete" });

  if (logErr) { setHint(hint, `Log-Fehler: ${logErr.message}`); return; }

  clearActor();
  setRoute("#/");
  await loadItems();
}

// ---------- Create Item ----------
async function createItem() {
  setHint(newHint, "Prüfe Eingaben …");
  const ok = await ensurePin();
  if (!ok) { setHint(newHint, "PIN abgebrochen."); return; }

  const id = normalizeId(newId.value);
  if (!id) { setHint(newHint, "Ungültige ID. Erlaubt: a-z 0-9 _ -"); return; }

  const name = (newName.value || "").trim().slice(0,80) || id;

  const cat = normalizeCategory(newCategoryFree.value) || normalizeCategory(newCategorySelect.value) || "Allgemein";
  const t = parseInt(newTarget.value, 10);
  const c = parseInt(newCurrent.value, 10);

  const target_qty = Number.isFinite(t) ? Math.max(0, t) : 0;
  const current_qty = Number.isFinite(c) ? Math.max(0, c) : 0;

  // existiert ID?
  const { data: existing, error: exErr } = await supabase
    .from("items")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (exErr) { setHint(newHint, `Fehler: ${exErr.message}`); return; }
  if (existing) { setHint(newHint, "Diese ID existiert bereits."); return; }

  const { error } = await supabase
    .from("items")
    .insert({ id, name, category: cat, target_qty, current_qty });

  if (error) { setHint(newHint, `Fehler: ${error.message}`); return; }

  setHint(newHint, "Artikel angelegt.");
  newItemDialog.close();

  newId.value = "";
  newName.value = "";
  newCategoryFree.value = "";
  newTarget.value = "10";
  newCurrent.value = "0";

  await loadItems();
  setRoute(`#/item/${encodeURIComponent(id)}`);
}

// ---------- Events ----------
searchInput.addEventListener("input", renderItems);
categoryFilter.addEventListener("change", renderItems);

newItemBtn.addEventListener("click", async () => {
  setHint(newHint, "");
  newCategoryFree.value = "";
  await refreshCategoryLists();
  newItemDialog.showModal();
});
cancelNewBtn.addEventListener("click", () => newItemDialog.close());
newItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await createItem();
});

goHomeBtn.addEventListener("click", () => setRoute("#/"));
backBtn.addEventListener("click", () => setRoute("#/"));

saveMetaBtn.addEventListener("click", () => saveMeta());
deleteBtn.addEventListener("click", () => softDeleteItem());

document.querySelectorAll("[data-delta]").forEach(btn => {
  btn.addEventListener("click", () => {
    const d = parseInt(btn.getAttribute("data-delta"), 10);
    adjust(d);
  });
});

uploadBtn.addEventListener("click", () => {
  imageFile.value = "";
  imageFile.click();
});
imageFile.addEventListener("change", async () => {
  const f = imageFile.files?.[0];
  if (!f) return;
  await uploadImage(f);
});

// Auto-Reload wenn du zurückkommst (40min Problem)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) handleRoute();
});
window.addEventListener("focus", () => handleRoute());

// ---------- Routing ----------
async function handleRoute() {
  const r = getRoute();
  if (r.startsWith("#/item/")) {
    const id = decodeURIComponent(r.replace("#/item/", ""));
    await loadItem(id);
    return;
  }
  showHome();
  await loadItems();
}

window.addEventListener("hashchange", handleRoute);
handleRoute();

