// src/export.js – CSV Export & PDF Generation

// ============================================================
// CSV EXPORT
// ============================================================
export function exportCSV(filename, headers, rows) {
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
}

export function exportCustomersCSV(customers) {
  exportCSV("kunden", 
    ["Name", "Firma", "Position", "Email", "Telefon", "Mobil", "Website", "Adresse", "Status", "Quelle", "Erstellt", "Notizen"],
    customers.map((c) => [c.name, c.company, c.position, c.email, c.phone, c.mobile, c.website, c.address, c.status, c.source, c.createdAt?.split("T")[0], c.notes])
  );
}

export function exportDealsCSV(deals) {
  exportCSV("angebote",
    ["Titel", "Kunde", "Verkäufer", "Betrag", "Status", "Produkte", "Erstellt", "Notizen"],
    deals.map((d) => [d.title, d.customerName, d.assignedName, d.amount, d.status, d.productList, d.createdAt?.split("T")[0], d.notes])
  );
}

export function exportProductsCSV(products) {
  exportCSV("produkte",
    ["Name", "SKU", "Preis", "Kategorie", "Beschreibung"],
    products.map((p) => [p.name, p.sku, p.price, p.category, p.description])
  );
}

export function exportProductionCSV(production) {
  exportCSV("produktion",
    ["Datum", "Produkt", "RAL", "Menge", "Schicht", "Notizen"],
    production.map((p) => [p.date || p.createdAt?.split("T")[0], p.product, p.ral, p.quantity, p.shift, p.notes])
  );
}

export function exportInventoryCSV(inventory) {
  exportCSV("inventar",
    ["Produkt", "RAL", "Produziert", "Verkauft", "Bestand"],
    inventory.map((i) => [i.name, i.ral, i.produced, i.sold, i.stock])
  );
}

// ============================================================
// PDF GENERATION (simple HTML-based)
// ============================================================
export function generateDealPDF(deal, companyName = "Windoform") {
  const now = new Date().toLocaleDateString("de-DE");
  const items = (deal.productList || "").split(",").map((i) => i.trim()).filter(Boolean);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 40px; color: #333; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #2B5597; }
  .logo { font-size: 24px; font-weight: 800; color: #2B5597; }
  .logo span { display: block; font-size: 11px; color: #999; letter-spacing: 2px; font-weight: 600; }
  .doc-type { text-align: right; }
  .doc-type h2 { font-size: 20px; color: #2B5597; margin: 0; }
  .doc-type p { font-size: 12px; color: #999; margin: 4px 0 0; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
  .meta-box h3 { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px; }
  .meta-box p { font-size: 14px; margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f5f5f5; text-align: left; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; border-bottom: 2px solid #ddd; }
  td { padding: 10px 14px; border-bottom: 1px solid #eee; font-size: 14px; }
  .total-row { display: flex; justify-content: flex-end; margin-top: 20px; }
  .total-box { background: #2B5597; color: #fff; padding: 16px 30px; border-radius: 8px; text-align: right; }
  .total-box span { display: block; font-size: 11px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; }
  .total-box strong { font-size: 24px; }
  .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
  .status { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .notes { background: #f9f9f9; padding: 16px; border-radius: 8px; margin-top: 20px; font-size: 13px; line-height: 1.6; }
</style>
</head><body>
  <div class="header">
    <div class="logo">${companyName}<span>DOOR AND WINDOW ACCESSORIES</span></div>
    <div class="doc-type"><h2>${deal.status === "won" ? "RECHNUNG" : "ANGEBOT"}</h2><p>Datum: ${now}</p><p>Nr: ${deal.id?.substring(0, 8).toUpperCase() || "—"}</p></div>
  </div>
  <div class="meta">
    <div class="meta-box"><h3>Kunde</h3><p><strong>${deal.customerName || "—"}</strong></p></div>
    <div class="meta-box"><h3>Verkäufer</h3><p>${deal.assignedName || "—"}</p></div>
  </div>
  <table>
    <thead><tr><th>Pos.</th><th>Beschreibung</th></tr></thead>
    <tbody>${items.map((item, i) => `<tr><td>${i + 1}</td><td>${item}</td></tr>`).join("")}
    ${items.length === 0 ? "<tr><td colspan='2' style='color:#999'>Keine Positionen</td></tr>" : ""}</tbody>
  </table>
  <div class="total-row"><div class="total-box"><span>Gesamtbetrag</span><strong>${new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(deal.amount || 0)}</strong></div></div>
  ${deal.notes ? `<div class="notes"><strong>Notizen:</strong><br>${deal.notes}</div>` : ""}
  <div class="footer">${companyName} · Door and Window Accessories · windoform.com.tr</div>
</body></html>`;

  // Open in new window for printing/PDF
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}
