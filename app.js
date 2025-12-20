const $ = (id) => document.getElementById(id);

const state = {
  hotels: [],
  destinations: [] // selected destination names (strings)
};

/* =========================
   Utils
========================= */
function setTodayIfEmpty(){
  const d = new Date();
  const iso = d.toISOString().slice(0,10);
  if ($("quoteDate") && !$("quoteDate").value) $("quoteDate").value = iso;
}

function getSelectedOptions(selectEl){
  return Array.from(selectEl?.selectedOptions || []).map(o => o.value);
}

function money(n){
  const x = Number(n || 0);
  return isFinite(x) ? x.toFixed(2) : "0.00";
}

function formatDate(iso){
  if(!iso) return "—";
  return iso; // yyyy-mm-dd
}

function calcDuration(){
  const go = $("goDate")?.value;
  const back = $("backDate")?.value;
  if(!go || !back) return null;

  const goD = new Date(go + "T00:00:00");
  const backD = new Date(back + "T00:00:00");
  const diffMs = backD - goD;
  if(diffMs <= 0) return { nights: 0, days: 0, text: "—" };

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const nights = Math.max(days, 0);
  const travelDays = days + 1;
  return {
    nights,
    days: travelDays,
    text: `${String(nights).padStart(2,'0')} ليالي / ${String(travelDays).padStart(2,'0')} أيام`
  };
}

function toggle(el, show){
  if(!el) return;
  el.classList.toggle("hidden", !show);
}

/* =========================
   Destinations (Bootstrap dropdown + search + checkboxes)
========================= */

/**
 * Fetch all countries from RestCountries and return array:
 * [{ en: "Singapore", ar: "سنغافورة" }, ...]
 */
async function fetchCountries(){
  const url = "https://restcountries.com/v3.1/all?fields=name,translations";
  const res = await fetch(url);
  if(!res.ok) throw new Error("Failed to load countries");
  const data = await res.json();

  const list = data
    .map(c => {
      const en = c?.name?.common?.trim();
      const ar = c?.translations?.ara?.common?.trim(); // Arabic translation if available
      return {
        en: en || "",
        ar: ar || ""
      };
    })
    .filter(x => x.en)
    .sort((a,b) => (a.ar || a.en).localeCompare((b.ar || b.en), "ar"));

  return list;
}

/**
 * Build dropdown checkbox list
 */
function renderDestList(countries, filterText = ""){
  const listEl = $("destList");
  if(!listEl) return;

  const q = (filterText || "").trim().toLowerCase();

  const filtered = !q ? countries : countries.filter(c => {
    const ar = (c.ar || "").toLowerCase();
    const en = (c.en || "").toLowerCase();
    return ar.includes(q) || en.includes(q);
  });

  if(!filtered.length){
    listEl.innerHTML = `<div class="muted">لا توجد نتائج…</div>`;
    return;
  }

  const selectedSet = new Set(state.destinations);

  listEl.innerHTML = filtered.map((c, idx) => {
    const label = c.ar || c.en;
    const safeId = `dest_cb_${idx}_${c.en.replace(/\s+/g,"_")}`;
    const checked = selectedSet.has(label) ? "checked" : "";

    return `
      <label class="destItem" for="${safeId}">
        <input type="checkbox" id="${safeId}" class="destCb" data-label="${escapeHtml(label)}" ${checked} />
        <span class="destName">${escapeHtml(label)}</span>
        ${c.ar && c.en && c.ar !== c.en ? `<span class="destEn">${escapeHtml(c.en)}</span>` : ""}
      </label>
    `;
  }).join("");

  // bind checkbox events
  listEl.querySelectorAll(".destCb").forEach(cb => {
    cb.addEventListener("change", () => {
      const label = cb.getAttribute("data-label") || "";
      if(!label) return;

      if(cb.checked){
        if(!state.destinations.includes(label)) state.destinations.push(label);
      } else {
        state.destinations = state.destinations.filter(x => x !== label);
      }

      syncDestinationsToSelect();
      updateDestButtonText();
      renderAll();
    });
  });
}

/**
 * Keep hidden <select multiple id="destinations"> synced with state.destinations
 */
function syncDestinationsToSelect(){
  const sel = $("destinations");
  if(!sel) return;

  sel.innerHTML = "";
  state.destinations.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    opt.selected = true;
    sel.appendChild(opt);
  });

  // trigger change in case any listener expects it
  sel.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Update dropdown button text to show selected countries
 */
function updateDestButtonText(){
  const btn = $("destDropdownBtn");
  if(!btn) return;

  if(!state.destinations.length){
    btn.textContent = "اختر الوجهات…";
    return;
  }

  // show up to 3 names then +N
  const shown = state.destinations.slice(0,3).join(" - ");
  const more = state.destinations.length > 3 ? ` (+${state.destinations.length - 3})` : "";
  btn.textContent = shown + more;
}

/**
 * Select all / Clear all helpers
 */
function selectAllDestinations(countries){
  // choose Arabic if available else English
  state.destinations = countries.map(c => c.ar || c.en);
  syncDestinationsToSelect();
  updateDestButtonText();
  renderAll();
}

function clearDestinations(){
  state.destinations = [];
  syncDestinationsToSelect();
  updateDestButtonText();
  renderAll();

  // also uncheck visible checkboxes
  const listEl = $("destList");
  if(listEl){
    listEl.querySelectorAll(".destCb").forEach(cb => cb.checked = false);
  }
}

/**
 * Escape for HTML (to prevent issues)
 */
function escapeHtml(str){
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Setup destinations dropdown
 */
async function setupDestinationsDropdown(){
  const listEl = $("destList");
  const searchEl = $("destSearch");
  const btnSelectAll = $("destSelectAll");
  const btnClear = $("destClear");

  // If HTML doesn't contain the new UI, skip safely
  if(!listEl || !searchEl) return;

  try{
    const countries = await fetchCountries();

    // initial render
    renderDestList(countries, "");

    // search
    searchEl.addEventListener("input", () => {
      renderDestList(countries, searchEl.value);
    });

    // select all
    btnSelectAll?.addEventListener("click", () => {
      selectAllDestinations(countries);
      // re-render for current search filter to update checks
      renderDestList(countries, searchEl.value);
    });

    // clear
    btnClear?.addEventListener("click", () => {
      clearDestinations();
      renderDestList(countries, searchEl.value);
    });

    // If there were existing <option> values (old version), import them once
    importDestinationsFromSelectOnce();

    // update button label
    updateDestButtonText();
  } catch (e){
    listEl.innerHTML = `<div class="muted">تعذر تحميل الدول. تأكد من الإنترنت أو جرّب لاحقًا.</div>`;
    console.error(e);
  }
}

/**
 * If user had old destinations options selected (from previous build),
 * import them into state.destinations once.
 */
function importDestinationsFromSelectOnce(){
  const sel = $("destinations");
  if(!sel) return;

  const old = getSelectedOptions(sel).filter(Boolean);
  if(old.length && state.destinations.length === 0){
    state.destinations = [...new Set(old)];
    syncDestinationsToSelect();
    updateDestButtonText();
  }
}

/* =========================
   Hotels
========================= */
function addHotelRow(prefill = {}){
  const tpl = $("hotelRowTpl");
  if(!tpl) return;

  const node = tpl.content.firstElementChild.cloneNode(true);

  node.querySelector(".hCity").value = prefill.city ?? "";
  node.querySelector(".hHotel").value = prefill.hotel ?? "";
  node.querySelector(".hStars").value = prefill.stars ?? "*4";
  node.querySelector(".hRooms").value = prefill.rooms ?? "1";
  node.querySelector(".hRoomType").value = prefill.roomType ?? "غرفة مزدوجة";
  node.querySelector(".hMeals").value = prefill.meals ?? "بالافطار";
  node.querySelector(".hPrice").value = prefill.price ?? 0;

  node.querySelector(".btnRemoveHotel").addEventListener("click", () => {
    node.remove();
    syncHotelsFromDOM();
    renderAll();
  });

  node.querySelectorAll("input,select").forEach(inp => {
    inp.addEventListener("input", () => {
      syncHotelsFromDOM();
      renderAll();
    });
    inp.addEventListener("change", () => {
      syncHotelsFromDOM();
      renderAll();
    });
  });

  $("hotelsContainer")?.appendChild(node);
  syncHotelsFromDOM();
  renderAll();
}

function syncHotelsFromDOM(){
  const rows = Array.from(document.querySelectorAll(".hotelRow"));
  state.hotels = rows.map(r => ({
    city: r.querySelector(".hCity")?.value?.trim() || "",
    hotel: r.querySelector(".hHotel")?.value?.trim() || "",
    stars: r.querySelector(".hStars")?.value || "",
    rooms: r.querySelector(".hRooms")?.value || "0",
    roomType: r.querySelector(".hRoomType")?.value || "",
    meals: r.querySelector(".hMeals")?.value || "",
    price: Number(r.querySelector(".hPrice")?.value || 0),
  }));
}

function renderPreviewHotels(){
  const tbody = $("pHotelsBody");
  if(!tbody) return;
  tbody.innerHTML = "";

  if(state.hotels.length === 0){
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" class="muted">—</td>`;
    tbody.appendChild(tr);
    return;
  }

  state.hotels.forEach(h => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${h.city || "—"}</td>
      <td>${h.hotel || "—"}</td>
      <td class="num">${h.stars || "—"}</td>
      <td class="num">${h.rooms || "—"}</td>
      <td>${h.roomType || "—"}</td>
      <td>${h.meals || "—"}</td>
      <td class="num">${money(h.price)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* =========================
   Flight + Airline
========================= */
function hasFlight(){
  const v = document.querySelector('input[name="hasFlight"]:checked')?.value || "no";
  return v === "yes";
}

function getAirlineText(){
  const airlineEl = $("airline");
  if(!airlineEl) return "";
  const v = airlineEl.value;
  if(v === "أخرى"){
    const other = $("airlineOther")?.value?.trim();
    return other ? other : "أخرى";
  }
  return v;
}

function flightText(){
  if(!hasFlight()) return "لا يشمل العرض الطيران الدولي.";

  const airline = getAirlineText();
  const type = $("flightType")?.value || "—";
  const bag = $("baggage")?.value || "—";
  const note = $("flightNote")?.value?.trim() || "";

  const go = `*رحلة الذهاب*\nمن ${$("fromCityGo")?.value || "—"} إلى ${$("toCityGo")?.value || "—"}\nإقلاع ${$("goDepTime")?.value || "—"} وصول ${$("goArrTime")?.value || "—"}`;
  const back = `*رحلة العودة*\nمن ${$("fromCityBack")?.value || "—"} إلى ${$("toCityBack")?.value || "—"}\nإقلاع ${$("backDepTime")?.value || "—"} وصول ${$("backArrTime")?.value || "—"}`;

  const head = `✅ طيران ${type} على ${airline} مع وزن ${bag} كيلو ✈️`;

  return `${head}\n\n${go}\n\n${back}${note ? `\n\nملاحظة: ${note}` : ""}`;
}

/* =========================
   Transport + Intercity
========================= */
function transportText(){
  const parts = [];

  const transferYes = $("hasTransfer")?.value === "yes";
  if(transferYes){
    parts.push("✅ الاستقبال والتوديع من المطار بسيارة خاصة مع سائق خاص 🚘");
  } else {
    parts.push("لا يشمل العرض التوصيل من/إلى المطار.");
  }

  const carYes = $("hasCar")?.value === "yes";
  if(carYes){
    const type = $("carType")?.value?.trim() || "—";
    parts.push(`✅ يشمل العرض سيارة إيجار طوال مدة الرحلة (النوع: ${type}).`);

    const toursYes = $("hasTours")?.value === "yes";
    if(toursYes){
      const n = Number($("toursCount")?.value || 0);
      parts.push(`✅ يشمل العرض (${n}) جولات يومية من 8 إلى 9 ساعات بسيارة خاصة مع سائق خاص.`);
    }
  } else {
    parts.push("لا يشمل العرض سيارة إيجار.");
  }

  const interYes = $("hasIntercity")?.value === "yes";
  if(interYes){
    const txt = $("intercityDetails")?.value?.trim();
    parts.push(`✅ انتقالات داخلية: ${txt ? txt : "بين المدن/الفنادق"}`);
  }

  const note = $("transportNotes")?.value?.trim();
  if(note) parts.push(`ملاحظات: ${note}`);

  return parts.join("\n");
}

/* =========================
   Totals + Per Person
========================= */
function totals(){
  const curr = $("currency")?.value || "AED";

  const flightPrice = hasFlight() ? Number($("flightPrice")?.value || 0) : 0;
  const hotelsTotal = state.hotels.reduce((s,h) => s + Number(h.price || 0), 0);

  const transferPrice = ($("hasTransfer")?.value === "yes") ? Number($("transferPrice")?.value || 0) : 0;
  const carPrice = ($("hasCar")?.value === "yes") ? Number($("carPrice")?.value || 0) : 0;
  const transportTotal = transferPrice + carPrice;

  const subtotal = flightPrice + hotelsTotal + transportTotal;

  const discount = Number($("discount")?.value || 0);
  const afterDiscount = Math.max(subtotal - discount, 0);

  const taxPct = Number($("tax")?.value || 0);
  const taxAmount = afterDiscount * (taxPct / 100);

  const grand = afterDiscount + taxAmount;

  return {
    curr, flightPrice, hotelsTotal, transportTotal, subtotal, discount, taxAmount, grand
  };
}

function getPeopleCount(){
  const adults = Number($("adults")?.value || 0);
  const children = Number($("children")?.value || 0);
  return Math.max(adults + children, 0);
}

function resolvePriceDisplayMode(){
  const v = $("priceDisplay")?.value || "auto";
  if(v !== "auto") return v;

  const people = getPeopleCount();
  return people > 1 ? "both" : "total";
}

/* =========================
   Stay Summary
========================= */
function staySummaryText(){
  if(!state.hotels.length) return "—";

  const cities = Array.from(new Set(state.hotels.map(h => h.city).filter(Boolean)));
  const stars = Array.from(new Set(state.hotels.map(h => h.stars).filter(Boolean)));
  const meals = Array.from(new Set(state.hotels.map(h => h.meals).filter(Boolean)));

  const roomsTotal = state.hotels.reduce((s,h) => s + Number(h.rooms || 0), 0);

  const citiesText = cities.length ? cities.join(" - ") : "—";
  const starsText = stars.length ? stars.join(" / ") : "—";
  const mealsText = meals.length ? meals.join(" / ") : "—";

  return `الإقامة في: ${citiesText}\nتصنيف الفنادق: ${starsText}\nخطة الوجبات: ${mealsText}\nإجمالي عدد الغرف: ${roomsTotal || "—"}`;
}

/* =========================
   Render
========================= */
function renderAll(){
  const dur = calcDuration();
  if($("tripDurationText")) $("tripDurationText").textContent = dur?.text || "—";

  const compName = $("companyName")?.value?.trim() || "—";
  const compMeta = [
    $("companyAddress")?.value?.trim(),
    $("companyPhone")?.value?.trim(),
    $("companyEmail")?.value?.trim()
  ].filter(Boolean).join(" • ");

  if($("pCompanyName")) $("pCompanyName").textContent = compName;
  if($("pCompanyMeta")) $("pCompanyMeta").textContent = compMeta || "—";

  if($("pQuoteNo")) $("pQuoteNo").textContent = $("quoteNo")?.value?.trim() || "—";
  if($("pQuoteDate")) $("pQuoteDate").textContent = formatDate($("quoteDate")?.value);

  if($("pClientName")) $("pClientName").textContent = $("clientName")?.value?.trim() || "—";

  // destinations from hidden select
  const dests = getSelectedOptions($("destinations"));
  if($("pDestinations")) $("pDestinations").textContent = dests.length ? dests.join(" - ") : "—";

  if($("pAdults")) $("pAdults").textContent = $("adults")?.value || "—";
  if($("pChildren")) $("pChildren").textContent = $("children")?.value || "—";

  if($("pChildrenAges")){
    const ages = $("childrenAges")?.value?.trim();
    $("pChildrenAges").textContent = ages ? ages : "—";
  }

  if($("pGoDate")) $("pGoDate").textContent = formatDate($("goDate")?.value);
  if($("pBackDate")) $("pBackDate").textContent = formatDate($("backDate")?.value);
  if($("pDuration")) $("pDuration").textContent = dur?.text || "—";

  if($("pFlight")) $("pFlight").textContent = flightText();
  if($("pProgramDetails")) $("pProgramDetails").textContent = $("programDetails")?.value?.trim() || "—";

  renderPreviewHotels();
  if($("pStaySummary")) $("pStaySummary").textContent = staySummaryText();

  if($("pTransport")) $("pTransport").textContent = transportText();

  const t = totals();

  if($("pCurr1")) $("pCurr1").textContent = t.curr;
  if($("pCurr2")) $("pCurr2").textContent = t.curr;
  if($("pCurr3")) $("pCurr3").textContent = t.curr;
  if($("pCurr4")) $("pCurr4").textContent = t.curr;
  if($("pCurr5")) $("pCurr5").textContent = t.curr;
  if($("pCurr6")) $("pCurr6").textContent = t.curr;
  if($("pCurr7")) $("pCurr7").textContent = t.curr;

  if($("pFlightPrice")) $("pFlightPrice").textContent = money(t.flightPrice);
  if($("pHotelsTotal")) $("pHotelsTotal").textContent = money(t.hotelsTotal);
  if($("pTransportTotal")) $("pTransportTotal").textContent = money(t.transportTotal);
  if($("pSubtotal")) $("pSubtotal").textContent = money(t.subtotal);
  if($("pDiscount")) $("pDiscount").textContent = money(t.discount);
  if($("pTaxAmount")) $("pTaxAmount").textContent = money(t.taxAmount);
  if($("pGrand")) $("pGrand").textContent = money(t.grand);

  const people = getPeopleCount();
  const perPerson = people > 0 ? (t.grand / people) : 0;

  if($("pPerPerson")) $("pPerPerson").textContent = money(perPerson);
  if($("pCurrPer")) $("pCurrPer").textContent = t.curr;

  const mode = resolvePriceDisplayMode();
  const perWrap = $("pPerPersonWrap");
  const grandWrap = $("pGrandWrap");

  if(perWrap) toggle(perWrap, mode === "both" || mode === "perPerson");
  if(grandWrap) toggle(grandWrap, mode === "both" || mode === "total");

  if($("pNotes")) $("pNotes").textContent = $("notes")?.value?.trim() || "—";
  if($("pTerms")) $("pTerms").textContent = $("terms")?.value?.trim() || "—";
}

/* =========================
   Visibility / Dynamic inputs
========================= */
function setupVisibility(){
  document.querySelectorAll('input[name="hasFlight"]').forEach(r => {
    r.addEventListener("change", () => {
      toggle($("flightBox"), hasFlight());
      renderAll();
    });
  });

  const airlineEl = $("airline");
  if(airlineEl){
    airlineEl.addEventListener("change", () => {
      const isOther = airlineEl.value === "أخرى";
      toggle($("airlineOtherWrap"), isOther);
      if(!isOther && $("airlineOther")) $("airlineOther").value = "";
      renderAll();
    });
  }

  $("hasTransfer")?.addEventListener("change", () => {
    const yes = $("hasTransfer").value === "yes";
    toggle($("transferPriceWrap"), yes);
    if(!yes && $("transferPrice")) $("transferPrice").value = 0;
    renderAll();
  });

  $("hasCar")?.addEventListener("change", () => {
    const yes = $("hasCar").value === "yes";
    toggle($("carTypeWrap"), yes);
    toggle($("carPriceWrap"), yes);
    toggle($("hasToursWrap"), yes);

    if(!yes){
      if($("carType")) $("carType").value = "";
      if($("carPrice")) $("carPrice").value = 0;
      if($("hasTours")) $("hasTours").value = "no";
      if($("toursCount")) $("toursCount").value = 0;
      toggle($("toursCountWrap"), false);
    }
    renderAll();
  });

  $("hasTours")?.addEventListener("change", () => {
    const yes = $("hasTours").value === "yes";
    toggle($("toursCountWrap"), yes);
    if(!yes && $("toursCount")) $("toursCount").value = 0;
    renderAll();
  });

  const interEl = $("hasIntercity");
  if(interEl){
    interEl.addEventListener("change", () => {
      const yes = interEl.value === "yes";
      toggle($("intercityDetailsWrap"), yes);
      if(!yes && $("intercityDetails")) $("intercityDetails").value = "";
      renderAll();
    });
  }
}

function bindGeneralInputs(){
  const ids = [
    "companyName","companyPhone","companyEmail","companyAddress",
    "clientName","quoteNo","quoteDate","currency",
    "destinations", // hidden select (synced)
    "adults","children","childrenAges",
    "goDate","backDate",
    "programDetails",
    "flightType","baggage","airline","airlineOther","flightPrice","flightNote",
    "fromCityGo","toCityGo","goDepTime","goArrTime",
    "fromCityBack","toCityBack","backDepTime","backArrTime",
    "hasTransfer","transferPrice",
    "hasCar","carType","carPrice",
    "hasTours","toursCount",
    "hasIntercity","intercityDetails",
    "transportNotes",
    "priceDisplay",
    "discount","tax",
    "notes","terms"
  ];

  ids.forEach(id => {
    const el = $(id);
    if(!el) return;
    el.addEventListener("input", renderAll);
    el.addEventListener("change", renderAll);
  });
}

/* =========================
   PDF (print)
========================= */
function downloadPDF(){
  document.title = ($("quoteNo")?.value || "عرض-سعر").trim();
  window.print();
}

/* =========================
   Init
========================= */
function init(){
  setTodayIfEmpty();

  // default first hotel row
  addHotelRow({ city: "موسكو", hotel: "فندق اكوامارين", stars: "*4", rooms: "1", roomType: "غرفة مزدوجة", meals: "بالافطار", price: 0 });

  setupVisibility();
  bindGeneralInputs();

  $("btnAddHotel")?.addEventListener("click", () => addHotelRow());
  $("btnDownload")?.addEventListener("click", downloadPDF);

  toggle($("flightBox"), hasFlight());
  toggle($("transferPriceWrap"), $("hasTransfer")?.value === "yes");
  toggle($("carTypeWrap"), $("hasCar")?.value === "yes");
  toggle($("carPriceWrap"), $("hasCar")?.value === "yes");
  toggle($("hasToursWrap"), $("hasCar")?.value === "yes");
  toggle($("toursCountWrap"), $("hasTours")?.value === "yes" && $("hasCar")?.value === "yes");

  if($("airline")) toggle($("airlineOtherWrap"), $("airline").value === "أخرى");
  if($("hasIntercity")) toggle($("intercityDetailsWrap"), $("hasIntercity").value === "yes");

  // ✅ destinations dropdown setup (loads countries + binds search/check)
  setupDestinationsDropdown();

  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
