// 1) HIER EINTRAGEN:
const SUPABASE_URL = "https://fiwatlffqgevxvmrsmvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd2F0bGZmcWdldnh2bXJzbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODY1MDYsImV4cCI6MjA4MTI2MjUwNn0.5jQBokoo25GFMBWgluBLN5Yy_NitrvYas8Pyxsj8AZA";
const EDIT_PIN = "81243";

// Pin-Session-Key
const PIN_STORAGE_KEY = "lager_pin_ok_v1";

// Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM
const statusLine = document.getElementById("statusLine");

const overviewSection = document.getElementById("overviewSection");
const detailSection = document.getElementById("detailSection");
const trashSection = document.getElementById("trashSection");

const navOverview = document.getElementById("navOverview");
const navTrash = document.getElementById("navTrash");
const newItemBtn = document.getElementById("newItemBtn");
const backBtn = document.getElementById("backBtn");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

const homeMessage = document.getElementById("homeMessage");
const itemsGrid = document.getElementById("itemsGrid");
const emptyHint = document.getElementById("emptyHint");

const trashMessage = document.getElementById("trashMessage");
const trashGrid = document.getElementById("trashGrid");
const trashEmpty = document.getElementById("trashEmpty");

const newItemDialog = document.getElementById("newItemDialog");
const newCancel = document.getElementById("newCancel");
const newCreate = document.getElementById("newCreate");
const newHint = document.getElementById("newHint");

const newId = document.getElementById("newId");
const newName = document.getElementById("newName");
const newCategoryFree = document.getElementById("newCategoryFree");
const newLocation = document.getElementById("newLocation");
const newTarget = document.getElementById("newTarget");
const newCurrent = document.getElementById("newCurrent");
const newMin = document.getElementById("newMin");
const newUnitName = document.getElementById("newUnitName");
const newPackName = document.getElementById("newPackName");
const newPackSize = document.getElementById("newPackSize");
const newActor = document.getElementById("newActor");

const confirmDialog = document.getElementById("confirmDialog");
const confirmTitle = document.getElementById("confirmTitle");
const confirmText = document.getElementById("confirmText");
const confirmNo = document.getElementById("confirmNo");
const confirmYes = document.getElementById("confirmYes");

const detailId = document.getElementById("detailId");
const detailName = document.getElementById("detailName");
const detailCategory = document.getElementById("detailCategory");
const detailLocation = document.getElementById("detailLocation");
const detailTarget = document.getElementById("detailTarget");
const detailMin = document.getElementById("detailMin");
const detailUnit = document.getElementById("detailUnit");
const detailPackName = document.getElementById("detailPackName");
const detailPackSize = document.getElementById("detailPackSize");

const detailCurrent = document.getElementById("detailCurrent");
const detailActor = document.getElementById("detailActor");
const btnSaveMeta = document.getElementById("btnSaveMeta");
const btnSoftDelete = document.getElementById("btnSoftDelete");

const btnPackMinus = document.getElementById("btnPackMinus");
const btnPackPlus = document.getElementById("btnPackPlus");

const detailMetaLine = document.getElementById("detailMetaLine");
const detailLogs = document.getElementById("detailLogs");

const detailNoImage = document.getElementById("detailNoImage");
const detailImage = document.getElementById("detailImage");
const qrLink = document.getElementById("qrLink");

const btnTakePhoto = document.getElementById("btnTakePhoto");
const btnPickFile = document.getElementById("btnPickFile");
const cameraInput = document.getElementById("cameraInput");
const fileInput = document.getElementById("fileInput");

// State
let currentItem = null;
let confirmResolve = null;

// Utils
function setStatus(msg) {
  statusLine.textContent = msg || "Bereit";
}
function showMessage(el, msg) {
  if (!msg) { el.classList.add("hidden"); el.textContent = ""; return; }
  el.classList.remove("hidden");
  el.textContent = msg;
}
function setHint(el, msg) {
  el.textContent = msg || "";
}
function normalizeId(v) {
  const s = (v || "").trim().toLowerCase();
  if (!s) return "";
  if (!/^[a-z0-9_-]+$/.test(s)) return "";
  return s;
}
function normalizeText(v) {
  return (v || "").trim();
}
function normalizeCategory(v) {
  return normalizeText(v);
}
function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : NaN;
}
function nowIso() {
  return new Date().toISOString();
}
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("de-DE");
}
function badgeFor(item) {
  if (item.current_qty < item.min_qty) return { cls: "low", text: "UNTER MIN" };
  if (item.current_qty < item.target_qty) return { cls: "warn", text: "ZU WENIG" };
  return { cls: "ok", text: "OK" };
}
function packText(item) {
  if (!item.pack_name || !item.pack_size || item.pack_size <= 0) return "";
  const packs = Math.floor(item.current_qty / item.pack_size);
  const rest = item.current_qty % item.pack_size;
  if (packs <= 0) return `0 ${item.pack_name}, ${rest} ${item.unit_name}`;
  if (rest === 0) return `${packs} ${item.pack_name}`;
  return `${packs} ${item.pack_name} + ${rest} ${item.unit_name}`;
}
function getPublicImageUrl(path) {
  if (!path) return "";
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}

// PIN
async function ensurePin() {
  const ok = localStorage.getItem(PIN_STORAGE_KEY) === "1";
  if (ok) return true;

  const p = prompt("PIN eingeben:");
  if (!p) return false;

  if (p.trim() !== EDIT_PIN) {
    alert("Falsche PIN.");
    return false;
  }
  localStorage.setItem(PIN_STORAGE_KEY, "1");
  return true;
}

// Confirm
function confirmAsk(title, text) {
  confirmTitle.textContent = title;
  confirmText.textContent = text;
  confirmDialog.showModal();
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}
confirmNo.addEventListener("click", () => {
  confirmDialog.close();
  if (confirmResolve) confirmResolve(false);
  confirmResolve = null;
});
confirmYes.addEventListener("click", () => {
  confirmDialog.close();
  if (confirmResolve) confirmResolve(true);
  confirmResolve = null;
});

// Navigation
navOverview.addEventListener("click", () => setRoute("#/"));
navTrash.addEventListener("click", () => setRoute("#/trash"));

backBtn.addEventListener("click", () => history.back());

newItemBtn.addEventListener("click", async () => {
  setHint(newHint, "");
  newId.value = "";
  newName.value = "";
  newCategoryFree.value = "";
  newLocation.value = "";
  newTarget.value = "10";
  newCurrent.value = "0";
  newMin.value = "0";
  newUnitName.value = "Stück";
  newPackName.value = "";
  newPackSize.value = "";
  newActor.value = "";
  await refreshCategoryFilter();
  newItemDialog.showModal();
});

newCancel.addEventListener("click", () => newItemDialog.close());
newCreate.addEventListener("click", () => createItem());

searchInput.addEventListener("input", () => loadItems());
categoryFilter.addEventListener("change", () => loadItems());

// Routing
window.addEventListener("hashchange", handleRoute);

function setRoute(hash) {
  window.location.hash = hash;
}

function showSection(which) {
  overviewSection.classList.add("hidden");
  detailSection.classList.add("hidden");
  trashSection.classList.add("hidden");

  if (which === "overview") overviewSection.classList.remove("hidden");
  if (which === "detail") detailSection.classList.remove("hidden");
  if (which === "trash") trashSection.classList.remove("hidden");
}

async function handleRoute() {
  const h = window.location.hash || "#/";
  if (h.startsWith("#/item/")) {
    const id = decodeURIComponent(h.slice("#/item/".length));
    await openDetail(id);
    return;
  }
  if (h === "#/trash") {
    showSection("trash");
    await loadTrash();
    return;
  }
  showSection("overview");
  await loadItems();
}

// Data
async function refreshCategoryFilter() {
  // Kategorien aus aktiven Items
  const { data, error } = await supabase
    .from("items")
    .select("category")
    .is("deleted_at", null);

  if (error) return;

  const cats = Array.from(new Set((data || []).map(x => (x.category || "").trim()).filter(Boolean)))
    .sort((a,b) => a.localeCompare(b));

  const prev = categoryFilter.value || "";
  categoryFilter.innerHTML = `<option value="">Alle Kategorien</option>`;
  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryFilter.appendChild(opt);
  }
  categoryFilter.value = prev;
}

async function loadItems() {
  setStatus("Lade Artikel …");
  showMessage(homeMessage, null);

  const q = (searchInput.value || "").trim().toLowerCase();
  const cat = categoryFilter.value || "";

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    showMessage(homeMessage, `Fehler beim Laden: ${error.message}`);
    itemsGrid.innerHTML = "";
    emptyHint.classList.remove("hidden");
    setStatus("Fehler");
    return;
  }

  let items = data || [];

  if (cat) items = items.filter(x => (x.category || "") === cat);

  if (q) {
    items = items.filter(x => {
      const hay = [
        x.id, x.name, x.category, x.location
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  await refreshCategoryFilter();

  itemsGrid.innerHTML = "";
  if (!items.length) {
    emptyHint.classList.remove("hidden");
    setStatus("Keine Treffer");
    return;
  }
  emptyHint.classList.add("hidden");

  for (const item of items) {
    const b = badgeFor(item);

    const card = document.createElement("div");
    card.className = "card";
    card.addEventListener("click", () => setRoute(`#/item/${encodeURIComponent(item.id)}`));

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    if (item.image_path) {
      const img = document.createElement("img");
      img.src = getPublicImageUrl(item.image_path);
      thumb.appendChild(img);
    } else {
      thumb.textContent = "Kein Bild";
    }

    const main = document.createElement("div");
    main.className = "cardMain";

    const title = document.createElement("div");
    title.className = "cardTitle";
    title.textContent = item.name;

    const qty = document.createElement("div");
    qty.className = "cardQty";
    const pack = packText(item);
    qty.textContent = `${item.current_qty} / ${item.target_qty}${pack ? "  (" + pack + ")" : ""}`;

    const sub = document.createElement("div");
    sub.className = "cardSub";
    sub.textContent = `Standort: ${item.location}  |  Zuletzt: ${item.last_actor || "-"}, ${formatDate(item.last_change_at || item.updated_at)}`;

    main.appendChild(title);
    main.appendChild(qty);
    main.appendChild(sub);

    const badge = document.createElement("div");
    badge.className = `badge ${b.cls}`;
    badge.textContent = b.text;

    card.appendChild(thumb);
    card.appendChild(main);
    card.appendChild(badge);

    itemsGrid.appendChild(card);
  }

  setStatus(`Artikel: ${items.length}`);
}

async function loadTrash() {
  setStatus("Lade Papierkorb …");
  showMessage(trashMessage, null);

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    showMessage(trashMessage, `Fehler: ${error.message}`);
    trashGrid.innerHTML = "";
    trashEmpty.classList.remove("hidden");
    setStatus("Fehler");
    return;
  }

  const items = data || [];
  trashGrid.innerHTML = "";
  if (!items.length) {
    trashEmpty.classList.remove("hidden");
    setStatus("Papierkorb leer");
    return;
  }
  trashEmpty.classList.add("hidden");

  for (const item of items) {
    const card = document.createElement("div");
    card.className = "card";

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    if (item.image_path) {
      const img = document.createElement("img");
      img.src = getPublicImageUrl(item.image_path);
      thumb.appendChild(img);
    } else {
      thumb.textContent = "Kein Bild";
    }

    const main = document.createElement("div");
    main.className = "cardMain";

    const title = document.createElement("div");
    title.className = "cardTitle";
    title.textContent = item.name;

    const sub = document.createElement("div");
    sub.className = "cardSub";
    sub.textContent = `Gelöscht: ${formatDate(item.deleted_at)}  |  Standort: ${item.location}`;

    main.appendChild(title);
    main.appendChild(sub);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.flexDirection = "column";
    actions.style.gap = "8px";

    const restoreBtn = document.createElement("button");
    restoreBtn.className = "btn secondary";
    restoreBtn.textContent = "Wiederherstellen";
    restoreBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await restoreItem(item.id);
    });

    const hardBtn = document.createElement("button");
    hardBtn.className = "btn danger";
    hardBtn.textContent = "Endgültig löschen";
    hardBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await hardDeleteItem(item.id);
    });

    actions.appendChild(restoreBtn);
    actions.appendChild(hardBtn);

    card.appendChild(thumb);
    card.appendChild(main);
    card.appendChild(actions);

    trashGrid.appendChild(card);
  }

  setStatus(`Papierkorb: ${items.length}`);
}

// Create
async function createItem() {
  setHint(newHint, "");

  const ok = await ensurePin();
  if (!ok) { setHint(newHint, "PIN abgebrochen."); return; }

  const actor = normalizeText(newActor.value);
  if (actor.length < 2) { setHint(newHint, "Wer legt an? ist Pflicht."); return; }

  const id = normalizeId(newId.value);
  if (!id) { setHint(newHint, "Ungültige ID. Erlaubt: a-z 0-9 _ -"); return; }

  const name = normalizeText(newName.value);
  if (!name) { setHint(newHint, "Name ist Pflicht."); return; }

  const category = normalizeCategory(newCategoryFree.value);
  if (!category) { setHint(newHint, "Kategorie ist Pflicht."); return; }

  const location = normalizeText(newLocation.value);
  if (!location) { setHint(newHint, "Standort ist Pflicht."); return; }

  const target = toInt(newTarget.value);
  const current = toInt(newCurrent.value);
  const minQty = toInt(newMin.value);

  if (!Number.isFinite(target) || target < 0) { setHint(newHint, "Soll ist Pflicht und muss >= 0 sein."); return; }
  if (!Number.isFinite(current) || current < 0) { setHint(newHint, "Ist ist Pflicht und muss >= 0 sein."); return; }
  if (!Number.isFinite(minQty) || minQty < 0) { setHint(newHint, "Mindestbestand muss >= 0 sein."); return; }

  const unit = normalizeText(newUnitName.value) || "Stück";
  const packName = normalizeText(newPackName.value) || null;
  const packSizeRaw = toInt(newPackSize.value);
  const packSize = (packName && Number.isFinite(packSizeRaw) && packSizeRaw > 0) ? packSizeRaw : null;

  setHint(newHint, "Speichere …");

  const { data: exists, error: exErr } = await supabase
    .from("items")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (exErr) { setHint(newHint, exErr.message); return; }
  if (exists) { setHint(newHint, "Diese ID existiert bereits."); return; }

  const payload = {
    id,
    name,
    category,
    location,
    unit_name: unit,
    target_qty: target,
    min_qty: minQty,
    current_qty: current,
    pack_name: packName,
    pack_size: packSize,
    deleted_at: null,
    last_actor: actor,
    last_change_at: nowIso()
  };

  const { data: inserted, error } = await supabase
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
    snapshot_min: inserted.min_qty,
    note: "Artikel angelegt"
  });

  setHint(newHint, "Artikel angelegt ✓");
  newItemDialog.close();
  await loadItems();
  setRoute(`#/item/${encodeURIComponent(inserted.id)}`);
}

// Detail
async function openDetail(id) {
  setStatus("Lade Artikel …");
  showSection("detail");
  showMessage(homeMessage, null);

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    setStatus("Artikel nicht gefunden");
    currentItem = null;
    return;
  }
  currentItem = data;

  renderDetail();
  await loadDetailLogs();
  setStatus("Bereit");
}

function renderDetail() {
  const item = currentItem;
  if (!item) return;

  detailId.textContent = item.id;
  detailName.value = item.name || "";
  detailCategory.value = item.category || "";
  detailLocation.value = item.location || "";
  detailTarget.value = item.target_qty ?? 0;
  detailMin.value = item.min_qty ?? 0;
  detailUnit.value = item.unit_name || "Stück";

  detailPackName.value = item.pack_name || "";
  detailPackSize.value = item.pack_size || "";

  detailCurrent.textContent = String(item.current_qty ?? 0);

  detailActor.value = ""; // niemals automatisch

  const b = badgeFor(item);
  const pack = packText(item);
  detailMetaLine.textContent =
    `Status: ${b.text}  |  ${pack ? "Anzeige: " + pack + "  |  " : ""}Zuletzt: ${item.last_actor || "-"}, ${formatDate(item.last_change_at || item.updated_at)}`;

  const url = `${window.location.origin}${window.location.pathname}#/item/${encodeURIComponent(item.id)}`;
  qrLink.textContent = url;

  if (item.image_path) {
    detailNoImage.classList.add("hidden");
    detailImage.classList.remove("hidden");
    detailImage.src = getPublicImageUrl(item.image_path);
  } else {
    detailNoImage.classList.remove("hidden");
    detailImage.classList.add("hidden");
    detailImage.src = "";
  }

  // Pack buttons
  if (item.pack_name && item.pack_size && item.pack_size > 0) {
    btnPackMinus.classList.remove("hidden");
    btnPackPlus.classList.remove("hidden");
    btnPackMinus.textContent = `-1 ${item.pack_name} (-${item.pack_size})`;
    btnPackPlus.textContent = `+1 ${item.pack_name} (+${item.pack_size})`;
  } else {
    btnPackMinus.classList.add("hidden");
    btnPackPlus.classList.add("hidden");
  }
}

// Quantity buttons
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-delta]");
  if (!btn) return;
  if (!currentItem) return;

  const delta = toInt(btn.getAttribute("data-delta"));
  if (!Number.isFinite(delta)) return;

  await adjustQty(delta);
});

btnPackMinus.addEventListener("click", async () => {
  if (!currentItem?.pack_size) return;
  await adjustQty(-currentItem.pack_size);
});
btnPackPlus.addEventListener("click", async () => {
  if (!currentItem?.pack_size) return;
  await adjustQty(currentItem.pack_size);
});

async function requireActor() {
  const actor = normalizeText(detailActor.value);
  if (actor.length < 2) {
    setStatus("Bitte Namen für Änderung eintragen");
    return "";
  }
  return actor;
}

async function adjustQty(delta) {
  const ok = await ensurePin();
  if (!ok) { setStatus("PIN abgebrochen"); return; }

  const actor = await requireActor();
  if (!actor) return;

  const prev = currentItem.current_qty ?? 0;
  const next = Math.max(0, prev + delta);

  const { data: updated, error } = await supabase
    .from("items")
    .update({
      current_qty: next,
      last_actor: actor,
      last_change_at: nowIso(),
      deleted_at: null
    })
    .eq("id", currentItem.id)
    .select("*")
    .single();

  if (error) { setStatus(`Fehler: ${error.message}`); return; }

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
    snapshot_min: updated.min_qty,
    note: delta >= 0 ? "Bestand erhöht" : "Bestand reduziert"
  });

  currentItem = updated;
  renderDetail();
  await loadDetailLogs();
  await loadItems();
  setStatus("Gespeichert");
}

// Save meta
btnSaveMeta.addEventListener("click", async () => {
  if (!currentItem) return;

  const ok = await ensurePin();
  if (!ok) { setStatus("PIN abgebrochen"); return; }

  const actor = await requireActor();
  if (!actor) return;

  const name = normalizeText(detailName.value);
  const category = normalizeCategory(detailCategory.value);
  const location = normalizeText(detailLocation.value);
  const target = toInt(detailTarget.value);
  const minQty = toInt(detailMin.value);
  const unit = normalizeText(detailUnit.value) || "Stück";

  if (!name || !category || !location) {
    setStatus("Pflichtfelder fehlen: Name, Kategorie, Standort");
    return;
  }
  if (!Number.isFinite(target) || target < 0) { setStatus("Soll muss >= 0 sein"); return; }
  if (!Number.isFinite(minQty) || minQty < 0) { setStatus("Mindestbestand muss >= 0 sein"); return; }

  const pn = normalizeText(detailPackName.value) || null;
  const psRaw = toInt(detailPackSize.value);
  const ps = (pn && Number.isFinite(psRaw) && psRaw > 0) ? psRaw : null;

  const { data: updated, error } = await supabase
    .from("items")
    .update({
      name,
      category,
      location,
      target_qty: target,
      min_qty: minQty,
      unit_name: unit,
      pack_name: pn,
      pack_size: ps,
      last_actor: actor,
      last_change_at: nowIso(),
      deleted_at: null
    })
    .eq("id", currentItem.id)
    .select("*")
    .single();

  if (error) { setStatus(`Fehler: ${error.message}`); return; }

  await supabase.from("logs").insert({
    item_id: currentItem.id,
    actor,
    action: "update",
    delta: 0,
    prev_qty: updated.current_qty,
    new_qty: updated.current_qty,
    snapshot_name: updated.name,
    snapshot_category: updated.category,
    snapshot_location: updated.location,
    snapshot_target: updated.target_qty,
    snapshot_min: updated.min_qty,
    note: "Stammdaten gespeichert"
  });

  currentItem = updated;
  renderDetail();
  await loadDetailLogs();
  await loadItems();
  setStatus("Stammdaten gespeichert");
});

// Upload image
btnTakePhoto.addEventListener("click", () => cameraInput.click());
btnPickFile.addEventListener("click", () => fileInput.click());

cameraInput.addEventListener("change", async () => {
  if (cameraInput.files?.[0]) await uploadImage(cameraInput.files[0]);
  cameraInput.value = "";
});
fileInput.addEventListener("change", async () => {
  if (fileInput.files?.[0]) await uploadImage(fileInput.files[0]);
  fileInput.value = "";
});

async function uploadImage(file) {
  if (!currentItem) return;

  const ok = await ensurePin();
  if (!ok) { setStatus("PIN abgebrochen"); return; }

  const actor = await requireActor();
  if (!actor) return;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `items/${currentItem.id}/${Date.now()}.${ext}`;

  setStatus("Bild wird hochgeladen …");

  const up = await supabase.storage
    .from("images")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (up.error) {
    setStatus(`Upload Fehler: ${up.error.message}`);
    return;
  }

  const { data: updated, error } = await supabase
    .from("items")
    .update({
      image_path: path,
      last_actor: actor,
      last_change_at: nowIso(),
      deleted_at: null
    })
    .eq("id", currentItem.id)
    .select("*")
    .single();

  if (error) { setStatus(`DB Fehler: ${error.message}`); return; }

  await supabase.from("logs").insert({
    item_id: currentItem.id,
    actor,
    action: "upload_image",
    note: "Bild hochgeladen",
    snapshot_name: updated.name,
    snapshot_category: updated.category,
    snapshot_location: updated.location,
    snapshot_target: updated.target_qty,
    snapshot_min: updated.min_qty
  });

  currentItem = updated;
  renderDetail();
  await loadDetailLogs();
  await loadItems();
  setStatus("Bild gespeichert");
}

// Soft delete
btnSoftDelete.addEventListener("click", async () => {
  if (!currentItem) return;

  const ok = await ensurePin();
  if (!ok) { setStatus("PIN abgebrochen"); return; }

  const actor = await requireActor();
  if (!actor) return;

  const yes = await confirmAsk("Löschen", "Artikel in den Papierkorb verschieben?");
  if (!yes) return;

  const { data: updated, error } = await supabase
    .from("items")
    .update({
      deleted_at: nowIso(),
      last_actor: actor,
      last_change_at: nowIso()
    })
    .eq("id", currentItem.id)
    .select("*")
    .single();

  if (error) { setStatus(`Fehler: ${error.message}`); return; }

  await supabase.from("logs").insert({
    item_id: currentItem.id,
    actor,
    action: "soft_delete",
    note: "In Papierkorb verschoben",
    snapshot_name: updated.name,
    snapshot_category: updated.category,
    snapshot_location: updated.location,
    snapshot_target: updated.target_qty,
    snapshot_min: updated.min_qty
  });

  setStatus("In Papierkorb verschoben");
  currentItem = null;
  await loadItems();
  setRoute("#/");
});

// Restore + Hard delete
async function restoreItem(id) {
  const ok = await ensurePin();
  if (!ok) { setStatus("PIN abgebrochen"); return; }

  const actor = prompt("Wer stellt wieder her? (Pflicht)");
  if (!actor || actor.trim().length < 2) { setStatus("Name fehlt"); return; }

  const { data: updated, error } = await supabase
    .from("items")
    .update({
      deleted_at: null,
      last_actor: actor.trim(),
      last_change_at: nowIso()
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) { setStatus(`Fehler: ${error.message}`); return; }

  await supabase.from("logs").insert({
    item_id: id,
    actor: actor.trim(),
    action: "restore",
    note: "Wiederhergestellt",
    snapshot_name: updated.name,
    snapshot_category: updated.category,
    snapshot_location: updated.location,
    snapshot_target: updated.target_qty,
    snapshot_min: updated.min_qty
  });

  await loadTrash();
  await loadItems();
  setStatus("Wiederhergestellt");
}

async function hardDeleteItem(id) {
  const ok = await ensurePin();
  if (!ok) { setStatus("PIN abgebrochen"); return; }

  const actor = prompt("Wer löscht endgültig? (Pflicht)");
  if (!actor || actor.trim().length < 2) { setStatus("Name fehlt"); return; }

  const yes = await confirmAsk("Endgültig löschen", "Das kann nicht rückgängig gemacht werden. Fortfahren?");
  if (!yes) return;

  const { data: item } = await supabase.from("items").select("*").eq("id", id).maybeSingle();

  if (item?.image_path) {
    await supabase.storage.from("images").remove([item.image_path]);
  }

  const del = await supabase.from("items").delete().eq("id", id);
  if (del.error) { setStatus(`Fehler: ${del.error.message}`); return; }

  await supabase.from("logs").insert({
    item_id: id,
    actor: actor.trim(),
    action: "hard_delete",
    note: "Endgültig gelöscht"
  });

  await loadTrash();
  await loadItems();
  setStatus("Endgültig gelöscht");
}

async function loadDetailLogs() {
  if (!currentItem) return;

  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .eq("item_id", currentItem.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    detailLogs.innerHTML = "";
    return;
  }

  const logs = data || [];
  detailLogs.innerHTML = "";

  for (const l of logs) {
    const row = document.createElement("div");
    row.className = "logRow";

    const top = document.createElement("div");
    top.className = "logRowTop";

    const main = document.createElement("div");
    main.className = "logRowMain";

    const when = document.createElement("div");
    when.className = "logRowMain";
    when.style.fontWeight = "700";
    when.style.color = "#64748b";

    let txt = l.action;
    if (l.action === "adjust") {
      const sign = (l.delta || 0) >= 0 ? "+" : "";
      txt = `Bestand ${sign}${l.delta}  (${l.prev_qty} → ${l.new_qty})`;
    }
    if (l.action === "create") txt = "Artikel angelegt";
    if (l.action === "update") txt = "Stammdaten gespeichert";
    if (l.action === "upload_image") txt = "Bild hochgeladen";
    if (l.action === "soft_delete") txt = "In Papierkorb verschoben";
    if (l.action === "restore") txt = "Wiederhergestellt";
    if (l.action === "hard_delete") txt = "Endgültig gelöscht";

    main.textContent = txt;
    when.textContent = formatDate(l.created_at);

    top.appendChild(main);
    top.appendChild(when);

    const sub = document.createElement("div");
    sub.className = "logRowSub";
    sub.textContent = `von ${l.actor}${l.note ? "  |  " + l.note : ""}`;

    row.appendChild(top);
    row.appendChild(sub);

    detailLogs.appendChild(row);
  }
}

// Boot
(async function init() {
  setStatus("Starte …");
  await refreshCategoryFilter();
  await handleRoute();
  setStatus("Bereit");
})();

