const STORAGE_KEY = "dilucca-management-v1";
const INVOICE_LOGO_PATH = "assets/di-lucca-logo-pdf.png";
const FIREBASE_SDK_VERSION = "12.14.0";
const DATA_COLLECTIONS = ["supplies", "wood", "furniture", "invoices", "orders"];
const FIREBASE_COLLECTIONS = [...DATA_COLLECTIONS, "settings"];
const DEFAULT_SETTINGS = [{ id: "pricing", suggestedMarkup: 80 }];
const INVOICE_STATUSES = ["Pendiente", "Entregado", "Cancelado"];

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
      category: "Terminación",
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
      wood: [
        {
          woodId: "wood-1",
          cuts: [
            { lengthMm: 1800, widthMm: 600, qty: 2 },
            { lengthMm: 900, widthMm: 500, qty: 2 },
          ],
        },
      ],
      createdAt: "2026-05-22T12:00:00.000Z",
    },
  ],
  invoices: [
    {
      id: "invoice-1",
      furnitureId: "furniture-1",
      client: "Cliente ejemplo",
      phone: "Sin teléfono",
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
  orders: [],
  settings: structuredClone(DEFAULT_SETTINGS),
};

const state = loadState();
let furnitureDraft = createFurnitureDraft();
let orderDraft = [];
let currentOrderId = "";
let modalConfirmAction = null;
let currentFurniturePhoto = "";
let storageWarningShown = false;
let cloudSaveTimer = null;
let activeStockPanel = "supplies";
let modalCancelAction = null;

const cloudSync = {
  enabled: false,
  ready: false,
  saving: false,
  db: null,
  auth: null,
  user: null,
  refs: {},
  snapshots: {},
  modules: {},
  businessId: "",
  unsubscribes: [],
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
  logout: $("#logout-button"),
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
  },
  furniture: {
    form: $("#furniture-form"),
    builder: $("#furniture-builder"),
    showForm: $("#show-furniture-form"),
    id: $("#furniture-id"),
    name: $("#furniture-name"),
    notes: $("#furniture-notes"),
    length: $("#furniture-length"),
    width: $("#furniture-width"),
    height: $("#furniture-height"),
    photo: $("#furniture-photo"),
    photoPreview: $("#furniture-photo-preview"),
    photoImage: $("#furniture-photo-image"),
    removePhoto: $("#remove-furniture-photo"),
    submit: $("#furniture-submit"),
    cancel: $("#furniture-cancel"),
    search: $("#furniture-search"),
    table: $("#furniture-table"),
    count: $("#furniture-count-label"),
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
    deposit: $("#invoice-deposit"),
    status: $("#invoice-status"),
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
    cost: $("#invoice-cost"),
    total: $("#invoice-total"),
    profit: $("#invoice-profit"),
    depositLabel: $("#invoice-deposit-label"),
    balanceLabel: $("#invoice-balance-label"),
    shippingLabel: $("#invoice-shipping-label"),
    shippingLocation: $("#invoice-shipping-location"),
  },
  orders: {
    form: $("#order-form"),
    name: $("#order-name"),
    furniture: $("#order-furniture"),
    qty: $("#order-qty"),
    table: $("#order-table"),
    count: $("#order-count-label"),
    itemsCount: $("#order-items-count"),
    totalQty: $("#order-total-qty"),
    totalCost: $("#order-total-cost"),
    clear: $("#clear-order"),
    save: $("#save-order"),
    export: $("#export-order"),
    savedTable: $("#saved-order-table"),
    savedCount: $("#saved-order-count-label"),
  },
  stock: {
    supplyLabel: $("#stock-supply-label"),
    woodLabel: $("#stock-wood-label"),
    furnitureLabel: $("#stock-furniture-label"),
    supplySearch: $("#stock-supply-search"),
    woodSearch: $("#stock-wood-search"),
    furnitureSearch: $("#stock-furniture-search"),
    supplyList: $("#stock-supply-list"),
    woodList: $("#stock-wood-list"),
    furnitureList: $("#stock-furniture-list"),
    mobileSelect: $("#stock-mobile-select"),
    panels: $$("[data-stock-panel]"),
  },
  metrics: {
    period: $("#dashboard-period"),
    salesCount: $("#metric-sales-count"),
    salesPeriod: $("#metric-sales-period"),
    salesIncome: $("#metric-sales-income"),
    salesProfit: $("#metric-sales-profit"),
    furnitureStockCost: $("#metric-furniture-stock-cost"),
    lowSupplyCount: $("#metric-low-supply-count"),
    accumulatedPeriod: $("#metric-accumulated-period"),
    accumulatedSales: $("#metric-accumulated-sales"),
    accumulatedIncome: $("#metric-accumulated-income"),
    accumulatedProfit: $("#metric-accumulated-profit"),
    accumulatedStockCost: $("#metric-accumulated-stock-cost"),
    lowStockCountLabel: $("#low-stock-count-label"),
    lowStockList: $("#low-stock-list"),
  },
  settings: {
    suggestedMargin: $("#suggested-margin"),
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
  auth: {
    gate: $("#auth-gate"),
    form: $("#login-form"),
    email: $("#login-email"),
    password: $("#login-password"),
    passwordToggle: $("#login-password-toggle"),
    submit: $("#login-submit"),
    message: $("#login-message"),
  },
};

function defaultSettings() {
  return structuredClone(DEFAULT_SETTINGS);
}

function normalizeSettings(settings = []) {
  const pricing = Array.isArray(settings) ? settings.find((item) => item?.id === "pricing") : null;
  const suggestedMarkup = Number(pricing?.suggestedMarkup);

  return [
    {
      id: "pricing",
      suggestedMarkup: Number.isFinite(suggestedMarkup) ? Math.max(0, suggestedMarkup) : 80,
    },
  ];
}

function emptyState() {
  return { supplies: [], wood: [], furniture: [], invoices: [], orders: [], settings: defaultSettings() };
}

function normalizeState(source = emptyState()) {
  return {
    supplies: Array.isArray(source.supplies) ? source.supplies : [],
    wood: Array.isArray(source.wood) ? source.wood : [],
    furniture: Array.isArray(source.furniture) ? source.furniture : [],
    invoices: Array.isArray(source.invoices) ? source.invoices : [],
    orders: Array.isArray(source.orders) ? source.orders : [],
    settings: normalizeSettings(source.settings),
  };
}

function replaceState(nextState) {
  const normalized = normalizeState(nextState);
  FIREBASE_COLLECTIONS.forEach((collectionName) => {
    state[collectionName] = normalized[collectionName];
  });
}

function hasStateData(source = state) {
  return DATA_COLLECTIONS.some((collectionName) => source[collectionName]?.length);
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

function setAuthScreen(mode) {
  document.body.classList.toggle("auth-loading", mode === "loading");
  document.body.classList.toggle("auth-required", mode === "required");
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
        "El navegador no tenía espacio para guardar las fotos. Guardé los datos sin fotos para no perder insumos, madera, muebles y ventas.",
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
    wood: [createFurnitureWoodLine()],
  };
}

function createFurnitureWoodLine() {
  return {
    woodId: "",
    cuts: [createWoodCut()],
  };
}

function createWoodCut() {
  return {
    lengthMm: 0,
    widthMm: 0,
    qty: 1,
  };
}

function normalizeWoodLine(line = {}) {
  const cuts = Array.isArray(line.cuts)
    ? line.cuts.map((cut) => ({
        lengthMm: Number(cut.lengthMm || 0),
        widthMm: Number(cut.widthMm || 0),
        qty: Number(cut.qty || 0),
      }))
    : [];

  return {
    woodId: line.woodId || "",
    qty: Number(line.qty || 0),
    cuts: cuts.length ? cuts : [createWoodCut()],
  };
}

function normalizeFurnitureDraft(draft) {
  return {
    supplies: draft.supplies?.length ? draft.supplies : [{ supplyId: "", qty: 0 }],
    wood: draft.wood?.length ? draft.wood.map(normalizeWoodLine) : [createFurnitureWoodLine()],
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

function woodStockM2(item) {
  const stock = Number(item.stockM2);
  return Number.isFinite(stock) ? Math.max(0, stock) : Number(item.used || 0);
}

function furnitureSupplyLineCost(line) {
  const item = state.supplies.find((entry) => entry.id === line.supplyId);
  return item ? Number(line.qty || 0) * supplyUnitPrice(item) : 0;
}

function woodCutM2(cut) {
  return (Number(cut.lengthMm || 0) * Number(cut.widthMm || 0) * Number(cut.qty || 0)) / 1000000;
}

function furnitureWoodLineM2(line) {
  const cuts = Array.isArray(line.cuts) ? line.cuts : [];
  const cutsM2 = cuts.reduce((sum, cut) => sum + woodCutM2(cut), 0);
  return cutsM2 > 0 ? cutsM2 : Number(line.qty || 0);
}

function furnitureWoodLineCost(line) {
  const item = state.wood.find((entry) => entry.id === line.woodId);
  return item ? furnitureWoodLineM2(line) * woodUsefulM2Cost(item) : 0;
}

function furnitureSupplyTotal(item) {
  return (item.supplies || []).reduce((sum, line) => sum + furnitureSupplyLineCost(line), 0);
}

function furnitureWoodTotal(item) {
  return (item.wood || []).reduce((sum, line) => sum + furnitureWoodLineCost(line), 0);
}

function furnitureWoodM2Total(item) {
  return (item.wood || []).reduce((sum, line) => sum + furnitureWoodLineM2(line), 0);
}

function furnitureTotal(item) {
  return furnitureSupplyTotal(item) + furnitureWoodTotal(item);
}

function pricingSettings() {
  return normalizeSettings(state.settings)[0];
}

function suggestedMarkup() {
  return pricingSettings().suggestedMarkup;
}

function suggestedPriceLabel() {
  return `Sugerido ${formatNumber.format(suggestedMarkup())}%`;
}

function furnitureSuggestedPrice(item) {
  return furnitureTotal(item) * (1 + suggestedMarkup() / 100);
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

function furnitureDimensionsText(item) {
  const length = Number(item.lengthMm || 0);
  const width = Number(item.widthMm || 0);
  const height = Number(item.heightMm || 0);
  if (!length && !width && !height) return "";

  return [
    length ? `Largo ${formatNumber.format(length)} mm` : "",
    width ? `Ancho ${formatNumber.format(width)} mm` : "",
    height ? `Alto ${formatNumber.format(height)} mm` : "",
  ]
    .filter(Boolean)
    .join(" - ");
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

function hasExplicitDeposit(invoice) {
  return Object.prototype.hasOwnProperty.call(invoice, "deposit");
}

function invoiceDeposit(invoice) {
  const price = Math.max(0, Number(invoice.price || 0));
  if (!hasExplicitDeposit(invoice)) return price;
  return Math.min(Math.max(0, Number(invoice.deposit || 0)), price);
}

function invoiceBalance(invoice) {
  return Math.max(0, Number(invoice.price || 0) - invoiceDeposit(invoice));
}

function invoiceStatus(invoice) {
  const status = cleanText(invoice.status);
  return INVOICE_STATUSES.includes(status) ? status : "Pendiente";
}

function invoiceStatusClass(invoice) {
  return invoiceStatus(invoice)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}

function invoicePaidAmount(invoice) {
  return invoiceStatus(invoice) === "Cancelado" ? 0 : invoiceDeposit(invoice);
}

function invoiceProfit(invoice) {
  if (invoiceStatus(invoice) === "Cancelado") return 0;
  return Number(invoice.price || 0) - invoiceFurnitureCost(invoice);
}

function invoiceMonthKey(invoice) {
  const value = cleanText(invoice.date || invoice.createdAt);
  const match = value.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "";
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return "Sin fecha";

  const label = new Date(year, month - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dashboardMonthKeys() {
  return Array.from(new Set(state.invoices.map(invoiceMonthKey).filter(Boolean))).sort((a, b) =>
    b.localeCompare(a),
  );
}

function dashboardSalesTotals(invoices) {
  return invoices.reduce(
    (totals, invoice) => ({
      count: totals.count + 1,
      income: totals.income + invoicePaidAmount(invoice),
      profit: totals.profit + invoiceProfit(invoice),
    }),
    { count: 0, income: 0, profit: 0 },
  );
}

function furnitureStockCostTotal() {
  return state.furniture.reduce((sum, item) => sum + Number(item.stock || 0) * furnitureTotal(item), 0);
}

function supplyStockUnits(item) {
  return Number(item.packQty || 0) * Number(item.stock || 0);
}

function lowStockSupplies() {
  return state.supplies
    .map((item) => ({
      item,
      units: supplyStockUnits(item),
    }))
    .filter(({ units }) => units <= 0)
    .sort((a, b) => a.units - b.units || sortSuppliesByName(a.item, b.item));
}

function saleStockDiscountSummary(furniture) {
  if (!furniture) return `<p class="confirm-copy">No se encontró el mueble elegido.</p>`;

  const supplyLines = (furniture.supplies || []).filter((line) => line.supplyId && Number(line.qty || 0) > 0);
  const woodLines = (furniture.wood || []).filter((line) => line.woodId && furnitureWoodLineM2(line) > 0);
  const woodTotal = woodLines.reduce((sum, line) => sum + furnitureWoodLineM2(line), 0);

  return `
    <p class="confirm-copy">La venta se guardará y se descontará del stock disponible.</p>
    <div class="detail-section">
      <div class="detail-row"><strong>Mueble</strong><span>1 un.</span></div>
      <div class="detail-row"><strong>Insumos</strong><span>${formatNumber.format(supplyLines.length)} líneas</span></div>
      <div class="detail-row"><strong>Madera</strong><span>${formatNumber.format(woodTotal)} m2 usados</span></div>
    </div>
  `;
}

function applySaleStockDiscount(furnitureId) {
  const furniture = furnitureById(furnitureId);
  if (!furniture) return;

  state.furniture = state.furniture.map((item) =>
    item.id === furnitureId
      ? {
          ...item,
          stock: Math.max(0, Number(item.stock || 0) - 1),
        }
      : item,
  );

  (furniture.supplies || []).forEach((line) => {
    const qty = Number(line.qty || 0);
    if (!line.supplyId || qty <= 0) return;

    state.supplies = state.supplies.map((item) => {
      if (item.id !== line.supplyId) return item;
      const packQty = Number(item.packQty || 0);
      const nextUnits = Math.max(0, supplyStockUnits(item) - qty);
      return {
        ...item,
        stock: packQty > 0 ? nextUnits / packQty : 0,
      };
    });
  });

  (furniture.wood || []).forEach((line) => {
    const m2 = furnitureWoodLineM2(line);
    if (!line.woodId || m2 <= 0) return;

    state.wood = state.wood.map((item) =>
      item.id === line.woodId
        ? {
            ...item,
            stockM2: Math.max(0, woodStockM2(item) - m2),
          }
        : item,
    );
  });
}

function orderLineFurniture(line) {
  return furnitureById(line.furnitureId);
}

function orderLineQty(line) {
  return Math.max(1, Number(line.qty || 1));
}

function orderLineSupplyCost(line) {
  const furniture = orderLineFurniture(line);
  return furniture ? furnitureSupplyTotal(furniture) : 0;
}

function orderLineWoodCost(line) {
  const furniture = orderLineFurniture(line);
  return furniture ? furnitureWoodTotal(furniture) : 0;
}

function orderLineUnitCost(line) {
  const furniture = orderLineFurniture(line);
  return furniture ? furnitureTotal(furniture) : 0;
}

function orderLineTotal(line) {
  return orderLineUnitCost(line) * orderLineQty(line);
}

function orderTotalQty() {
  return orderDraft.reduce((sum, line) => sum + orderLineQty(line), 0);
}

function orderTotalCost() {
  return orderDraft.reduce((sum, line) => sum + orderLineTotal(line), 0);
}

function savedOrderLineCount(order) {
  return Array.isArray(order.lines) ? order.lines.length : 0;
}

function savedOrderTotalQty(order) {
  return (order.lines || []).reduce((sum, line) => sum + orderLineQty(line), 0);
}

function currentOrderName() {
  const typedName = cleanText(elements.orders.name.value);
  if (typedName) return typedName;
  return `Pedido ${new Date().toLocaleDateString("es-AR")}`;
}

function normalizeOrderLines(lines = []) {
  return lines
    .filter((line) => furnitureById(line.furnitureId))
    .map((line) => ({
      furnitureId: line.furnitureId,
      qty: orderLineQty(line),
    }));
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
  elements.menuToggle.setAttribute("aria-label", "Abrir menú");
}

function toggleMobileMenu() {
  const isOpen = elements.sidebar.classList.toggle("menu-open");
  elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
  elements.menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
}

function matchesSupplySearch(item) {
  const query = elements.supplies.search.value.trim().toLowerCase();
  if (!query) return true;
  return [item.name, item.category, item.supplier, supplyUnit(item)].some((value) =>
    String(value || "").toLowerCase().includes(query),
  );
}

function sortSuppliesByName(a, b) {
  return cleanText(a.name).localeCompare(cleanText(b.name), "es", {
    numeric: true,
    sensitivity: "base",
  });
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
  return [item.name, item.notes, furnitureDimensionsText(item)].some((value) => String(value || "").toLowerCase().includes(query));
}

function matchesInvoiceSearch(item) {
  const query = elements.invoices.search.value.trim().toLowerCase();
  if (!query) return true;
  return [
    item.client,
    item.phone,
    item.location,
    item.payment,
    item.notes,
    furnitureNameById(item.furnitureId),
    invoiceStatus(item),
  ].some((value) => String(value || "").toLowerCase().includes(query));
}

function renderSupplies() {
  const rows = state.supplies.filter(matchesSupplySearch).sort(sortSuppliesByName);
  elements.supplies.table.innerHTML = "";
  elements.supplies.count.textContent = `${rows.length} ítems`;

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
  const selectedLabel = supplySearchLabelById(line.supplyId);

  return `
    <div class="line-row" data-kind="supply" data-index="${index}">
      <label class="line-picker">
        <span>Insumo</span>
        <input class="line-search" data-field="supplyFilter" type="search" value="${escapeHtml(selectedLabel)}" placeholder="Buscar insumo" autocomplete="off" />
        <input data-field="supplyId" type="hidden" value="${escapeHtml(line.supplyId || "")}" />
        <div class="line-dropdown hidden" data-line-options="supply"></div>
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
  const m2 = furnitureWoodLineM2(line);
  const cuts = Array.isArray(line.cuts) && line.cuts.length ? line.cuts : [createWoodCut()];
  const selectedLabel = woodSearchLabelById(line.woodId);

  return `
    <div class="wood-line" data-kind="wood" data-index="${index}" data-legacy-qty="${Number(line.qty || 0)}">
      <div class="wood-line-header">
        <label class="line-picker">
          <span>Madera</span>
          <input class="line-search" data-field="woodFilter" type="search" value="${escapeHtml(selectedLabel)}" placeholder="Buscar madera" autocomplete="off" />
          <input data-field="woodId" type="hidden" value="${escapeHtml(line.woodId || "")}" />
          <div class="line-dropdown hidden" data-line-options="wood"></div>
        </label>
        <div class="line-subtotal" data-subtotal>
          ${formatCurrency.format(furnitureWoodLineCost(line))}
          <small data-m2>${formatNumber.format(m2)} m2</small>
        </div>
        <button class="table-action delete" type="button" data-remove-furniture-wood="${index}">Quitar</button>
      </div>
      <button class="secondary-button cut-add" type="button" data-add-wood-cut="${index}">+ Agregar corte</button>
      <div class="cut-list">
        ${cuts.map((cut, cutIndex) => furnitureWoodCutTemplate(cut, index, cutIndex)).join("")}
      </div>
    </div>
  `;
}

function furnitureWoodCutTemplate(cut, woodIndex, cutIndex) {
  return `
    <div class="cut-row" data-cut-index="${cutIndex}">
      <label>
        <span>Largo mm</span>
        <input data-field="lengthMm" type="number" min="0" step="1" value="${Number(cut.lengthMm || 0)}" />
      </label>
      <label>
        <span>Ancho mm</span>
        <input data-field="widthMm" type="number" min="0" step="1" value="${Number(cut.widthMm || 0)}" />
      </label>
      <label>
        <span>Cantidad</span>
        <input data-field="cutQty" type="number" min="0" step="1" value="${Number(cut.qty || 0)}" />
      </label>
      <div class="cut-m2" data-cut-m2>${formatNumber.format(woodCutM2(cut))} m2</div>
      <button class="table-action delete" type="button" data-remove-wood-cut="${woodIndex}:${cutIndex}">Quitar</button>
    </div>
  `;
}

function matchesSupplyOptionSearch(item, query) {
  if (!query) return true;
  return [supplySearchLabel(item), item.name, item.category, item.supplier, supplyUnit(item)].some((value) =>
    String(value || "").toLowerCase().includes(query),
  );
}

function supplyOptions(selectedId, query = "") {
  const cleanQuery = cleanText(query).toLowerCase();
  const options = [`<option value="">Elegí insumo</option>`];
  state.supplies
    .filter((item) => item.id === selectedId || matchesSupplyOptionSearch(item, cleanQuery))
    .sort(sortSuppliesByName)
    .forEach((item) => {
      const selected = item.id === selectedId ? " selected" : "";
      const label = supplySearchLabel(item);
      options.push(`<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(label)}</option>`);
    });
  return options.join("");
}

function supplyOptionButtons(selectedId, query = "") {
  const cleanQuery = cleanText(query).toLowerCase();
  const rows = state.supplies.filter((item) => matchesSupplyOptionSearch(item, cleanQuery)).sort(sortSuppliesByName);

  if (!rows.length) return `<div class="line-dropdown-empty">Sin resultados.</div>`;

  return rows
    .map((item) => {
      const active = item.id === selectedId ? " is-selected" : "";
      return `<button class="line-option${active}" type="button" data-select-line-option="supply" data-value="${escapeHtml(item.id)}">${escapeHtml(supplySearchLabel(item))}</button>`;
    })
    .join("");
}

function supplySearchLabel(item) {
  const detail = [item.category || "General", item.supplier].filter(Boolean).join(" - ");
  return `${item.name}${detail ? ` (${detail})` : ""} - ${formatCurrency.format(supplyUnitPrice(item))} / ${supplyUnit(item)}`;
}

function supplySearchLabelById(id) {
  const item = state.supplies.find((entry) => entry.id === id);
  return item ? supplySearchLabel(item) : "";
}

function supplyIdBySearchLabel(label) {
  const cleanLabel = cleanText(label);
  return state.supplies.find((item) => supplySearchLabel(item) === cleanLabel)?.id || "";
}

function supplySearchOptions() {
  return [...state.supplies]
    .sort(sortSuppliesByName)
    .map((item) => `<option value="${escapeHtml(supplySearchLabel(item))}"></option>`)
    .join("");
}

function matchesWoodOptionSearch(item, query) {
  if (!query) return true;
  return [woodSearchLabel(item), item.type, item.color, item.supplier, item.thickness].some((value) =>
    String(value || "").toLowerCase().includes(query),
  );
}

function sortWoodByDescription(a, b) {
  return cleanText(`${a.type} ${a.thickness} ${a.color}`).localeCompare(cleanText(`${b.type} ${b.thickness} ${b.color}`), "es", {
    numeric: true,
    sensitivity: "base",
  });
}

function woodOptions(selectedId, query = "") {
  const cleanQuery = cleanText(query).toLowerCase();
  const options = [`<option value="">Elegí madera</option>`];
  state.wood
    .filter((item) => item.id === selectedId || matchesWoodOptionSearch(item, cleanQuery))
    .sort(sortWoodByDescription)
    .forEach((item) => {
    const selected = item.id === selectedId ? " selected" : "";
    const label = woodSearchLabel(item);
    options.push(`<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(label)}</option>`);
    });
  return options.join("");
}

function woodOptionButtons(selectedId, query = "") {
  const cleanQuery = cleanText(query).toLowerCase();
  const rows = state.wood.filter((item) => matchesWoodOptionSearch(item, cleanQuery)).sort(sortWoodByDescription);

  if (!rows.length) return `<div class="line-dropdown-empty">Sin resultados.</div>`;

  return rows
    .map((item) => {
      const active = item.id === selectedId ? " is-selected" : "";
      return `<button class="line-option${active}" type="button" data-select-line-option="wood" data-value="${escapeHtml(item.id)}">${escapeHtml(woodSearchLabel(item))}</button>`;
    })
    .join("");
}

function woodSearchLabel(item) {
  const detail = [item.color, item.supplier].filter(Boolean).join(" - ");
  return `${item.type} ${item.thickness} mm${detail ? ` (${detail})` : ""} - ${formatCurrency.format(woodUsefulM2Cost(item))} / m2`;
}

function woodSearchLabelById(id) {
  const item = state.wood.find((entry) => entry.id === id);
  return item ? woodSearchLabel(item) : "";
}

function woodIdBySearchLabel(label) {
  const cleanLabel = cleanText(label);
  return state.wood.find((item) => woodSearchLabel(item) === cleanLabel)?.id || "";
}

function woodSearchOptions() {
  return [...state.wood]
    .sort(sortWoodByDescription)
    .map((item) => `<option value="${escapeHtml(woodSearchLabel(item))}"></option>`)
    .join("");
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
    const woodM2 = furnitureWoodM2Total(item);
    const dimensions = furnitureDimensionsText(item);
    card.innerHTML = `
      <div class="furniture-card-media">
        ${
          item.photo
            ? `<img class="furniture-card-photo" src="${escapeHtml(item.photo)}" alt="${escapeHtml(item.name)}" />`
            : `<span>${escapeHtml(furnitureInitials(item.name))}</span>`
        }
      </div>
      <div class="furniture-card-body">
        <div>
          <h4>${escapeHtml(item.name)}</h4>
          <p>${escapeHtml(item.notes || "Sin detalle")}</p>
          ${dimensions ? `<p>${escapeHtml(dimensions)}</p>` : ""}
        </div>
        <div class="furniture-card-stats">
          <span>Insumos <strong>${formatNumber.format(supplyCount)}</strong></span>
          <span>Madera <strong>${formatNumber.format(woodM2)} m2</strong></span>
          <span>Costo <strong>${formatCurrency.format(furnitureTotal(item))}</strong></span>
          <span>${escapeHtml(suggestedPriceLabel())} <strong>${formatCurrency.format(furnitureSuggestedPrice(item))}</strong></span>
        </div>
      </div>
      <div class="furniture-card-actions">
        <button class="table-action" type="button" data-duplicate-furniture="${item.id}">Duplicar</button>
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
  elements.invoices.count.textContent = `${rows.length} ventas`;

  if (!rows.length) {
    elements.invoices.table.innerHTML = `<div class="empty-state">Sin ventas cargadas.</div>`;
    return;
  }

  rows.forEach((item) => {
    const card = document.createElement("article");
    card.className = `invoice-card clickable-row status-card-${invoiceStatusClass(item)}`;
    card.dataset.viewInvoice = item.id;
    card.innerHTML = `
      <div>
        <h4>${escapeHtml(item.client)}</h4>
        <p>${escapeHtml(furnitureNameById(item.furnitureId))}</p>
        <span class="status-pill status-${escapeHtml(invoiceStatusClass(item))}">${escapeHtml(invoiceStatus(item))}</span>
      </div>
      <div class="invoice-card-stats">
        <span>Precio <strong>${formatCurrency.format(Number(item.price || 0))}</strong></span>
        <span>Seña <strong>${formatCurrency.format(invoiceDeposit(item))}</strong></span>
        <span>Saldo <strong>${formatCurrency.format(invoiceBalance(item))}</strong></span>
        <span>Envío <strong>${item.shippingRequired ? formatCurrency.format(invoiceShippingCost(item)) : "No"}</strong></span>
        <span>Total <strong>${formatCurrency.format(invoiceTotal(item))}</strong></span>
        <span>Ganancia <strong>${formatCurrency.format(invoiceProfit(item))}</strong></span>
      </div>
      <p>${escapeHtml(item.shippingRequired ? item.location || "Envío sin ubicación" : "Retira / sin envío")}</p>
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
  const currentPeriod = elements.metrics.period.value || "all";
  const monthKeys = dashboardMonthKeys();
  const availablePeriods = new Set(["all", ...monthKeys]);
  const selectedPeriod = availablePeriods.has(currentPeriod) ? currentPeriod : "all";
  const periodOptions = [
    `<option value="all">Acumulado</option>`,
    ...monthKeys.map((key) => `<option value="${key}">${escapeHtml(monthLabel(key))}</option>`),
  ];
  elements.metrics.period.innerHTML = periodOptions.join("");
  elements.metrics.period.value = selectedPeriod;

  const periodInvoices =
    selectedPeriod === "all" ? state.invoices : state.invoices.filter((invoice) => invoiceMonthKey(invoice) === selectedPeriod);
  const periodTotals = dashboardSalesTotals(periodInvoices);
  const accumulatedTotals = dashboardSalesTotals(state.invoices);
  const stockCost = furnitureStockCostTotal();
  const lowSupplies = lowStockSupplies();
  const periodLabel = selectedPeriod === "all" ? "Acumulado" : monthLabel(selectedPeriod);

  elements.metrics.salesCount.textContent = formatNumber.format(periodTotals.count);
  elements.metrics.salesPeriod.textContent = periodLabel;
  elements.metrics.salesIncome.textContent = formatCurrency.format(periodTotals.income);
  elements.metrics.salesProfit.textContent = formatCurrency.format(periodTotals.profit);
  elements.metrics.furnitureStockCost.textContent = formatCurrency.format(stockCost);
  elements.metrics.lowSupplyCount.textContent = formatNumber.format(lowSupplies.length);
  elements.metrics.accumulatedPeriod.textContent = "Total histórico";
  elements.metrics.accumulatedSales.textContent = formatNumber.format(accumulatedTotals.count);
  elements.metrics.accumulatedIncome.textContent = formatCurrency.format(accumulatedTotals.income);
  elements.metrics.accumulatedProfit.textContent = formatCurrency.format(accumulatedTotals.profit);
  elements.metrics.accumulatedStockCost.textContent = formatCurrency.format(stockCost);

  renderLowStockSupplies(lowSupplies);
}

function renderLowStockSupplies(rows = lowStockSupplies()) {
  elements.metrics.lowStockList.innerHTML = "";
  elements.metrics.lowStockCountLabel.textContent = `${rows.length} ítems`;

  if (!rows.length) {
    elements.metrics.lowStockList.innerHTML = `<div class="empty-state">Sin insumos sin stock.</div>`;
    return;
  }

  rows.forEach(({ item, units }) => {
    const row = document.createElement("div");
    row.className = `compact-item${units <= 0 ? " stock-empty" : ""}`;
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.category || "General")}</small>
      </div>
      <span>${formatNumber.format(units)} ${escapeHtml(supplyUnit(item))}</span>
    `;
    elements.metrics.lowStockList.appendChild(row);
  });
}

function renderSettings() {
  if (!elements.settings.suggestedMargin) return;
  if (document.activeElement === elements.settings.suggestedMargin) return;
  elements.settings.suggestedMargin.value = String(suggestedMarkup());
}

function renderStock() {
  renderStockSupplies();
  renderStockWood();
  renderStockFurniture();
  updateStockPanelVisibility();
}

function renderStockSupplies() {
  const query = cleanText(elements.stock.supplySearch.value).toLowerCase();
  const rows = state.supplies
    .filter((item) =>
      [item.name, item.category, item.supplier, supplyUnit(item)].some((value) =>
        String(value || "").toLowerCase().includes(query),
      ),
    )
    .sort(sortSuppliesByName);
  elements.stock.supplyList.innerHTML = "";
  elements.stock.supplyLabel.textContent = `${rows.length} ítems`;

  if (!rows.length) {
    elements.stock.supplyList.innerHTML = `<div class="empty-state">${state.supplies.length ? "Sin resultados." : "Sin insumos cargados."}</div>`;
    return;
  }

  rows.forEach((item) => {
    const unit = supplyUnit(item);
    const stockUnits = Number(item.packQty || 0) * Number(item.stock || 0);
    const card = document.createElement("article");
    card.className = `stock-item${stockUnits <= 0 ? " stock-empty" : ""}`;
    card.innerHTML = `
      <div class="stock-description">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.category || "General")}</small>
      </div>
      <label class="stock-edit">
        <input data-stock-supply="${escapeHtml(item.id)}" type="number" min="0" step="0.01" value="${Number(stockUnits || 0)}" />
        <span>${escapeHtml(unit)}</span>
      </label>
    `;
    elements.stock.supplyList.appendChild(card);
  });
}

function renderStockWood() {
  const query = cleanText(elements.stock.woodSearch.value).toLowerCase();
  const rows = state.wood.filter((item) =>
    [item.type, item.color, item.supplier, item.thickness].some((value) =>
      String(value || "").toLowerCase().includes(query),
    ),
  );
  elements.stock.woodList.innerHTML = "";
  elements.stock.woodLabel.textContent = `${rows.length} lotes`;

  if (!rows.length) {
    elements.stock.woodList.innerHTML = `<div class="empty-state">${state.wood.length ? "Sin resultados." : "Sin madera cargada."}</div>`;
    return;
  }

  rows.forEach((item) => {
    const stockM2 = woodStockM2(item);
    const card = document.createElement("article");
    card.className = `stock-item${stockM2 <= 0 ? " stock-empty" : ""}`;
    card.innerHTML = `
      <div class="stock-description">
        <strong>${escapeHtml(item.type)} ${formatNumber.format(item.thickness)} mm</strong>
        <small>${escapeHtml(item.color)}</small>
      </div>
      <label class="stock-edit">
        <input data-stock-wood="${escapeHtml(item.id)}" type="number" min="0" max="${Number(item.area || item.used || 0)}" step="0.01" value="${stockM2}" />
        <span>m2</span>
      </label>
    `;
    elements.stock.woodList.appendChild(card);
  });
}

function renderStockFurniture() {
  const query = cleanText(elements.stock.furnitureSearch.value).toLowerCase();
  const rows = state.furniture.filter((item) =>
    [item.name, item.notes].some((value) => String(value || "").toLowerCase().includes(query)),
  );
  elements.stock.furnitureList.innerHTML = "";
  elements.stock.furnitureLabel.textContent = `${rows.length} muebles`;

  if (!rows.length) {
    elements.stock.furnitureList.innerHTML = `<div class="empty-state">${state.furniture.length ? "Sin resultados." : "Sin muebles cargados."}</div>`;
    return;
  }

  rows.forEach((item) => {
    const card = document.createElement("article");
    card.className = `stock-item${Number(item.stock || 0) <= 0 ? " stock-empty" : ""}`;
    card.innerHTML = `
      <div class="stock-description">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.notes || "Sin detalle")}</small>
      </div>
      <label class="stock-edit">
        <input data-stock-furniture="${escapeHtml(item.id)}" type="number" min="0" step="1" value="${Number(item.stock || 0)}" />
        <span>un.</span>
      </label>
    `;
    elements.stock.furnitureList.appendChild(card);
  });
}

function updateStockPanelVisibility() {
  if (elements.stock.mobileSelect.value !== activeStockPanel) {
    elements.stock.mobileSelect.value = activeStockPanel;
  }

  elements.stock.panels.forEach((panel) => {
    panel.classList.toggle("stock-panel-active", panel.dataset.stockPanel === activeStockPanel);
  });
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
  renderSettings();
  renderSupplies();
  renderWood();
  renderFurniture();
  renderFurnitureBuilder();
  renderInvoices();
  renderInvoiceFurnitureOptions();
  renderOrders();
  updateInvoiceSummary();
  renderStock();
  renderDashboard();
}

function renderOrderFurnitureOptions(selectedId = elements.orders.furniture.value) {
  const options = [`<option value="">Elegí mueble</option>`];
  state.furniture.forEach((item) => {
    const selected = item.id === selectedId ? " selected" : "";
    const label = `${item.name} - costo ${formatCurrency.format(furnitureTotal(item))}`;
    options.push(`<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(label)}</option>`);
  });
  elements.orders.furniture.innerHTML = options.join("");
}

function renderOrders() {
  orderDraft = orderDraft.filter((line) => furnitureById(line.furnitureId));
  renderOrderFurnitureOptions();
  renderSavedOrders();
  elements.orders.table.innerHTML = "";
  elements.orders.count.textContent = `${orderDraft.length} líneas`;
  elements.orders.itemsCount.textContent = formatNumber.format(orderDraft.length);
  elements.orders.totalQty.textContent = formatNumber.format(orderTotalQty());
  elements.orders.totalCost.textContent = formatCurrency.format(orderTotalCost());

  if (!orderDraft.length) {
    elements.orders.table.appendChild(emptyRow(7));
    return;
  }

  orderDraft.forEach((line, index) => {
    const furniture = orderLineFurniture(line);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(furniture?.name || "Mueble eliminado")}</strong>
        <div class="muted-cell">${escapeHtml(furniture?.notes || "Sin detalle")}</div>
      </td>
      <td class="number">${formatNumber.format(orderLineQty(line))}</td>
      <td class="number">${formatCurrency.format(orderLineSupplyCost(line))}</td>
      <td class="number">${formatCurrency.format(orderLineWoodCost(line))}</td>
      <td class="number">${formatCurrency.format(orderLineUnitCost(line))}</td>
      <td class="number"><strong>${formatCurrency.format(orderLineTotal(line))}</strong></td>
      <td>
        <div class="row-actions">
          <button class="table-action delete" type="button" data-remove-order-line="${index}">Quitar</button>
        </div>
      </td>
    `;
    elements.orders.table.appendChild(tr);
  });
}

function renderSavedOrders() {
  const savedOrders = [...(state.orders || [])].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  elements.orders.savedTable.innerHTML = "";
  elements.orders.savedCount.textContent = `${savedOrders.length} pedidos`;

  if (!savedOrders.length) {
    elements.orders.savedTable.appendChild(emptyRow(5));
    return;
  }

  savedOrders.forEach((order) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(order.name || "Pedido sin nombre")}</strong>
        <div class="muted-cell">${order.id === currentOrderId ? "Abierto ahora" : "Guardado"}</div>
      </td>
      <td>${escapeHtml(formatInvoiceDate((order.updatedAt || order.createdAt || "").slice(0, 10)))}</td>
      <td class="number">${formatNumber.format(savedOrderLineCount(order))}</td>
      <td class="number">${formatNumber.format(savedOrderTotalQty(order))}</td>
      <td>
        <div class="row-actions order-actions">
          <button class="table-action" type="button" data-load-order="${order.id}">Abrir</button>
          <button class="table-action" type="button" data-export-saved-order="${order.id}">Exportar</button>
          <button class="table-action delete" type="button" data-delete-order="${order.id}">Borrar</button>
        </div>
      </td>
    `;
    elements.orders.savedTable.appendChild(tr);
  });
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

  const [appModule, authModule, firestoreModule] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`),
  ]);

  cloudSync.modules = {
    initializeApp: appModule.initializeApp,
    getAuth: authModule.getAuth,
    onAuthStateChanged: authModule.onAuthStateChanged,
    signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
    signOut: authModule.signOut,
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
    setAuthScreen("none");
    updateSyncStatus("Guardado local", "local");
    return;
  }

  try {
    setAuthScreen("loading");
    updateSyncStatus("Iniciar sesión", "saving");
    const firebaseModules = await importFirebaseModules();
    const app = firebaseModules.initializeApp(firebaseConfig);
    cloudSync.auth = firebaseModules.getAuth(app);
    cloudSync.db = firebaseModules.getFirestore(app);
    cloudSync.businessId = getFirebaseBusinessId();
    cloudSync.enabled = true;

    firebaseModules.onAuthStateChanged(
      cloudSync.auth,
      (user) => {
        if (user) {
          handleSignedIn(user);
        } else {
          handleSignedOut();
        }
      },
      (error) => {
        console.error("Firebase auth error", error);
        setAuthScreen("required");
        elements.auth.message.textContent = "No se pudo verificar la sesión.";
        updateSyncStatus("Error de acceso", "error");
      },
    );
  } catch (error) {
    console.error("Firebase init error", error);
    setAuthScreen("required");
    elements.auth.message.textContent = "No se pudo conectar con Firebase.";
    updateSyncStatus("Firebase sin conexión", "error");
  }
}

function stopCloudListeners() {
  cloudSync.unsubscribes.forEach((unsubscribe) => unsubscribe());
  cloudSync.unsubscribes = [];
  cloudSync.refs = {};
  cloudSync.snapshots = {};
  cloudSync.ready = false;
}

function handleSignedOut() {
  cloudSync.user = null;
  stopCloudListeners();
  setAuthScreen("required");
  elements.logout.classList.add("hidden");
  updateSyncStatus("Iniciar sesión", "saving");
}

function handleSignedIn(user) {
  cloudSync.user = user;
  setAuthScreen("none");
  elements.logout.classList.remove("hidden");
  updateSyncStatus("Conectando Firebase", "saving");
  startCloudListeners();
}

function startCloudListeners() {
  stopCloudListeners();
  const { collection, onSnapshot } = cloudSync.modules;

  FIREBASE_COLLECTIONS.forEach((collectionName) => {
    const collectionRef = collection(cloudSync.db, "businesses", cloudSync.businessId, collectionName);
    cloudSync.refs[collectionName] = collectionRef;

    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => handleCloudSnapshot(collectionName, snapshot),
      (error) => {
        console.error("Firebase sync error", error);
        updateSyncStatus("Error Firebase", "error");
      },
    );

    cloudSync.unsubscribes.push(unsubscribe);
  });
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
    orders: cloudSync.snapshots.orders,
    settings: cloudSync.snapshots.settings,
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
  if (!cloudSync.enabled || !cloudSync.user) return;

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
  const localItems = Array.isArray(state[collectionName]) ? state[collectionName] : [];
  const snapshot = await getDocs(collectionRef);
  const localIds = new Set(localItems.map((item) => item.id).filter(Boolean));
  const batch = writeBatch(cloudSync.db);
  let operations = 0;

  localItems.forEach((item) => {
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
  if (!cloudSync.enabled || !cloudSync.user || !cloudSync.ready || cloudSync.saving) return;

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

function authErrorMessage(error) {
  const code = error?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Email o contraseña incorrectos.";
  }
  if (code.includes("too-many-requests")) return "Demasiados intentos. Esperá un momento y probá de nuevo.";
  if (code.includes("network-request-failed")) return "No hay conexión con Firebase.";
  return "No se pudo iniciar sesión.";
}

function togglePasswordVisibility() {
  const isVisible = elements.auth.password.type === "text";
  elements.auth.password.type = isVisible ? "password" : "text";
  elements.auth.passwordToggle.classList.toggle("is-visible", !isVisible);
  elements.auth.passwordToggle.setAttribute("aria-pressed", String(!isVisible));
  elements.auth.passwordToggle.setAttribute(
    "aria-label",
    isVisible ? "Mostrar contraseña" : "Ocultar contraseña",
  );
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  if (!cloudSync.auth) return;

  elements.auth.message.textContent = "Ingresando...";
  elements.auth.submit.disabled = true;

  try {
    await cloudSync.modules.signInWithEmailAndPassword(
      cloudSync.auth,
      cleanText(elements.auth.email.value),
      elements.auth.password.value,
    );
    elements.auth.password.value = "";
    elements.auth.message.textContent = "";
  } catch (error) {
    elements.auth.message.textContent = authErrorMessage(error);
  } finally {
    elements.auth.submit.disabled = false;
  }
}

async function handleLogout() {
  if (!cloudSync.auth) return;

  try {
    await cloudSync.modules.signOut(cloudSync.auth);
  } catch (error) {
    console.error("Firebase logout error", error);
    updateSyncStatus("Error al salir", "error");
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
  furnitureDraft.wood = Array.from(elements.furniture.woodLines.querySelectorAll(".wood-line")).map((row) => {
    return {
      woodId: row.querySelector('[data-field="woodId"]')?.value || "",
      qty: Number(row.dataset.legacyQty || 0),
      cuts: Array.from(row.querySelectorAll(".cut-row")).map((cutRow) => ({
        lengthMm: Number(cutRow.querySelector('[data-field="lengthMm"]')?.value) || 0,
        widthMm: Number(cutRow.querySelector('[data-field="widthMm"]')?.value) || 0,
        qty: Number(cutRow.querySelector('[data-field="cutQty"]')?.value) || 0,
      })),
    };
  });
  furnitureDraft = normalizeFurnitureDraft(furnitureDraft);
}

function updateFurnitureTotal() {
  elements.furniture.supplyLines.querySelectorAll(".line-row").forEach((row, index) => {
    const subtotal = row.querySelector("[data-subtotal]");
    if (subtotal) subtotal.textContent = formatCurrency.format(furnitureSupplyLineCost(furnitureDraft.supplies[index] || {}));
  });

  elements.furniture.woodLines.querySelectorAll(".wood-line").forEach((row, index) => {
    const line = furnitureDraft.wood[index] || {};
    const subtotal = row.querySelector("[data-subtotal]");

    if (subtotal) {
      subtotal.innerHTML = `
        ${formatCurrency.format(furnitureWoodLineCost(line))}
        <small data-m2>${formatNumber.format(furnitureWoodLineM2(line))} m2</small>
      `;
    }

    row.querySelectorAll(".cut-row").forEach((cutRow, cutIndex) => {
      const cutM2 = cutRow.querySelector("[data-cut-m2]");
      if (cutM2) cutM2.textContent = `${formatNumber.format(woodCutM2(line.cuts?.[cutIndex] || {}))} m2`;
    });
  });

  const draftItem = { supplies: furnitureDraft.supplies, wood: furnitureDraft.wood };
  const supplyCount = furnitureDraft.supplies.filter((line) => line.supplyId && line.qty > 0).length;
  const woodM2 = furnitureWoodM2Total(draftItem);
  const total = furnitureTotal(draftItem);

  elements.furniture.total.textContent = formatCurrency.format(total);
  elements.furniture.totalDetail.textContent =
    supplyCount || woodM2
      ? `${formatNumber.format(supplyCount)} insumos - ${formatNumber.format(woodM2)} m2 de madera`
      : "Sin ítems seleccionados";
}

function filterFurnitureSupplyOptions(input) {
  const row = input.closest(".line-row");
  const hiddenInput = row?.querySelector('[data-field="supplyId"]');
  const dropdown = row?.querySelector('[data-line-options="supply"]');
  if (!hiddenInput || !dropdown) return;

  if (input.value !== supplySearchLabelById(hiddenInput.value)) {
    hiddenInput.value = "";
  }

  dropdown.innerHTML = supplyOptionButtons(hiddenInput.value, input.value);
  dropdown.classList.remove("hidden");
  syncFurnitureDraftFromDom();
  updateFurnitureTotal();
}

function filterFurnitureWoodOptions(input) {
  const row = input.closest(".wood-line");
  const hiddenInput = row?.querySelector('[data-field="woodId"]');
  const dropdown = row?.querySelector('[data-line-options="wood"]');
  if (!hiddenInput || !dropdown) return;

  if (input.value !== woodSearchLabelById(hiddenInput.value)) {
    hiddenInput.value = "";
  }

  dropdown.innerHTML = woodOptionButtons(hiddenInput.value, input.value);
  dropdown.classList.remove("hidden");
  syncFurnitureDraftFromDom();
  updateFurnitureTotal();
}

function selectFurnitureLineOption(button) {
  const kind = button.dataset.selectLineOption;
  const id = button.dataset.value || "";
  const picker = button.closest(".line-picker");
  if (!picker) return;

  const input = picker.querySelector(kind === "supply" ? '[data-field="supplyFilter"]' : '[data-field="woodFilter"]');
  const hiddenInput = picker.querySelector(kind === "supply" ? '[data-field="supplyId"]' : '[data-field="woodId"]');
  const dropdown = picker.querySelector("[data-line-options]");
  const label = kind === "supply" ? supplySearchLabelById(id) : woodSearchLabelById(id);

  if (input) input.value = label;
  if (hiddenInput) hiddenInput.value = id;
  if (dropdown) dropdown.classList.add("hidden");

  syncFurnitureDraftFromDom();
  updateFurnitureTotal();
}

function closeLineDropdowns() {
  $$(".line-dropdown").forEach((dropdown) => dropdown.classList.add("hidden"));
}

function handleFurnitureLineChange(event) {
  const field = event?.target?.dataset?.field;

  if (field === "supplyFilter") {
    filterFurnitureSupplyOptions(event.target);
    return;
  }

  if (field === "woodFilter") {
    filterFurnitureWoodOptions(event.target);
    return;
  }

  syncFurnitureDraftFromDom();
  updateFurnitureTotal();
}

function renderInvoiceFurnitureOptions(selectedId = elements.invoices.furniture.value) {
  const options = [`<option value="">Elegí mueble</option>`];
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
    deposit: readNumber(elements.invoices.deposit),
    status: elements.invoices.status.value,
    shippingRequired,
    shippingPrice: shippingRequired ? readNumber(elements.invoices.shippingPrice) : 0,
    location: cleanText(elements.invoices.location.value),
  };
}

function handleOrderSubmit(event) {
  event.preventDefault();
  const furnitureId = elements.orders.furniture.value;
  const qty = Math.max(1, Math.floor(readNumber(elements.orders.qty, 1)));

  if (!furnitureId) {
    alert("Elegí un mueble para agregar al pedido.");
    return;
  }

  const existing = orderDraft.find((line) => line.furnitureId === furnitureId);
  if (existing) {
    existing.qty = orderLineQty(existing) + qty;
  } else {
    orderDraft.push({
      furnitureId,
      qty,
    });
  }

  elements.orders.qty.value = 1;
  renderOrders();
}

function removeOrderLine(index) {
  orderDraft.splice(index, 1);
  renderOrders();
}

function saveCurrentOrder() {
  const lines = normalizeOrderLines(orderDraft);
  if (!lines.length) {
    alert("Agregá al menos un mueble antes de guardar el pedido.");
    return;
  }

  const id = currentOrderId || createId("order");
  const payload = {
    id,
    name: currentOrderName(),
    lines,
    createdAt: getExistingCreatedAt(state.orders || [], id),
    updatedAt: new Date().toISOString(),
  };

  if (currentOrderId && (state.orders || []).some((order) => order.id === currentOrderId)) {
    state.orders = (state.orders || []).map((order) => (order.id === currentOrderId ? payload : order));
  } else {
    state.orders = [payload, ...(state.orders || [])];
    currentOrderId = id;
  }

  elements.orders.name.value = payload.name;
  saveAndRefresh();
}

function loadSavedOrder(id) {
  const order = (state.orders || []).find((item) => item.id === id);
  if (!order) return;

  currentOrderId = order.id;
  orderDraft = normalizeOrderLines(order.lines || []);
  elements.orders.name.value = order.name || "";
  renderOrders();
}

function deleteSavedOrder(id) {
  const order = (state.orders || []).find((item) => item.id === id);
  if (!order) return;

  confirmWithModal({
    title: "Borrar pedido",
    body: `¿Seguro que querés borrar "${order.name || "Pedido sin nombre"}"? Esta acción no se puede deshacer.`,
    confirmLabel: "Sí, borrar",
    onConfirm: () => {
      state.orders = (state.orders || []).filter((item) => item.id !== id);
      if (currentOrderId === id) {
        currentOrderId = "";
        orderDraft = [];
        elements.orders.name.value = "";
      }
      saveAndRefresh();
    },
  });
}

function clearOrder() {
  if (!orderDraft.length) return;
  const clear = confirm("¿Seguro que querés limpiar el pedido?");
  if (!clear) return;
  currentOrderId = "";
  orderDraft = [];
  elements.orders.name.value = "";
  renderOrders();
}

function orderExportRows(lines = orderDraft) {
  return lines.flatMap((line) => {
    const furniture = orderLineFurniture(line);
    if (!furniture) return [];

    return (furniture.wood || []).flatMap((woodLine) => {
      const wood = state.wood.find((item) => item.id === woodLine.woodId);
      return (woodLine.cuts || [])
        .filter((cut) => woodCutM2(cut) > 0)
        .map((cut) => ({
          furniture: furniture.name,
          wood: wood?.type || "Madera eliminada",
          color: wood?.color || "-",
          thickness: wood ? `${formatNumber.format(wood.thickness)} mm` : "-",
          lengthMm: Number(cut.lengthMm || 0),
          widthMm: Number(cut.widthMm || 0),
          qty: Number(cut.qty || 0) * orderLineQty(line),
          m2: woodCutM2(cut) * orderLineQty(line),
        }));
    });
  });
}

function excelNumber(value) {
  return Number(value || 0).toFixed(2);
}

function exportOrderExcel(lines = orderDraft, filenamePrefix = "cortes-dilucca") {
  if (!lines.length) {
    alert("Agregá al menos un mueble al pedido antes de exportar.");
    return;
  }

  const rows = orderExportRows(lines);
  if (!rows.length) {
    alert("Los muebles del pedido no tienen cortes de madera cargados.");
    return;
  }

  const generatedAt = new Date().toLocaleString("es-AR");
  const htmlRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.furniture)}</td>
          <td>${escapeHtml(row.wood)}</td>
          <td>${escapeHtml(row.color)}</td>
          <td>${escapeHtml(row.thickness)}</td>
          <td>${row.lengthMm}</td>
          <td>${row.widthMm}</td>
          <td>${row.qty}</td>
          <td>${excelNumber(row.m2)}</td>
        </tr>
      `,
    )
    .join("");
  const workbook = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #999; padding: 8px; }
          th { background: #e7f0e9; font-weight: 700; }
          .number { mso-number-format: "0.00"; }
        </style>
      </head>
      <body>
        <h2>Cortes Muebles DiLucca</h2>
        <p>Generado: ${escapeHtml(generatedAt)}</p>
        <table>
          <thead>
            <tr>
              <th>Mueble</th>
              <th>Madera</th>
              <th>Color</th>
              <th>Espesor</th>
              <th>Largo mm</th>
              <th>Ancho mm</th>
              <th>Cantidad</th>
              <th>m2</th>
            </tr>
          </thead>
          <tbody>${htmlRows}</tbody>
          <tfoot>
            <tr>
              <th colspan="6">Total cortes</th>
              <th>${rows.reduce((sum, row) => sum + row.qty, 0)}</th>
              <th>${excelNumber(rows.reduce((sum, row) => sum + row.m2, 0))}</th>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;
  const blob = new Blob([workbook], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filenamePrefix}-${todayValue()}.xls`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function exportSavedOrder(id) {
  const order = (state.orders || []).find((item) => item.id === id);
  if (!order) return;

  const safeName = cleanText(order.name || "pedido")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  exportOrderExcel(normalizeOrderLines(order.lines || []), `cortes-${safeName || "pedido"}`);
}

function updateInvoiceSummary() {
  const draft = currentInvoiceDraft();
  const shippingDisabled = !draft.shippingRequired;

  elements.invoices.shippingPrice.disabled = shippingDisabled;
  elements.invoices.location.disabled = shippingDisabled;

  elements.invoices.cost.textContent = formatCurrency.format(invoiceFurnitureCost(draft));
  elements.invoices.total.textContent = formatCurrency.format(invoiceTotal(draft));
  elements.invoices.profit.textContent = formatCurrency.format(invoiceProfit(draft));
  elements.invoices.depositLabel.textContent = formatCurrency.format(invoiceDeposit(draft));
  elements.invoices.balanceLabel.textContent = formatCurrency.format(invoiceBalance(draft));
  elements.invoices.shippingLabel.textContent = draft.shippingRequired
    ? formatCurrency.format(invoiceShippingCost(draft))
    : "No";
  elements.invoices.shippingLocation.textContent = draft.shippingRequired
    ? draft.location || "sin ubicación"
    : "sin envío";
}

function handleInvoiceChange() {
  updateInvoiceSummary();
}

function handleStockPanelChange() {
  activeStockPanel = elements.stock.mobileSelect.value || "supplies";
  updateStockPanelVisibility();
}

function handleStockChange(event) {
  const input = event.target.closest("input");
  if (!input) return;

  if (input.dataset.stockSupply) {
    const item = state.supplies.find((entry) => entry.id === input.dataset.stockSupply);
    if (!item) return;
    const unit = supplyUnit(item);
    const current = Number(item.packQty || 0) * Number(item.stock || 0);
    const next = Math.max(0, readNumber(input));
    requestStockUpdate({
      input,
      title: "Editar stock de insumo",
      description: item.name,
      current,
      next,
      unit,
      onConfirm: () => updateSupplyStock(item.id, next),
    });
    return;
  }

  if (input.dataset.stockWood) {
    const item = state.wood.find((entry) => entry.id === input.dataset.stockWood);
    if (!item) return;
    const current = woodStockM2(item);
    const next = Math.min(Math.max(0, readNumber(input)), Number(item.area || 0));
    requestStockUpdate({
      input,
      title: "Editar stock de madera",
      description: `${item.type} ${item.thickness} mm ${item.color}`,
      current,
      next,
      unit: "m2",
      onConfirm: () => updateWoodStock(item.id, next),
    });
    return;
  }

  if (input.dataset.stockFurniture) {
    const item = state.furniture.find((entry) => entry.id === input.dataset.stockFurniture);
    if (!item) return;
    const current = Number(item.stock || 0);
    const next = Math.max(0, Math.floor(readNumber(input)));
    requestStockUpdate({
      input,
      title: "Editar stock de mueble",
      description: item.name,
      current,
      next,
      unit: "un.",
      onConfirm: () => updateFurnitureStock(item.id, next),
    });
  }
}

function requestStockUpdate({ input, title, description, current, next, unit, onConfirm }) {
  const currentValue = Number(current || 0);
  const nextValue = Number(next || 0);
  input.value = String(currentValue);

  if (Math.abs(currentValue - nextValue) < 0.0001) return;

  confirmWithModal({
    title,
    body: `¿Querés cambiar el stock de "${description}" de ${formatNumber.format(currentValue)} ${unit} a ${formatNumber.format(nextValue)} ${unit}?`,
    confirmLabel: "Sí, editar",
    onConfirm,
  });
}

function updateSupplyStock(id, stockUnits) {
  state.supplies = state.supplies.map((item) => {
    if (item.id !== id) return item;
    const packQty = Number(item.packQty || 0);
    return {
      ...item,
      stock: packQty > 0 ? stockUnits / packQty : 0,
    };
  });
  saveAndRefresh();
}

function updateWoodStock(id, stockM2) {
  state.wood = state.wood.map((item) => {
    if (item.id !== id) return item;
    const area = Number(item.area || 0);
    return {
      ...item,
      stockM2: area > 0 ? Math.min(stockM2, area) : stockM2,
    };
  });
  saveAndRefresh();
}

function updateFurnitureStock(id, stockQty) {
  state.furniture = state.furniture.map((item) =>
    item.id === id
      ? {
          ...item,
          stock: stockQty,
        }
      : item,
  );
  saveAndRefresh();
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
      alert("No se pudo cargar la foto. Probá con otra imagen.");
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

function openModal({ eyebrow, title, body, confirmLabel = "", cancelLabel = "No", onConfirm = null, onCancel = null }) {
  modalConfirmAction = onConfirm;
  modalCancelAction = onCancel;
  elements.modal.eyebrow.textContent = eyebrow;
  elements.modal.title.textContent = title;
  elements.modal.body.innerHTML = body;
  elements.modal.root.classList.remove("hidden");

  if (onConfirm) {
    elements.modal.actions.classList.remove("hidden");
    elements.modal.confirm.textContent = confirmLabel || "Sí";
    elements.modal.cancel.textContent = cancelLabel;
  } else {
    elements.modal.actions.classList.add("hidden");
  }

  elements.modal.close.focus();
}

function closeModal() {
  modalConfirmAction = null;
  modalCancelAction = null;
  elements.modal.root.classList.add("hidden");
  elements.modal.body.innerHTML = "";
  elements.modal.actions.classList.add("hidden");
}

function confirmWithModal({ title, body, confirmLabel = "Sí", onConfirm }) {
  openModal({
    eyebrow: "Confirmación",
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
  const wood = (item.wood || []).filter((line) => line.woodId && furnitureWoodLineM2(line) > 0);
  const supplyTotal = furnitureSupplyTotal(item);
  const woodTotal = furnitureWoodTotal(item);
  const dimensions = furnitureDimensionsText(item);

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
          <span>Costo</span>
          <strong>${formatCurrency.format(furnitureTotal(item))}</strong>
        </div>
        <div class="detail-metric">
          <span>${escapeHtml(suggestedPriceLabel())}</span>
          <strong>${formatCurrency.format(furnitureSuggestedPrice(item))}</strong>
        </div>
      </div>
      ${item.notes ? `<p class="confirm-copy">${escapeHtml(item.notes)}</p>` : ""}
      ${
        dimensions
          ? `<div class="detail-section">
              <h3>Medidas</h3>
              <div class="detail-row"><strong>Largo / ancho / alto</strong><span>${escapeHtml(dimensions)}</span></div>
            </div>`
          : ""
      }
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
    eyebrow: "Detalle de venta",
    title: item.client,
    body: `
      <div class="detail-summary">
        <div class="detail-metric">
          <span>Mueble</span>
          <strong>${escapeHtml(furnitureNameById(item.furnitureId))}</strong>
        </div>
        <div class="detail-metric">
          <span>Total venta</span>
          <strong>${formatCurrency.format(invoiceTotal(item))}</strong>
        </div>
        <div class="detail-metric">
          <span>Ganancia</span>
          <strong>${formatCurrency.format(invoiceProfit(item))}</strong>
        </div>
      </div>
      <div class="detail-actions">
        <button class="primary-button" type="button" data-print-invoice="${item.id}">Generar comprobante</button>
        ${
          item.stockDiscounted
            ? ""
            : `<button class="secondary-button" type="button" data-discount-invoice-stock="${item.id}">Descontar stock ahora</button>`
        }
      </div>
      <div class="detail-section">
        <h3>Datos</h3>
        <div class="detail-row"><strong>Fecha</strong><span>${escapeHtml(item.date || "-")}</span></div>
        <div class="detail-row"><strong>Teléfono</strong><span>${escapeHtml(item.phone || "-")}</span></div>
        <div class="detail-row"><strong>Pago</strong><span>${escapeHtml(item.payment || "-")}</span></div>
        <div class="detail-row"><strong>Estado</strong><span>${escapeHtml(invoiceStatus(item))}</span></div>
        <div class="detail-row"><strong>Precio de venta</strong><span>${formatCurrency.format(Number(item.price || 0))}</span></div>
        <div class="detail-row"><strong>Seña</strong><span>${formatCurrency.format(invoiceDeposit(item))}</span></div>
        <div class="detail-row"><strong>Saldo</strong><span>${formatCurrency.format(invoiceBalance(item))}</span></div>
        <div class="detail-row"><strong>Costo mueble</strong><span>${formatCurrency.format(invoiceFurnitureCost(item))}</span></div>
        <div class="detail-row"><strong>Envío</strong><span>${item.shippingRequired ? formatCurrency.format(invoiceShippingCost(item)) : "No"}</span></div>
        <div class="detail-row"><strong>Stock</strong><span>${item.stockDiscounted ? "Descontado" : "Sin descontar"}</span></div>
        ${item.shippingRequired ? `<div class="detail-row"><strong>Ubicación</strong><span>${escapeHtml(item.location || "-")}</span></div>` : ""}
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
    ? escapeHtml(invoice.location || "Envío sin ubicación")
    : "Retira / sin envío";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Venta ${escapeHtml(invoiceNumber(invoice))} - Muebles DiLucca</title>
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
          <h1>Comprobante de venta</h1>
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
          <span>Teléfono</span>
          <strong>${escapeHtml(invoice.phone || "-")}</strong>
        </div>
        <div class="info-card">
          <span>Forma de pago</span>
          <strong>${escapeHtml(invoice.payment || "-")}</strong>
        </div>
        <div class="info-card">
          <span>Estado</span>
          <strong>${escapeHtml(invoiceStatus(invoice))}</strong>
        </div>
        <div class="info-card">
          <span>Envío</span>
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
                  <td>Envío${invoice.location ? ` - ${escapeHtml(invoice.location)}` : ""}</td>
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
          <span>Seña</span>
          <strong>${formatCurrency.format(invoiceDeposit(invoice))}</strong>
        </div>
        <div class="total-row">
          <span>Saldo</span>
          <strong>${formatCurrency.format(invoiceBalance(invoice))}</strong>
        </div>
        <div class="total-row">
          <span>Envío</span>
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
    alert("El navegador bloqueó la ventana para generar el PDF. Habilitá las ventanas emergentes y probá de nuevo.");
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
    .map((line, index) => {
      const hasCuts = Array.isArray(line.cuts) && line.cuts.some((cut) => woodCutM2(cut) > 0);
      return `
        <div class="detail-row detail-row-stack">
          <div>
            <strong>${escapeHtml(woodLabelById(line.woodId))}</strong>
            <small>${formatNumber.format(furnitureWoodLineM2(line))} m2 calculados</small>
          </div>
          <span>${formatCurrency.format(furnitureWoodLineCost(line))}</span>
          ${
            hasCuts
              ? `<button class="table-action cuts-toggle" type="button" data-toggle-cuts="${index}">Ver cortes</button>
                 <div class="cuts-detail hidden" data-cuts-panel="${index}">
                   ${detailCutRows(line.cuts, line.woodId)}
                 </div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function detailCutRows(cuts = [], woodId = "") {
  const wood = state.wood.find((item) => item.id === woodId);
  const woodName = wood ? wood.type : "-";
  const woodColor = wood ? wood.color : "-";
  const thickness = wood ? `${formatNumber.format(wood.thickness)} mm` : "-";
  const rows = cuts
    .filter((cut) => woodCutM2(cut) > 0)
    .map(
      (cut) => `
        <div class="cut-detail-row">
          <span>${escapeHtml(woodName)}</span>
          <span>${escapeHtml(woodColor)}</span>
          <span>${escapeHtml(thickness)}</span>
          <span>${formatNumber.format(cut.lengthMm)} x ${formatNumber.format(cut.widthMm)} mm</span>
          <span>${formatNumber.format(cut.qty)} un.</span>
          <strong>${formatNumber.format(woodCutM2(cut))} m2</strong>
        </div>
      `,
    )
    .join("");

  return `
    <div class="cut-detail-header">
      <span>Madera</span>
      <span>Color</span>
      <span>Espesor</span>
      <span>Medida</span>
      <span>Cantidad</span>
      <span>m2</span>
    </div>
    ${rows}
  `;
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
  const existingWood = id ? state.wood.find((item) => item.id === id) : null;
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
    stockM2: existingWood ? Math.min(woodStockM2(existingWood), area || woodStockM2(existingWood)) : used,
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
  const wood = furnitureDraft.wood.filter((line) => line.woodId && furnitureWoodLineM2(line) > 0);

  if (!supplies.length && !wood.length) {
    alert("Agregá al menos un insumo o una madera para calcular el mueble.");
    return;
  }

  const id = elements.furniture.id.value;
  const existingFurniture = id ? state.furniture.find((item) => item.id === id) : null;
  const payload = {
    id: id || createId("furniture"),
    name: cleanText(elements.furniture.name.value),
    notes: cleanText(elements.furniture.notes.value),
    lengthMm: readNumber(elements.furniture.length),
    widthMm: readNumber(elements.furniture.width),
    heightMm: readNumber(elements.furniture.height),
    photo: currentFurniturePhoto,
    stock: Number(existingFurniture?.stock || 0),
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
  const existingInvoice = id ? state.invoices.find((item) => item.id === id) : null;
  const shippingRequired = elements.invoices.shippingRequired.value === "yes";
  const payload = {
    id: id || createId("invoice"),
    furnitureId: elements.invoices.furniture.value,
    client: cleanText(elements.invoices.client.value),
    phone: cleanText(elements.invoices.phone.value),
    date: elements.invoices.date.value || todayValue(),
    price: readNumber(elements.invoices.price),
    deposit: readNumber(elements.invoices.deposit),
    status: invoiceStatus({ status: elements.invoices.status.value }),
    shippingRequired,
    shippingPrice: shippingRequired ? readNumber(elements.invoices.shippingPrice) : 0,
    location: shippingRequired ? cleanText(elements.invoices.location.value) : "",
    payment: cleanText(elements.invoices.payment.value),
    notes: cleanText(elements.invoices.notes.value),
    stockDiscounted: Boolean(existingInvoice?.stockDiscounted),
    stockDiscountedAt: existingInvoice?.stockDiscountedAt || "",
    createdAt: id ? getExistingCreatedAt(state.invoices, id) : new Date().toISOString(),
  };

  if (!id) {
    requestInvoiceStockDiscount(payload);
    return;
  }

  saveInvoicePayload(payload);
}

function saveInvoicePayload(payload, { discountStock = false } = {}) {
  const nextPayload = { ...payload };

  if (discountStock && !nextPayload.stockDiscounted) {
    applySaleStockDiscount(nextPayload.furnitureId);
    nextPayload.stockDiscounted = true;
    nextPayload.stockDiscountedAt = new Date().toISOString();
  }

  const exists = state.invoices.some((item) => item.id === nextPayload.id);
  if (exists) {
    state.invoices = state.invoices.map((item) => (item.id === nextPayload.id ? nextPayload : item));
  } else {
    state.invoices.unshift(nextPayload);
  }

  resetInvoiceForm();
  closeInvoiceComposer();
  saveAndRefresh();
}

function requestInvoiceStockDiscount(payload) {
  const furniture = furnitureById(payload.furnitureId);
  openModal({
    eyebrow: "Stock",
    title: "Descontar stock",
    body: saleStockDiscountSummary(furniture),
    cancelLabel: "Guardar sin descontar",
    confirmLabel: "Descontar stock",
    onCancel: () => saveInvoicePayload(payload),
    onConfirm: () => saveInvoicePayload(payload, { discountStock: true }),
  });
}

function discountInvoiceStockNow(id) {
  const invoice = state.invoices.find((item) => item.id === id);
  if (!invoice || invoice.stockDiscounted) return;

  applySaleStockDiscount(invoice.furnitureId);
  state.invoices = state.invoices.map((item) =>
    item.id === id
      ? {
          ...item,
          stockDiscounted: true,
          stockDiscountedAt: new Date().toISOString(),
        }
      : item,
  );
  closeModal();
  saveAndRefresh();
}

function requestDiscountInvoiceStock(id) {
  const invoice = state.invoices.find((item) => item.id === id);
  if (!invoice || invoice.stockDiscounted) return;
  const furniture = furnitureById(invoice.furnitureId);

  openModal({
    eyebrow: "Stock",
    title: "Descontar stock",
    body: saleStockDiscountSummary(furniture),
    cancelLabel: "Cancelar",
    confirmLabel: "Descontar stock",
    onConfirm: () => discountInvoiceStockNow(id),
  });
}

function getExistingCreatedAt(collection, id) {
  return collection.find((item) => item.id === id)?.createdAt || new Date().toISOString();
}

function saveAndRefresh() {
  saveState();
  renderAll();
}

function handleSuggestedMarginChange() {
  const current = suggestedMarkup();
  const nextValue = Math.max(0, readNumber(elements.settings.suggestedMargin, current));
  state.settings = [
    {
      ...pricingSettings(),
      suggestedMarkup: nextValue,
    },
  ];
  saveAndRefresh();
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
  elements.furniture.length.value = item.lengthMm || "";
  elements.furniture.width.value = item.widthMm || "";
  elements.furniture.height.value = item.heightMm || "";
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
    body: `¿Querés editar "${item.name}"? Se cargará en el formulario para modificarlo.`,
    confirmLabel: "Sí, editar",
    onConfirm: () => editFurniture(id),
  });
}

function duplicateFurniture(id) {
  const item = state.furniture.find((entry) => entry.id === id);
  if (!item) return;

  const copy = {
    ...structuredClone(item),
    id: createId("furniture"),
    name: `${item.name} copia`,
    stock: 0,
    createdAt: new Date().toISOString(),
  };

  state.furniture.unshift(copy);
  saveAndRefresh();
}

function requestDuplicateFurniture(id) {
  const item = state.furniture.find((entry) => entry.id === id);
  if (!item) return;
  confirmWithModal({
    title: "Duplicar mueble",
    body: `¿Querés crear una copia de "${item.name}"? La copia queda con stock en cero.`,
    confirmLabel: "Duplicar",
    onConfirm: () => duplicateFurniture(id),
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
  elements.invoices.deposit.value = invoiceDeposit(item);
  elements.invoices.status.value = invoiceStatus(item);
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
    title: "Editar venta",
    body: `¿Querés editar la venta de "${item.client}"? Se cargará en el formulario para modificarla.`,
    confirmLabel: "Sí, editar",
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
    body: `¿Seguro que querés borrar "${item.name}"? Esta acción no se puede deshacer.`,
    confirmLabel: "Sí, borrar",
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
    body: `¿Seguro que querés borrar "${item.type} ${item.color}"? Esta acción no se puede deshacer.`,
    confirmLabel: "Sí, borrar",
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
    body: `¿Seguro que querés borrar "${item.name}"? Esta acción no se puede deshacer.`,
    confirmLabel: "Sí, borrar",
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
    title: "Borrar venta",
    body: `¿Seguro que querés borrar la venta de "${item.client}"? Esta acción no se puede deshacer.`,
    confirmLabel: "Sí, borrar",
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
  elements.invoices.deposit.value = 0;
  elements.invoices.status.value = "Pendiente";
  elements.invoices.shippingRequired.value = "no";
  elements.invoices.shippingPrice.value = 0;
  elements.invoices.submit.textContent = "Guardar venta";
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
  elements.invoices.showForm.textContent = "Agregar venta";
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
  furnitureDraft.supplies.unshift({ supplyId: "", qty: 0 });
  renderFurnitureBuilder();
  elements.furniture.supplyLines.querySelector('[data-field="supplyFilter"]')?.focus();
}

function addFurnitureWoodLine() {
  syncFurnitureDraftFromDom();
  furnitureDraft.wood.unshift(createFurnitureWoodLine());
  renderFurnitureBuilder();
  elements.furniture.woodLines.querySelector('[data-field="woodFilter"]')?.focus();
}

function addFurnitureWoodCut(woodIndex) {
  syncFurnitureDraftFromDom();
  if (!furnitureDraft.wood[woodIndex]) {
    furnitureDraft.wood[woodIndex] = createFurnitureWoodLine();
  }

  if (!Array.isArray(furnitureDraft.wood[woodIndex].cuts)) {
    furnitureDraft.wood[woodIndex].cuts = [];
  }

  furnitureDraft.wood[woodIndex].cuts.unshift(createWoodCut());
  renderFurnitureBuilder();
  elements.furniture.woodLines
    .querySelector(`[data-kind="wood"][data-index="${woodIndex}"] [data-field="lengthMm"]`)
    ?.focus();
}

function removeFurnitureWoodCut(woodIndex, cutIndex) {
  syncFurnitureDraftFromDom();
  const cuts = furnitureDraft.wood[woodIndex]?.cuts;
  if (!cuts) return;

  cuts.splice(cutIndex, 1);
  if (!cuts.length) cuts.push(createWoodCut());
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
  const typed = prompt(`Para vaciar ${label}, escribí VACIAR.`);
  if (typed !== "VACIAR") return;
  state[collectionName] = [];
  saveAndRefresh();
}

function loadSampleData() {
  if (state.supplies.length || state.wood.length || state.furniture.length || state.invoices.length) {
    const replace = confirm("¿Reemplazar los datos actuales por el ejemplo?");
    if (!replace) return;
  }
  state.supplies = structuredClone(sampleData.supplies);
  state.wood = structuredClone(sampleData.wood);
  state.furniture = structuredClone(sampleData.furniture);
  state.invoices = structuredClone(sampleData.invoices);
  state.orders = structuredClone(sampleData.orders);
  state.settings = structuredClone(sampleData.settings);
  currentOrderId = "";
  orderDraft = [];
  resetFurnitureForm();
  resetInvoiceForm();
  saveAndRefresh();
}

function handleTableClick(event) {
  const editSupplyButton = event.target.closest("[data-edit-supply]");
  const deleteSupplyButton = event.target.closest("[data-delete-supply]");
  const editWoodButton = event.target.closest("[data-edit-wood]");
  const deleteWoodButton = event.target.closest("[data-delete-wood]");
  const duplicateFurnitureButton = event.target.closest("[data-duplicate-furniture]");
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
  if (duplicateFurnitureButton) {
    requestDuplicateFurniture(duplicateFurnitureButton.dataset.duplicateFurniture);
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
  const discountInvoiceStockButton = event.target.closest("[data-discount-invoice-stock]");
  const cutsToggle = event.target.closest("[data-toggle-cuts]");

  if (printInvoiceButton) {
    printInvoice(printInvoiceButton.dataset.printInvoice);
    return;
  }

  if (discountInvoiceStockButton) {
    requestDiscountInvoiceStock(discountInvoiceStockButton.dataset.discountInvoiceStock);
    return;
  }

  if (cutsToggle) {
    const panel = elements.modal.body.querySelector(`[data-cuts-panel="${cutsToggle.dataset.toggleCuts}"]`);
    if (!panel) return;
    const isHidden = panel.classList.toggle("hidden");
    cutsToggle.textContent = isHidden ? "Ver cortes" : "Ocultar cortes";
  }
}

function handleFurnitureLineClick(event) {
  const lineOptionButton = event.target.closest("[data-select-line-option]");
  const supplyFilter = event.target.closest('[data-field="supplyFilter"]');
  const woodFilter = event.target.closest('[data-field="woodFilter"]');
  const removeSupplyButton = event.target.closest("[data-remove-furniture-supply]");
  const removeWoodButton = event.target.closest("[data-remove-furniture-wood]");
  const addWoodCutButton = event.target.closest("[data-add-wood-cut]");
  const removeWoodCutButton = event.target.closest("[data-remove-wood-cut]");

  if (lineOptionButton) {
    selectFurnitureLineOption(lineOptionButton);
    return;
  }

  if (supplyFilter) {
    filterFurnitureSupplyOptions(supplyFilter);
    return;
  }

  if (woodFilter) {
    filterFurnitureWoodOptions(woodFilter);
    return;
  }

  if (removeSupplyButton) {
    removeFurnitureLine("supplies", Number(removeSupplyButton.dataset.removeFurnitureSupply));
    return;
  }

  if (removeWoodButton) {
    removeFurnitureLine("wood", Number(removeWoodButton.dataset.removeFurnitureWood));
    return;
  }

  if (addWoodCutButton) {
    addFurnitureWoodCut(Number(addWoodCutButton.dataset.addWoodCut));
    return;
  }

  if (removeWoodCutButton) {
    const [woodIndex, cutIndex] = removeWoodCutButton.dataset.removeWoodCut.split(":").map(Number);
    removeFurnitureWoodCut(woodIndex, cutIndex);
  }
}

function handleDocumentClick(event) {
  if (event.target.closest(".line-picker")) return;
  closeLineDropdowns();
}

function handleOrderTableClick(event) {
  const removeButton = event.target.closest("[data-remove-order-line]");
  if (removeButton) removeOrderLine(Number(removeButton.dataset.removeOrderLine));
}

function handleSavedOrderTableClick(event) {
  const loadButton = event.target.closest("[data-load-order]");
  const exportButton = event.target.closest("[data-export-saved-order]");
  const deleteButton = event.target.closest("[data-delete-order]");

  if (loadButton) {
    loadSavedOrder(loadButton.dataset.loadOrder);
    return;
  }

  if (exportButton) {
    exportSavedOrder(exportButton.dataset.exportSavedOrder);
    return;
  }

  if (deleteButton) {
    deleteSavedOrder(deleteButton.dataset.deleteOrder);
  }
}

function bindEvents() {
  elements.auth.form.addEventListener("submit", handleLoginSubmit);
  elements.auth.passwordToggle.addEventListener("click", togglePasswordVisibility);
  elements.logout.addEventListener("click", handleLogout);

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
  elements.supplies.table.addEventListener("click", handleTableClick);

  elements.wood.form.addEventListener("submit", handleWoodSubmit);
  elements.wood.cancel.addEventListener("click", resetWoodForm);
  elements.wood.search.addEventListener("input", renderWood);
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
  elements.invoices.table.addEventListener("click", handleTableClick);
  elements.invoices.furniture.addEventListener("change", handleInvoiceChange);
  elements.invoices.price.addEventListener("input", handleInvoiceChange);
  elements.invoices.deposit.addEventListener("input", handleInvoiceChange);
  elements.invoices.status.addEventListener("change", handleInvoiceChange);
  elements.invoices.shippingRequired.addEventListener("change", handleInvoiceChange);
  elements.invoices.shippingPrice.addEventListener("input", handleInvoiceChange);
  elements.invoices.location.addEventListener("input", handleInvoiceChange);

  elements.orders.form.addEventListener("submit", handleOrderSubmit);
  elements.orders.save.addEventListener("click", saveCurrentOrder);
  elements.orders.clear.addEventListener("click", clearOrder);
  elements.orders.export.addEventListener("click", () => exportOrderExcel());
  elements.orders.table.addEventListener("click", handleOrderTableClick);
  elements.orders.savedTable.addEventListener("click", handleSavedOrderTableClick);

  elements.stock.supplySearch.addEventListener("input", renderStockSupplies);
  elements.stock.woodSearch.addEventListener("input", renderStockWood);
  elements.stock.furnitureSearch.addEventListener("input", renderStockFurniture);
  elements.stock.mobileSelect.addEventListener("change", handleStockPanelChange);
  elements.stock.supplyList.addEventListener("change", handleStockChange);
  elements.stock.woodList.addEventListener("change", handleStockChange);
  elements.stock.furnitureList.addEventListener("change", handleStockChange);
  elements.metrics.period.addEventListener("change", renderDashboard);
  elements.settings.suggestedMargin.addEventListener("change", handleSuggestedMarginChange);

  elements.modal.close.addEventListener("click", closeModal);
  elements.modal.body.addEventListener("click", handleModalBodyClick);
  elements.modal.cancel.addEventListener("click", () => {
    const action = modalCancelAction;
    closeModal();
    if (action) action();
  });
  elements.modal.confirm.addEventListener("click", () => {
    const action = modalConfirmAction;
    closeModal();
    if (action) action();
  });
  elements.modal.root.addEventListener("click", (event) => {
    if (event.target === elements.modal.root) closeModal();
  });
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.root.classList.contains("hidden")) closeModal();
  });

}

bindEvents();
renderAll();
initFirebaseSync();
