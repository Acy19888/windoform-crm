import { useState, useEffect } from "react";
import { C, cardStyle, btnStyle, inputStyle, labelStyle, Ic, STATUS, PRIORITY, fmt, fmtDate, parseCSV, mapCSVtoCustomer, mapCSVtoProduct } from "./theme.jsx";
import { add, upd, del, subscribe, addBatch, onAuthChange, logoutUser } from "./firebase.js";
import { demoCustomers, demoProducts, demoDeals, demoTasks, demoProduction } from "./demoData.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Settings from "./pages/Settings.jsx";
import CustomerDetail from "./pages/CustomerDetail.jsx";
import Production from "./pages/Production.jsx";
import FormModal from "./components/FormModal.jsx";
import CSVImport from "./components/CSVImport.jsx";
import { exportCustomersCSV, exportDealsCSV, exportProductsCSV, exportProductionCSV, generateDealPDF } from "./export.js";

export default function App() {
  const [user, setUser] = useState(undefined);
  const [page, setPage] = useState("dashboard");
  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState([]);
  const [production, setProduction] = useState([]);
  const [showForm, setShowForm] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchQ, setSearchQ] = useState("");
  const [userSettings, setUserSettings] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => onAuthChange((u) => setUser(u || null)), []);
  useEffect(() => {
    if (!user) return;
    const u = [subscribe("crm_customers", setCustomers), subscribe("crm_deals", setDeals), subscribe("crm_tasks", setTasks), subscribe("crm_products", setProducts), subscribe("crm_production", setProduction)];
    // Load user settings
    (async () => {
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const { db } = await import("./firebase.js");
        if (db) { const snap = await getDoc(doc(db, "crm_settings", user.uid)); if (snap.exists()) setUserSettings(snap.data()); }
      } catch {}
    })();
    return () => u.forEach((fn) => fn?.());
  }, [user]);

  const saveSettings = async (s) => {
    setUserSettings(s);
    try {
      const { setDoc, doc } = await import("firebase/firestore");
      const { db } = await import("./firebase.js");
      if (db) await setDoc(doc(db, "crm_settings", user.uid), s, { merge: true });
    } catch (e) { notify("Fehler: " + e.message, "error"); }
  };

  const notify = (m, t = "success") => { setToast({ m, t }); setTimeout(() => setToast(null), 3000); };

  // CRUD
  const saveForm = async () => {
    const col = `crm_${showForm}s`;
    try {
      if (editItem) { await upd(col, editItem.id, { ...formData, updatedBy: user.uid }); notify("Gespeichert"); }
      else { await add(col, { ...formData, createdBy: user.uid, assignedTo: user.uid }); notify("Erstellt"); }
      setShowForm(null); setEditItem(null); setFormData({});
    } catch (e) { notify("Fehler: " + e.message, "error"); }
  };

  const removeItem = async (col, id) => { if (!confirm("Wirklich löschen?")) return; await del(col, id); notify("Gelöscht"); setShowForm(null); setEditItem(null); };
  const openEdit = (type, item) => { setShowForm(type); setEditItem(item); setFormData({ ...item }); };
  const openNew = (type) => { setShowForm(type); setEditItem(null); setFormData({}); };

  // CSV Import
  const importCustomersCSV = async (text) => {
    const rows = parseCSV(text).map(mapCSVtoCustomer).filter((r) => r.name);
    await addBatch("crm_customers", rows.map((r) => ({ ...r, createdBy: user.uid }))); 
    notify(`${rows.length} Kunden importiert`);
  };
  const importProductsCSV = async (text) => {
    const rows = parseCSV(text).map(mapCSVtoProduct).filter((r) => r.name);
    await addBatch("crm_products", rows.map((r) => ({ ...r, createdBy: user.uid })));
    notify(`${rows.length} Produkte importiert`);
  };

  // Demo data
  const loadDemo = async () => {
    notify("Demo-Daten werden geladen...");
    await addBatch("crm_customers", demoCustomers);
    await addBatch("crm_products", demoProducts);
    await addBatch("crm_deals", demoDeals);
    await addBatch("crm_tasks", demoTasks);
    await addBatch("crm_production", demoProduction);
    notify("Demo-Daten geladen!");
  };

  // Filter
  const f = (items) => items.filter((i) => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return Object.values(i).some((v) => typeof v === "string" && v.toLowerCase().includes(q));
  });

  // ============================================================
  if (user === undefined) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.tx, fontFamily: "'Montserrat'" }}>Laden...</div>;
  if (!user) return <Login onDemo={null} />;

  const NAV = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "customers", icon: "customers", label: "Kunden" },
    { id: "deals", icon: "deals", label: "Angebote" },
    { id: "tasks", icon: "tasks", label: "Aufgaben" },
    { id: "products", icon: "products", label: "Produkte" },
    { id: "production", icon: "settings", label: "Produktion" },
    { id: "settings", icon: "settings", label: "Settings" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Montserrat',sans-serif", color: C.tx, display: "flex" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400&display=swap');
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        *{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${C.bd};border-radius:4px}input,textarea,select{font-family:'Montserrat',sans-serif}
        @media(max-width:768px){.desk{display:none!important}.mob{display:flex!important}}
      `}</style>

      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.t === "error" ? C.err : C.ok, color: C.wh, padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 1001, animation: "fadeIn .3s" }}>{toast.m}</div>}
      {sideOpen && <div onClick={() => setSideOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 998 }} />}

      {/* Sidebar */}
      <div className="desk" style={{ width: 240, background: C.sf, borderRight: `1px solid ${C.bd}`, display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, zIndex: 999, ...(sideOpen ? { display: "flex", animation: "slideIn .2s" } : {}) }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.bd}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.jpg" alt="W" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <div><h1 style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>WINDOFORM</h1><p style={{ fontSize: 9, color: C.txM, letterSpacing: ".1em", fontWeight: 600 }}>CRM</p></div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => { setPage(n.id); setSideOpen(false); setSearchQ(""); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              background: page === n.id ? C.accG : "transparent", border: "none", borderRadius: 10,
              color: page === n.id ? C.tx : C.txM, fontSize: 13, fontWeight: page === n.id ? 600 : 500, cursor: "pointer", marginBottom: 2, textAlign: "left",
            }}><Ic name={n.icon} size={18} color={page === n.id ? C.acc : C.txD} /> {n.label}</button>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: `1px solid ${C.bd}` }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.tx, marginBottom: 2 }}>{user.displayName}</p>
          <p style={{ fontSize: 11, color: C.txM, marginBottom: 8 }}>{user.email}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={logoutUser} style={{ ...btnStyle("transparent", C.txM), padding: "6px 0", fontSize: 11 }}><Ic name="logout" size={12} color={C.txM} /> Logout</button>
            <button onClick={loadDemo} style={{ ...btnStyle("transparent", C.txD), padding: "6px 0", fontSize: 11 }}>Demo</button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, marginLeft: 240, minHeight: "100vh" }}>
        {/* Top bar */}
        <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.bd}`, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: C.bg, zIndex: 10 }}>
          <button className="mob" onClick={() => setSideOpen(true)} style={{ display: "none", background: "none", border: "none", cursor: "pointer" }}><Ic name="menu" size={22} color={C.txM} /></button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: C.sf, borderRadius: 10, padding: "8px 14px", border: `1px solid ${C.bd}` }}>
            <Ic name="search" size={16} color={C.txD} />
            <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Suchen..." style={{ flex: 1, background: "none", border: "none", color: C.tx, fontSize: 13, outline: "none" }} />
          </div>
          {page === "customers" && <CSVImport onImport={importCustomersCSV} label="CSV↑" />}
          {page === "customers" && customers.length > 0 && <button onClick={() => { exportCustomersCSV(customers); notify("CSV exportiert"); }} style={btnStyle(C.sf2, C.txM, { border: `1px solid ${C.bd}`, padding: "8px 12px", fontSize: 11 })}>CSV↓</button>}
          {page === "products" && <CSVImport onImport={importProductsCSV} label="CSV↑" />}
          {page === "products" && products.length > 0 && <button onClick={() => { exportProductsCSV(products); notify("CSV exportiert"); }} style={btnStyle(C.sf2, C.txM, { border: `1px solid ${C.bd}`, padding: "8px 12px", fontSize: 11 })}>CSV↓</button>}
          {page === "deals" && deals.length > 0 && <button onClick={() => { exportDealsCSV(deals); notify("CSV exportiert"); }} style={btnStyle(C.sf2, C.txM, { border: `1px solid ${C.bd}`, padding: "8px 12px", fontSize: 11 })}>CSV↓</button>}
          {page !== "dashboard" && page !== "settings" && page !== "production" && (
            <button onClick={() => openNew(page.replace(/s$/, ""))} style={btnStyle(C.acc, C.wh)}><Ic name="add" size={16} color={C.wh} /> Neu</button>
          )}
        </div>

        <div style={{ padding: 24, animation: "fadeIn .3s" }}>
          {page === "dashboard" && <Dashboard customers={customers} deals={deals} tasks={tasks} />}

          {page === "customers" && !selectedCustomer && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Kunden ({customers.length})</h2>
              {f(customers).map((c) => (
                <div key={c.id} onClick={() => setSelectedCustomer(c)} style={{ ...cardStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, marginBottom: 10, transition: "border-color .2s" }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = C.acc + "66"} onMouseOut={(e) => e.currentTarget.style.borderColor = C.bd}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.accG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: C.acc, flexShrink: 0 }}>{(c.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</p>
                    <p style={{ fontSize: 12, color: C.txM }}>{c.company}{c.position ? ` · ${c.position}` : ""}</p>
                    {c.email && <p style={{ fontSize: 11, color: C.txD, marginTop: 2 }}>{c.email}</p>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {c.status && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, color: STATUS[c.status]?.color, background: STATUS[c.status]?.bg }}>{STATUS[c.status]?.label}</span>}
                    {c.emailHistory?.length > 0 && <span style={{ fontSize: 9, color: C.txD }}>{c.emailHistory.length} Emails</span>}
                    <span style={{ fontSize: 10, color: C.txD }}>{fmtDate(c.createdAt)}</span>
                  </div>
                </div>
              ))}
              {customers.length === 0 && <p style={{ color: C.txD, textAlign: "center", padding: 40 }}>Noch keine Kunden. Erstelle oder importiere welche.</p>}
            </>
          )}

          {page === "customers" && selectedCustomer && (
            <CustomerDetail
              customer={selectedCustomer}
              deals={deals}
              tasks={tasks}
              user={user}
              settings={userSettings}
              onBack={() => setSelectedCustomer(null)}
              onEditCustomer={(c) => { openEdit("customer", c); setSelectedCustomer(null); }}
              notify={notify}
            />
          )}

          {page === "deals" && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Angebote & Rechnungen ({deals.length})</h2>
              {f(deals).map((d) => (
                <div key={d.id} onClick={() => openEdit("deal", d)} style={{ ...cardStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, marginBottom: 10, transition: "border-color .2s" }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = C.acc + "66"} onMouseOut={(e) => e.currentTarget.style.borderColor = C.bd}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: STATUS[d.status]?.bg || C.accG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ic name="euro" size={20} color={STATUS[d.status]?.color || C.acc} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{d.title || "Angebot"}</p>
                    <p style={{ fontSize: 12, color: C.txM }}>{d.customerName}{d.assignedName ? ` → ${d.assignedName}` : ""}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: C.ok, fontFamily: "'JetBrains Mono'" }}>{fmt(d.amount)}</p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", marginTop: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, color: STATUS[d.status]?.color, background: STATUS[d.status]?.bg }}>{STATUS[d.status]?.label}</span>
                      <button onClick={(e) => { e.stopPropagation(); generateDealPDF(d, userSettings.companyName || "Windoform"); }} style={{ background: "none", border: `1px solid ${C.bd}`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 10, color: C.txM, fontWeight: 600 }}>PDF</button>
                    </div>
                  </div>
                </div>
              ))}
              {deals.length === 0 && <p style={{ color: C.txD, textAlign: "center", padding: 40 }}>Noch keine Angebote</p>}
            </>
          )}

          {page === "tasks" && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Aufgaben ({tasks.length})</h2>
              {tasks.filter((t) => !t.done && t.dueDate && new Date(t.dueDate) < new Date()).length > 0 && (
                <div style={{ ...cardStyle, background: C.errG, borderColor: C.err + "33", marginBottom: 16, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <Ic name="calendar" size={18} color={C.err} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.err }}>{tasks.filter((t) => !t.done && t.dueDate && new Date(t.dueDate) < new Date()).length} überfällige Aufgaben</span>
                </div>
              )}
              {f(tasks).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0)).map((t) => (
                <div key={t.id} style={{ ...cardStyle, padding: 14, display: "flex", alignItems: "center", gap: 14, marginBottom: 8, opacity: t.done ? .5 : 1 }}>
                  <button onClick={() => upd("crm_tasks", t.id, { done: !t.done })} style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${t.done ? C.ok : C.bd}`, background: t.done ? C.okG : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {t.done && <Ic name="check" size={14} color={C.ok} />}
                  </button>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => openEdit("task", t)}>
                    <p style={{ fontSize: 13, fontWeight: 600, textDecoration: t.done ? "line-through" : "none" }}>{t.title}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      {t.customerName && <span style={{ fontSize: 11, color: C.txM }}>{t.customerName}</span>}
                      {t.dueDate && <span style={{ fontSize: 11, color: new Date(t.dueDate) < new Date() && !t.done ? C.err : C.txD }}>{fmtDate(t.dueDate)}</span>}
                    </div>
                  </div>
                  {t.priority && <span style={{ fontSize: 10, fontWeight: 600, color: PRIORITY[t.priority]?.color, padding: "2px 8px", borderRadius: 6, background: C.bg }}>{PRIORITY[t.priority]?.label}</span>}
                </div>
              ))}
              {tasks.length === 0 && <p style={{ color: C.txD, textAlign: "center", padding: 40 }}>Noch keine Aufgaben</p>}
            </>
          )}

          {page === "products" && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Produkte ({products.length})</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {f(products).map((p) => (
                  <div key={p.id} onClick={() => openEdit("product", p)} style={{ ...cardStyle, cursor: "pointer", transition: "border-color .2s" }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = C.acc + "66"} onMouseOut={(e) => e.currentTarget.style.borderColor = C.bd}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{p.name}</h3>
                      {p.category && <span style={{ fontSize: 10, color: C.acc, background: C.accG, padding: "2px 8px", borderRadius: 6, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{p.category}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: C.txM, marginBottom: 10, lineHeight: 1.5 }}>{p.description || "—"}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: C.ok, fontFamily: "'JetBrains Mono'" }}>{fmt(p.price)}</span>
                      {p.sku && <span style={{ fontSize: 11, color: C.txD }}>SKU: {p.sku}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {products.length === 0 && <p style={{ color: C.txD, textAlign: "center", padding: 40 }}>Noch keine Produkte. Erstelle oder importiere welche.</p>}
            </>
          )}

          {page === "settings" && <Settings user={user} settings={userSettings} onSave={saveSettings} notify={notify} />}

          {page === "production" && <Production production={production} products={products} deals={deals} notify={notify} />}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && <FormModal type={showForm} editItem={editItem} formData={formData} setFormData={setFormData} onSave={saveForm} onDelete={(id) => removeItem(`crm_${showForm}s`, id)} onClose={() => { setShowForm(null); setEditItem(null); }} />}
    </div>
  );
}
