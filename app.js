/*******************************************************
 * STABILES Lager-Prototyp JS
 * - Läuft auch wenn DB-Spalten anders heißen (ist/soll vs current_qty/target_qty)
 * - Sichtbare Errors im UI
 * - Actor Popup Pflicht
 * - Bilderupload in Bucket "images"
 *******************************************************/

const SUPABASE_URL = "https://fiwatlffqgevxvmrsmvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd2F0bGZmcWdldnh2bXJzbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODY1MDYsImV4cCI6MjA4MTI2MjUwNn0.5jQBokoo25GFMBWgluBLN5Yy_NitrvYas8Pyxsj8AZA";
const EDIT_PIN = "81243";
const BUCKET = "images";
const TABLE = "items";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI
const statusText = document.getElementById("statusText");
const debugBox = document.getElementById("debugBox");
const btnReload = document.getElementById("btnReload");

const viewList = document.getElementById("viewList");
const viewDetail = document.getElementById("viewDetail");
const brandSub = document.getElementById("brandSub");

const q = document.getElementById("q");
const cat = document.getElementById("cat");
const loc = document.getElementById("loc");
const listHint = document.getElementById("listHint");
const grid = document.getElementById("grid");

const btnHome = document.getElementById("btnHome");
const btnBack = document.getElementById("btnBack");
const btnCreateOpen = document.getElementById("btnCreateOpen");
const toast = document.getElementById("toast");

const createModal = document.getElementById("createModal");
const btnCreateCancel = document.getElementById("btnCreateCancel");
const btnCreate = document.getElementById("btnCreate");
const createHint = document.getElementById("createHint");

const actorModal = document.getElementById("actorModal");
const actorInput = document.getElementById("actor");
const actorHint = document.getElementById("actorHint");
const btnActorCancel = document.getElementById("btnActorCancel");
const btnActorOk = document.getElementById("btnActorOk");

const catList = document.getElementById("catList");
const locList = document.getElementById("locList");

// Detail fields
const dTitle = document.getElementById("dTitle");
const dMeta = document.getElementById("dMeta");
const btnDelete = document.getElementById("btnDelete");

const img = document.getElementById("img");
const noimg = document.getElementById("noimg");
const imgHint = document.getElementById("imgHint");
const btnCamera = document.getElementById("btnCamera");
const btnPicker = document.getElementById("btnPicker");
const fileCam = document.getElementById("fileCam");
const filePick = document.getElementById("filePick");

const f_id = document.getElementById("f_id");
const f_name = document.getElementById("f_name");
const f_cat = document.getElementById("f_cat");
const f_loc = document.getElementById("f_loc");
const f_target = document.getElementById("f_target");
const f_current = document.getElementById("f_current");
const f_pack = document.getElementById("f_pack");

const btnSaveMeta = document.getElementById("btnSaveMeta");

const stock = document.getElementById("stock");
const state = document.getElementById("state");
const packHint = document.getElementById("packHint");
const btnPackMinus = document.getElementById("btnPackMinus");
const btnPackPlus = document.getElementById("btnPackPlus");
const qr = document.getElementById("qr");

// Create fields
const c_id = document.getElementById("c_id");
const c_name = document.getElementById("c_name");
const c_cat = document.getElementById("c_cat");
const c_loc = document.getElementById("c_loc");
const c_target = document.getElementById("c_target");
const c_current = document.getElementById("c_current");
const c_pack = document.getElementById("c_pack");

// State
let allRows = [];
let current = null;
let resolveActor = null;

// Column mapping candidates (wir lesen * und interpretieren Keys)
const COL = {
  id: ["id", "item_id", "code"],
  name: ["name", "titel", "title"],
  category: ["category", "kategorie", "cat"],
  location: ["location", "standort", "lagerort"],
  target: ["target_qty", "soll", "target", "soll_qty"],
  current: ["current_qty", "ist", "current", "ist_qty"],
  pack: ["pack_size", "pack", "packung", "pack_qty"],
  deletedAt: ["deleted_at", "deletedAt"],
  image: ["image_path", "image_url", "imageUrl", "image", "img"]
};

function logDebug(obj) {
  debugBox.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

function setStatus(msg, extra) {
  statusText.textContent = msg;
  if (extra) logDebug(extra);
}

function toastMsg(msg, ms = 2200) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.add("hidden"), ms);
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizeId(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

function pick(row, keys) {
  for (const k of keys) {
    if (row && Object.prototype.hasOwnProperty.call(row, k)) return row[k];
  }
  return undefined;
}

function setValue(row, keys, value) {
  // Setzt in Payload genau 1 passende Spalte
  for (const k of keys) {
    if (row && Object.prototype.hasOwnProperty.call(row, k)) {
      row[k] = value;
      return true;
    }
  }
  // Wenn wir den Key nicht kennen (neue Inserts), nutzen wir den ersten Candidate als Default
  row[keys[0]] = value;
  return true;
}

function getPublicUrl(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl + "?v=" + Date.now();
}

function computeState(cur, target) {
  const c = Number(cur || 0);
  const t = Number(target || 0);
  if (c < t) return { cls: "warn", text: "ZU WENIG" };
  return { cls: "ok", text: "OK" };
}

// Actor modal
function needActor() {
  return new Promise((resolve) => {
    resolveActor = resolve;
    actorInput.value = "";
    actorHint.textContent = "";
    actorModal.classList.remove("hidden");
    setTimeout(() => actorInput.focus(), 0);
  });
}
function closeActor(val) {
  actorModal.classList.add("hidden");
  if (resolveActor) resolveActor(val);
  resolveActor = null;
}
btnActorCancel.addEventListener("click", () => closeActor(null));
btnActorOk.addEventListener("click", () => {
  const v = (actorInput.value || "").trim();
  if (v.length < 2) {
    actorHint.textContent = "Bitte Namen eingeben.";
    return;
  }
  closeActor(v);
});

// Views / routing
function showList() {
  brandSub.textContent = "Übersicht";
  viewDetail.classList.add("hidden");
  viewList.classList.remove("hidden");
  current = null;
}
function showDetail(item) {
  brandSub.textContent = "Artikel";
  viewList.classList.add("hidden");
  viewDetail.classList.remove("hidden");
  current = item;
  renderDetail();
}

function route() {
  const h = location.hash || "#/";
  const m = h.match(/^#\/item\/(.+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const it = allRows.find(r => String(pick(r, COL.id)) === id);
    if (it) showDetail(it);
    else showList();
    return;
  }
  showList();
}

window.addEventListener("hashchange", route);
btnHome.addEventListener("click", () => (location.hash = "#/"));
btnBack.addEventListener("click", () => (location.hash = "#/"));
btnReload.addEventListener("click", () => init());

// Create modal
btnCreateOpen.addEventListener("click", () => {
  createHint.textContent = "";
  c_id.value = "";
  c_name.value = "";
  c_cat.value = "";
  c_loc.value = "";
  c_target.value = "0";
  c_current.value = "0";
  c_pack.value = "";
  createModal.classList.remove("hidden");
  setTimeout(() => c_id.focus(), 0);
});
btnCreateCancel.addEventListener("click", () => createModal.classList.add("hidden"));

// Filter events
q.addEventListener("input", renderList);
cat.addEventListener("change", renderList);
loc.addEventListener("change", renderList);

// Detail buttons
document.querySelectorAll("[data-d]").forEach(b => {
  b.addEventListener("click", async () => {
    if (!current) return;
    const actor = await needActor();
    if (!actor) return;

    const delta = Number(b.getAttribute("data-d"));
    const cur = Number(pick(current, COL.current) || 0);
    const next = Math.max(0, cur + delta);

    await updateItemWithFallback(current, { current: next }, actor, `adjust ${delta}`);
  });
});

btnPackMinus.addEventListener("click", async () => adjustPack(-1));
btnPackPlus.addEventListener("click", async () => adjustPack(+1));

async function adjustPack(sign) {
  if (!current) return;
  const ps = Number(pick(current, COL.pack) || 0);
  if (!(ps > 0)) return;

  const actor = await needActor();
  if (!actor) return;

  const cur = Number(pick(current, COL.current) || 0);
  const next = Math.max(0, cur + sign * ps);

  await updateItemWithFallback(current, { current: next }, actor, `pack ${sign > 0 ? "+1" : "-1"} (${ps})`);
}

// Save meta
btnSaveMeta.addEventListener("click", async () => {
  if (!current) return;

  const name = (f_name.value || "").trim();
  const catV = (f_cat.value || "").trim();
  const locV = (f_loc.value || "").trim();
  const targetV = Number(f_target.value);
  const currentV = Number(f_current.value);
  const packV = f_pack.value === "" ? null : Number(f_pack.value);

  if (!name) return alert("Name ist Pflicht.");
  if (!catV) return alert("Kategorie ist Pflicht.");
  if (!locV) return alert("Standort ist Pflicht.");
  if (!Number.isFinite(targetV) || targetV < 0) return alert("Soll ungültig.");
  if (!Number.isFinite(currentV) || currentV < 0) return alert("Ist ungültig.");

  const actor = await needActor();
  if (!actor) return;

  await updateItemWithFallback(current, { name, category: catV, location: locV, target: targetV, current: currentV, pack: packV }, actor, "save meta");
});

// Delete (soft)
btnDelete.addEventListener("click", async () => {
  if (!current) return;
  if (!confirm("Artikel soft löschen? (Falls deleted_at existiert, wird er ausgeblendet.)")) return;

  const actor = await needActor();
  if (!actor) return;

  await softDeleteWithFallback(current, actor);
});

// Image upload
btnCamera.addEventListener("click", () => fileCam.click());
btnPicker.addEventListener("click", () => filePick.click());
fileCam.addEventListener("change", async e => { const f = e.target.files?.[0]; e.target.value=""; if (f) await uploadImage(f); });
filePick.addEventListener("change", async e => { const f = e.target.files?.[0]; e.target.value=""; if (f) await uploadImage(f); });

async function uploadImage(file) {
  if (!current) return;

  imgHint.textContent = "";
  if (!file.type.startsWith("image/")) return alert("Bitte ein Bild auswählen.");
  if (file.size > 8 * 1024 * 1024) return alert("Bild zu groß (max 8MB).");

  const actor = await needActor();
  if (!actor) return;

  const id = String(pick(current, COL.id));
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `items/${id}/${Date.now()}.${ext}`;

  imgHint.textContent = "Upload läuft …";

  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type
  });

  if (up.error) {
    imgHint.textContent = "Upload Fehler: " + up.error.message;
    setStatus("Upload Fehler", up.error);
    return;
  }

  await updateItemWithFallback(current, { image: path }, actor, "upload image");
  imgHint.textContent = "Bild gespeichert.";
}

// Core DB operations with fallback
async function insertWithFallback(basePayload) {
  // Wir versuchen mehrere Spaltenvarianten, bis Supabase nicht mehr meckert
  const variants = buildInsertVariants(basePayload);

  let lastErr = null;
  for (const payload of variants) {
    const r = await supabase.from(TABLE).insert(payload).select("*").single();
    if (!r.error) return r.data;
    lastErr = r.error;
    // Wenn PK duplicate oder RLS: weitergeben, nicht endlos probieren
    if (String(r.error.message || "").toLowerCase().includes("duplicate")) break;
    if (String(r.error.message || "").toLowerCase().includes("row level security")) break;
  }

  throw lastErr || new Error("Insert failed");
}

async function updateWithFallback(id, patchObj) {
  const variants = buildUpdateVariants(patchObj);

  let lastErr = null;
  for (const patch of variants) {
    const r = await supabase.from(TABLE).update(patch).eq("id", id).select("*").single();
    if (!r.error) return r.data;
    lastErr = r.error;

    // Wenn id column nicht "id" ist, versuchen wir alternative PK match (item_id)
    if (String(r.error.message || "").toLowerCase().includes("column") && String(r.error.message).includes("id")) {
      // Try item_id
      const r2 = await supabase.from(TABLE).update(patch).eq("item_id", id).select("*").single();
      if (!r2.error) return r2.data;
      lastErr = r2.error;
    }
    if (String(r.error.message || "").toLowerCase().includes("row level security")) break;
  }

  throw lastErr || new Error("Update failed");
}

async function updateItemWithFallback(row, newValues, actor, note) {
  try {
    setStatus("Speichere …");

    const id = String(pick(row, COL.id));
    const patchObj = {};

    if (newValues.name !== undefined) patchObj.name = newValues.name;
    if (newValues.category !== undefined) patchObj.category = newValues.category;
    if (newValues.location !== undefined) patchObj.location = newValues.location;
    if (newValues.target !== undefined) patchObj.target = newValues.target;
    if (newValues.current !== undefined) patchObj.current = newValues.current;
    if (newValues.pack !== undefined) patchObj.pack = newValues.pack;
    if (newValues.image !== undefined) patchObj.image = newValues.image;

    // optional actor/time columns if they exist (best effort)
    patchObj.last_actor = actor;
    patchObj.last_change_at = new Date().toISOString();
    patchObj.updated_at = new Date().toISOString();

    const updated = await updateWithFallback(id, patchObj);

    // Update local row
    const idx = allRows.findIndex(r => String(pick(r, COL.id)) === id);
    if (idx >= 0) allRows[idx] = updated;

    current = updated;
    toastMsg("Gespeichert");
    setStatus("OK");

    rebuildFilters();
    renderList();
    renderDetail();
  } catch (e) {
    const msg = e?.message || JSON.stringify(e);
    alert("Fehler beim Speichern: " + msg);
    setStatus("Speichern fehlgeschlagen", e);
  }
}

async function softDeleteWithFallback(row, actor) {
  const id = String(pick(row, COL.id));
  try {
    setStatus("Lösche …");
    const patch = {
      deleted_at: new Date().toISOString(),
      last_actor: actor,
      last_change_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Wenn deleted_at nicht existiert, versuchen wir "is_deleted" oder "deleted" nicht, sondern lassen es hart scheitern
    // und zeigen dann klar, dass deine Tabelle kein deleted_at hat.
    const updated = await updateWithFallback(id, patch);

    allRows = allRows.filter(r => String(pick(r, COL.id)) !== id);
    toastMsg("Gelöscht");
    setStatus("OK");
    location.hash = "#/";
    rebuildFilters();
    renderList();
  } catch (e) {
    alert("Löschen fehlgeschlagen: " + (e?.message || e));
    setStatus("Löschen fehlgeschlagen", e);
  }
}

// Build payload variants for insert/update (different column names)
function buildInsertVariants(base) {
  const v = [];

  // Canonical
  v.push({
    id: base.id,
    name: base.name,
    category: base.category,
    location: base.location,
    target_qty: base.target,
    current_qty: base.current,
    pack_size: base.pack ?? null,
    deleted_at: null
  });

  // German style
  v.push({
    id: base.id,
    name: base.name,
    kategorie: base.category,
    standort: base.location,
    soll: base.target,
    ist: base.current,
    pack_size: base.pack ?? null,
    deleted_at: null
  });

  // Mixed / alternative
  v.push({
    id: base.id,
    titel: base.name,
    category: base.category,
    standort: base.location,
    target: base.target,
    current: base.current,
    pack: base.pack ?? null,
    deleted_at: null
  });

  return v;
}

function buildUpdateVariants(patchObj) {
  const variants = [];

  // Variant 1 (canonical)
  const p1 = {};
  for (const [k, v] of Object.entries(patchObj)) {
    if (k === "name") p1.name = v;
    else if (k === "category") p1.category = v;
    else if (k === "location") p1.location = v;
    else if (k === "target") p1.target_qty = v;
    else if (k === "current") p1.current_qty = v;
    else if (k === "pack") p1.pack_size = v;
    else if (k === "image") p1.image_path = v;
    else p1[k] = v; // last_actor etc best-effort
  }
  variants.push(p1);

  // Variant 2 (german)
  const p2 = {};
  for (const [k, v] of Object.entries(patchObj)) {
    if (k === "name") p2.name = v;
    else if (k === "category") p2.kategorie = v;
    else if (k === "location") p2.standort = v;
    else if (k === "target") p2.soll = v;
    else if (k === "current") p2.ist = v;
    else if (k === "pack") p2.pack_size = v;
    else if (k === "image") p2.image_url = v;
    else p2[k] = v;
  }
  variants.push(p2);

  // Variant 3 (alt keys)
  const p3 = {};
  for (const [k, v] of Object.entries(patchObj)) {
    if (k === "name") p3.title = v;
    else if (k === "category") p3.cat = v;
    else if (k === "location") p3.lagerort = v;
    else if (k === "target") p3.target = v;
    else if (k === "current") p3.current = v;
    else if (k === "pack") p3.pack = v;
    else if (k === "image") p3.imageUrl = v;
    else p3[k] = v;
  }
  variants.push(p3);

  return variants;
}

// Rendering
function rebuildFilters() {
  const cats = new Set();
  const locs = new Set();

  for (const r of allRows) {
    const cv = pick(r, COL.category);
    const lv = pick(r, COL.location);
    if (cv) cats.add(String(cv));
    if (lv) locs.add(String(lv));
  }

  const oldC = cat.value;
  const oldL = loc.value;

  cat.innerHTML = `<option value="">Alle Kategorien</option>` + [...cats].sort().map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("");
  loc.innerHTML = `<option value="">Alle Standorte</option>` + [...locs].sort().map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("");

  cat.value = cats.has(oldC) ? oldC : "";
  loc.value = locs.has(oldL) ? oldL : "";

  catList.innerHTML = [...cats].sort().map(x => `<option value="${esc(x)}"></option>`).join("");
  locList.innerHTML = [...locs].sort().map(x => `<option value="${esc(x)}"></option>`).join("");
}

function renderList() {
  const query = (q.value || "").trim().toLowerCase();
  const catV = cat.value;
  const locV = loc.value;

  let rows = [...allRows];

  // hide deleted if we can detect deleted_at
  rows = rows.filter(r => {
    const d = pick(r, COL.deletedAt);
    return !d;
  });

  if (query) {
    rows = rows.filter(r => {
      const s = `${pick(r, COL.id)} ${pick(r, COL.name)} ${pick(r, COL.category)} ${pick(r, COL.location)}`.toLowerCase();
      return s.includes(query);
    });
  }
  if (catV) rows = rows.filter(r => String(pick(r, COL.category) || "") === catV);
  if (locV) rows = rows.filter(r => String(pick(r, COL.location) || "") === locV);

  grid.innerHTML = "";

  if (!rows.length) {
    listHint.textContent = "Keine Treffer oder keine Daten.";
    return;
  }
  listHint.textContent = "";

  for (const r of rows) {
    const id = String(pick(r, COL.id) ?? "");
    const name = String(pick(r, COL.name) ?? id);
    const catName = String(pick(r, COL.category) ?? "Ohne Kategorie");
    const locName = String(pick(r, COL.location) ?? "Ohne Standort");
    const cur = Number(pick(r, COL.current) ?? 0);
    const target = Number(pick(r, COL.target) ?? 0);
    const imgPath = pick(r, COL.image);

    const st = computeState(cur, target);

    const card = document.createElement("div");
    card.className = "card itemCard";
    card.addEventListener("click", () => {
      location.hash = `#/item/${encodeURIComponent(id)}`;
    });

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    if (imgPath) {
      const im = document.createElement("img");
      im.src = getPublicUrl(String(imgPath));
      thumb.appendChild(im);
    } else {
      const sp = document.createElement("span");
      sp.textContent = "Kein Bild";
      thumb.appendChild(sp);
    }

    const info = document.createElement("div");
    info.className = "itemInfo";
    info.innerHTML = `
      <div class="itemName">${esc(name)}</div>
      <div class="itemSub">${esc(catName)} • ${esc(locName)}</div>
      <div class="itemMeta">Bestand: <b>${cur}</b> / ${target}</div>
    `;

    const pill = document.createElement("div");
    pill.className = `pill ${st.cls}`;
    pill.textContent = st.text;

    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(pill);
    grid.appendChild(card);
  }
}

function renderDetail() {
  if (!current) return;

  const id = String(pick(current, COL.id) ?? "");
  const name = String(pick(current, COL.name) ?? id);
  const catName = String(pick(current, COL.category) ?? "");
  const locName = String(pick(current, COL.location) ?? "");
  const target = Number(pick(current, COL.target) ?? 0);
  const cur = Number(pick(current, COL.current) ?? 0);
  const pack = pick(current, COL.pack);
  const imgPath = pick(current, COL.image);

  dTitle.textContent = name;
  dMeta.textContent = `Kategorie: ${catName || "—"} | Standort: ${locName || "—"}`;

  f_id.value = id;
  f_name.value = name;
  f_cat.value = catName;
  f_loc.value = locName;
  f_target.value = String(target);
  f_current.value = String(cur);
  f_pack.value = pack ?? "";

  stock.textContent = String(cur);
  const st = computeState(cur, target);
  state.className = `pill ${st.cls}`;
  state.textContent = st.text;

  const ps = Number(pack || 0);
  if (ps > 0) {
    packHint.textContent = `Packungsgröße: ${ps} Stück.`;
    btnPackMinus.disabled = false;
    btnPackPlus.disabled = false;
  } else {
    packHint.textContent = "Tipp: Packungsgröße setzen (z.B. 16), dann funktionieren +1 Pack / -1 Pack.";
    btnPackMinus.disabled = true;
    btnPackPlus.disabled = true;
  }

  qr.textContent = `${location.origin}${location.pathname}#/item/${encodeURIComponent(id)}`;

  if (imgPath) {
    noimg.classList.add("hidden");
    img.classList.remove("hidden");
    img.src = getPublicUrl(String(imgPath));
  } else {
    img.classList.add("hidden");
    noimg.classList.remove("hidden");
  }

  imgHint.textContent = "";
}

// Create
btnCreate.addEventListener("click", async () => {
  try {
    createHint.textContent = "Prüfe Eingaben …";

    const actor = await needActor();
    if (!actor) { createHint.textContent = "Abgebrochen."; return; }

    const id = normalizeId(c_id.value);
    const name = (c_name.value || "").trim();
    const catV = (c_cat.value || "").trim();
    const locV = (c_loc.value || "").trim();
    const target = Number(c_target.value);
    const cur = Number(c_current.value);
    const pack = c_pack.value === "" ? null : Number(c_pack.value);

    if (!id) { createHint.textContent = "ID fehlt/ungültig."; return; }
    if (!name) { createHint.textContent = "Name ist Pflicht."; return; }
    if (!catV) { createHint.textContent = "Kategorie ist Pflicht."; return; }
    if (!locV) { createHint.textContent = "Standort ist Pflicht."; return; }
    if (!Number.isFinite(target) || target < 0) { createHint.textContent = "Soll ungültig."; return; }
    if (!Number.isFinite(cur) || cur < 0) { createHint.textContent = "Ist ungültig."; return; }
    if (pack !== null && (!Number.isFinite(pack) || pack < 0)) { createHint.textContent = "Packungsgröße ungültig."; return; }

    createHint.textContent = "Lege an …";
    setStatus("Insert …");

    const newRow = await insertWithFallback({
      id, name, category: catV, location: locV, target, current: cur, pack
    });

    createModal.classList.add("hidden");
    toastMsg("Artikel angelegt");
    setStatus("OK");

    await load();
    location.hash = `#/item/${encodeURIComponent(String(pick(newRow, COL.id) || id))}`;
  } catch (e) {
    createHint.textContent = "Fehler: " + (e?.message || e);
    setStatus("Insert fehlgeschlagen", e);
  }
});

// Load
async function load() {
  setStatus("Lade Daten …");
  listHint.textContent = "Lade …";
  grid.innerHTML = "";

  const res = await supabase.from(TABLE).select("*").limit(1000);
  if (res.error) {
    setStatus("DB Fehler beim Laden", res.error);
    listHint.textContent = "Fehler: " + res.error.message;
    allRows = [];
    return;
  }

  allRows = res.data || [];
  setStatus(`OK (${allRows.length} Datensätze geladen)`);

  rebuildFilters();
  renderList();
  route();
}

// Init
async function init() {
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("PASTE_")) {
    setStatus("Fehlt: SUPABASE_ANON_KEY in app.js eintragen.");
    alert("Bitte in app.js den SUPABASE_ANON_KEY eintragen.");
    return;
  }

  // Quick Storage sanity check (best effort)
  const b = await supabase.storage.listBuckets();
  if (b.error) {
    setStatus("Storage Bucket Check fehlgeschlagen (nicht kritisch)", b.error);
  } else {
    const has = (b.data || []).some(x => x.name === BUCKET);
    if (!has) {
      setStatus(`Bucket "${BUCKET}" nicht gefunden. Bilderupload wird scheitern.`, b.data);
    }
  }

  await load();
}

init();
