const $ = (id) => document.getElementById(id);

const state = {
  hotels: [],
  destinations: [],
  carImageData: null,
  airports: [],
  domesticFlights: []
};

/* =========================
   Utils
========================= */
function setTodayIfEmpty() {
  const d = new Date();
  const iso = d.toISOString().slice(0, 10);
  if ($("quoteDate") && !$("quoteDate").value) $("quoteDate").value = iso;
}

function money(n) {
  const x = Number(n || 0);
  return isFinite(x) ? x.toFixed(2) : "0.00";
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
    from: r.querySelector(".dfFrom")?.value || "",
    to: r.querySelector(".dfTo")?.value || "",
    date: r.querySelector(".dfDate")?.value || "",
    airline: r.querySelector(".dfAirline")?.value || "",
    price: Number(r.querySelector(".dfPrice")?.value || 0),
    note: r.querySelector(".dfNote")?.value || ""
  }));
}

function domesticFlightsText() {
  if (!state.domesticFlights.length) return "—";

  return state.domesticFlights
    .map(
      (f, i) => `✈️ رحلة داخلية (${i + 1})
من ${f.from} إلى ${f.to}
التاريخ: ${f.date || "—"}
شركة الطيران: ${f.airline || "—"}
السعر: ${money(f.price)}`
    )
    .join("\n\n");
}

/* =========================
   Transport Text
========================= */
function transportText() {
  const parts = [];

  if ($("hasIntercity")?.value === "yes") {
    const count = Number($("intercityCount")?.value || 0);
    const price = Number($("intercityPrice")?.value || 0);
    const total = count * price;

    if (count > 0) {
      parts.push(
        `🚐 انتقالات داخلية (${count} انتقالة)
سعر الانتقالة: ${money(price)}
إجمالي: ${money(total)}`
      );
    }
  }

  return parts.join("\n\n") || "—";
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

  const transferPrice =
    $("hasTransfer")?.value === "yes" ? Number($("transferPrice")?.value || 0) : 0;

  const carPrice =
    $("hasCar")?.value === "yes" ? Number($("carPrice")?.value || 0) : 0;

  const sightseeingTotal =
    $("hasSightseeing")?.value === "yes"
      ? Number($("sightseeingCount")?.value || 0) *
        Number($("sightseeingPrice")?.value || 0)
      : 0;

  const intercityTotal =
    $("hasIntercity")?.value === "yes"
      ? Number($("intercityCount")?.value || 0) *
        Number($("intercityPrice")?.value || 0)
      : 0;

  const domesticFlightsTotal = state.domesticFlights.reduce(
    (s, f) => s + Number(f.price || 0),
    0
  );

  const transportTotal =
    transferPrice + carPrice + sightseeingTotal + intercityTotal;

  const subtotal =
    flightPrice + hotelsTotal + transportTotal + domesticFlightsTotal;

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
  if ($("pTransport")) $("pTransport").textContent = transportText();

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
    .forEach((r) =>
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
      })
    );

  $("hasIntercity")?.addEventListener("change", () => {
    const yes = $("hasIntercity").value === "yes";

    toggle($("intercityCountWrap"), yes);
    toggle($("intercityPriceWrap"), yes);

    if (!yes) {
      $("intercityCount").value = 0;
      $("intercityPrice").value = 0;
    }

    renderAll();
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
