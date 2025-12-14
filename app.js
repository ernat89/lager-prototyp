/**********************************************************
 * Lager Prototype - app.js (komplett)
 * - Supabase Storage + DB
 * - Actor wird NIE vorausgefüllt
 * - Wenn Actor fehlt: Popup
 **********************************************************/

/** 1) HIER EINTRAGEN */
const SUPABASE_URL = "https://fiwatlffqgevxvmrsmvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd2F0bGZmcWdldnh2bXJzbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODY1MDYsImV4cCI6MjA4MTI2MjUwNn0.5jQBokoo25GFMBWgluBLN5Yy_NitrvYas8Pyxsj8AZA";
const EDIT_PIN = "81243";

/** Optional: simpler Edit-PIN (nur UI-Schutz, kein echter Security Layer) */
const EDIT_PIN = "81243";

/** Tabellen/Bucket */
const TABLE_ITEMS = "items";
const TABLE_LOGS = "logs";
const BUCKET_IMAGES = "images";

/** Supabase Client */
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** State */
let allItems = [];
let currentItem = null;
let pinOkUntil = 0; // 10min Cache
let actorResolver = null;

/** DOM */
const viewList = document.getElementById("viewList");
const viewDetail = document.getElementById("viewDetail");

const itemsGrid = document.getElementById("itemsGrid");
const listHint = document.getElementById("listHint");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const locationFilter = document.getElementById("locationFilter");

const btnHome = document.getElementById("btnHome");
const btnBack = document.getElementById("btnBack");
const btnOpenCreate = document.getElementById("btnOpenCreate");

const createModal = document.getElementById("createModal");
const btnCreateCancel = document.getElementById("btnCreateCancel");
const btnCreate = document.getElementById("btnCreate");
const createHint = document.getElementById("createHint");

const actorModal = document.getElementById("actorModal");
const actorInput = document.getElementById("actorInput");
const actorHint = document.getElementById("actorHint");
const btnActorCancel = document.getElementById("btnActorCancel");
const btnActorOk = document.getElementById("btnActorOk");

const toast = document.getElementById("toast");

/** Detail DOM */
const detailTitle = document.getElementById("detailTitle");
const detailMeta = document.getElementById("detailMeta");
const btnDelete = document.getElementById("btnDelete");

const detailImage = document.getElementById("detailImage");
const detailNoImage = document.getElementById("detailNoImage");
const imageHint = document.getElementById("imageHint");

const btnTakePhoto = document.getElementById("btnTakePhoto");
const btnPickPhoto = document.getElementById("btnPickPhoto");
const fileCamera = document.getElementById("fileCamera");
const filePicker = document.getElementById("filePicker");

const d_id = document.getElementById("d_id");
const d_name = document.getElementById("d_name");
const d_category = document.getElementById("d_category");
const d_location = document.getElementById("d_location");
const d_unit = document.getElementById("d_unit");
const d_min = document.getElementById("d_min");
const d_target = document.getElementById("d_target");
const d_current = document.getElementById("d_current");
const d_pack_name = document.getElementById("d_pack_name");
const d_pack_size = document.getElementById("d_pack_size");

const btnSaveMeta = document.getElementById("btnSaveMeta");

const stockValue = document.getElementById("stockValue");
const stockState = document.getElementById("stockState");
const packHint = document.getElementById("packHint");

const logList = document.getElementById("logList");
const qrLink = document.getElementById("qrLink");

const categoryList = document.getElementById("categoryList");
const locationList = document.getElementById("locationList");

const btnDeltaPackMinus = document.getElementById("btnDeltaPackMinus");
const btnDeltaPackPlus = document.getElementById("btnDeltaPackPlus");

/** Create modal inputs */
const c_id = document.getElementById("c_id");
const c_name = document.getElementById("c_name");
const c_category = document.getElementById("c_category");
const c_location = document.getElementById("c_location");
const c_target = document.getElementById("c_target");
const c_current = document.getElementById("c_current");
const c_min = document.getElementById("c_min");
const c_unit = document.getElementById("c_unit");
const c_pack_name = document.getElementById("c_pack_name");
const c_pack_size = document.getElementById("c_pack_size");

/** Utils */
function toastMsg(msg, ms = 2200) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => toast.classList.add("hidden"), ms);
}

function setHint(el, msg) {
  el.textContent = msg || "";
}

function normalizeId(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

function isValidId(id) {
  return /^[a-z0-9_-]+$/.test(id);
}

function nowIso() {
  return new Date().toISOString();
}

function formatTs(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleString("de-DE", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  } catch { return String(ts); }
}

function getPublicUrl(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(BUCKET_IMAGES).getPublicUrl(path);
  // Cache buster damit Upload sofort sichtbar
  return data.publicUrl + "?v=" + Date.now();
}

/** PIN */
async function ensurePin() {
  const now = Date.now();
  if (now < pinOkUntil) return true;

  const pin = window.prompt("PIN eingeben:");
  if (!pin) return false;

  if (pin.trim() !== EDIT_PIN) {
    alert("Falscher PIN.");
    return false;
  }

  pinOkUntil = Date.now() + 10 * 60 * 1000;
  return true;
}

/** Actor popup */
function requireActor() {
  return new Promise((resolve) => {
    actorResolver = resolve;
    actorInput.value = "";
    actorHint.textContent = "";
    actorModal.classList.remove("hidden");
    setTimeout(() => actorInput.focus(), 0);
  });
}

function closeActorModal() {
  actorModal.classList.add("hidden");
}

btnActorCancel.addEventListener("click", () => {
  closeActorModal();
  if (actorResolver) actorResolver(null);
  actorResolver = null;
});

btnActorOk.addEventListener("click", () => {
  const name = (actorInput.value || "").trim();
  if (name.length < 2) {
    actorHint.textContent = "Bitte einen Namen eingeben.";
    return;
  }
  closeActorModal();
  if (actorResolver) actorResolver(name);
  actorResolver = null;
});

/** Routing */
function showList() {
  viewDetail.classList.add("hidden");
  viewList.classList.remove("hidden");
  document.querySelector(".brandSub").textContent = "Übersicht";
  currentItem = null;
}

function showDetail(item) {
  currentItem = item;
  viewList.classList.add("hidden");
  viewDetail.classList.remove("hidden");
  document.querySelector(".brandSub").textContent = "Artikel";
  renderDetail();
}

function openItem(id) {
  const item = allItems.find(x => x.id === id);
  if (!item) {
    toastMsg("Artikel nicht gefunden.");
    return;
  }
  window.location.hash = `#/item/${encodeURIComponent(id)}`;
}

/** Data loading */
async function loadItems() {
  setHint(listHint, "Lade …");
  const { data, error } = await supabase
    .from(TABLE_ITEMS)
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    setHint(listHint, "Fehler beim Laden: " + error.message);
    allItems = [];
    renderList();
    return;
  }

  allItems = data || [];
  setHint(listHint, allItems.length ? "" : "Noch keine Artikel vorhanden.");
  rebuildFiltersAndDatalists();
  renderList();
}

function rebuildFiltersAndDatalists() {
  const cats = new Set();
  const locs = new Set();

  for (const it of allItems) {
    if (it.category) cats.add(it.category);
    if (it.location) locs.add(it.location);
  }

  // Filter selects
  const catVal = categoryFilter.value;
  const locVal = locationFilter.value;

  categoryFilter.innerHTML = `<option value="">Alle Kategorien</option>` + [...cats].sort().map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  locationFilter.innerHTML = `<option value="">Alle Standorte</option>` + [...locs].sort().map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");

  categoryFilter.value = cats.has(catVal) ? catVal : "";
  locationFilter.value = locs.has(locVal) ? locVal : "";

  // Datalists
  categoryList.innerHTML = [...cats].sort().map(c => `<option value="${escapeHtml(c)}"></option>`).join("");
  locationList.innerHTML = [...locs].sort().map(l => `<option value="${escapeHtml(l)}"></option>`).join("");
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/** List render */
function computeState(it) {
  const cur = Number(it.current_qty ?? it.ist ?? 0);
  const target = Number(it.target_qty ?? it.soll ?? 0);
  const min = Number(it.min_qty ?? 0);

  if (min > 0 && cur < min) return { cls: "bad", text: "MIN" };
  if (cur < target) return { cls: "warn", text: "ZU WENIG" };
  return { cls: "ok", text: "OK" };
}

function renderList() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const cat = categoryFilter.value;
  const loc = locationFilter.value;

  let items = [...allItems];

  if (q) {
    items = items.filter(it => {
      const hay = `${it.id} ${it.name||""} ${it.category||""} ${it.location||""}`.toLowerCase();
      return hay.includes(q);
    });
  }
  if (cat) items = items.filter(it => (it.category || "") === cat);
  if (loc) items = items.filter(it => (it.location || "") === loc);

  itemsGrid.innerHTML = "";

  if (!items.length) {
    setHint(listHint, "Keine Treffer.");
    return;
  } else {
    setHint(listHint, "");
  }

  for (const it of items) {
    const cur = Number(it.current_qty ?? 0);
    const target = Number(it.target_qty ?? 0);
    const st = computeState(it);

    const card = document.createElement("div");
    card.className = "card itemCard";
    card.addEventListener("click", () => openItem(it.id));

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    if (it.image_path) {
      const img = document.createElement("img");
      img.src = getPublicUrl(it.image_path);
      img.alt = "";
      thumb.appendChild(img);
    } else {
      const span = document.createElement("span");
      span.textContent = "Kein Bild";
      thumb.appendChild(span);
    }

    const info = document.createElement("div");
    info.className = "itemInfo";
    info.innerHTML = `
      <div class="itemName">${escapeHtml(it.name || it.id)}</div>
      <div class="itemSub">${escapeHtml(it.category || "Ohne Kategorie")} • ${escapeHtml(it.location || "Ohne Standort")}</div>
      <div class="itemMeta">Bestand: <b>${cur}</b> / ${target}</div>
      <div class="itemMeta">Zuletzt: ${escapeHtml(it.last_actor || "—")}, ${escapeHtml(formatTs(it.last_change_at || it.updated_at))}</div>
    `;

    const pill = document.createElement("div");
    pill.className = `pill ${st.cls}`;
    pill.textContent = st.text;

    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(pill);

    itemsGrid.appendChild(card);
  }
}

/** Detail render */
function renderDetail() {
  if (!currentItem) return;

  detailTitle.textContent = currentItem.name || currentItem.id;
  detailMeta.textContent =
    `Kategorie: ${currentItem.category || "—"} | Standort: ${currentItem.location || "—"} | Zuletzt: ${currentItem.last_actor || "—"}, ${formatTs(currentItem.last_change_at || currentItem.updated_at)}`;

  d_id.value = currentItem.id;
  d_name.value = currentItem.name || "";
  d_category.value = currentItem.category || "";
  d_location.value = currentItem.location || "";
  d_unit.value = currentItem.unit_name || "Stück";
  d_min.value = Number(currentItem.min_qty ?? 0);
  d_target.value = Number(currentItem.target_qty ?? 0);
  d_current.value = Number(currentItem.current_qty ?? 0);
  d_pack_name.value = currentItem.pack_name || "";
  d_pack_size.value = currentItem.pack_size ?? "";

  // Image
  if (currentItem.image_path) {
    detailNoImage.classList.add("hidden");
    detailImage.classList.remove("hidden");
    detailImage.src = getPublicUrl(currentItem.image_path);
  } else {
    detailImage.classList.add("hidden");
    detailNoImage.classList.remove("hidden");
  }

  // stock state
  updateStockUI();

  // pack hint
  const ps = Number(currentItem.pack_size || 0);
  if (ps > 0) {
    packHint.textContent = `Pack: ${ps} ${currentItem.unit_name || "Stück"} pro ${currentItem.pack_name || "Packung"}.`;
    btnDeltaPackMinus.disabled = false;
    btnDeltaPackPlus.disabled = false;
  } else {
    packHint.textContent = `Tipp: Packung Größe setzen (z.B. 16) für +1 Pack / -1 Pack.`;
    btnDeltaPackMinus.disabled = true;
    btnDeltaPackPlus.disabled = true;
  }

  // qr link
  const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/");
  qrLink.textContent = `${window.location.origin}${window.location.pathname}#/item/${currentItem.id}`;

  loadLogs(currentItem.id);
}

function updateStockUI() {
  const cur = Number(currentItem.current_qty ?? 0);
  const target = Number(currentItem.target_qty ?? 0);
  stockValue.textContent = String(cur);

  const st = computeState(currentItem);
  stockState.className = `pill ${st.cls}`;
  stockState.textContent = st.text;
}

/** Logs */
async function loadLogs(itemId) {
  logList.innerHTML = "Lade …";
  const { data, error } = await supabase
    .from(TABLE_LOGS)
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    logList.innerHTML = `<div class="smallHint">Logs konnten nicht geladen werden: ${escapeHtml(error.message)}</div>`;
    return;
  }

  const logs = data || [];
  if (!logs.length) {
    logList.innerHTML = `<div class="smallHint">Noch keine Änderungen.</div>`;
    return;
  }

  logList.innerHTML = "";
  for (const l of logs) {
    const div = document.createElement("div");
    div.className = "logItem";
    div.innerHTML = `
      <div class="logTop">
        <div class="logMain">${escapeHtml(l.action || "action")}${l.delta != null ? ` (${l.delta > 0 ? "+" : ""}${l.delta})` : ""}</div>
        <div class="pill ${l.delta != null && l.delta < 0 ? "warn" : "ok"}">${escapeHtml(l.actor || "—")}</div>
      </div>
      <div class="logSub">${escapeHtml(l.note || "")} • ${escapeHtml(formatTs(l.created_at))}</div>
    `;
    logList.appendChild(div);
  }
}

/** CRUD: Create */
function openCreateModal() {
  createHint.textContent = "";
  c_id.value = "";
  c_name.value = "";
  c_category.value = "";
  c_location.value = "";
  c_target.value = "0";
  c_current.value = "0";
  c_min.value = "0";
  c_unit.value = "Stück";
  c_pack_name.value = "";
  c_pack_size.value = "";
  createModal.classList.remove("hidden");
  setTimeout(() => c_id.focus(), 0);
}

function closeCreateModal() {
  createModal.classList.add("hidden");
}

btnOpenCreate.addEventListener("click", openCreateModal);
btnCreateCancel.addEventListener("click", closeCreateModal);

btnCreate.addEventListener("click", async () => {
  createHint.textContent = "Prüfe …";

  const ok = await ensurePin();
  if (!ok) { createHint.textContent = "PIN abgebrochen."; return; }

  const actor = await requireActor();
  if (!actor) { createHint.textContent = "Abgebrochen."; return; }

  const idRaw = c_id.value;
  const id = normalizeId(idRaw);
  if (!id || !isValidId(id)) { createHint.textContent = "Ungültige ID (a-z, 0-9, _ und -)."; return; }

  const name = (c_name.value || "").trim();
  const category = (c_category.value || "").trim();
  const location = (c_location.value || "").trim();

  const target = Number(c_target.value);
  const current = Number(c_current.value);
  const min = Number(c_min.value);

  if (!name) { createHint.textContent = "Name ist Pflicht."; return; }
  if (!category) { createHint.textContent = "Kategorie ist Pflicht."; return; }
  if (!location) { createHint.textContent = "Standort ist Pflicht."; return; }
  if (!Number.isFinite(target) || target < 0) { createHint.textContent = "Soll ist ungültig."; return; }
  if (!Number.isFinite(current) || current < 0) { createHint.textContent = "Ist ist ungültig."; return; }

  const unit = (c_unit.value || "Stück").trim() || "Stück";
  const packName = (c_pack_name.value || "").trim();
  const packSize = c_pack_size.value === "" ? null : Number(c_pack_size.value);

  createHint.textContent = "Lege an …";

  const payload = {
    id,
    name,
    category,
    location,
    unit_name: unit,
    min_qty: Number.isFinite(min) && min >= 0 ? min : 0,
    target_qty: target,
    current_qty: current,
    pack_name: packName || null,
    pack_size: Number.isFinite(packSize) && packSize > 0 ? packSize : null,
    last_actor: actor,
    last_change_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null
  };

  const { data, error } = await supabase.from(TABLE_ITEMS).insert(payload).select("*").single();

  if (error) {
    console.error(error);
    createHint.textContent = "Fehler: " + error.message;
    return;
  }

  await supabase.from(TABLE_LOGS).insert({
    item_id: id,
    actor,
    action: "create",
    delta: null,
    note: "Artikel angelegt"
  });

  toastMsg("Artikel angelegt");
  closeCreateModal();
  await loadItems();
  openItem(id);
});

/** CRUD: Save Meta */
btnSaveMeta.addEventListener("click", async () => {
  if (!currentItem) return;

  const ok = await ensurePin();
  if (!ok) return;

  const name = (d_name.value || "").trim();
  const category = (d_category.value || "").trim();
  const location = (d_location.value || "").trim();

  const target = Number(d_target.value);
  const current = Number(d_current.value);
  const min = Number(d_min.value);

  if (!name) { alert("Name ist Pflicht."); return; }
  if (!category) { alert("Kategorie ist Pflicht."); return; }
  if (!location) { alert("Standort ist Pflicht."); return; }
  if (!Number.isFinite(target) || target < 0) { alert("Soll ist ungültig."); return; }
  if (!Number.isFinite(current) || current < 0) { alert("Ist ist ungültig."); return; }

  const unit = (d_unit.value || "Stück").trim() || "Stück";
  const packName = (d_pack_name.value || "").trim();
  const packSize = d_pack_size.value === "" ? null : Number(d_pack_size.value);

  const actor = await requireActor();
  if (!actor) return;

  const patch = {
    name,
    category,
    location,
    unit_name: unit,
    min_qty: Number.isFinite(min) && min >= 0 ? min : 0,
    target_qty: target,
    current_qty: current,
    pack_name: packName || null,
    pack_size: Number.isFinite(packSize) && packSize > 0 ? packSize : null,
    last_actor: actor,
    last_change_at: nowIso(),
    updated_at: nowIso()
  };

  const { data, error } = await supabase
    .from(TABLE_ITEMS)
    .update(patch)
    .eq("id", currentItem.id)
    .select("*")
    .single();

  if (error) {
    console.error(error);
    alert("Fehler beim Speichern: " + error.message);
    return;
  }

  await supabase.from(TABLE_LOGS).insert({
    item_id: currentItem.id,
    actor,
    action: "update_meta",
    delta: null,
    note: "Stammdaten gespeichert"
  });

  currentItem = data;
  toastMsg("Gespeichert");
  await loadItems();
  renderDetail();
});

/** Stock delta buttons */
document.querySelectorAll("[data-delta]").forEach(btn => {
  btn.addEventListener("click", async () => {
    if (!currentItem) return;

    const ok = await ensurePin();
    if (!ok) return;

    const actor = await requireActor();
    if (!actor) return;

    const delta = Number(btn.getAttribute("data-delta"));
    const newQty = Math.max(0, Number(currentItem.current_qty ?? 0) + delta);

    const { data, error } = await supabase
      .from(TABLE_ITEMS)
      .update({
        current_qty: newQty,
        last_actor: actor,
        last_change_at: nowIso(),
        updated_at: nowIso()
      })
      .eq("id", currentItem.id)
      .select("*")
      .single();

    if (error) {
      console.error(error);
      alert("Fehler: " + error.message);
      return;
    }

    await supabase.from(TABLE_LOGS).insert({
      item_id: currentItem.id,
      actor,
      action: "adjust_qty",
      delta,
      note: `Bestand geändert (${delta > 0 ? "+" : ""}${delta})`
    });

    currentItem = data;
    updateStockUI();
    await loadItems();
    loadLogs(currentItem.id);
  });
});

/** Pack +/- */
btnDeltaPackMinus.addEventListener("click", async () => adjustByPack(-1));
btnDeltaPackPlus.addEventListener("click", async () => adjustByPack(+1));

async function adjustByPack(sign) {
  if (!currentItem) return;
  const ps = Number(currentItem.pack_size || 0);
  if (!(ps > 0)) return;

  const ok = await ensurePin();
  if (!ok) return;

  const actor = await requireActor();
  if (!actor) return;

  const delta = sign * ps;
  const newQty = Math.max(0, Number(currentItem.current_qty ?? 0) + delta);

  const { data, error } = await supabase
    .from(TABLE_ITEMS)
    .update({
      current_qty: newQty,
      last_actor: actor,
      last_change_at: nowIso(),
      updated_at: nowIso()
    })
    .eq("id", currentItem.id)
    .select("*")
    .single();

  if (error) {
    console.error(error);
    alert("Fehler: " + error.message);
    return;
  }

  await supabase.from(TABLE_LOGS).insert({
    item_id: currentItem.id,
    actor,
    action: "adjust_pack",
    delta,
    note: `${sign > 0 ? "+1" : "-1"} Pack (${ps} ${currentItem.unit_name || "Stück"})`
  });

  currentItem = data;
  updateStockUI();
  await loadItems();
  loadLogs(currentItem.id);
}

/** Delete (soft delete) */
btnDelete.addEventListener("click", async () => {
  if (!currentItem) return;

  const ok = await ensurePin();
  if (!ok) return;

  if (!confirm("Artikel wirklich löschen? (Er verschwindet aus der Übersicht, Logs bleiben.)")) return;

  const actor = await requireActor();
  if (!actor) return;

  const { error } = await supabase
    .from(TABLE_ITEMS)
    .update({
      deleted_at: nowIso(),
      last_actor: actor,
      last_change_at: nowIso(),
      updated_at: nowIso()
    })
    .eq("id", currentItem.id);

  if (error) {
    console.error(error);
    alert("Fehler: " + error.message);
    return;
  }

  await supabase.from(TABLE_LOGS).insert({
    item_id: currentItem.id,
    actor,
    action: "delete_soft",
    delta: null,
    note: "Artikel soft gelöscht"
  });

  toastMsg("Gelöscht");
  window.location.hash = "#/";
  await loadItems();
});

/** Image upload */
btnTakePhoto.addEventListener("click", () => fileCamera.click());
btnPickPhoto.addEventListener("click", () => filePicker.click());

fileCamera.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  e.target.value = "";
  if (f) await uploadImageForCurrentItem(f);
});
filePicker.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  e.target.value = "";
  if (f) await uploadImageForCurrentItem(f);
});

async function uploadImageForCurrentItem(file) {
  if (!currentItem) return;

  imageHint.textContent = "";

  const ok = await ensurePin();
  if (!ok) return;

  const actor = await requireActor();
  if (!actor) return;

  // Basic validation
  if (!file.type.startsWith("image/")) {
    alert("Bitte eine Bilddatei auswählen.");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    alert("Bild ist zu groß (max 8 MB).");
    return;
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `items/${currentItem.id}/${Date.now()}.${ext}`;

  imageHint.textContent = "Upload läuft …";

  const up = await supabase.storage
    .from(BUCKET_IMAGES)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (up.error) {
    console.error("UPLOAD ERROR", up.error);
    imageHint.textContent = "Upload Fehler: " + up.error.message;
    alert("Upload Fehler: " + up.error.message);
    return;
  }

  // Save path to DB
  const { data, error } = await supabase
    .from(TABLE_ITEMS)
    .update({
      image_path: path,
      last_actor: actor,
      last_change_at: nowIso(),
      updated_at: nowIso()
    })
    .eq("id", currentItem.id)
    .select("*")
    .single();

  if (error) {
    console.error("DB image_path error", error);
    imageHint.textContent = "DB Fehler: " + error.message;
    alert("DB Fehler: " + error.message);
    return;
  }

  await supabase.from(TABLE_LOGS).insert({
    item_id: currentItem.id,
    actor,
    action: "upload_image",
    delta: null,
    note: "Bild hochgeladen"
  });

  currentItem = data;

  // Render
  detailNoImage.classList.add("hidden");
  detailImage.classList.remove("hidden");
  detailImage.src = getPublicUrl(path);

  imageHint.textContent = "Bild gespeichert.";
  toastMsg("Bild gespeichert");
  await loadItems();
  loadLogs(currentItem.id);
}

/** Filters */
searchInput.addEventListener("input", renderList);
categoryFilter.addEventListener("change", renderList);
locationFilter.addEventListener("change", renderList);

/** Navigation buttons */
btnHome.addEventListener("click", () => window.location.hash = "#/");
btnBack.addEventListener("click", () => window.location.hash = "#/");

/** Hash routing */
window.addEventListener("hashchange", handleRoute);

function handleRoute() {
  const h = window.location.hash || "#/";
  const m = h.match(/^#\/item\/(.+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const item = allItems.find(x => x.id === id);
    if (item) showDetail(item);
    else {
      // If list not loaded yet, load and then route
      loadItems().then(() => {
        const again = allItems.find(x => x.id === id);
        if (again) showDetail(again);
        else {
          toastMsg("Artikel nicht gefunden.");
          window.location.hash = "#/";
        }
      });
    }
    return;
  }
  showList();
}

/** Init */
(async function init() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("PASTE_")) {
    alert("Bitte SUPABASE_URL und SUPABASE_ANON_KEY in app.js eintragen.");
    return;
  }

  await loadItems();
  handleRoute();
})();



