import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { C, cardStyle, inputStyle, btnStyle, labelStyle, Ic, fmt } from "../theme.jsx";
import { add, upd, del } from "../firebase.js";

export default function Production({ production, products, deals, notify }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ product: "", quantity: "", ral: "", date: new Date().toISOString().split("T")[0], shift: "Tag", notes: "" });
  const [dateFilter, setDateFilter] = useState("month");
  const [tab, setTab] = useState("overview"); // overview | log | inventory

  const fd = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const now = new Date();

  // Filter by date
  const filtered = useMemo(() => production.filter((p) => {
    const d = new Date(p.date || p.createdAt);
    if (dateFilter === "today") return d.toDateString() === now.toDateString();
    if (dateFilter === "week") { const w = new Date(); w.setDate(w.getDate() - 7); return d >= w; }
    if (dateFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateFilter === "year") return d.getFullYear() === now.getFullYear();
    return true;
  }), [production, dateFilter]);

  // Total produced
  const totalProduced = filtered.reduce((s, p) => s + (parseInt(p.quantity) || 0), 0);

  // Production by product
  const byProduct = useMemo(() => {
    const m = {};
    filtered.forEach((p) => {
      const name = p.product || "Unbekannt";
      if (!m[name]) m[name] = { name, quantity: 0, entries: 0 };
      m[name].quantity += parseInt(p.quantity) || 0;
      m[name].entries++;
    });
    return Object.values(m).sort((a, b) => b.quantity - a.quantity);
  }, [filtered]);

  // Production by day (last 30 days)
  const byDay = useMemo(() => {
    const m = {};
    production.forEach((p) => {
      const d = (p.date || p.createdAt || "").split("T")[0];
      if (!m[d]) m[d] = { date: d, label: new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }), quantity: 0 };
      m[d].quantity += parseInt(p.quantity) || 0;
    });
    return Object.values(m).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [production]);

  // Inventory calculation: produced - sold
  const inventory = useMemo(() => {
    const m = {};
    // Add production
    production.forEach((p) => {
      const name = p.product || "Unbekannt";
      const key = p.ral ? `${name} (${p.ral})` : name;
      if (!m[key]) m[key] = { name, ral: p.ral || "", produced: 0, sold: 0 };
      m[key].produced += parseInt(p.quantity) || 0;
    });
    // Subtract sold from won deals
    deals.filter((d) => d.status === "won" && d.productList).forEach((d) => {
      const items = d.productList.split(",").map((i) => i.trim());
      items.forEach((item) => {
        const match = item.match(/(.+?)\s*x\s*(\d+)/i);
        if (match) {
          const name = match[1].trim();
          const qty = parseInt(match[2]) || 0;
          // Try to match with inventory
          const key = Object.keys(m).find((k) => k.toLowerCase().includes(name.toLowerCase()));
          if (key) m[key].sold += qty;
        }
      });
    });
    return Object.entries(m).map(([key, v]) => ({ key, ...v, stock: v.produced - v.sold })).sort((a, b) => b.produced - a.produced);
  }, [production, deals]);

  // Save production entry
  const saveEntry = async () => {
    if (!form.product || !form.quantity) { notify("Produkt und Menge eingeben", "error"); return; }
    await add("crm_production", { ...form, quantity: parseInt(form.quantity) });
    setForm({ product: "", quantity: "", ral: "", date: new Date().toISOString().split("T")[0], shift: "Tag", notes: "" });
    setShowAdd(false);
    notify(`${form.quantity}x ${form.product} eingetragen`);
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Produktion & Inventar</h2>
        <button onClick={() => setShowAdd(true)} style={btnStyle(C.acc, C.wh)}><Ic name="add" size={16} color={C.wh} /> Eintrag</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["overview", "Übersicht"], ["log", "Produktionslog"], ["inventory", "Inventar"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: tab === k ? C.accG : "transparent", border: `1px solid ${tab === k ? C.acc : C.bd}`, color: tab === k ? C.tx : C.txM,
          }}>{l}</button>
        ))}
      </div>

      {/* Date filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["today", "Heute"], ["week", "Woche"], ["month", "Monat"], ["year", "Jahr"], ["all", "Alle"]].map(([k, l]) => (
          <button key={k} onClick={() => setDateFilter(k)} style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
            background: dateFilter === k ? C.accG : "transparent", border: `1px solid ${dateFilter === k ? C.acc : C.bd}`, color: dateFilter === k ? C.tx : C.txM,
          }}>{l}</button>
        ))}
      </div>

      {/* ============ OVERVIEW ============ */}
      {tab === "overview" && (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
            <div style={cardStyle}>
              <p style={{ fontSize: 10, color: C.txM, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Produziert</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: C.ok, fontFamily: "'JetBrains Mono'" }}>{totalProduced.toLocaleString()}</p>
              <p style={{ fontSize: 10, color: C.txD, marginTop: 2 }}>Stück</p>
            </div>
            <div style={cardStyle}>
              <p style={{ fontSize: 10, color: C.txM, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Produkte</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: C.acc, fontFamily: "'JetBrains Mono'" }}>{byProduct.length}</p>
              <p style={{ fontSize: 10, color: C.txD, marginTop: 2 }}>Varianten</p>
            </div>
            <div style={cardStyle}>
              <p style={{ fontSize: 10, color: C.txM, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Einträge</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: C.warn, fontFamily: "'JetBrains Mono'" }}>{filtered.length}</p>
              <p style={{ fontSize: 10, color: C.txD, marginTop: 2 }}>Buchungen</p>
            </div>
          </div>

          {/* Chart: daily production */}
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Tägliche Produktion</h3>
            {byDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
                  <XAxis dataKey="label" tick={{ fill: C.txD, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.txD, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: C.sf2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.tx, fontSize: 12 }} />
                  <Line type="monotone" dataKey="quantity" stroke={C.acc} strokeWidth={2} dot={{ fill: C.acc, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p style={{ color: C.txD, textAlign: "center", padding: 40 }}>Noch keine Daten</p>}
          </div>

          {/* Top products */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Produktion nach Produkt</h3>
            {byProduct.map((p, i) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.acc, width: 24 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.ok, fontFamily: "'JetBrains Mono'" }}>{p.quantity.toLocaleString()} Stk</span>
                  </div>
                  <div style={{ height: 5, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${(p.quantity / (byProduct[0]?.quantity || 1)) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.acc}, ${C.ok})`, borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            ))}
            {byProduct.length === 0 && <p style={{ color: C.txD, fontSize: 13 }}>Noch keine Produktionsdaten</p>}
          </div>
        </>
      )}

      {/* ============ LOG ============ */}
      {tab === "log" && (
        <>
          {filtered.map((p, i) => (
            <div key={p.id} style={{ ...cardStyle, marginBottom: 8, padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: C.okG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic name="products" size={18} color={C.ok} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{p.product} {p.ral && <span style={{ fontSize: 11, color: C.txM }}>RAL {p.ral}</span>}</p>
                <p style={{ fontSize: 12, color: C.txM }}>{p.shift}-Schicht · {p.notes || ""}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: C.ok, fontFamily: "'JetBrains Mono'" }}>{parseInt(p.quantity).toLocaleString()}</p>
                <p style={{ fontSize: 10, color: C.txD }}>{p.date || p.createdAt?.split("T")[0]}</p>
              </div>
              <button onClick={() => del("crm_production", p.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, opacity: .5 }}><Ic name="del" size={14} color={C.err} /></button>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: C.txD, textAlign: "center", padding: 40 }}>Keine Einträge im gewählten Zeitraum</p>}
        </>
      )}

      {/* ============ INVENTORY ============ */}
      {tab === "inventory" && (
        <>
          <div style={{ display: "grid", gap: 8 }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", gap: 8, padding: "8px 14px" }}>
              <span style={{ fontSize: 10, color: C.txM, fontWeight: 600 }}>PRODUKT</span>
              <span style={{ fontSize: 10, color: C.txM, fontWeight: 600, textAlign: "right" }}>PRODUZIERT</span>
              <span style={{ fontSize: 10, color: C.txM, fontWeight: 600, textAlign: "right" }}>VERKAUFT</span>
              <span style={{ fontSize: 10, color: C.txM, fontWeight: 600, textAlign: "right" }}>BESTAND</span>
            </div>
            {inventory.map((item) => (
              <div key={item.key} style={{ ...cardStyle, padding: 14, display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", gap: 8, alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</p>
                  {item.ral && <p style={{ fontSize: 11, color: C.txM }}>RAL {item.ral}</p>}
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.ok, textAlign: "right", fontFamily: "'JetBrains Mono'" }}>{item.produced.toLocaleString()}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.warn, textAlign: "right", fontFamily: "'JetBrains Mono'" }}>{item.sold.toLocaleString()}</p>
                <p style={{ fontSize: 16, fontWeight: 800, textAlign: "right", fontFamily: "'JetBrains Mono'", color: item.stock <= 0 ? C.err : item.stock < 100 ? C.warn : C.ok }}>{item.stock.toLocaleString()}</p>
              </div>
            ))}
            {inventory.length === 0 && <p style={{ color: C.txD, textAlign: "center", padding: 40 }}>Noch kein Inventar. Trage Produktionszahlen ein.</p>}
          </div>
        </>
      )}

      {/* ============ ADD ENTRY MODAL ============ */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,22,40,.85)", backdropFilter: "blur(8px)", padding: 24 }} onClick={() => setShowAdd(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, maxWidth: 450, width: "100%", animation: "slideUp .3s ease" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Produktion eintragen</h3>

            <div style={{ marginBottom: 10 }}><label style={labelStyle}>Produkt *</label>
              <input style={inputStyle} value={form.product} onChange={(e) => fd("product", e.target.value)} placeholder="z.B. Ege Akustik" list="prod-list" />
              <datalist id="prod-list">{products.map((p) => <option key={p.id} value={p.name} />)}</datalist>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><label style={labelStyle}>Menge (Stück) *</label><input style={inputStyle} type="number" value={form.quantity} onChange={(e) => fd("quantity", e.target.value)} placeholder="500" /></div>
              <div><label style={labelStyle}>RAL Code</label><input style={inputStyle} value={form.ral} onChange={(e) => fd("ral", e.target.value)} placeholder="z.B. 9016" /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><label style={labelStyle}>Datum</label><input style={inputStyle} type="date" value={form.date} onChange={(e) => fd("date", e.target.value)} /></div>
              <div><label style={labelStyle}>Schicht</label><select style={inputStyle} value={form.shift} onChange={(e) => fd("shift", e.target.value)}>
                <option>Tag</option><option>Nacht</option><option>Früh</option><option>Spät</option>
              </select></div>
            </div>
            <div style={{ marginBottom: 14 }}><label style={labelStyle}>Notizen</label><input style={inputStyle} value={form.notes} onChange={(e) => fd("notes", e.target.value)} placeholder="Optional" /></div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveEntry} style={{ ...btnStyle(`linear-gradient(135deg,${C.acc},#1E4080)`, C.wh), flex: 1, justifyContent: "center" }}><Ic name="check" size={16} color={C.wh} /> Eintragen</button>
              <button onClick={() => setShowAdd(false)} style={btnStyle(C.sf2, C.txM, { border: `1px solid ${C.bd}` })}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
