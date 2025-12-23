const $ = (id) => document.getElementById(id);

const state = {
  hotels: [],
  destinations: [],
  carImageData: null,
  airports: [],
  domesticFlights: [] // ✅ NEW
};

/* =========================
   Utils
========================= */
function setTodayIfEmpty() {
  const d = new Date();
  const iso = d.toISOString().slice(0, 10);
  if ($("quoteDate") && !$("quoteDate").value) $("quoteDate").value = iso;
}

function getSelectedOptions(selectEl) {
  return Array.from(selectEl?.selectedOptions || []).map((o) => o.value);
}

function money(n) {
  const x = Number(n || 0);
  return isFinite(x) ? x.toFixed(2) : "0.00";
}

function formatDate(iso) {
  if (!iso) return "—";
  return iso;
}

function toggle(el, show) {
  if (!el) return;
  el.classList.toggle("hidden", !show);
}

/* =========================
   Domestic Flights (Multiple)
========================= */
function addDomesticFlight(prefill = {}) {
  const tpl = $("domesticFlightTpl");
  if (!tpl) return;

  const node = tpl.content.firstElementChild.cloneNode(true);

  node.querySelector(".dfFrom").value = prefill.from || "";
  node.querySelector(".dfTo").value = prefill.to || "";
  node.querySelector(".dfDate").value = prefill.date || "";
  node.querySelector(".dfAirline").value = prefill.airline || "";
  node.querySelector(".dfPrice").value = prefill.price || 0;
  node.querySelector(".dfNote").value = prefill.note || "";

  node.querySelector(".btnRemoveDomestic").addEventListener("click", () => {
    node.remove();
    syncDomesticFlightsFromDOM();
    renderAll();
  });

  node.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => {
      syncDomesticFlightsFromDOM();
      renderAll();
    });
  });

  $("domesticFlightsContainer")?.appendChild(node);
  syncDomesticFlightsFromDOM();
  renderAll();
}

function syncDomesticFlightsFromDOM() {
  const rows = Array.from(document.querySelectorAll(".domesticRow"));
  state.domesticFlights = rows.map((r) => ({
    from: r.querySelector(".dfFrom")?.value?.trim() || "",
    to: r.querySelector(".dfTo")?.value?.trim() || "",
    date: r.querySelector(".dfDate")?.value || "",
    airline: r.querySelector(".dfAirline")?.value?.trim() || "",
    price: Number(r.querySelector(".dfPrice")?.value || 0),
    note: r.querySelector(".dfNote")?.value?.trim() || ""
  }));
}

function domesticFlightsText() {
  if (!state.domesticFlights.length) return "—";

  return state.domesticFlights
    .map(
      (f, i) => `✈️ رحلة داخلية (${i + 1})
من ${f.from || "—"} إلى ${f.to || "—"}
التاريخ: ${f.date || "—"}
شركة الطيران: ${f.airline || "—"}
السعر: ${money(f.price)}
${f.note ? `ملاحظة: ${f.note}` : ""}`
    )
    .join("\n\n");
}

/* =========================
   Totals
========================= */
function totals() {
  const curr = $("currency")?.value || "AED";

  const flightPrice =
    document.querySelector('input[name="hasFlight"]:checked')?.value === "yes"
      ? Number($("flightPrice")?.value || 0)
      : 0;

  const hotelsTotal = state.hotels.reduce((s, h) => s + Number(h.price || 0), 0);

  const transportTotal =
    ($("hasTransfer")?.value === "yes" ? Number($("transferPrice")?.value || 0) : 0) +
    ($("hasCar")?.value === "yes" ? Number($("carPrice")?.value || 0) : 0) +
    ($("hasIntercity")?.value === "yes" ? Number($("intercityPrice")?.value || 0) : 0) +
    ($("hasSightseeing")?.value === "yes"
      ? Number($("sightseeingCount")?.value || 0) *
        Number($("sightseeingPrice")?.value || 0)
      : 0);

  const domesticFlightsTotal = state.domesticFlights.reduce(
    (s, f) => s + Number(f.price || 0),
    0
  );

  const subtotal = flightPrice + hotelsTotal + transportTotal + domesticFlightsTotal;

  const discount = Number($("discount")?.value || 0);
  const afterDiscount = Math.max(subtotal - discount, 0);

  const taxAmount = afterDiscount * (Number($("tax")?.value || 0) / 100);
  const grand = afterDiscount + taxAmount;

  return {
    curr,
    flightPrice,
    hotelsTotal,
    transportTotal: transportTotal + domesticFlightsTotal,
    subtotal,
    discount,
    taxAmount,
    grand
  };
}

/* =========================
   Render
========================= */
function renderAll() {
  if ($("pDomesticFlights")) $("pDomesticFlights").textContent = domesticFlightsText();

  if ($("pDomesticFlightsWrap")) {
    toggle($("pDomesticFlightsWrap"), state.domesticFlights.length > 0);
  }

  const t = totals();

  if ($("pFlightPrice")) $("pFlightPrice").textContent = money(t.flightPrice);
  if ($("pHotelsTotal")) $("pHotelsTotal").textContent = money(t.hotelsTotal);
  if ($("pTransportTotal")) $("pTransportTotal").textContent = money(t.transportTotal);
  if ($("pSubtotal")) $("pSubtotal").textContent = money(t.subtotal);
  if ($("pDiscount")) $("pDiscount").textContent = money(t.discount);
  if ($("pTaxAmount")) $("pTaxAmount").textContent = money(t.taxAmount);
  if ($("pGrand")) $("pGrand").textContent = money(t.grand);
}

/* =========================
   Visibility
========================= */
function setupVisibility() {
  document
    .querySelectorAll('input[name="hasDomesticFlights"]')
    .forEach((r) => {
      r.addEventListener("change", () => {
        const yes =
          document.querySelector('input[name="hasDomesticFlights"]:checked')
            ?.value === "yes";
        toggle($("domesticFlightsBox"), yes);

        if (!yes) {
          state.domesticFlights = [];
          $("domesticFlightsContainer").innerHTML = "";
        }

        renderAll();
      });
    });
}

/* =========================
   Init
========================= */
function init() {
  setTodayIfEmpty();

  $("btnAddDomesticFlight")?.addEventListener("click", () =>
    addDomesticFlight()
  );

  setupVisibility();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
