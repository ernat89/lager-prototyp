// 1) HIER EINTRAGEN:
const SUPABASE_URL = "https://fiwatlffqgevxvmrsmvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd2F0bGZmcWdldnh2bXJzbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODY1MDYsImV4cCI6MjA4MTI2MjUwNn0.5jQBokoo25GFMBWgluBLN5Yy_NitrvYas8Pyxsj8AZA";
const EDIT_PIN = "4711";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Views
const homeView = document.getElementById("homeView");
const detailView = document.getElementById("detailView");
const pageTitle = document.getElementById("pageTitle");

// Home UI
const itemsGrid = document.getElementById("itemsGrid");
const emptyHint = document.getElementById("emptyHint");
const searchInput = document.getElementById("searchInput");
const newItemBtn = document.getElementById("newItemBtn");
const goHomeBtn = document.getElementById("goHomeBtn");

// Detail UI
const backBtn = document.getElementById("backBtn");
const detailId = document.getElementById("detailId");
const detailImg = document.getElementById("detailImg");
const detailImgPlaceholder = document.getElementById("detailImgPlaceholder");
const imageFile = document.getElementById("imageFile");
const nameInput = document.getElementById("nameInput");
const targetInput = document.getElementById("targetInput");
const currentQtyText = document.getElementById("currentQtyText");
const actorInput = document.getElementById("actorInput");
const statusPill = document.getElementById("statusPill");
const metaLine = document.getElementById("metaLine");
const logsList = document.getElementById("logsList");
const hint = document.getElementById("hint");
const saveMetaBtn = document.getElementById("saveMetaBtn");
const qrLink = document.getElementById("qrLink");

// New item dialog
const newItemDialog = document.getElementById("newItemDialog");
const newId = document.getElementById("newId");
const newName = document.getElementById("newName");
const newTarget = document.getElementById("newTarget");
const newCurrent = document.getElementById("newCurrent");
const newHint = document.getElementById("newHint");
const createBtn = document.getElementById("createBtn");

// PIN dialog
const pinDialog = document.getElementById("pinDialog");
const pinDialogInput = document.getElementById("pinDialogInput");
const pinOkBtn = document.getElementById("pinOkBtn");
const pinHint = document.getElementById("pinHint");

let allItems = [];
let currentItem = null;

const PIN_STORAGE_KEY = "lager_edit_pin_ok";

function setHint(el, msg) { el.textContent = msg || ""; }

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return iso; }
}

function statusFrom(target, current) {
  if (current <= 0) return { label: "LEER", color: "var(--bad)" };
  if (current < target) return { label: "ZU WENIG", color: "var(--warn)" };
  return { label: "OK", color: "var(--ok)" };
}

function showHome() {
  homeView.style.display = "block";
  detailView.style.display = "none";
  pageTitle.textContent = "Übersicht";
}

function showDetail() {
  homeView.style.display = "none";
  detailView.style.display = "block";
}

function setRoute(hash) { window.location.hash = hash; }
function getRoute() { return window.location.hash || "#/"; }

// PIN nur bei Schreibaktionen
async function ensurePin() {
  const ok = localStorage.getItem(PIN_STORAGE_KEY) === "1";
  if (ok) return true;

  pinDialogInput.value = "";
  setHint(pinHint, "");
  pinDialog.showModal();

  return await new Promise((resolve) => {
    const onOk = (e) => {
      e.preventDefault();
      const p = (pinDialogInput.value || "").trim();
      if (p !== EDIT_PIN) {
        setHint(pinHint, "Falsche PIN.");
        return;
      }
      localStorage.setItem(PIN_STORAGE_KEY, "1");
      pinDialog.close();
      cleanup();
      resolve(true);
    };

    const onClose = () => {
      cleanup();
      resolve(localStorage.getItem(PIN_STORAGE_KEY) === "1");
    };

    function cleanup() {
      pinOkBtn.removeEventListener("click", onOk);
      pinDialog.removeEventListener("close", onClose);
    }

    pinOkBtn.addEventListener("click", onOk);
    pinDialog.addEventListener("close", onClose);
  });
}

async function loadItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    itemsGrid.innerHTML = `<div class="muted">Fehler: ${escapeHtml(error.message)}</div>`;
    return;
  }

  allItems = data || [];
  renderItems();
}

function renderItems() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const items = allItems.filter(it => {
    if (!q) return true;
    return (it.name || "").toLowerCase().includes(q) || (it.id || "").toLowerCase().includes(q);
  });

  itemsGrid.innerHTML = "";
  emptyHint.style.display = items.length === 0 ? "block" : "none";

  for (const it of items) {
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
    const last = it.last_actor ? `${it.last_actor}, ` : "";
    sub.textContent = `Zuletzt: ${last}${fmtDate(it.updated_at)}`;

    main.appendChild(name);
    main.appendChild(meta);
    main.appendChild(sub);

    card.appendChild(thumb);
    card.appendChild(main);
    itemsGrid.appendChild(card);
  }
}

async function loadItem(id) {
  setHint(hint, "");

  const { data: item, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    setHint(hint, `Item nicht gefunden: ${error.message}`);
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
  targetInput.value = item.target_qty ?? 0;
  currentQtyText.textContent = item.current_qty ?? 0;

  const st = statusFrom(item.target_qty, item.current_qty);
  statusPill.textContent = st.label;
  statusPill.style.borderColor = st.color;
  statusPill.style.color = st.color;

  const created = fmtDate(item.created_at);
  const updated = fmtDate(item.updated_at);
  const lastActor = item.last_actor ? ` von ${item.last_actor}` : "";
  metaLine.textContent = `Angelegt: ${created} | Letzte Änderung: ${updated}${lastActor}`;

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
}

async function loadLogs(itemId) {
  const { data, error } = await supabase
    .from("logs")
    .select("actor, delta, created_at")
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
        <div><strong>${escapeHtml(l.actor)}</strong></div>
        <div class="muted small">${fmtDate(l.created_at)}</div>
      </div>
      <div style="font-weight:1000;white-space:nowrap;">${escapeHtml(delta)}</div>
    `;
    logsList.appendChild(row);
  }
}

async function adjust(delta) {
  setHint(hint, "");

  const ok = await ensurePin();
  if (!ok) return;

  const actor = (actorInput.value || "").trim();
  if (actor.length < 2) {
    setHint(hint, "Bitte 'Wer war das?' ausfüllen (mind. 2 Zeichen).");
    actorInput.focus();
    return;
  }

  if (!currentItem) return;

  const newQty = Math.max(0, (currentItem.current_qty ?? 0) + delta);

  const { error: upErr } = await supabase
    .from("items")
    .update({ current_qty: newQty, last_actor: actor })
    .eq("id", currentItem.id);

  if (upErr) { setHint(hint, `Fehler: ${upErr.message}`); return; }

  const { error: logErr } = await supabase
    .from("logs")
    .insert({ item_id: currentItem.id, actor, delta });

  if (logErr) { setHint(hint, `Log-Fehler: ${logErr.message}`); return; }

  await loadItem(currentItem.id);
  setHint(hint, "Gespeichert.");
  setTimeout(() => setHint(hint, ""), 1200);
}

async function saveMeta() {
  setHint(hint, "");

  const ok = await ensurePin();
  if (!ok) return;

  const actor = (actorInput.value || "").trim();
  if (actor.length < 2) {
    setHint(hint, "Bitte 'Wer war das?' ausfüllen, damit klar ist, wer geändert hat.");
    actorInput.focus();
    return;
  }

  if (!currentItem) return;

  const name = (nameInput.value || "").trim().slice(0, 80);
  const target = parseInt(targetInput.value, 10);
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0;

  const { error } = await supabase
    .from("items")
    .update({ name: name || currentItem.name, target_qty: safeTarget, last_actor: actor })
    .eq("id", currentItem.id);

  if (error) { setHint(hint, `Fehler: ${error.message}`); return; }

  await loadItem(currentItem.id);
  setHint(hint, "Stammdaten gespeichert.");
  setTimeout(() => setHint(hint, ""), 1200);
}

async function uploadImage(file) {
  setHint(hint, "");

  const ok = await ensurePin();
  if (!ok) return;

  const actor = (actorInput.value || "").trim();
  if (actor.length < 2) {
    setHint(hint, "Bitte 'Wer war das?' ausfüllen.");
    actorInput.focus();
    return;
  }

  if (!currentItem || !file) return;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg","jpeg","png","webp"].includes(ext) ? ext : "jpg";
  const filePath = `${currentItem.id}/${Date.now()}.${safeExt}`;

  const { error: upErr } = await supabase.storage
    .from("images")
    .upload(filePath, file, { upsert: true });

  if (upErr) {
    setHint(hint, `Upload-Fehler: ${upErr.message}`);
    return;
  }

  const { data } = supabase.storage.from("images").getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  const { error: dbErr } = await supabase
    .from("items")
    .update({ image_url: publicUrl, last_actor: actor })
    .eq("id", currentItem.id);

  if (dbErr) { setHint(hint, `DB-Fehler: ${dbErr.message}`); return; }

  await loadItem(currentItem.id);
  setHint(hint, "Bild aktualisiert.");
  setTimeout(() => setHint(hint, ""), 1200);
}

function normalizeId(raw) {
  const s = (raw || "").trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z0-9_-]+$/.test(s)) return null;
  return s;
}

async function createItem() {
  setHint(newHint, "");

  const ok = await ensurePin();
  if (!ok) return;

  const id = normalizeId(newId.value);
  if (!id) { setHint(newHint, "Ungültige ID. Erlaubt: a-z 0-9 _ -"); return; }

  const name = (newName.value || "").trim().slice(0,80) || id;
  const t = parseInt(newTarget.value, 10);
  const c = parseInt(newCurrent.value, 10);

  const target_qty = Number.isFinite(t) ? Math.max(0, t) : 0;
  const current_qty = Number.isFinite(c) ? Math.max(0, c) : 0;

  const { error } = await supabase.from("items").insert({ id, name, target_qty, current_qty });
  if (error) { setHint(newHint, `Fehler: ${error.message}`); return; }

  newItemDialog.close();
  newId.value = "";
  newName.value = "";
  newTarget.value = "10";
  newCurrent.value = "0";

  await loadItems();
  setRoute(`#/item/${encodeURIComponent(id)}`);
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

// Events
searchInput.addEventListener("input", renderItems);

newItemBtn.addEventListener("click", async () => {
  setHint(newHint, "");
  const ok = await ensurePin();
  if (!ok) return;
  newItemDialog.showModal();
});

createBtn.addEventListener("click", (e) => { e.preventDefault(); createItem(); });

goHomeBtn.addEventListener("click", () => setRoute("#/"));
backBtn.addEventListener("click", () => setRoute("#/"));

saveMetaBtn.addEventListener("click", (e) => { e.preventDefault(); saveMeta(); });

document.querySelectorAll("[data-delta]").forEach(btn => {
  btn.addEventListener("click", () => {
    const d = parseInt(btn.getAttribute("data-delta"), 10);
    adjust(d);
  });
});

imageFile.addEventListener("change", () => {
  const f = imageFile.files?.[0];
  if (f) uploadImage(f);
});

window.addEventListener("hashchange", handleRoute);
handleRoute();

