const STORAGE_KEY = "dilucca-management-v1";
const INVOICE_LOGO_PATH = "assets/di-lucca-logo-pdf.png";
const FIREBASE_SDK_VERSION = "12.14.0";
const FIREBASE_COLLECTIONS = ["supplies", "wood", "furniture", "invoices"];

const sampleData = {
  supplies: [
    {
      id: "supply-1",
      name: "Tornillos 4x40",
      category: "Herrajes",
      packQty: 100,
      unit: "UN",
      packPrice: 6200,
      stock: 4,
      supplier: "Bulonera Centro",
      createdAt: "2026-05-20T10:00:00.000Z",
    },
    {
      id: "supply-2",
      name: "Bisagra codo 35 mm",
      category: "Herrajes",
      packQty: 20,
      unit: "UN",
      packPrice: 18400,
      stock: 2,
      supplier: "Distribuidora Norte",
      createdAt: "2026-05-21T10:00:00.000Z",
    },
    {
      id: "supply-3",
      name: "Canto PVC blanco 22 mm",
      category: "Terminacion",
      packQty: 50,
      unit: "M",
      packPrice: 29500,
      stock: 1,
      supplier: "Tapacantos Sur",
      createdAt: "2026-05-22T10:00:00.000Z",
    },
  ],
  wood: [
    {
      id: "wood-1",
      type: "Melamina",
      thickness: 18,
      color: "Blanco seda",
      supplier: "Maderera Centro",
      area: 16.4,
      price: 124000,
      used: 4.1,
      createdAt: "2026-05-20T11:00:00.000Z",
    },
    {
      id: "wood-2",
      type: "MDF",
      thickness: 15,
      color: "Natural",
      supplier: "Proveedor Norte",
      area: 10.2,
      price: 71200,
      used: 2,
      createdAt: "2026-05-21T11:00:00.000Z",
    },
  ],
  furniture: [
    {
      id: "furniture-1",
      name: "Bajo mesada",
      notes: "Ejemplo con insumos y melamina",
      supplies: [
        { supplyId: "supply-1", qty: 40 },
        { supplyId: "supply-2", qty: 6 },
        { supplyId: "supply-3", qty: 8 },
      ],
      wood: [{ woodId: "wood-1", qty: 3.4 }],
      createdAt: "2026-05-22T12:00:00.000Z",
    },
  ],
  invoices: [
    {
      id: "invoice-1",
      furnitureId: "furniture-1",
      client: "Cliente ejemplo",
      phone: "Sin telefono",
      date: "2026-06-01",
      price: 185000,
      shippingRequired: true,
      shippingPrice: 12000,
      location: "Rosario centro",
      payment: "Transferencia",
      notes: "Entrega coordinada",
      createdAt: "2026-06-01T12:00:00.000Z",
    },
  ],
};

const state = loadState();
let furnitureDraft = createFurnitureDraft();
let modalConfirmAction = null;
let currentFurniturePhoto = "";
let storageWarningShown = false;
let cloudSaveTimer = null;

const cloudSync = {
  enabled: false,
  ready: false,
  saving: false,
  db: null,
  refs: {},
  snapshots: {},
  modules: {},
  businessId: "",
};

const formatCurrency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

const formatNumber = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
});

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  sidebar: $(".sidebar"),
  menuToggle: $("#menu-toggle"),
  syncStatus: $("#sync-status"),
  views: $$(".view"),
  tabs: $$(".nav-tab"),
  supplies: {
    form: $("#supply-form"),
    id: $("#supply-id"),
    name: $("#supply-name"),
    category: $("#supply-category"),
    packQty: $("#supply-pack-qty"),
    unit: $("#supply-unit"),
    packPrice: $("#supply-pack-price"),
    stock: $("#supply-stock"),
    supplier: $("#supply-supplier"),
    submit: $("#supply-submit"),
    cancel: $("#supply-cancel"),
    search: $("#supply-search"),
    table: $("#supply-table"),
    count: $("#supply-count-label"),
    clear: $("#clear-supplies"),
  },
  wood: {
    form: $("#wood-form"),
    id: $("#wood-id"),
    type: $("#wood-type"),
    thickness: $("#wood-thickness"),
    color: $("#wood-color"),
    supplier: $("#wood-supplier"),
    area: $("#wood-area"),
    price: $("#wood-price"),
    used: $("#wood-used"),
    submit: $("#wood-submit"),
    cancel: $("#wood-cancel"),
    search: $("#wood-search"),
    table: $("#wood-table"),
    count: $("#wood-count-label"),
    clear: $("#clear-wood"),
  },
  furniture: {
    form: $("#furniture-form"),
    builder: $("#furniture-builder"),
    showForm: $("#show-furniture-form"),
    id: $("#furniture-id"),
    name: $("#furniture-name"),
    notes: $("#furniture-notes"),
    photo: $("#furniture-photo"),
    photoPreview: $("#furniture-photo-preview"),
    photoImage: $("#furniture-photo-image"),
    removePhoto: $("#remove-furniture-photo"),
    submit: $("#furniture-submit"),
    cancel: $("#furniture-cancel"),
    search: $("#furniture-search"),
    table: $("#furniture-table"),
    count: $("#furniture-count-label"),
    clear: $("#clear-furniture"),
    addSupply: $("#add-furniture-supply"),
    addWood: $("#add-furniture-wood"),
    supplyLines: $("#furniture-supply-lines"),
    woodLines: $("#furniture-wood-lines"),
    total: $("#furniture-total"),
    totalDetail: $("#furniture-total-detail"),
  },
  invoices: {
    form: $("#invoice-form"),
    builder: $("#invoice-builder"),
    showForm: $("#show-invoice-form"),
    id: $("#invoice-id"),
    furniture: $("#invoice-furniture"),
    client: $("#invoice-client"),
    phone: $("#invoice-phone"),
    date: $("#invoice-date"),
    price: $("#invoice-price"),
    shippingRequired: $("#invoice-shipping-required"),
    shippingPrice: $("#invoice-shipping-price"),
    location: $("#invoice-location"),
    payment: $("#invoice-payment"),
    notes: $("#invoice-notes"),
    submit: $("#invoice-submit"),
    cancel: $("#invoice-cancel"),
    search: $("#invoice-search"),
    table: $("#invoice-table"),
    count: $("#invoice-count-label"),
    clear: $("#clear-invoices"),
    cost: $("#invoice-cost"),
    total: $("#invoice-total"),
    profit: $("#invoice-profit"),
    shippingLabel: $("#invoice-shipping-label"),
    shippingLocation: $("#invoice-shipping-location"),
  },
  metrics: {
    suppliesCount: $("#metric-supplies-count"),
    suppliesValue: $("#metric-supplies-value"),
    woodArea: $("#metric-wood-area"),
    woodValue: $("#metric-wood-value"),
    averageUnit: $("#metric-average-unit"),
    thicknessCount: $("#metric-thickness-count"),
    latestSupplies: $("#latest-supplies"),
    woodByThickness: $("#wood-by-thickness"),
  },
  modal: {
    root: $("#app-modal"),
    eyebrow: $("#modal-eyebrow"),
    title: $("#modal-title"),
    body: $("#modal-body"),
    actions: $("#modal-actions"),
    close: $("#modal-close"),
    cancel: $("#modal-cancel"),
    confirm: $("#modal-confirm"),
  },
};

function emptyState() {
  return { supplies: [], wood: [], furniture: [], invoices: [] };
}

function normalizeState(source = emptyState()) {
  return {
    supplies: Array.isArray(source.supplies) ? source.supplies : [],
    wood: Array.isArray(source.wood) ? source.wood : [],
    furniture: Array.isArray(source.furniture) ? source.furniture : [],
    invoices: Array.isArray(source.invoices) ? source.invoices : [],
  };
}

function replaceState(nextState) {
  const normalized = normalizeState(nextState);
  FIREBASE_COLLECTIONS.forEach((collectionName) => {
    state[collectionName] = normalized[collectionName];
  });
}

function hasStateData(source = state) {
  return FIREBASE_COLLECTIONS.some((collectionName) => source[collectionName]?.length);
}

function loadState() {
  const fallback = emptyState();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : fallback;
    return normalizeState(parsed);
  } catch {
    return fallback;
  }
}

function showStorageWarning(message) {
  if (storageWarningShown) return;
  storageWarningShown = true;
  setTimeout(() => alert(message), 0);
}

function updateSyncStatus(message, status = "local") {
  if (!elements.syncStatus) return;
  elements.syncStatus.textContent = message;
  elements.syncStatus.dataset.status = status;
}

function stateWithoutPhotos(source) {
  return {
    ...source,
    furniture: source.furniture.map((item) => ({
      ...item,
      photo: "",
    })),
  };
}

function persistLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    const lighterState = stateWithoutPhotos(state);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lighterState));
      state.furniture = lighterState.furniture;
      currentFurniturePhoto = "";
      showStorageWarning(
        "El navegador no tenia espacio para guardar las fotos. Guarde los datos sin fotos para no perder insumos, madera, muebles y facturas.",
      );
      return true;
    } catch {
      showStorageWarning(
        "No se pudo guardar en este navegador. Para usarlo desde PC y celular hace falta conectar una base de datos online.",
      );
      return false;
    }
  }
}

function saveState() {
  persistLocalState();
  scheduleCloudSave();
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createFurnitureDraft() {
  return {
    supplies: [{ supplyId: "", qty: 0 }],
    wood: [{ woodId: "", qty: 0 }],
  };
}

function normalizeFurnitureDraft(draft) {
  return {
    supplies: draft.supplies?.length ? draft.supplies : [{ supplyId: "", qty: 0 }],
    wood: draft.wood?.length ? draft.wood : [{ woodId: "", qty: 0 }],
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function readNumber(input, fallback = 0) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function supplyUnitPrice(item) {
  return item.packQty > 0 ? item.packPrice / item.packQty : 0;
}

function supplyUnit(item) {
  return cleanText(item.unit || "UN").toUpperCase();
}

function supplyStockValue(item) {
  return item.packPrice * item.stock;
}

function woodUsefulM2Cost(item) {
  return item.used > 0 ? item.price / item.used : 0;
}

function woodWaste(item) {
  return Math.max(item.area - item.used, 0);
}

function woodUsedCost(item) {
  return item.used > 0 ? item.price : 0;
}

function furnitureSupplyLineCost(line) {
  const item = state.supplies.find((entry) => entry.id === line.supplyId);
  return item ? Number(line.qty || 0) * supplyUnitPrice(item) : 0;
}

function furnitureWoodLineCost(line) {
  const item = state.wood.find((entry) => entry.id === line.woodId);
  return item ? Number(line.qty || 0) * woodUsefulM2Cost(item) : 0;
}

function furnitureSupplyTotal(item) {
  return (item.supplies || []).reduce((sum, line) => sum + furnitureSupplyLineCost(line), 0);
}

function furnitureWoodTotal(item) {
  return (item.wood || []).reduce((sum, line) => sum + furnitureWoodLineCost(line), 0);
}

function furnitureTotal(item) {
  return furnitureSupplyTotal(item) + furnitureWoodTotal(item);
}

function supplyLabelById(id) {
  const item = state.supplies.find((entry) => entry.id === id);
  return item ? `${item.name} (${supplyUnit(item)})` : "Insumo eliminado";
}

function woodLabelById(id) {
  const item = state.wood.find((entry) => entry.id === id);
  return item ? `${item.type} ${item.thickness} mm ${item.color}` : "Madera eliminada";
}

function furnitureInitials(name) {
  return cleanText(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] || "")
    .join("")
    .toUpperCase() || "M";
}

function furnitureById(id) {
  return state.furniture.find((item) => item.id === id);
}

function furnitureNameById(id) {
  return furnitureById(id)?.name || "Mueble eliminado";
}

function invoiceFurnitureCost(invoice) {
  const furniture = furnitureById(invoice.furnitureId);
  return furniture ? furnitureTotal(furniture) : 0;
}

function invoiceShippingCost(invoice) {
  return invoice.shippingRequired ? Number(invoice.shippingPrice || 0) : 0;
}

function invoiceTotal(invoice) {
  return Number(invoice.price || 0) + invoiceShippingCost(invoice);
}

function invoiceProfit(invoice) {
  return Number(invoice.price || 0) - invoiceFurnitureCost(invoice);
}

function invoiceNumber(invoice) {
  const digits = cleanText(invoice.id).match(/\d+/g)?.join("").slice(-6);
  if (digits) return `DL-${digits.padStart(6, "0")}`;
  const fallback = cleanText(invoice.id).replace(/[^a-z0-9]/gi, "").toUpperCase().slice(-6);
  return `DL-${fallback || "000001"}`;
}

function formatInvoiceDate(value) {
  const [year, month, day] = cleanText(value).split("-");
  if (year && month && day) return `${day}/${month}/${year}`;
  return cleanText(value) || "-";
}

function todayValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setActiveView(viewId) {
  elements.tabs.forEach((tab) => {
    const isActive = tab.dataset.view === viewId;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-current", isActive ? "page" : "false");
  });

  elements.views.forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });
}

function closeMobileMenu() {
  elements.sidebar.classList.remove("menu-open");
  elements.menuToggle.setAttribute("aria-expanded", "false");
  elements.menuToggle.setAttribute("aria-label", "Abrir menu");
}

function toggleMobileMenu() {
  const isOpen = elements.sidebar.classList.toggle("menu-open");
  elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
  elements.menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menu" : "Abrir menu");
}

function matchesSupplySearch(item) {
  const query = elements.supplies.search.value.trim().toLowerCase();
  if (!query) return true;
  return [item.name, item.category, item.supplier, supplyUnit(item)].some((value) =>
    String(value || "").toLowerCase().includes(query),
  );
}

function matchesWoodSearch(item) {
  const query = elements.wood.search.value.trim().toLowerCase();
  if (!query) return true;
  return [item.type, item.color, item.supplier, item.thickness].some((value) =>
    String(value || "").toLowerCase().includes(query),
  );
}

function matchesFurnitureSearch(item) {
  const query = elements.furniture.search.value.trim().toLowerCase();
  if (!query) return true;
  return [item.name, item.notes].some((value) => String(value || "").toLowerCase().includes(query));
}

function matchesInvoiceSearch(item) {
  const query = elements.invoices.search.value.trim().toLowerCase();
  if (!query) return true;
  return [item.client, item.phone, item.location, item.payment, item.notes, furnitureNameById(item.furnitureId)].some(
    (value) => String(value || "").toLowerCase().includes(query),
  );
}

function renderSupplies() {
  const rows = state.supplies.filter(matchesSupplySearch);
  elements.supplies.table.innerHTML = "";
  elements.supplies.count.textContent = `${rows.length} items`;

  if (!rows.length) {
    elements.supplies.table.appendChild(emptyRow(8));
    return;
  }

  rows.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(item.name)}</strong>
        <div class="muted-cell">${escapeHtml(item.supplier || "Sin proveedor")}</div>
      </td>
      <td><span class="tag">${escapeHtml(item.category || "General")}</span></td>
      <td class="number">${formatNumber.format(item.packQty)} ${escapeHtml(supplyUnit(item))}</td>
      <td class="number">${formatCurrency.format(item.packPrice)}</td>
      <td class="number">${formatCurrency.format(supplyUnitPrice(item))} / ${escapeHtml(supplyUnit(item))}</td>
      <td class="number">${formatNumber.format(item.stock)}</td>
      <td class="number">${formatCurrency.format(supplyStockValue(item))}</td>
      <td>
        <div class="row-actions">
          <button class="table-action" type="button" data-edit-supply="${item.id}">Editar</button>
          <button class="table-action delete" type="button" data-delete-supply="${item.id}">Borrar</button>
        </div>
      </td>
    `;
    elements.supplies.table.appendChild(tr);
  });
}

function renderWood() {
  const rows = state.wood.filter(matchesWoodSearch);
  elements.wood.table.innerHTML = "";
  elements.wood.count.textContent = `${rows.length} lotes`;

  if (!rows.length) {
    elements.wood.table.appendChild(emptyRow(10));
    return;
  }

  rows.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(item.type)}</strong></td>
      <td><span class="tag">${formatNumber.format(item.thickness)} mm</span></td>
      <td>${escapeHtml(item.color)}</td>
      <td>${escapeHtml(item.supplier || "Sin proveedor")}</td>
      <td class="number">${formatNumber.format(item.area)} m2</td>
      <td class="number">${formatNumber.format(item.used)} m2</td>
      <td class="number">${formatNumber.format(woodWaste(item))} m2</td>
      <td class="number">${formatCurrency.format(woodUsefulM2Cost(item))}</td>
      <td class="number">${formatCurrency.format(woodUsedCost(item))}</td>
      <td>
        <div class="row-actions">
          <button class="table-action" type="button" data-edit-wood="${item.id}">Editar</button>
          <button class="table-action delete" type="button" data-delete-wood="${item.id}">Borrar</button>
        </div>
      </td>
    `;
    elements.wood.table.appendChild(tr);
  });
}

function renderFurnitureBuilder() {
  furnitureDraft = normalizeFurnitureDraft(furnitureDraft);
  elements.furniture.supplyLines.innerHTML = furnitureDraft.supplies
    .map((line, index) => furnitureSupplyLineTemplate(line, index))
    .join("");
  elements.furniture.woodLines.innerHTML = furnitureDraft.wood
    .map((line, index) => furnitureWoodLineTemplate(line, index))
    .join("");
  updateFurnitureTotal();
}

function furnitureSupplyLineTemplate(line, index) {
  return `
    <div class="line-row" data-kind="supply" data-index="${index}">
      <label>
        <span>Insumo</span>
        <select data-field="supplyId">
          ${supplyOptions(line.supplyId)}
        </select>
      </label>
      <label>
        <span>Cantidad</span>
        <input data-field="qty" type="number" min="0" step="0.01" value="${Number(line.qty || 0)}" />
      </label>
      <div class="line-subtotal" data-subtotal>${formatCurrency.format(furnitureSupplyLineCost(line))}</div>
      <button class="table-action delete" type="button" data-remove-furniture-supply="${index}">Quitar</button>
    </div>
  `;
}

function furnitureWoodLineTemplate(line, index) {
  return `
    <div class="line-row" data-kind="wood" data-index="${index}">
      <label>
        <span>Madera</span>
        <select data-field="woodId">
          ${woodOptions(line.woodId)}
        </select>
      </label>
      <label>
        <span>m2 utiles</span>
        <input data-field="qty" type="number" min="0" step="0.01" value="${Number(line.qty || 0)}" />
      </label>
      <div class="line-subtotal" data-subtotal>${formatCurrency.format(furnitureWoodLineCost(line))}</div>
      <button class="table-action delete" type="button" data-remove-furniture-wood="${index}">Quitar</button>
    </div>
  `;
}

function supplyOptions(selectedId) {
  const options = [`<option value="">Elegir insumo</option>`];
  state.supplies.forEach((item) => {
    const selected = item.id === selectedId ? " selected" : "";
    const label = `${item.name} - ${formatCurrency.format(supplyUnitPrice(item))} / ${supplyUnit(item)}`;
    options.push(`<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(label)}</option>`);
  });
  return options.join("");
}

function woodOptions(selectedId) {
  const options = [`<option value="">Elegir madera</option>`];
  state.wood.forEach((item) => {
    const selected = item.id === selectedId ? " selected" : "";
    const label = `${item.type} ${item.thickness} mm ${item.color} - ${formatCurrency.format(woodUsefulM2Cost(item))} / m2`;
    options.push(`<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(label)}</option>`);
  });
  return options.join("");
}

function renderFurniture() {
  const rows = state.furniture.filter(matchesFurnitureSearch);
  elements.furniture.table.innerHTML = "";
  elements.furniture.count.textContent = `${rows.length} muebles`;

  if (!rows.length) {
    elements.furniture.table.innerHTML = `<div class="empty-state">Sin muebles cargados.</div>`;
    return;
  }

  rows.forEach((item) => {
    const card = document.createElement("article");
    card.className = "furniture-card clickable-row";
    card.dataset.viewFurniture = item.id;
    const supplyCount = (item.supplies || []).filter((line) => line.supplyId && line.qty > 0).length;
    const woodM2 = (item.wood || []).reduce((sum, line) => sum + Number(line.qty || 0), 0);
    card.innerHTML = `
      <div class="furniture-card-media">
        ${item.photo ? `<img src="${escapeHtml(item.photo)}" alt="${escapeHtml(item.name)}" />` : `<span>${escapeHtml(furnitureInitials(item.name))}</span>`}
      </div>
      <div class="furniture-card-body">
        <div>
          <h4>${escapeHtml(item.name)}</h4>
          <p>${escapeHtml(item.notes || "Sin detalle")}</p>
        </div>
        <div class="furniture-card-stats">
          <span>Insumos <strong>${formatNumber.format(supplyCount)}</strong></span>
          <span>Madera <strong>${formatNumber.format(woodM2)} m2</strong></span>
          <span>Total <strong>${formatCurrency.format(furnitureTotal(item))}</strong></span>
        </div>
      </div>
      <div class="furniture-card-actions">
        <button class="table-action" type="button" data-edit-furniture="${item.id}">Editar</button>
        <button class="table-action delete" type="button" data-delete-furniture="${item.id}">Borrar</button>
      </div>
    `;
    elements.furniture.table.appendChild(card);
  });
}

function renderInvoices() {
  const rows = state.invoices.filter(matchesInvoiceSearch);
  elements.invoices.table.innerHTML = "";
  elements.invoices.count.textContent = `${rows.length} facturas`;

  if (!rows.length) {
    elements.invoices.table.innerHTML = `<div class="empty-state">Sin facturas cargadas.</div>`;
    return;
  }

  rows.forEach((item) => {
    const card = document.createElement("article");
    card.className = "invoice-card clickable-row";
    card.dataset.viewInvoice = item.id;
    card.innerHTML = `
      <div>
        <h4>${escapeHtml(item.client)}</h4>
        <p>${escapeHtml(furnitureNameById(item.furnitureId))}</p>
      </div>
      <div class="invoice-card-stats">
        <span>Precio <strong>${formatCurrency.format(Number(item.price || 0))}</strong></span>
        <span>Envio <strong>${item.shippingRequired ? formatCurrency.format(invoiceShippingCost(item)) : "No"}</strong></span>
        <span>Total <strong>${formatCurrency.format(invoiceTotal(item))}</strong></span>
        <span>Ganancia <strong>${formatCurrency.format(invoiceProfit(item))}</strong></span>
      </div>
      <p>${escapeHtml(item.shippingRequired ? item.location || "Envio sin ubicacion" : "Retira / sin envio")}</p>
      <div class="invoice-card-actions">
        <button class="table-action pdf" type="button" data-print-invoice="${item.id}">PDF</button>
        <button class="table-action" type="button" data-edit-invoice="${item.id}">Editar</button>
        <button class="table-action delete" type="button" data-delete-invoice="${item.id}">Borrar</button>
      </div>
    `;
    elements.invoices.table.appendChild(card);
  });
}

function renderDashboard() {
  const suppliesValue = state.supplies.reduce((sum, item) => sum + supplyStockValue(item), 0);
  const woodValue = state.wood.reduce((sum, item) => sum + woodUsedCost(item), 0);
  const woodArea = state.wood.reduce((sum, item) => sum + item.used, 0);
  const averageUnit = state.supplies.length
    ? state.supplies.reduce((sum, item) => sum + supplyUnitPrice(item), 0) / state.supplies.length
    : 0;
  const thicknessCount = new Set(state.wood.map((item) => Number(item.thickness))).size;

  elements.metrics.suppliesCount.textContent = formatNumber.format(state.supplies.length);
  elements.metrics.suppliesValue.textContent = formatCurrency.format(suppliesValue);
  elements.metrics.woodArea.textContent = `${formatNumber.format(woodArea)} m2`;
  elements.metrics.woodValue.textContent = `${formatCurrency.format(woodValue)} usados`;
  elements.metrics.averageUnit.textContent = formatCurrency.format(averageUnit);
  elements.metrics.thicknessCount.textContent = formatNumber.format(thicknessCount);

  renderLatestSupplies();
  renderWoodByThickness();
}

function renderLatestSupplies() {
  const latest = [...state.supplies]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  elements.metrics.latestSupplies.innerHTML = "";

  if (!latest.length) {
    elements.metrics.latestSupplies.innerHTML = `<div class="empty-state">Sin registros cargados.</div>`;
    return;
  }

  latest.forEach((item) => {
    const row = document.createElement("div");
    row.className = "compact-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.category || "General")} - ${formatNumber.format(item.packQty)} ${escapeHtml(supplyUnit(item))}</small>
      </div>
      <span>${formatCurrency.format(supplyUnitPrice(item))} / ${escapeHtml(supplyUnit(item))}</span>
    `;
    elements.metrics.latestSupplies.appendChild(row);
  });
}

function renderWoodByThickness() {
  const groups = state.wood.reduce((acc, item) => {
    const key = `${Number(item.thickness)} mm`;
    acc[key] = acc[key] || { area: 0, value: 0 };
    acc[key].area += item.used;
    acc[key].value += woodUsedCost(item);
    return acc;
  }, {});

  elements.metrics.woodByThickness.innerHTML = "";
  const entries = Object.entries(groups).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

  if (!entries.length) {
    elements.metrics.woodByThickness.innerHTML = `<div class="empty-state">Sin registros cargados.</div>`;
    return;
  }

  entries.forEach(([thickness, totals]) => {
    const row = document.createElement("div");
    row.className = "compact-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(thickness)}</strong>
        <small>${formatCurrency.format(totals.value)}</small>
      </div>
      <span>${formatNumber.format(totals.area)} m2</span>
    `;
    elements.metrics.woodByThickness.appendChild(row);
  });
}

function renderAll() {
  renderSupplies();
  renderWood();
  renderFurniture();
  renderFurnitureBuilder();
  renderInvoices();
  renderInvoiceFurnitureOptions();
  updateInvoiceSummary();
  renderDashboard();
}

function getFirebaseConfig() {
  return window.DILUCCA_FIREBASE_CONFIG || {};
}

function hasFirebaseConfig(config) {
  return ["apiKey", "authDomain", "projectId", "appId"].every((key) => cleanText(config[key]));
}

function getFirebaseBusinessId() {
  return cleanText(window.DILUCCA_FIREBASE_BUSINESS_ID) || "dilucca";
}

function toCloudItem(item) {
  return JSON.parse(JSON.stringify(item));
}

function cloudItemsFromSnapshot(snapshot) {
  return snapshot.docs.map((documentSnapshot) => ({
    ...documentSnapshot.data(),
    id: documentSnapshot.id,
  }));
}

async function importFirebaseModules() {
  if (cloudSync.modules.initializeApp) return cloudSync.modules;

  const [appModule, firestoreModule] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`),
  ]);

  cloudSync.modules = {
    initializeApp: appModule.initializeApp,
    collection: firestoreModule.collection,
    doc: firestoreModule.doc,
    getDocs: firestoreModule.getDocs,
    getFirestore: firestoreModule.getFirestore,
    onSnapshot: firestoreModule.onSnapshot,
    writeBatch: firestoreModule.writeBatch,
  };

  return cloudSync.modules;
}

async function initFirebaseSync() {
  const firebaseConfig = getFirebaseConfig();

  if (!hasFirebaseConfig(firebaseConfig)) {
    updateSyncStatus("Guardado local", "local");
    return;
  }

  try {
    updateSyncStatus("Conectando Firebase", "saving");
    const firebaseModules = await importFirebaseModules();
    const app = firebaseModules.initializeApp(firebaseConfig);
    cloudSync.db = firebaseModules.getFirestore(app);
    cloudSync.businessId = getFirebaseBusinessId();
    cloudSync.enabled = true;

    FIREBASE_COLLECTIONS.forEach((collectionName) => {
      const collectionRef = firebaseModules.collection(
        cloudSync.db,
        "businesses",
        cloudSync.businessId,
        collectionName,
      );
      cloudSync.refs[collectionName] = collectionRef;

      firebaseModules.onSnapshot(
        collectionRef,
        (snapshot) => handleCloudSnapshot(collectionName, snapshot),
        (error) => {
          console.error("Firebase sync error", error);
          updateSyncStatus("Error Firebase", "error");
        },
      );
    });
  } catch (error) {
    console.error("Firebase init error", error);
    updateSyncStatus("Firebase sin conexion", "error");
  }
}

function handleCloudSnapshot(collectionName, snapshot) {
  cloudSync.snapshots[collectionName] = cloudItemsFromSnapshot(snapshot);

  const hasAllSnapshots = FIREBASE_COLLECTIONS.every((name) => Array.isArray(cloudSync.snapshots[name]));
  if (!hasAllSnapshots) return;

  const remoteState = normalizeState({
    supplies: cloudSync.snapshots.supplies,
    wood: cloudSync.snapshots.wood,
    furniture: cloudSync.snapshots.furniture,
    invoices: cloudSync.snapshots.invoices,
  });

  if (!cloudSync.ready) {
    cloudSync.ready = true;

    if (!hasStateData(remoteState) && hasStateData(state)) {
      updateSyncStatus("Subiendo datos locales", "saving");
      writeStateToCloud();
      return;
    }
  }

  replaceState(remoteState);
  persistLocalState();
  renderAll();
  updateSyncStatus(cloudSync.saving ? "Sincronizando" : "Firebase conectado", "online");
}

function scheduleCloudSave() {
  if (!cloudSync.enabled) return;

  if (!cloudSync.ready) {
    updateSyncStatus("Conectando Firebase", "saving");
    return;
  }

  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(writeStateToCloud, 350);
}

async function syncCollectionToCloud(collectionName) {
  const { doc, getDocs, writeBatch } = cloudSync.modules;
  const collectionRef = cloudSync.refs[collectionName];
  const snapshot = await getDocs(collectionRef);
  const localIds = new Set(state[collectionName].map((item) => item.id).filter(Boolean));
  const batch = writeBatch(cloudSync.db);
  let operations = 0;

  state[collectionName].forEach((item) => {
    if (!item.id) return;
    batch.set(doc(collectionRef, item.id), toCloudItem(item));
    operations += 1;
  });

  snapshot.docs.forEach((documentSnapshot) => {
    if (localIds.has(documentSnapshot.id)) return;
    batch.delete(documentSnapshot.ref);
    operations += 1;
  });

  if (operations) await batch.commit();
}

async function writeStateToCloud() {
  if (!cloudSync.enabled || !cloudSync.ready || cloudSync.saving) return;

  try {
    cloudSync.saving = true;
    updateSyncStatus("Sincronizando", "saving");

    for (const collectionName of FIREBASE_COLLECTIONS) {
      await syncCollectionToCloud(collectionName);
    }

    updateSyncStatus("Firebase conectado", "online");
  } catch (error) {
    console.error("Firebase save error", error);
    updateSyncStatus("Error al guardar", "error");
  } finally {
    cloudSync.saving = false;
  }
}

function emptyRow(colspan) {
  const template = $("#empty-state-template").content.cloneNode(true);
  template.querySelector("td").colSpan = colspan;
  return template;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}

function syncFurnitureDraftFromDom() {
  furnitureDraft.supplies = Array.from(elements.furniture.supplyLines.querySelectorAll(".line-row")).map(
    (row) => ({
      supplyId: row.querySelector('[data-field="supplyId"]')?.value || "",
      qty: Number(row.querySelector('[data-field="qty"]')?.value) || 0,
    }),
  );
  furnitureDraft.wood = Array.from(elements.furniture.woodLines.querySelectorAll(".line-row")).map((row) => ({
    woodId: row.querySelector('[data-field="woodId"]')?.value || "",
    qty: Number(row.querySelector('[data-field="qty"]')?.value) || 0,
  }));
  furnitureDraft = normalizeFurnitureDraft(furnitureDraft);
}

function updateFurnitureTotal() {
  elements.furniture.supplyLines.querySelectorAll(".line-row").forEach((row, index) => {
    const subtotal = row.querySelector("[data-subtotal]");
    if (subtotal) subtotal.textContent = formatCurrency.format(furnitureSupplyLineCost(furnitureDraft.supplies[index] || {}));
  });

  elements.furniture.woodLines.querySelectorAll(".line-row").forEach((row, index) => {
    const subtotal = row.querySelector("[data-subtotal]");
    if (subtotal) subtotal.textContent = formatCurrency.format(furnitureWoodLineCost(furnitureDraft.wood[index] || {}));
  });

  const draftItem = { supplies: furnitureDraft.supplies, wood: furnitureDraft.wood };
  const supplyCount = furnitureDraft.supplies.filter((line) => line.supplyId && line.qty > 0).length;
  const woodM2 = furnitureDraft.wood.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  const total = furnitureTotal(draftItem);

  elements.furniture.total.textContent = formatCurrency.format(total);
  elements.furniture.totalDetail.textContent =
    supplyCount || woodM2
      ? `${formatNumber.format(supplyCount)} insumos - ${formatNumber.format(woodM2)} m2 de madera`
      : "Sin items seleccionados";
}

function handleFurnitureLineChange() {
  syncFurnitureDraftFromDom();
  updateFurnitureTotal();
}

function renderInvoiceFurnitureOptions(selectedId = elements.invoices.furniture.value) {
  const options = [`<option value="">Elegir mueble</option>`];
  state.furniture.forEach((item) => {
    const selected = item.id === selectedId ? " selected" : "";
    const label = `${item.name} - costo ${formatCurrency.format(furnitureTotal(item))}`;
    options.push(`<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(label)}</option>`);
  });
  elements.invoices.furniture.innerHTML = options.join("");
}

function currentInvoiceDraft() {
  const shippingRequired = elements.invoices.shippingRequired.value === "yes";
  return {
    furnitureId: elements.invoices.furniture.value,
    price: readNumber(elements.invoices.price),
    shippingRequired,
    shippingPrice: shippingRequired ? readNumber(elements.invoices.shippingPrice) : 0,
    location: cleanText(elements.invoices.location.value),
  };
}

function updateInvoiceSummary() {
  const draft = currentInvoiceDraft();
  const shippingDisabled = !draft.shippingRequired;

  elements.invoices.shippingPrice.disabled = shippingDisabled;
  elements.invoices.location.disabled = shippingDisabled;

  elements.invoices.cost.textContent = formatCurrency.format(invoiceFurnitureCost(draft));
  elements.invoices.total.textContent = formatCurrency.format(invoiceTotal(draft));
  elements.invoices.profit.textContent = formatCurrency.format(invoiceProfit(draft));
  elements.invoices.shippingLabel.textContent = draft.shippingRequired
    ? formatCurrency.format(invoiceShippingCost(draft))
    : "No";
  elements.invoices.shippingLocation.textContent = draft.shippingRequired
    ? draft.location || "sin ubicacion"
    : "sin envio";
}

function handleInvoiceChange() {
  updateInvoiceSummary();
}

function updateFurniturePhotoPreview() {
  if (currentFurniturePhoto) {
    elements.furniture.photoImage.src = currentFurniturePhoto;
    elements.furniture.photoPreview.classList.remove("hidden");
  } else {
    elements.furniture.photoImage.removeAttribute("src");
    elements.furniture.photoPreview.classList.add("hidden");
  }
}

function handleFurniturePhotoChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  resizeImageFile(file)
    .then((dataUrl) => {
      currentFurniturePhoto = dataUrl;
      updateFurniturePhotoPreview();
    })
    .catch(() => {
      alert("No se pudo cargar la foto. Proba con otra imagen.");
      elements.furniture.photo.value = "";
    });
}

function removeFurniturePhoto() {
  currentFurniturePhoto = "";
  elements.furniture.photo.value = "";
  updateFurniturePhotoPreview();
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 900;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openModal({ eyebrow, title, body, confirmLabel = "", cancelLabel = "No", onConfirm = null }) {
  modalConfirmAction = onConfirm;
  elements.modal.eyebrow.textContent = eyebrow;
  elements.modal.title.textContent = title;
  elements.modal.body.innerHTML = body;
  elements.modal.root.classList.remove("hidden");

  if (onConfirm) {
    elements.modal.actions.classList.remove("hidden");
    elements.modal.confirm.textContent = confirmLabel || "Si";
    elements.modal.cancel.textContent = cancelLabel;
  } else {
    elements.modal.actions.classList.add("hidden");
  }

  elements.modal.close.focus();
}

function closeModal() {
  modalConfirmAction = null;
  elements.modal.root.classList.add("hidden");
  elements.modal.body.innerHTML = "";
  elements.modal.actions.classList.add("hidden");
}

function confirmWithModal({ title, body, confirmLabel = "Si", onConfirm }) {
  openModal({
    eyebrow: "Confirmacion",
    title,
    body: `<p class="confirm-copy">${escapeHtml(body)}</p>`,
    confirmLabel,
    onConfirm,
  });
}

function showFurnitureDetail(id) {
  const item = state.furniture.find((entry) => entry.id === id);
  if (!item) return;

  const supplies = (item.supplies || []).filter((line) => line.supplyId && line.qty > 0);
  const wood = (item.wood || []).filter((line) => line.woodId && line.qty > 0);
  const supplyTotal = furnitureSupplyTotal(item);
  const woodTotal = furnitureWoodTotal(item);

  openModal({
    eyebrow: "Detalle de mueble",
    title: item.name,
    body: `
      ${item.photo ? `<img class="detail-photo" src="${escapeHtml(item.photo)}" alt="${escapeHtml(item.name)}" />` : ""}
      <div class="detail-summary">
        <div class="detail-metric">
          <span>Insumos</span>
          <strong>${formatCurrency.format(supplyTotal)}</strong>
        </div>
        <div class="detail-metric">
          <span>Madera</span>
          <strong>${formatCurrency.format(woodTotal)}</strong>
        </div>
        <div class="detail-metric">
          <span>Total</span>
          <strong>${formatCurrency.format(furnitureTotal(item))}</strong>
        </div>
      </div>
      ${item.notes ? `<p class="confirm-copy">${escapeHtml(item.notes)}</p>` : ""}
      <div class="detail-section">
        <h3>Insumos</h3>
        ${detailSupplyRows(supplies)}
      </div>
      <div class="detail-section">
        <h3>Madera</h3>
        ${detailWoodRows(wood)}
      </div>
    `,
  });
}

function showInvoiceDetail(id) {
  const item = state.invoices.find((entry) => entry.id === id);
  if (!item) return;

  openModal({
    eyebrow: "Detalle de factura",
    title: item.client,
    body: `
      <div class="detail-summary">
        <div class="detail-metric">
          <span>Mueble</span>
          <strong>${escapeHtml(furnitureNameById(item.furnitureId))}</strong>
        </div>
        <div class="detail-metric">
          <span>Total factura</span>
          <strong>${formatCurrency.format(invoiceTotal(item))}</strong>
        </div>
        <div class="detail-metric">
          <span>Ganancia</span>
          <strong>${formatCurrency.format(invoiceProfit(item))}</strong>
        </div>
      </div>
      <div class="detail-actions">
        <button class="primary-button" type="button" data-print-invoice="${item.id}">Generar PDF</button>
      </div>
      <div class="detail-section">
        <h3>Datos</h3>
        <div class="detail-row"><strong>Fecha</strong><span>${escapeHtml(item.date || "-")}</span></div>
        <div class="detail-row"><strong>Telefono</strong><span>${escapeHtml(item.phone || "-")}</span></div>
        <div class="detail-row"><strong>Pago</strong><span>${escapeHtml(item.payment || "-")}</span></div>
        <div class="detail-row"><strong>Precio en factura</strong><span>${formatCurrency.format(Number(item.price || 0))}</span></div>
        <div class="detail-row"><strong>Costo mueble</strong><span>${formatCurrency.format(invoiceFurnitureCost(item))}</span></div>
        <div class="detail-row"><strong>Envio</strong><span>${item.shippingRequired ? formatCurrency.format(invoiceShippingCost(item)) : "No"}</span></div>
        ${item.shippingRequired ? `<div class="detail-row"><strong>Ubicacion</strong><span>${escapeHtml(item.location || "-")}</span></div>` : ""}
      </div>
      ${item.notes ? `<div class="detail-section"><h3>Notas</h3><p class="confirm-copy">${escapeHtml(item.notes)}</p></div>` : ""}
    `,
  });
}

function buildInvoicePrintHtml(invoice, logoUrl) {
  const furnitureName = furnitureNameById(invoice.furnitureId);
  const invoicePrice = Number(invoice.price || 0);
  const shippingCost = invoiceShippingCost(invoice);
  const total = invoiceTotal(invoice);
  const notes = cleanText(invoice.notes);
  const shippingText = invoice.shippingRequired
    ? escapeHtml(invoice.location || "Envio sin ubicacion")
    : "Retira / sin envio";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Factura ${escapeHtml(invoiceNumber(invoice))} - Muebles DiLucca</title>
    <style>
      @page {
        size: A4;
        margin: 14mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #ffffff;
        color: #1f2933;
        font-family: Arial, Helvetica, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-button {
        min-height: 38px;
        padding: 0 14px;
        border: 1px solid #285e61;
        border-radius: 6px;
        background: #285e61;
        color: #ffffff;
        font: inherit;
        cursor: pointer;
      }

      .print-tools {
        display: flex;
        justify-content: flex-end;
        max-width: 820px;
        margin: 16px auto 14px;
      }

      .invoice-sheet {
        max-width: 820px;
        margin: 0 auto 32px;
      }

      .invoice-header {
        display: grid;
        grid-template-columns: 230px 1fr;
        gap: 24px;
        align-items: center;
        padding-bottom: 20px;
        border-bottom: 3px solid #d9aa45;
      }

      .logo-frame {
        display: grid;
        place-items: center;
        padding: 10px;
        border-radius: 8px;
        background: #000000;
      }

      .logo-frame img {
        display: block;
        width: 100%;
        max-width: 210px;
        height: auto;
      }

      .invoice-heading {
        text-align: right;
      }

      .invoice-heading h1 {
        margin: 0;
        font-size: 34px;
        letter-spacing: 0;
      }

      .invoice-heading p {
        margin: 8px 0 0;
        color: #667085;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin: 24px 0;
      }

      .info-card {
        min-height: 78px;
        padding: 14px;
        border: 1px solid #dde3dc;
        border-radius: 8px;
        background: #f9faf7;
      }

      .info-card span {
        display: block;
        margin-bottom: 6px;
        color: #667085;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .info-card strong {
        display: block;
        line-height: 1.35;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }

      th,
      td {
        padding: 13px 10px;
        border-bottom: 1px solid #dde3dc;
        text-align: left;
      }

      th {
        color: #667085;
        font-size: 12px;
        text-transform: uppercase;
      }

      td.number,
      th.number {
        text-align: right;
      }

      .totals {
        display: grid;
        gap: 8px;
        width: min(100%, 320px);
        margin: 22px 0 0 auto;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }

      .total-row.final {
        margin-top: 6px;
        padding-top: 12px;
        border-top: 2px solid #d9aa45;
        font-size: 22px;
        font-weight: 800;
      }

      .notes {
        margin-top: 26px;
        padding: 14px;
        border: 1px solid #dde3dc;
        border-radius: 8px;
      }

      .notes h2 {
        margin: 0 0 8px;
        font-size: 16px;
      }

      .notes p,
      .footer p {
        margin: 0;
        color: #667085;
        line-height: 1.5;
      }

      .footer {
        margin-top: 34px;
        padding-top: 16px;
        border-top: 1px solid #dde3dc;
        text-align: center;
      }

      @media print {
        .print-tools {
          display: none;
        }

        .invoice-sheet {
          margin: 0 auto;
        }
      }
    </style>
  </head>
  <body>
    <div class="print-tools">
      <button class="print-button" type="button" onclick="window.print()">Imprimir / guardar PDF</button>
    </div>
    <main class="invoice-sheet">
      <header class="invoice-header">
        <div class="logo-frame">
          <img src="${escapeHtml(logoUrl)}" alt="Muebles DiLucca" />
        </div>
        <div class="invoice-heading">
          <h1>Factura</h1>
          <p>Nro. ${escapeHtml(invoiceNumber(invoice))}</p>
          <p>Fecha ${escapeHtml(formatInvoiceDate(invoice.date))}</p>
        </div>
      </header>

      <section class="info-grid">
        <div class="info-card">
          <span>Cliente</span>
          <strong>${escapeHtml(invoice.client || "-")}</strong>
        </div>
        <div class="info-card">
          <span>Telefono</span>
          <strong>${escapeHtml(invoice.phone || "-")}</strong>
        </div>
        <div class="info-card">
          <span>Forma de pago</span>
          <strong>${escapeHtml(invoice.payment || "-")}</strong>
        </div>
        <div class="info-card">
          <span>Envio</span>
          <strong>${shippingText}</strong>
        </div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Detalle</th>
            <th class="number">Cantidad</th>
            <th class="number">Precio</th>
            <th class="number">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(furnitureName)}</td>
            <td class="number">1</td>
            <td class="number">${formatCurrency.format(invoicePrice)}</td>
            <td class="number">${formatCurrency.format(invoicePrice)}</td>
          </tr>
          ${
            invoice.shippingRequired
              ? `<tr>
                  <td>Envio${invoice.location ? ` - ${escapeHtml(invoice.location)}` : ""}</td>
                  <td class="number">1</td>
                  <td class="number">${formatCurrency.format(shippingCost)}</td>
                  <td class="number">${formatCurrency.format(shippingCost)}</td>
                </tr>`
              : ""
          }
        </tbody>
      </table>

      <section class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <strong>${formatCurrency.format(invoicePrice)}</strong>
        </div>
        <div class="total-row">
          <span>Envio</span>
          <strong>${invoice.shippingRequired ? formatCurrency.format(shippingCost) : "No"}</strong>
        </div>
        <div class="total-row final">
          <span>Total</span>
          <strong>${formatCurrency.format(total)}</strong>
        </div>
      </section>

      ${notes ? `<section class="notes"><h2>Notas</h2><p>${escapeHtml(notes)}</p></section>` : ""}

      <footer class="footer">
        <p>Gracias por confiar en Muebles DiLucca.</p>
      </footer>
    </main>
    <script>
      window.addEventListener("load", () => {
        setTimeout(() => window.print(), 300);
      });
    </script>
  </body>
</html>`;
}

function printInvoice(id) {
  const item = state.invoices.find((entry) => entry.id === id);
  if (!item) return;

  const logoUrl = new URL(INVOICE_LOGO_PATH, window.location.href).href;
  const popup = window.open("", "_blank", "width=900,height=1100");

  if (!popup) {
    alert("El navegador bloqueo la ventana para generar el PDF. Habilita las ventanas emergentes y proba de nuevo.");
    return;
  }

  popup.document.open();
  popup.document.write(buildInvoicePrintHtml(item, logoUrl));
  popup.document.close();
  popup.focus();
}

function detailSupplyRows(lines) {
  if (!lines.length) return `<div class="empty-state">Sin insumos cargados.</div>`;
  return lines
    .map((line) => {
      const item = state.supplies.find((entry) => entry.id === line.supplyId);
      const unit = item ? supplyUnit(item) : "";
      return `
        <div class="detail-row">
          <div>
            <strong>${escapeHtml(supplyLabelById(line.supplyId))}</strong>
            <small>${formatNumber.format(line.qty)} ${escapeHtml(unit)}</small>
          </div>
          <span>${formatCurrency.format(furnitureSupplyLineCost(line))}</span>
        </div>
      `;
    })
    .join("");
}

function detailWoodRows(lines) {
  if (!lines.length) return `<div class="empty-state">Sin madera cargada.</div>`;
  return lines
    .map(
      (line) => `
        <div class="detail-row">
          <div>
            <strong>${escapeHtml(woodLabelById(line.woodId))}</strong>
            <small>${formatNumber.format(line.qty)} m2 utiles</small>
          </div>
          <span>${formatCurrency.format(furnitureWoodLineCost(line))}</span>
        </div>
      `,
    )
    .join("");
}

function handleSupplySubmit(event) {
  event.preventDefault();
  const id = elements.supplies.id.value;
  const payload = {
    id: id || createId("supply"),
    name: cleanText(elements.supplies.name.value),
    category: cleanText(elements.supplies.category.value),
    packQty: readNumber(elements.supplies.packQty, 1),
    unit: cleanText(elements.supplies.unit.value).toUpperCase() || "UN",
    packPrice: readNumber(elements.supplies.packPrice),
    stock: readNumber(elements.supplies.stock, 0),
    supplier: cleanText(elements.supplies.supplier.value),
    createdAt: id ? getExistingCreatedAt(state.supplies, id) : new Date().toISOString(),
  };

  if (id) {
    state.supplies = state.supplies.map((item) => (item.id === id ? payload : item));
  } else {
    state.supplies.unshift(payload);
  }

  saveAndRefresh();
  resetSupplyForm();
}

function handleWoodSubmit(event) {
  event.preventDefault();
  const id = elements.wood.id.value;
  const area = readNumber(elements.wood.area);
  const used = Math.min(readNumber(elements.wood.used), area);
  const payload = {
    id: id || createId("wood"),
    type: cleanText(elements.wood.type.value),
    thickness: readNumber(elements.wood.thickness),
    color: cleanText(elements.wood.color.value),
    supplier: cleanText(elements.wood.supplier.value),
    area,
    price: readNumber(elements.wood.price),
    used,
    createdAt: id ? getExistingCreatedAt(state.wood, id) : new Date().toISOString(),
  };

  if (id) {
    state.wood = state.wood.map((item) => (item.id === id ? payload : item));
  } else {
    state.wood.unshift(payload);
  }

  saveAndRefresh();
  resetWoodForm();
}

function handleFurnitureSubmit(event) {
  event.preventDefault();
  syncFurnitureDraftFromDom();

  const supplies = furnitureDraft.supplies.filter((line) => line.supplyId && line.qty > 0);
  const wood = furnitureDraft.wood.filter((line) => line.woodId && line.qty > 0);

  if (!supplies.length && !wood.length) {
    alert("Agrega al menos un insumo o una madera para calcular el mueble.");
    return;
  }

  const id = elements.furniture.id.value;
  const payload = {
    id: id || createId("furniture"),
    name: cleanText(elements.furniture.name.value),
    notes: cleanText(elements.furniture.notes.value),
    photo: currentFurniturePhoto,
    supplies,
    wood,
    createdAt: id ? getExistingCreatedAt(state.furniture, id) : new Date().toISOString(),
  };

  if (id) {
    state.furniture = state.furniture.map((item) => (item.id === id ? payload : item));
  } else {
    state.furniture.unshift(payload);
  }

  resetFurnitureForm();
  closeFurnitureComposer();
  saveAndRefresh();
}

function handleInvoiceSubmit(event) {
  event.preventDefault();
  const id = elements.invoices.id.value;
  const shippingRequired = elements.invoices.shippingRequired.value === "yes";
  const payload = {
    id: id || createId("invoice"),
    furnitureId: elements.invoices.furniture.value,
    client: cleanText(elements.invoices.client.value),
    phone: cleanText(elements.invoices.phone.value),
    date: elements.invoices.date.value || todayValue(),
    price: readNumber(elements.invoices.price),
    shippingRequired,
    shippingPrice: shippingRequired ? readNumber(elements.invoices.shippingPrice) : 0,
    location: shippingRequired ? cleanText(elements.invoices.location.value) : "",
    payment: cleanText(elements.invoices.payment.value),
    notes: cleanText(elements.invoices.notes.value),
    createdAt: id ? getExistingCreatedAt(state.invoices, id) : new Date().toISOString(),
  };

  if (id) {
    state.invoices = state.invoices.map((item) => (item.id === id ? payload : item));
  } else {
    state.invoices.unshift(payload);
  }

  resetInvoiceForm();
  closeInvoiceComposer();
  saveAndRefresh();
}

function getExistingCreatedAt(collection, id) {
  return collection.find((item) => item.id === id)?.createdAt || new Date().toISOString();
}

function saveAndRefresh() {
  saveState();
  renderAll();
}

function editSupply(id) {
  const item = state.supplies.find((entry) => entry.id === id);
  if (!item) return;
  elements.supplies.id.value = item.id;
  elements.supplies.name.value = item.name;
  elements.supplies.category.value = item.category;
  elements.supplies.packQty.value = item.packQty;
  elements.supplies.unit.value = supplyUnit(item);
  elements.supplies.packPrice.value = item.packPrice;
  elements.supplies.stock.value = item.stock;
  elements.supplies.supplier.value = item.supplier;
  elements.supplies.submit.textContent = "Guardar cambios";
  elements.supplies.cancel.classList.remove("hidden");
  elements.supplies.name.focus();
}

function editWood(id) {
  const item = state.wood.find((entry) => entry.id === id);
  if (!item) return;
  elements.wood.id.value = item.id;
  elements.wood.type.value = item.type;
  elements.wood.thickness.value = item.thickness;
  elements.wood.color.value = item.color;
  elements.wood.supplier.value = item.supplier || "";
  elements.wood.area.value = item.area;
  elements.wood.price.value = item.price;
  elements.wood.used.value = item.used;
  elements.wood.submit.textContent = "Guardar cambios";
  elements.wood.cancel.classList.remove("hidden");
  elements.wood.type.focus();
}

function editFurniture(id) {
  const item = state.furniture.find((entry) => entry.id === id);
  if (!item) return;
  closeModal();
  openFurnitureComposer();
  elements.furniture.id.value = item.id;
  elements.furniture.name.value = item.name;
  elements.furniture.notes.value = item.notes || "";
  currentFurniturePhoto = item.photo || "";
  updateFurniturePhotoPreview();
  furnitureDraft = normalizeFurnitureDraft({
    supplies: structuredClone(item.supplies || []),
    wood: structuredClone(item.wood || []),
  });
  elements.furniture.submit.textContent = "Guardar cambios";
  elements.furniture.cancel.classList.remove("hidden");
  renderFurnitureBuilder();
  elements.furniture.name.focus();
}

function requestEditFurniture(id) {
  const item = state.furniture.find((entry) => entry.id === id);
  if (!item) return;
  confirmWithModal({
    title: "Editar mueble",
    body: `Queres editar "${item.name}"? Se cargara en el formulario para modificarlo.`,
    confirmLabel: "Si, editar",
    onConfirm: () => editFurniture(id),
  });
}

function editInvoice(id) {
  const item = state.invoices.find((entry) => entry.id === id);
  if (!item) return;
  closeModal();
  openInvoiceComposer();
  renderInvoiceFurnitureOptions(item.furnitureId);
  elements.invoices.id.value = item.id;
  elements.invoices.furniture.value = item.furnitureId;
  elements.invoices.client.value = item.client;
  elements.invoices.phone.value = item.phone || "";
  elements.invoices.date.value = item.date || todayValue();
  elements.invoices.price.value = item.price;
  elements.invoices.shippingRequired.value = item.shippingRequired ? "yes" : "no";
  elements.invoices.shippingPrice.value = item.shippingPrice || 0;
  elements.invoices.location.value = item.location || "";
  elements.invoices.payment.value = item.payment || "";
  elements.invoices.notes.value = item.notes || "";
  elements.invoices.submit.textContent = "Guardar cambios";
  elements.invoices.cancel.classList.remove("hidden");
  updateInvoiceSummary();
  elements.invoices.client.focus();
}

function requestEditInvoice(id) {
  const item = state.invoices.find((entry) => entry.id === id);
  if (!item) return;
  confirmWithModal({
    title: "Editar factura",
    body: `Queres editar la factura de "${item.client}"? Se cargara en el formulario para modificarla.`,
    confirmLabel: "Si, editar",
    onConfirm: () => editInvoice(id),
  });
}

function deleteSupply(id) {
  const item = state.supplies.find((entry) => entry.id === id);
  if (!item) return;
  state.supplies = state.supplies.filter((entry) => entry.id !== id);
  saveAndRefresh();
  resetSupplyForm();
}

function requestDeleteSupply(id) {
  const item = state.supplies.find((entry) => entry.id === id);
  if (!item) return;
  confirmWithModal({
    title: "Borrar insumo",
    body: `Seguro que queres borrar "${item.name}"? Esta accion no se puede deshacer.`,
    confirmLabel: "Si, borrar",
    onConfirm: () => deleteSupply(id),
  });
}

function deleteWood(id) {
  const item = state.wood.find((entry) => entry.id === id);
  if (!item) return;
  state.wood = state.wood.filter((entry) => entry.id !== id);
  saveAndRefresh();
  resetWoodForm();
}

function requestDeleteWood(id) {
  const item = state.wood.find((entry) => entry.id === id);
  if (!item) return;
  confirmWithModal({
    title: "Borrar madera",
    body: `Seguro que queres borrar "${item.type} ${item.color}"? Esta accion no se puede deshacer.`,
    confirmLabel: "Si, borrar",
    onConfirm: () => deleteWood(id),
  });
}

function deleteFurniture(id) {
  const item = state.furniture.find((entry) => entry.id === id);
  if (!item) return;
  state.furniture = state.furniture.filter((entry) => entry.id !== id);
  saveAndRefresh();
  resetFurnitureForm();
}

function requestDeleteFurniture(id) {
  const item = state.furniture.find((entry) => entry.id === id);
  if (!item) return;
  confirmWithModal({
    title: "Borrar mueble",
    body: `Seguro que queres borrar "${item.name}"? Esta accion no se puede deshacer.`,
    confirmLabel: "Si, borrar",
    onConfirm: () => deleteFurniture(id),
  });
}

function deleteInvoice(id) {
  const item = state.invoices.find((entry) => entry.id === id);
  if (!item) return;
  state.invoices = state.invoices.filter((entry) => entry.id !== id);
  saveAndRefresh();
  resetInvoiceForm();
}

function requestDeleteInvoice(id) {
  const item = state.invoices.find((entry) => entry.id === id);
  if (!item) return;
  confirmWithModal({
    title: "Borrar factura",
    body: `Seguro que queres borrar la factura de "${item.client}"? Esta accion no se puede deshacer.`,
    confirmLabel: "Si, borrar",
    onConfirm: () => deleteInvoice(id),
  });
}

function resetSupplyForm() {
  elements.supplies.form.reset();
  elements.supplies.id.value = "";
  elements.supplies.stock.value = 1;
  elements.supplies.unit.value = "UN";
  elements.supplies.submit.textContent = "Agregar insumo";
  elements.supplies.cancel.classList.add("hidden");
}

function resetWoodForm() {
  elements.wood.form.reset();
  elements.wood.id.value = "";
  elements.wood.used.value = 0;
  elements.wood.submit.textContent = "Agregar madera";
  elements.wood.cancel.classList.add("hidden");
}

function resetFurnitureForm() {
  elements.furniture.form.reset();
  elements.furniture.id.value = "";
  currentFurniturePhoto = "";
  updateFurniturePhotoPreview();
  furnitureDraft = createFurnitureDraft();
  elements.furniture.submit.textContent = "Guardar mueble";
  elements.furniture.cancel.classList.add("hidden");
  renderFurnitureBuilder();
}

function resetInvoiceForm() {
  elements.invoices.form.reset();
  elements.invoices.id.value = "";
  elements.invoices.date.value = todayValue();
  elements.invoices.shippingRequired.value = "no";
  elements.invoices.shippingPrice.value = 0;
  elements.invoices.submit.textContent = "Guardar factura";
  elements.invoices.cancel.classList.add("hidden");
  renderInvoiceFurnitureOptions();
  updateInvoiceSummary();
}

function openFurnitureComposer() {
  elements.furniture.form.classList.remove("hidden");
  elements.furniture.builder.classList.remove("hidden");
  elements.furniture.cancel.classList.remove("hidden");
  elements.furniture.showForm.textContent = "Cerrar";
}

function closeFurnitureComposer() {
  elements.furniture.form.classList.add("hidden");
  elements.furniture.builder.classList.add("hidden");
  elements.furniture.showForm.textContent = "Agregar mueble";
}

function toggleFurnitureComposer() {
  const isClosed = elements.furniture.form.classList.contains("hidden");
  if (isClosed) {
    resetFurnitureForm();
    openFurnitureComposer();
    elements.furniture.name.focus();
  } else {
    resetFurnitureForm();
    closeFurnitureComposer();
  }
}

function openInvoiceComposer() {
  elements.invoices.form.classList.remove("hidden");
  elements.invoices.builder.classList.remove("hidden");
  elements.invoices.cancel.classList.remove("hidden");
  elements.invoices.showForm.textContent = "Cerrar";
  renderInvoiceFurnitureOptions();
  updateInvoiceSummary();
}

function closeInvoiceComposer() {
  elements.invoices.form.classList.add("hidden");
  elements.invoices.builder.classList.add("hidden");
  elements.invoices.showForm.textContent = "Agregar factura";
}

function toggleInvoiceComposer() {
  const isClosed = elements.invoices.form.classList.contains("hidden");
  if (isClosed) {
    resetInvoiceForm();
    openInvoiceComposer();
    elements.invoices.client.focus();
  } else {
    resetInvoiceForm();
    closeInvoiceComposer();
  }
}

function addFurnitureSupplyLine() {
  syncFurnitureDraftFromDom();
  furnitureDraft.supplies.push({ supplyId: "", qty: 0 });
  renderFurnitureBuilder();
}

function addFurnitureWoodLine() {
  syncFurnitureDraftFromDom();
  furnitureDraft.wood.push({ woodId: "", qty: 0 });
  renderFurnitureBuilder();
}

function removeFurnitureLine(type, index) {
  syncFurnitureDraftFromDom();
  furnitureDraft[type].splice(index, 1);
  furnitureDraft = normalizeFurnitureDraft(furnitureDraft);
  renderFurnitureBuilder();
}

function clearCollection(collectionName, label) {
  if (!state[collectionName].length) return;
  const typed = prompt(`Para vaciar ${label}, escribi VACIAR.`);
  if (typed !== "VACIAR") return;
  state[collectionName] = [];
  saveAndRefresh();
}

function loadSampleData() {
  if (state.supplies.length || state.wood.length || state.furniture.length || state.invoices.length) {
    const replace = confirm("Reemplazar los datos actuales por el ejemplo?");
    if (!replace) return;
  }
  state.supplies = structuredClone(sampleData.supplies);
  state.wood = structuredClone(sampleData.wood);
  state.furniture = structuredClone(sampleData.furniture);
  state.invoices = structuredClone(sampleData.invoices);
  resetFurnitureForm();
  resetInvoiceForm();
  saveAndRefresh();
}

function handleTableClick(event) {
  const editSupplyButton = event.target.closest("[data-edit-supply]");
  const deleteSupplyButton = event.target.closest("[data-delete-supply]");
  const editWoodButton = event.target.closest("[data-edit-wood]");
  const deleteWoodButton = event.target.closest("[data-delete-wood]");
  const editFurnitureButton = event.target.closest("[data-edit-furniture]");
  const deleteFurnitureButton = event.target.closest("[data-delete-furniture]");
  const furnitureRow = event.target.closest("[data-view-furniture]");
  const printInvoiceButton = event.target.closest("[data-print-invoice]");
  const editInvoiceButton = event.target.closest("[data-edit-invoice]");
  const deleteInvoiceButton = event.target.closest("[data-delete-invoice]");
  const invoiceRow = event.target.closest("[data-view-invoice]");

  if (editSupplyButton) {
    editSupply(editSupplyButton.dataset.editSupply);
    return;
  }
  if (deleteSupplyButton) {
    requestDeleteSupply(deleteSupplyButton.dataset.deleteSupply);
    return;
  }
  if (editWoodButton) {
    editWood(editWoodButton.dataset.editWood);
    return;
  }
  if (deleteWoodButton) {
    requestDeleteWood(deleteWoodButton.dataset.deleteWood);
    return;
  }
  if (editFurnitureButton) {
    requestEditFurniture(editFurnitureButton.dataset.editFurniture);
    return;
  }
  if (deleteFurnitureButton) {
    requestDeleteFurniture(deleteFurnitureButton.dataset.deleteFurniture);
    return;
  }
  if (printInvoiceButton) {
    printInvoice(printInvoiceButton.dataset.printInvoice);
    return;
  }
  if (editInvoiceButton) {
    requestEditInvoice(editInvoiceButton.dataset.editInvoice);
    return;
  }
  if (deleteInvoiceButton) {
    requestDeleteInvoice(deleteInvoiceButton.dataset.deleteInvoice);
    return;
  }
  if (furnitureRow) showFurnitureDetail(furnitureRow.dataset.viewFurniture);
  if (invoiceRow) showInvoiceDetail(invoiceRow.dataset.viewInvoice);
}

function handleModalBodyClick(event) {
  const printInvoiceButton = event.target.closest("[data-print-invoice]");
  if (printInvoiceButton) printInvoice(printInvoiceButton.dataset.printInvoice);
}

function handleFurnitureLineClick(event) {
  const removeSupplyButton = event.target.closest("[data-remove-furniture-supply]");
  const removeWoodButton = event.target.closest("[data-remove-furniture-wood]");

  if (removeSupplyButton) {
    removeFurnitureLine("supplies", Number(removeSupplyButton.dataset.removeFurnitureSupply));
  }

  if (removeWoodButton) {
    removeFurnitureLine("wood", Number(removeWoodButton.dataset.removeFurnitureWood));
  }
}

function bindEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActiveView(tab.dataset.view);
      closeMobileMenu();
    });
  });
  elements.menuToggle.addEventListener("click", toggleMobileMenu);
  elements.supplies.form.addEventListener("submit", handleSupplySubmit);
  elements.supplies.cancel.addEventListener("click", resetSupplyForm);
  elements.supplies.search.addEventListener("input", renderSupplies);
  elements.supplies.clear.addEventListener("click", () => clearCollection("supplies", "insumos"));
  elements.supplies.table.addEventListener("click", handleTableClick);

  elements.wood.form.addEventListener("submit", handleWoodSubmit);
  elements.wood.cancel.addEventListener("click", resetWoodForm);
  elements.wood.search.addEventListener("input", renderWood);
  elements.wood.clear.addEventListener("click", () => clearCollection("wood", "madera"));
  elements.wood.table.addEventListener("click", handleTableClick);

  elements.furniture.form.addEventListener("submit", handleFurnitureSubmit);
  elements.furniture.cancel.addEventListener("click", () => {
    resetFurnitureForm();
    closeFurnitureComposer();
  });
  elements.furniture.photo.addEventListener("change", handleFurniturePhotoChange);
  elements.furniture.removePhoto.addEventListener("click", removeFurniturePhoto);
  elements.furniture.showForm.addEventListener("click", toggleFurnitureComposer);
  elements.furniture.search.addEventListener("input", renderFurniture);
  elements.furniture.clear.addEventListener("click", () => clearCollection("furniture", "muebles"));
  elements.furniture.table.addEventListener("click", handleTableClick);
  elements.furniture.addSupply.addEventListener("click", addFurnitureSupplyLine);
  elements.furniture.addWood.addEventListener("click", addFurnitureWoodLine);
  elements.furniture.supplyLines.addEventListener("input", handleFurnitureLineChange);
  elements.furniture.supplyLines.addEventListener("change", handleFurnitureLineChange);
  elements.furniture.supplyLines.addEventListener("click", handleFurnitureLineClick);
  elements.furniture.woodLines.addEventListener("input", handleFurnitureLineChange);
  elements.furniture.woodLines.addEventListener("change", handleFurnitureLineChange);
  elements.furniture.woodLines.addEventListener("click", handleFurnitureLineClick);

  elements.invoices.form.addEventListener("submit", handleInvoiceSubmit);
  elements.invoices.cancel.addEventListener("click", () => {
    resetInvoiceForm();
    closeInvoiceComposer();
  });
  elements.invoices.showForm.addEventListener("click", toggleInvoiceComposer);
  elements.invoices.search.addEventListener("input", renderInvoices);
  elements.invoices.clear.addEventListener("click", () => clearCollection("invoices", "facturas"));
  elements.invoices.table.addEventListener("click", handleTableClick);
  elements.invoices.furniture.addEventListener("change", handleInvoiceChange);
  elements.invoices.price.addEventListener("input", handleInvoiceChange);
  elements.invoices.shippingRequired.addEventListener("change", handleInvoiceChange);
  elements.invoices.shippingPrice.addEventListener("input", handleInvoiceChange);
  elements.invoices.location.addEventListener("input", handleInvoiceChange);

  elements.modal.close.addEventListener("click", closeModal);
  elements.modal.body.addEventListener("click", handleModalBodyClick);
  elements.modal.cancel.addEventListener("click", closeModal);
  elements.modal.confirm.addEventListener("click", () => {
    const action = modalConfirmAction;
    closeModal();
    if (action) action();
  });
  elements.modal.root.addEventListener("click", (event) => {
    if (event.target === elements.modal.root) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.root.classList.contains("hidden")) closeModal();
  });

}

bindEvents();
renderAll();
initFirebaseSync();
