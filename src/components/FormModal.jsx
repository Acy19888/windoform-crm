import { C, cardStyle, inputStyle, btnStyle, labelStyle, Ic, STATUS, PRIORITY } from "../theme.jsx";

export default function FormModal({ type, editItem, formData, setFormData, onSave, onDelete, onClose }) {
  const fd = (k, v) => setFormData((p) => ({ ...p, [k]: v }));
  const titles = { customer: "Kunde", deal: "Angebot", task: "Aufgabe", product: "Produkt" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,22,40,.85)", backdropFilter: "blur(8px)", padding: 24 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, maxWidth: 500, width: "100%", maxHeight: "85vh", overflow: "auto", animation: "slideUp .3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{editItem ? "Bearbeiten" : "Erstellen"}: {titles[type]}</h3>
          {editItem && <button onClick={() => onDelete(editItem.id)} style={btnStyle("transparent", C.err, { padding: "6px 12px", fontSize: 11 })}>Löschen</button>}
        </div>

        {type === "customer" && <>
          {[["name", "Name *"], ["company", "Firma"], ["position", "Position"], ["email", "Email"], ["phone", "Telefon"], ["mobile", "Mobil"], ["website", "Website"], ["address", "Adresse"]].map(([k, l]) => (
            <div key={k} style={{ marginBottom: 10 }}><label style={labelStyle}>{l}</label><input style={inputStyle} value={formData[k] || ""} onChange={(e) => fd(k, e.target.value)} /></div>
          ))}
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Status</label><select style={inputStyle} value={formData.status || "lead"} onChange={(e) => fd("status", e.target.value)}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Quelle</label><input style={inputStyle} value={formData.source || ""} onChange={(e) => fd("source", e.target.value)} placeholder="z.B. Fensterbau Frontale 2026" /></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Notizen</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={formData.notes || ""} onChange={(e) => fd("notes", e.target.value)} /></div>
        </>}

        {type === "deal" && <>
          {[["title", "Titel *"], ["customerName", "Kunde"], ["assignedName", "Verkäufer"]].map(([k, l]) => (
            <div key={k} style={{ marginBottom: 10 }}><label style={labelStyle}>{l}</label><input style={inputStyle} value={formData[k] || ""} onChange={(e) => fd(k, e.target.value)} /></div>
          ))}
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Betrag (€)</label><input style={inputStyle} type="number" value={formData.amount || ""} onChange={(e) => fd("amount", e.target.value)} /></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Status</label><select style={inputStyle} value={formData.status || "offer"} onChange={(e) => fd("status", e.target.value)}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Produkte</label><input style={inputStyle} value={formData.productList || ""} onChange={(e) => fd("productList", e.target.value)} placeholder="z.B. Fenstergriff Premium x50" /></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Notizen</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={formData.notes || ""} onChange={(e) => fd("notes", e.target.value)} /></div>
        </>}

        {type === "task" && <>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Aufgabe *</label><input style={inputStyle} value={formData.title || ""} onChange={(e) => fd("title", e.target.value)} /></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Kunde</label><input style={inputStyle} value={formData.customerName || ""} onChange={(e) => fd("customerName", e.target.value)} /></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Fällig am</label><input style={inputStyle} type="date" value={formData.dueDate || ""} onChange={(e) => fd("dueDate", e.target.value)} /></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Priorität</label><select style={inputStyle} value={formData.priority || "medium"} onChange={(e) => fd("priority", e.target.value)}>
            {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Beschreibung</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={formData.description || ""} onChange={(e) => fd("description", e.target.value)} /></div>
        </>}

        {type === "product" && <>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Produktname *</label><input style={inputStyle} value={formData.name || ""} onChange={(e) => fd("name", e.target.value)} /></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>SKU / Artikelnr.</label><input style={inputStyle} value={formData.sku || ""} onChange={(e) => fd("sku", e.target.value)} /></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Preis (€)</label><input style={inputStyle} type="number" value={formData.price || ""} onChange={(e) => fd("price", e.target.value)} /></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Kategorie</label><input style={inputStyle} value={formData.category || ""} onChange={(e) => fd("category", e.target.value)} placeholder="z.B. Fenstergriffe" /></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Beschreibung</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={formData.description || ""} onChange={(e) => fd("description", e.target.value)} /></div>
        </>}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={onSave} style={{ ...btnStyle(`linear-gradient(135deg,${C.acc},#1E4080)`, C.wh), flex: 1, justifyContent: "center" }}>
            <Ic name="check" size={16} color={C.wh} /> {editItem ? "Speichern" : "Erstellen"}
          </button>
          <button onClick={onClose} style={{ ...btnStyle(C.sf2, C.txM), border: `1px solid ${C.bd}` }}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}
