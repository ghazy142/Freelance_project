const $ = (id) => document.getElementById(id);

const state = {
  hotels: []
};

function setTodayIfEmpty(){
  const d = new Date();
  const iso = d.toISOString().slice(0,10);
  if (!$("quoteDate").value) $("quoteDate").value = iso;
}

function getSelectedOptions(selectEl){
  return Array.from(selectEl.selectedOptions).map(o => o.value);
}

function money(n){
  const x = Number(n || 0);
  return isFinite(x) ? x.toFixed(2) : "0.00";
}

function formatDate(iso){
  if(!iso) return "—";
  // keep as yyyy-mm-dd to be consistent
  return iso;
}

function calcDuration(){
  const go = $("goDate").value;
  const back = $("backDate").value;
  if(!go || !back) return null;

  const goD = new Date(go + "T00:00:00");
  const backD = new Date(back + "T00:00:00");
  const diffMs = backD - goD;
  if(diffMs <= 0) return { nights: 0, days: 0, text: "—" };

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const nights = Math.max(days, 0);
  // كثير بيكتبوا "X ليالي Y أيام" (الأيام غالبًا = الليالي + 1)
  const travelDays = days + 1;
  return { nights, days: travelDays, text: `${String(nights).padStart(2,'0')} ليالي / ${String(travelDays).padStart(2,'0')} أيام` };
}

function toggle(el, show){
  el.classList.toggle("hidden", !show);
}

function addHotelRow(prefill = {}){
  const tpl = $("hotelRowTpl");
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

  // on input -> sync + render
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

  $("hotelsContainer").appendChild(node);
  syncHotelsFromDOM();
  renderAll();
}

function syncHotelsFromDOM(){
  const rows = Array.from(document.querySelectorAll(".hotelRow"));
  state.hotels = rows.map(r => ({
    city: r.querySelector(".hCity").value.trim(),
    hotel: r.querySelector(".hHotel").value.trim(),
    stars: r.querySelector(".hStars").value,
    rooms: r.querySelector(".hRooms").value,
    roomType: r.querySelector(".hRoomType").value,
    meals: r.querySelector(".hMeals").value,
    price: Number(r.querySelector(".hPrice").value || 0),
  }));
}

function hasFlight(){
  const v = document.querySelector('input[name="hasFlight"]:checked')?.value || "no";
  return v === "yes";
}

function flightText(){
  if(!hasFlight()) return "لا يشمل العرض الطيران الدولي.";

  const type = $("flightType").value;
  const bag = $("baggage").value;
  const note = $("flightNote").value.trim();

  const go = `*رحلة الذهاب*\nمن ${$("fromCityGo").value} إلى ${$("toCityGo").value}\nإقلاع ${$("goDepTime").value} وصول ${$("goArrTime").value}`;
  const back = `*رحلة العودة*\nمن ${$("fromCityBack").value} إلى ${$("toCityBack").value}\nإقلاع ${$("backDepTime").value} وصول ${$("backArrTime").value}`;

  return `يشمل العرض الطيران الدولي: نعم\nنوع الرحلة: ${type} - وزن الشنطة: ${bag} كجم\n\n${go}\n\n${back}${note ? `\n\nملاحظة: ${note}` : ""}`;
}

function transportText(){
  const parts = [];

  const transferYes = $("hasTransfer").value === "yes";
  if(transferYes){
    parts.push("العرض يشمل الإستقبال والتوديع من المطار بسيارة خاصة مع سائق خاص.");
  } else {
    parts.push("لا يشمل العرض التوصيل من/إلى المطار.");
  }

  const carYes = $("hasCar").value === "yes";
  if(carYes){
    const type = $("carType").value.trim() || "—";
    parts.push(`العرض يشمل سيارة إيجار طوال مدة الرحلة (النوع: ${type}).`);

    const toursYes = $("hasTours").value === "yes";
    if(toursYes){
      const n = Number($("toursCount").value || 0);
      parts.push(`العرض يشمل (${n}) جولات يومية من 8 إلى 9 ساعات بسيارة خاصة مع سائق خاص.`);
    }
  } else {
    parts.push("لا يشمل العرض سيارة إيجار.");
  }

  const note = $("transportNotes").value.trim();
  if(note) parts.push(`ملاحظات: ${note}`);

  return parts.join("\n");
}

function totals(){
  const curr = $("currency").value;

  const flightPrice = hasFlight() ? Number($("flightPrice").value || 0) : 0;

  const hotelsTotal = state.hotels.reduce((s,h) => s + Number(h.price || 0), 0);

  const transferPrice = ($("hasTransfer").value === "yes") ? Number($("transferPrice").value || 0) : 0;
  const carPrice = ($("hasCar").value === "yes") ? Number($("carPrice").value || 0) : 0;
  const transportTotal = transferPrice + carPrice;

  const subtotal = flightPrice + hotelsTotal + transportTotal;

  const discount = Number($("discount").value || 0);
  const afterDiscount = Math.max(subtotal - discount, 0);

  const taxPct = Number($("tax").value || 0);
  const taxAmount = afterDiscount * (taxPct / 100);

  const grand = afterDiscount + taxAmount;

  return {
    curr, flightPrice, hotelsTotal, transportTotal, subtotal, discount, taxAmount, grand
  };
}

function renderPreviewHotels(){
  const tbody = $("pHotelsBody");
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

function renderAll(){
  // duration
  const dur = calcDuration();
  $("tripDurationText").textContent = dur?.text || "—";

  // Company meta
  const compName = $("companyName").value.trim() || "—";
  const compMeta = [
    $("companyAddress").value.trim(),
    $("companyPhone").value.trim(),
    $("companyEmail").value.trim()
  ].filter(Boolean).join(" • ");

  $("pCompanyName").textContent = compName;
  $("pCompanyMeta").textContent = compMeta || "—";

  $("pQuoteNo").textContent = $("quoteNo").value.trim() || "—";
  $("pQuoteDate").textContent = formatDate($("quoteDate").value);

  $("pClientName").textContent = $("clientName").value.trim() || "—";

  const dests = getSelectedOptions($("destinations"));
  $("pDestinations").textContent = dests.length ? dests.join(" - ") : "—";

  $("pAdults").textContent = $("adults").value;
  $("pChildren").textContent = $("children").value;

  $("pGoDate").textContent = formatDate($("goDate").value);
  $("pBackDate").textContent = formatDate($("backDate").value);
  $("pDuration").textContent = dur?.text || "—";

  $("pFlight").textContent = flightText();
  $("pProgramDetails").textContent = $("programDetails").value.trim() || "—";

  renderPreviewHotels();

  $("pTransport").textContent = transportText();

  // totals
  const t = totals();
  $("pCurr1").textContent = t.curr;
  $("pCurr2").textContent = t.curr;
  $("pCurr3").textContent = t.curr;
  $("pCurr4").textContent = t.curr;
  $("pCurr5").textContent = t.curr;
  $("pCurr6").textContent = t.curr;
  $("pCurr7").textContent = t.curr;

  $("pFlightPrice").textContent = money(t.flightPrice);
  $("pHotelsTotal").textContent = money(t.hotelsTotal);
  $("pTransportTotal").textContent = money(t.transportTotal);
  $("pSubtotal").textContent = money(t.subtotal);
  $("pDiscount").textContent = money(t.discount);
  $("pTaxAmount").textContent = money(t.taxAmount);
  $("pGrand").textContent = money(t.grand);

  $("pNotes").textContent = $("notes").value.trim() || "—";
  $("pTerms").textContent = $("terms").value.trim() || "—";
}

function setupVisibility(){
  // Flight toggle
  document.querySelectorAll('input[name="hasFlight"]').forEach(r => {
    r.addEventListener("change", () => {
      toggle($("flightBox"), hasFlight());
      renderAll();
    });
  });

  // Transfer yes/no
  $("hasTransfer").addEventListener("change", () => {
    const yes = $("hasTransfer").value === "yes";
    toggle($("transferPriceWrap"), yes);
    if(!yes) $("transferPrice").value = 0;
    renderAll();
  });

  // Car yes/no
  $("hasCar").addEventListener("change", () => {
    const yes = $("hasCar").value === "yes";
    toggle($("carTypeWrap"), yes);
    toggle($("carPriceWrap"), yes);
    toggle($("hasToursWrap"), yes);

    if(!yes){
      $("carType").value = "";
      $("carPrice").value = 0;
      $("hasTours").value = "no";
      $("toursCount").value = 0;
      toggle($("toursCountWrap"), false);
    }
    renderAll();
  });

  // Tours yes/no
  $("hasTours").addEventListener("change", () => {
    const yes = $("hasTours").value === "yes";
    toggle($("toursCountWrap"), yes);
    if(!yes) $("toursCount").value = 0;
    renderAll();
  });
}

function bindGeneralInputs(){
  const ids = [
    "companyName","companyPhone","companyEmail","companyAddress",
    "clientName","quoteNo","quoteDate","currency",
    "destinations","adults","children","goDate","backDate",
    "programDetails","flightType","baggage","flightPrice","flightNote",
    "fromCityGo","toCityGo","goDepTime","goArrTime",
    "fromCityBack","toCityBack","backDepTime","backArrTime",
    "transferPrice","carType","carPrice","toursCount",
    "transportNotes","discount","tax","notes","terms"
  ];

  ids.forEach(id => {
    const el = $(id);
    if(!el) return;
    el.addEventListener("input", renderAll);
    el.addEventListener("change", renderAll);
  });
}

async function downloadPDF(){
//   const el = $("pdfArea");
//   const scale = 2; // sharper
//   const canvas = await html2canvas(el, { scale, backgroundColor: "#ffffff" });

//   const imgData = canvas.toDataURL("image/png");
//   const { jsPDF } = window.jspdf;

//   // A4
//   const pdf = new jsPDF("p", "mm", "a4");
//   const pageWidth = pdf.internal.pageSize.getWidth();
//   const pageHeight = pdf.internal.pageSize.getHeight();

//   // Fit image to page width
//   const imgProps = pdf.getImageProperties(imgData);
//   const imgWidth = pageWidth;
//   const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

//   let y = 0;
//   let remaining = imgHeight;

//   while(remaining > 0){
//     pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);
//     remaining -= pageHeight;

//     if(remaining > 0){
//       pdf.addPage();
//       y -= pageHeight; // move up for next slice
//     }
//   }

//   const fileName = `${($("quoteNo").value || "Quotation").trim()}.pdf`;
//   pdf.save(fileName);
  // اسم الملف (بيظهر في بعض المتصفحات)
  document.title = ($("quoteNo").value || "عرض-سعر").trim();

  // افتح نافذة الطباعة
  window.print();
}

// اربط الزر
$("btnDownload").addEventListener("click", downloadPDF);


function init(){
  setTodayIfEmpty();

  // default first hotel row (موسكو كمثال)
  addHotelRow({ city: "موسكو", hotel: "فندق اكوامارين", stars: "*4", rooms: "1", roomType: "غرفة مزدوجة", meals: "بالافطار", price: 0 });

  setupVisibility();
  bindGeneralInputs();

  $("btnAddHotel").addEventListener("click", () => addHotelRow());
  $("btnDownload").addEventListener("click", downloadPDF);

  // initial visibility
  toggle($("flightBox"), hasFlight());
  toggle($("transferPriceWrap"), $("hasTransfer").value === "yes");
  toggle($("carTypeWrap"), $("hasCar").value === "yes");
  toggle($("carPriceWrap"), $("hasCar").value === "yes");
  toggle($("hasToursWrap"), $("hasCar").value === "yes");
  toggle($("toursCountWrap"), $("hasTours").value === "yes" && $("hasCar").value === "yes");

  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
