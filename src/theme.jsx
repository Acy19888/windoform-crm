// src/theme.js – Windoform CRM shared styles, icons, helpers

export const C = {
  bg: "#0A1628", sf: "#0F2035", sf2: "#142A42", acc: "#2B5597",
  accL: "#3A6BB5", accG: "rgba(43,85,151,0.12)",
  ok: "#34D399", okG: "rgba(52,211,153,0.12)",
  warn: "#FBBF24", warnG: "rgba(251,191,36,0.12)",
  err: "#EF4444", errG: "rgba(239,68,68,0.12)",
  tx: "#ECE9E1", txM: "#A7A9AC", txD: "#6d6e71",
  bd: "#1E3A5A", wh: "#FFF",
};

export const cardStyle = { background: C.sf, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 20 };
export const inputStyle = { width: "100%", padding: "10px 14px", background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", fontFamily: "'Montserrat',sans-serif" };
export const btnStyle = (bg, c, extra = {}) => ({ padding: "10px 20px", background: bg, color: c, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, ...extra });
export const labelStyle = { fontSize: 11, color: C.txM, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4, display: "block" };

export const STATUS = {
  lead: { label: "Lead", color: C.txM, bg: "rgba(167,169,172,0.15)" },
  contact: { label: "Kontakt", color: C.accL, bg: C.accG },
  offer: { label: "Angebot", color: C.warn, bg: C.warnG },
  negotiation: { label: "Verhandlung", color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  won: { label: "Gewonnen", color: C.ok, bg: C.okG },
  lost: { label: "Verloren", color: C.err, bg: C.errG },
};

export const PRIORITY = {
  low: { label: "Niedrig", color: C.txM },
  medium: { label: "Mittel", color: C.warn },
  high: { label: "Hoch", color: "#F97316" },
  urgent: { label: "Dringend", color: C.err },
};

export const fmt = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("de-DE") : "—";

// Icons
const iconPaths = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  customers: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  deals: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  tasks: "M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z",
  products: "M20 4H4c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm-5 7H9v-2h6v2z",
  settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41L9.25 5.35C8.66 5.59 8.12 5.92 7.63 6.29L5.24 5.33c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  del: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  logout: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
  euro: "M15 18.5c-2.51 0-4.68-1.42-5.76-3.5H15v-2H8.58c-.05-.33-.08-.66-.08-1s.03-.67.08-1H15V9H9.24C10.32 6.92 12.5 5.5 15 5.5c1.61 0 3.09.59 4.23 1.57L21 5.3C19.41 3.87 17.3 3 15 3c-3.92 0-7.24 2.51-8.48 6H3v2h3.06c-.04.33-.06.66-.06 1s.02.67.06 1H3v2h3.52c1.24 3.49 4.56 6 8.48 6 2.31 0 4.41-.87 6-2.3l-1.78-1.77c-1.13.98-2.6 1.57-4.22 1.57z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  calendar: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z",
  upload: "M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z",
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
};

export function Ic({ name, size = 20, color = C.tx }) {
  const d = iconPaths[name];
  if (!d) return null;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d={d} /></svg>;
}

// CSV Parser
export function parseCSV(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[,;\t]/).map((h) => h.replace(/"/g, "").trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const vals = line.match(/(".*?"|[^,;\t]+)/g) || [];
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/"/g, "").trim(); });
    return obj;
  });
}

// Map CSV headers to our fields
export function mapCSVtoCustomer(row) {
  return {
    name: row.name || row.vorname && row.nachname ? `${row.vorname} ${row.nachname}` : row.kontakt || "",
    company: row.company || row.firma || row.unternehmen || "",
    position: row.position || row.titel || row.jobtitel || "",
    email: row.email || row["e-mail"] || row.mail || "",
    phone: row.phone || row.telefon || row.tel || "",
    mobile: row.mobile || row.mobil || row.handy || row.gsm || "",
    website: row.website || row.web || row.url || "",
    address: row.address || row.adresse || row.anschrift || "",
    status: "lead",
    source: "CSV Import",
  };
}

export function mapCSVtoProduct(row) {
  return {
    name: row.name || row.produkt || row.produktname || row.article || "",
    sku: row.sku || row.artikelnr || row.artikelnummer || row["art.nr"] || "",
    price: parseFloat(row.price || row.preis || row.vk || "0") || 0,
    category: row.category || row.kategorie || row.gruppe || "",
    description: row.description || row.beschreibung || "",
  };
}
