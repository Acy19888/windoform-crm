import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { C, cardStyle, fmt, STATUS, Ic } from "../theme.jsx";

const PIE_COLORS = [C.acc, C.ok, C.warn, "#F97316", C.err, C.txM];

export default function Dashboard({ customers, deals, tasks }) {
  const [range, setRange] = useState("month");
  const now = new Date();

  const filterDate = (items) => items.filter((i) => {
    const d = new Date(i.createdAt);
    if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (range === "quarter") return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) && d.getFullYear() === now.getFullYear();
    if (range === "year") return d.getFullYear() === now.getFullYear();
    return true;
  });

  const wonDeals = deals.filter((d) => d.status === "won");
  const filteredWon = filterDate(wonDeals);
  const totalRev = filteredWon.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);

  const revBySeller = useMemo(() => {
    const m = {};
    filteredWon.forEach((d) => { const n = d.assignedName || "?"; m[n] = (m[n] || 0) + (parseFloat(d.amount) || 0); });
    return Object.entries(m).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [filteredWon]);

  const revByMonth = useMemo(() => {
    const m = {};
    wonDeals.forEach((d) => {
      const dt = new Date(d.createdAt);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const l = dt.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
      if (!m[k]) m[k] = { key: k, label: l, amount: 0 };
      m[k].amount += parseFloat(d.amount) || 0;
    });
    return Object.values(m).sort((a, b) => a.key.localeCompare(b.key)).slice(-12);
  }, [wonDeals]);

  const pipeline = useMemo(() => {
    const m = {};
    Object.keys(STATUS).forEach((s) => { m[s] = { status: s, ...STATUS[s], count: 0, amount: 0 }; });
    deals.forEach((d) => { if (m[d.status]) { m[d.status].count++; m[d.status].amount += parseFloat(d.amount) || 0; } });
    return Object.values(m);
  }, [deals]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Dashboard</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {[["month", "Monat"], ["quarter", "Quartal"], ["year", "Jahr"], ["all", "Alle"]].map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: range === k ? C.accG : "transparent", border: `1px solid ${range === k ? C.acc : C.bd}`, color: range === k ? C.tx : C.txM,
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Umsatz", value: fmt(totalRev), color: C.ok },
          { label: "Kunden", value: customers.length, color: C.acc },
          { label: "Angebote", value: filterDate(deals).length, color: C.warn },
          { label: "Offene Aufgaben", value: tasks.filter((t) => !t.done).length, color: C.err },
        ].map((k, i) => (
          <div key={i} style={{ ...cardStyle, animation: `slideUp .4s ease ${i * .08}s both` }}>
            <p style={{ fontSize: 11, color: C.txM, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>{k.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: k.color, fontFamily: "'JetBrains Mono',monospace" }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Umsatzentwicklung</h3>
          {revByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revByMonth}><XAxis dataKey="label" tick={{ fill: C.txD, fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: C.txD, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: C.sf2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.tx, fontSize: 12 }} formatter={(v) => fmt(v)} /><Bar dataKey="amount" fill={C.acc} radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: C.txD, fontSize: 13, padding: 40, textAlign: "center" }}>Noch keine Umsätze</p>}
        </div>
        <div style={cardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Pipeline</h3>
          {pipeline.some((p) => p.count > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={pipeline.filter((p) => p.count > 0)} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {pipeline.filter((p) => p.count > 0).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ background: C.sf2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.tx, fontSize: 12 }} /></PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {pipeline.filter((p) => p.count > 0).map((p, i) => <span key={p.status} style={{ fontSize: 10, color: PIE_COLORS[i % PIE_COLORS.length], fontWeight: 600 }}>● {p.label} ({p.count})</span>)}
              </div>
            </>
          ) : <p style={{ color: C.txD, fontSize: 13, padding: 40, textAlign: "center" }}>Noch keine Deals</p>}
        </div>
      </div>

      {/* Seller ranking */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Umsatz pro Verkäufer</h3>
        {revBySeller.length === 0 && <p style={{ color: C.txD, fontSize: 13 }}>Noch keine Daten</p>}
        {revBySeller.map((s, i) => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.acc, width: 28, textAlign: "center" }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ok, fontFamily: "'JetBrains Mono'" }}>{fmt(s.amount)}</span>
              </div>
              <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${(s.amount / (revBySeller[0]?.amount || 1)) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.acc}, ${C.ok})`, borderRadius: 3 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
