// 1) HIER EINTRAGEN
const SUPABASE_URL = "https://fiwatlffqgevxvmrsmvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd2F0bGZmcWdldnh2bXJzbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODY1MDYsImV4cCI6MjA4MTI2MjUwNn0.5jQBokoo25GFMBWgluBLN5Yy_NitrvYas8Pyxsj8AZA";
const EDIT_PIN = "81243"; // dein PIN

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const PIN_STORAGE_KEY = "lager_edit_pin_ok";

const homeView = document.getElementById("homeView");
const trashView = document.getElementById("trashView");
const detailView = document.getElementById("detailView");

const pageTitle = document.getElementById("pageTitle");
const statusLine = document.getElementById("statusLine");

const itemsContainer = document.getElementById("itemsContainer");
const emptyHint = document.getElementById("emptyHint");
const homeMessage = document.getElementById("homeMessage");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

const trashContainer = document.getElementById("trashContainer");
const trashEmptyHint = document.getElementById("trashEmptyHint");
const trashMessage = document.getElementById("trashMessage");

const newItemBtn = document.getElementById("newItemBtn");
const goHomeBtn = document.getElementById("goHomeBtn");
const goTrashBtn = document.getElementById("goTrashBtn");
const trashBackBtn = document.getElementById("trashBackBtn");

const backBtn = document.getElementById("backBtn");
const detailId = document.getElementById("detailId");

const detailImg = document.getElementById("detailImg");
const detailImgPlaceholder = document.getElementById("detailImgPlaceholder");
const takePhotoBtn = document.getElementById("takePhotoBtn");
const pickPhotoBtn = document.getElementById("pickPhotoBtn");
const imageCapture = document.getElementById("imageCapture");
const imagePicker = document.getElementById("imagePicker");

const nameInput = document.getElementById("nameInput");
const categoryInput = document.getElementById("categoryInput");
const locationInput = document.getElementById("locationInput");

const targetInput = document.getElementById("targetInput");
const minInput = document.getElementById("minInput");

const unitNameInput = document.getElementById("unitNameInput");
const packNameInput = document.getElementById("packNameInput");
const packSizeInput = document.getElementById("packSizeInput");

const currentQtyText = document.getElementById("currentQtyText");
const packDisplay = document.getElementById("packDisplay");

const actorInput = document.getElementById("actorInput");
const statusPill = document.getElementById("statusPill");
const metaLine = document.getElementById("metaLine");
const logsList = document.getElementById("logsList");
const hint = document.getElementById("hint");
const saveMetaBtn = document.getElementById("saveMetaBtn");
const deleteBtn = document.getElementById("deleteBtn");
const qrLink = document.getElementById("qrLink");

const incPackBtn = document.getElementById("incPackBtn");
const decPackBtn = document.getElementById("decPackBtn");

const newItemDialog = document.getElementById("newItemDialog");
const newItemForm = document.getElementById("newItemForm");
const cancelNewBtn = document.getElementById("cancelNewBtn");
const newId = document.getElementById("newId");
const newName = document.getElementById("newName");
const newCategorySelect = document.getElementById("newCategorySelect");
const newCategoryFree = document.getElementById("newCategoryFree");
const newLocation = document.getElementById("newLocation");
const newTarget = document.getElementById("newTarget");
const newMin = document.getElementById("newMin");
const newCurrent = document.getElementById("newCurrent");
const newUnitName = document.getElementById("newUnitName");
const newPackName = document.getElementById("newPackName");
const newPackSize = document.getElementById("newPackSize");
const newActor = document.getElementById("newActor");
const newHint = document.getElementById("newHint");

const pinDialog = document.getElementById("pinDialog");
const pinDialogInput = document.getElementById("pinDialogInput");
const pinOkBtn = document.getElementById("pinOkBtn");
const pinCancelBtn = document.getElementById("pinCancelBtn");
const pinHint = document.getElementById("pinHint");

let allItems = [];
let currentItem = null;

function setHint(el, msg) { el.textContent = msg || ""; }
function setStatus(msg) { statusLine.textContent = msg || ""; }

function showMessage(el, msg) {
  if (!msg) { el.style.display = "none"; el.textContent = ""; return; }
  el.style.display = "block";
  el.textContent = msg;
}

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

function normalizeId(raw) {
  const s = (raw || "").trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z0-9_-]+$/.test(s)) return null;
  return s;
}
function normalizeText(raw, maxLen) {
  const s = (raw || "").trim();
  if (!s) return "";
  return s.slice(0, maxLen);
}
function normalizeCategory(raw) {
  const s = (raw || "").trim();
  return s ? s.slice(0, 40) : "";
}

function statusFrom(target, min, current) {
  const c = current ?? 0;
  const t = target ?? 0;
  const m = min ?? 0;

  if (c <= 0) return { label: "LEER", css: "var(--bad)" };
  if (c < m) return { label: "KRITISCH", css: "var(--bad)" };
  if (c < t) return { label: "ZU WENIG", css: "var(--warn)" };
  return { label: "OK", css: "var(--ok)" };
}

function packText(item) {
  const ps = item.pack_size;
  const pn = (item.pack_name || "").trim();
  const un = (item.unit_name || "Stück").trim();
  if (!ps || ps <= 0 || !pn) return "";
  const c = item.current_qty ?? 0;
  const packs = Math.floor(c / ps);
  const rest = c % ps;
  if (packs <= 0) return `${rest} ${un}`;
  if (rest === 0) return `${packs} ${pn}`;
  return `${packs} ${pn} + ${rest} ${un}`;
}

function showHome() {
  homeView.style.display = "block";
  trashView.style.display = "none";
  detailView.style.display = "none";
  pageTitle.textContent = "Übersicht";
  setHint(hint, "");
}
function showTrash() {
  homeView.style.display = "none";
  trashView.style.display = "block";
  detailView.style.display = "none";
  pageTitle.textContent = "Papierkorb";
  setHint(hint, "");
}
function showDetail() {
  homeView.style.display = "none";
  trashView.style.display = "none";
  detailView.style.display = "block";
}

function setRoute(hash) { window.location.hash = hash; }
function getRoute() { return window.location.hash || "#/"; }

// PIN
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

function requireActor(elHint, inputEl) {
  const actor = (inputEl.value || "").trim();
  if (actor.length < 2) {
    setHint(elHint, "Bitte Name eintragen (Pflicht).");
    inputEl.focus();
    return null;
  }
  return actor;
}
function clearActor() { actorInput.value = ""; }
function clearNewActor() { newActor.value = ""; }

// Kategorien
async function refreshCategoryLists() {
  const cats = Array.from(new Set(
    (allItems || [])
      .map(x => (x.category || "").trim())
      .filter(Boolean)
  )).sort((a,b) => a.localeCompare(b, "de"));

  const cur = categoryFilter.value || "";
  categoryFilter.innerHTML = `<option value="">Alle Kategorien</option>` + cats.map(c =>
    `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`
  ).join("");
  categoryFilter.value = cats.includes(cur) ? cur : "";

  newCategorySelect.innerHTML = `<option value="">Kategorie wählen…</option>` + cats.map(c =>
    `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`
  ).join("");
}

// Laden
async function loadItems() {
  showMessage(homeMessage, null);
  itemsContainer.innerHTML = `<div class="muted">Lade Daten …</div>`;
  emptyHint.style.display = "none";

  const { data, error } = await supabase
    .from("items")
    .select("id,name,category,location,unit_name,pack_name,pack_size,target_qty,min_qty,current_qty,image_url,created_at,updated_at,deleted_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    itemsContainer.innerHTML = "";
    showMessage(homeMessage, `Fehler beim Laden: ${error.message}`);
    setStatus("Supabase nicht erreichbar oder blockiert.");
    return;
  }

  allItems = data || [];
  await refreshCategoryLists();
  renderItems();
  setStatus(`Aktualisiert: ${new Date().toLocaleTimeString("de-DE")}`);
}

function renderItems() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const cat = (categoryFilter.value || "").trim();

  const items = (allItems || []).filter(it => {
    if (cat && (it.category || "").trim() !== cat) return false;
    if (!q) return true;
    return (
      (it.name || "").toLowerCase().includes(q) ||
      (it.id || "").toLowerCase().includes(q) ||
      (it.location || "").toLowerCase().includes(q) ||
      (it.category || "").toLowerCase().includes(q)
    );
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
      const st = statusFrom(it.target_qty, it.min_qty, it.current_qty);

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
        <div class="pill" style="border-color:${st.css};color:${st.css};">${st.label}</div>
      `;

      const sub = document.createElement("div");
      sub.className = "muted small";
      sub.style.marginTop = "8px";
      const loc = (it.location || "").trim();
      sub.textContent = loc ? `Standort: ${loc} | Zuletzt: ${fmtDate(it.updated_at)}` : `Zuletzt: ${fmtDate(it.updated_at)}`;

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
    showMessage(homeMessage, `Artikel nicht gefunden oder nicht ladbar: ${error.message}`);
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
  locationInput.value = (item.location || "").trim();

  targetInput.value = item.target_qty ?? 0;
  minInput.value = item.min_qty ?? 0;

  unitNameInput.value = (item.unit_name || "Stück").trim();
  packNameInput.value = (item.pack_name || "").trim();
  packSizeInput.value = item.pack_size ?? "";

  currentQtyText.textContent = item.current_qty ?? 0;
  packDisplay.textContent = packText(item);

  const st = statusFrom(item.target_qty, item.min_qty, item.current_qty);
  statusPill.textContent = st.label;
  statusPill.style.borderColor = st.css;
  statusPill.style.color = st.css;

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
    .select("actor, action, delta, prev_qty, new_qty, snapshot_location, snapshot_target, snapshot_min, created_at")
    .eq("item_id", itemId)
    .order("id", { ascending: false })
    .limit(50);

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

    const d = l.delta > 0 ? `+${l.delta}` : `${l.delta}`;
    const pv = (l.prev_qty ?? "");
    const nv = (l.new_qty ?? "");
    const range = (pv !== "" && nv !== "") ? `${pv} → ${nv}` : "";

    const extra = [];
    if (l.snapshot_location) extra.push(`Standort: ${l.snapshot_location}`);
    if (Number.isFinite(l.snapshot_min)) extra.push(`Min: ${l.snapshot_min}`);
    if (Number.isFinite(l.snapshot_target)) extra.push(`Soll: ${l.snapshot_target}`);

    row.innerHTML = `
      <div class="logLeft">
        <div><strong>${escapeHtml(l.actor)}</strong> <span class="muted small">(${escapeHtml(l.action)})</span></div>
        <div class="muted small">${fmtDate(l.created_at)}${range ? " | " + escapeHtml(range) : ""}${extra.length ? " | " + escapeHtml(extra.join(" | ")) : ""}</div>
      </div>
      <div style="font-weight:1000;white-space:nowrap;">${escapeHtml(d)}</div>
    `;
    logsList.appendChild(row);
  }
}

// Papierkorb
async function loadTrash() {
  showMessage(trashMessage, null);
  trashContainer.innerHTML = `<div class="muted">Lade Papierkorb …</div>`;
  trashEmptyHint.style.display = "none";

  const { data, error } = await supabase
    .from("items")
    .select("id,name,category,location,deleted_at,image_url")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    trashContainer.innerHTML = "";
    showMessage(trashMessage, `Fehler: ${error.message}`);
    return;
  }

  const items = data || [];
  trashContainer.innerHTML = "";
  trashEmptyHint.style.display = items.length === 0 ? "block" : "none";

  for (const it of items) {
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginBottom = "12px";

    const loc = (it.location || "").trim();
    const cat = (it.category || "").trim();

    card.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;">
        <div style="min-width:220px;">
          <div style="font-weight:1000;">${escapeHtml(it.name)} <span class="muted small">(${escapeHtml(it.id)})</span></div>
          <div class="muted small">${cat ? "Kategorie: " + escapeHtml(cat) + " | " : ""}${loc ? "Standort: " + escapeHtml(loc) + " | " : ""}Gelöscht: ${escapeHtml(fmtDate(it.deleted_at))}</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn" data-restore="${escapeAttr(it.id)}" type="button">Wiederherstellen</button>
          <button class="btn danger" data-purge="${escapeAttr(it.id)}" type="button">Endgültig löschen</button>
        </div>
      </div>
    `;

    trashContainer.appendChild(card);
  }

  trashContainer.querySelectorAll("[data-restore]").forEach(btn => {
    btn.addEventListener("click", () => restoreItem(btn.getAttribute("data-restore")));
  });
  trashContainer.querySelectorAll("[data-purge]").forEach(btn => {
    btn.addEventListener("click", () => purgeItem(btn.getAttribute("data-purge")));
  });
}

async function restoreItem(id) {
  const ok = await ensurePin();
  if (!ok) return;

  const actor = prompt("Wer stellt wieder her? (Pflicht)");
  if (!actor || actor.trim().length < 2) return;

  const { error } = await supabase
    .from("items")
    .update({ deleted_at: null, last_actor: actor.trim() })
    .eq("id", id);

  if (error) { alert("Fehler: " + error.message); return; }

  await supabase.from("logs").insert({
    item_id: id, actor: actor.trim(), action: "restore", delta: 0
  });

  await loadTrash();
  await loadItems();
}

async function purgeItem(id) {
  const ok = await ensurePin();
  if (!ok) return;

  const actor = prompt("Wer löscht endgültig? (Pflicht)");
  if (!actor || actor.trim().length < 2) return;

  const really = confirm("Endgültig löschen? Das kann nicht rückgängig gemacht werden.");
  if (!really) return;

  const { data: item } = await supabase.from("items").select("image_url").eq("id", id).maybeSingle();

  if (item?.image_url) {
    try {
      const url = new URL(item.image_url);
      const parts = url.pathname.split("/");
      const idx = parts.findIndex(p => p === "images");
      if (idx >= 0) {
        const path = parts.slice(idx + 1).join("/");
        await supabase.storage.from("images").remove([path]);
      }
    } catch {}
  }

  await supabase.from("logs").insert({ item_id: id, actor: actor.trim(), action: "purge", delta: 0 });

  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) { alert("Fehler: " + error.message); return; }

  await loadTrash();
  await loadItems();
}

// Aktionen Detail
async function adjust(delta) {
  setHint(hint, "");
  const ok = await ensurePin();
  if (!ok) return;

  const actor = requireActor(hint, actorInput);
  if (!actor || !currentItem) return;

  const prev = currentItem.current_qty ?? 0;
  const next = Math.max(0, prev + delta);

  const { error: upErr, data: updated } = await supabase
    .from("items")
    .update({ current_qty: next, last_actor: actor })
    .eq("id", currentItem.id)
    .select("*")
    .single();

  if (upErr) { setHint(hint, `Fehler: ${upErr.message}`); return; }

  await supabase.from("logs").insert({
    item_id: currentItem.id,
    actor,
    action: "adjust",
    delta,
    prev_qty: prev,
    new_qty: next,
    snapshot_name: updated.name,
    snapshot_category: updated.category,
    snapshot_location: updated.location,
    snapshot_target: updated.target_qty,
    snapshot_min: updated.min_qty
  });

  currentItem = updated;
  renderItem(updated);
  await loadLogs(updated.id);
  await loadItems();

  setHint(hint, "Gespeichert.");
  clearActor();
  setTimeout(() => setHint(hint, ""), 900);
}

async function adjustPack(sign) {
  const ps = parseInt(packSizeInput.value, 10);
  const pn = (packNameInput.value || "").trim();
  if (!ps || ps <= 0 || !pn) {
    setHint(hint, "Packung nicht konfiguriert. Packungsname und Packungsgröße setzen und speichern.");
    return;
  }
  await adjust(sign * ps);
}

async function saveMeta() {
  setHint(hint, "");
  const ok = await ensurePin();
  if (!ok) return;

  const actor = requireActor(hint, actorInput);
  if (!actor || !currentItem) return;

  const name = normalizeText(nameInput.value, 80) || currentItem.name;
  const category = normalizeCategory(categoryInput.value) || "Allgemein";
  const location = normalizeText(locationInput.value, 80);

  const t = parseInt(targetInput.value, 10);
  const m = parseInt(minInput.value, 10);

  const target_qty = Number.isFinite(t) ? Math.max(0, t) : 0;
  const min_qty = Number.isFinite(m) ? Math.max(0, m) : 0;

  const unit_name = normalizeText(unitNameInput.value || "Stück", 20) || "Stück";
  const pack_name = normalizeText(packNameInput.value, 20);
  const ps = parseInt(packSizeInput.value, 10);
  const pack_size = Number.isFinite(ps) ? Math.max(0, ps) : null;

  const payload = {
    name, category, location,
    target_qty, min_qty,
    unit_name,
    pack_name: pack_name || null,
    pack_size: pack_size && pack_name ? pack_size : null,
    last_actor: actor
  };

  const { error, data: updated } = await supabase
    .from("items")
    .update(payload)
    .eq("id", currentItem.id)
    .select("*")
    .single();

  if (error) { setHint(hint, `Fehler: ${error.message}`); return; }

  await supabase.from("logs").insert({
    item_id: updated.id,
    actor,
    action: "meta",
    delta: 0,
    prev_qty: updated.current_qty,
    new_qty: updated.current_qty,
    snapshot_name: updated.name,
    snapshot_category: updated.category,
    snapshot_location: updated.location,
    snapshot_target: updated.target_qty,
    snapshot_min: updated.min_qty
  });

  currentItem = updated;
  renderItem(updated);
  await loadLogs(updated.id);
  await loadItems();

  setHint(hint, "Stammdaten gespeichert.");
  clearActor();
  setTimeout(() => setHint(hint, ""), 900);
}

async function uploadImage(file) {
  setHint(hint, "");
  const ok = await ensurePin();
  if (!ok) return;

  const actor = requireActor(hint, actorInput);
  if (!actor || !currentItem || !file) return;

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

  const { error: dbErr, data: updated } = await supabase
    .from("items")
    .update({ image_url: publicUrl, last_actor: actor })
    .eq("id", currentItem.id)
    .select("*")
    .single();

  if (dbErr) { setHint(hint, `DB-Fehler: ${dbErr.message}`); return; }

  await supabase.from("logs").insert({
    item_id: updated.id,
    actor,
    action: "upload",
    delta: 0,
    prev_qty: updated.current_qty,
    new_qty: updated.current_qty,
    snapshot_location: updated.location,
    snapshot_target: updated.target_qty,
    snapshot_min: updated.min_qty
  });

  currentItem = updated;
  renderItem(updated);
  await loadLogs(updated.id);
  await loadItems();

  setHint(hint, "Bild gespeichert.");
  clearActor();
  setTimeout(() => setHint(hint, ""), 900);
}

async function softDeleteItem() {
  setHint(hint, "");
  const ok = await ensurePin();
  if (!ok) return;

  const actor = requireActor(hint, actorInput);
  if (!actor || !currentItem) return;

  const confirmText = `Artikel wirklich löschen?\n\n${currentItem.name} (${currentItem.id})\n\nWird in den Papierkorb verschoben.`;
  if (!window.confirm(confirmText)) return;

  const { error, data: updated } = await supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString(), last_actor: actor })
    .eq("id", currentItem.id)
    .select("*")
    .single();

  if (error) { setHint(hint, `Fehler: ${error.message}`); return; }

  await supabase.from("logs").insert({
    item_id: updated.id,
    actor,
    action: "delete",
    delta: 0,
    prev_qty: updated.current_qty,
    new_qty: updated.current_qty,
    snapshot_location: updated.location,
    snapshot_target: updated.target_qty,
    snapshot_min: updated.min_qty
  });

  clearActor();
  setRoute("#/");
  await loadItems();
}

// Create
async function createItem() {
  setHint(newHint, "Prüfe Eingaben …");
  const ok = await ensurePin();
  if (!ok) { setHint(newHint, "PIN abgebrochen."); return; }

  const actor = requireActor(newHint, newActor);
  if (!actor) return;

  const id = normalizeId(newId.value);
  if (!id) { setHint(newHint, "Ungültige ID. Erlaubt: a-z 0-9 _ -"); return; }

  const name = normalizeText(newName.value, 80) || id;
  const category = normalizeCategory(newCategoryFree.value) || normalizeCategory(newCategorySelect.value) || "Allgemein";
  const location = normalizeText(newLocation.value, 80);

  const t = parseInt(newTarget.value, 10);
  const m = parseInt(newMin.value, 10);
  const c = parseInt(newCurrent.value, 10);

  const target_qty = Number.isFinite(t) ? Math.max(0, t) : 0;
  const min_qty = Number.isFinite(m) ? Math.max(0, m) : 0;
  const current_qty = Number.isFinite(c) ? Math.max(0, c) : 0;

  const unit_name = normalizeText(newUnitName.value || "Stück", 20) || "Stück";
  const pack_name = normalizeText(newPackName.value, 20);
  const ps = parseInt(newPackSize.value, 10);
  const pack_size = Number.isFinite(ps) ? Math.max(0, ps) : null;

  const { data: existing, error: exErr } = await supabase
    .from("items")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (exErr) { setHint(newHint, `Fehler: ${exErr.message}`); return; }
  if (existing) { setHint(newHint, "Diese ID existiert bereits."); return; }

  const payload = {
    id, name, category, location,
    target_qty, min_qty, current_qty,
    unit_name,
    pack_name: pack_name || null,
    pack_size: pack_size && pack_name ? pack_size : null,
    last_actor: actor
  };

  const { error, data: inserted } = await supabase
    .from("items")
    .insert(payload)
    .select("*")
    .single();

  if (error) { setHint(newHint, `Fehler: ${error.message}`); return; }

  await supabase.from("logs").insert({
    item_id: inserted.id,
    actor,
    action: "create",
    delta: 0,
    prev_qty: 0,
    new_qty: inserted.current_qty,
    snapshot_name: inserted.name,
    snapshot_category: inserted.category,
    snapshot_location: inserted.location,
    snapshot_target: inserted.target_qty,
    snapshot_min: inserted.min_qty
  });

  setHint(newHint, "Artikel angelegt.");
  newItemDialog.close();

  newId.value = "";
  newName.value = "";
  newCategoryFree.value = "";
  newLocation.value = "";
  newTarget.value = "10";
  newMin.value = "0";
  newCurrent.value = "0";
  newUnitName.value = "Stück";
  newPackName.value = "";
  newPackSize.value = "";
  clearNewActor();

  await loadItems();
  setRoute(`#/item/${encodeURIComponent(inserted.id)}`);
}

// Suche: Enter öffnet, wenn eindeutig
function openIfUnique() {
  const q = (searchInput.value || "").trim().toLowerCase();
  if (!q) return;

  const exact = (allItems || []).find(x => (x.id || "").toLowerCase() === q);
  if (exact) { setRoute(`#/item/${encodeURIComponent(exact.id)}`); return; }

  const cat = (categoryFilter.value || "").trim();
  const filtered = (allItems || []).filter(it => {
    if (cat && (it.category || "").trim() !== cat) return false;
    return (
      (it.name || "").toLowerCase().includes(q) ||
      (it.id || "").toLowerCase().includes(q) ||
      (it.location || "").toLowerCase().includes(q) ||
      (it.category || "").toLowerCase().includes(q)
    );
  });

  if (filtered.length === 1) {
    setRoute(`#/item/${encodeURIComponent(filtered[0].id)}`);
  }
}

// Events
searchInput.addEventListener("input", renderItems);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") openIfUnique();
});
categoryFilter.addEventListener("change", renderItems);

newItemBtn.addEventListener("click", async () => {
  setHint(newHint, "");
  newCategoryFree.value = "";
  clearNewActor();
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

goTrashBtn.addEventListener("click", () => setRoute("#/trash"));
trashBackBtn.addEventListener("click", () => setRoute("#/"));

saveMetaBtn.addEventListener("click", () => saveMeta());
deleteBtn.addEventListener("click", () => softDeleteItem());

document.querySelectorAll("[data-delta]").forEach(btn => {
  btn.addEventListener("click", () => {
    const d = parseInt(btn.getAttribute("data-delta"), 10);
    adjust(d);
  });
});

incPackBtn.addEventListener("click", () => adjustPack(1));
decPackBtn.addEventListener("click", () => adjustPack(-1));

takePhotoBtn.addEventListener("click", () => {
  imageCapture.value = "";
  imageCapture.click();
});
pickPhotoBtn.addEventListener("click", () => {
  imagePicker.value = "";
  imagePicker.click();
});
imageCapture.addEventListener("change", async () => {
  const f = imageCapture.files?.[0];
  if (!f) return;
  await uploadImage(f);
});
imagePicker.addEventListener("change", async () => {
  const f = imagePicker.files?.[0];
  if (!f) return;
  await uploadImage(f);
});

// Auto reload bei Rückkehr
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) handleRoute();
});
window.addEventListener("focus", () => handleRoute());

// Routing
async function handleRoute() {
  const r = getRoute();

  if (r.startsWith("#/item/")) {
    const id = decodeURIComponent(r.replace("#/item/", ""));
    await loadItem(id);
    return;
  }

  if (r === "#/trash") {
    showTrash();
    await loadTrash();
    return;
  }

  showHome();
  await loadItems();
}

window.addEventListener("hashchange", handleRoute);
handleRoute();

