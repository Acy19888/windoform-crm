// src/components/ActivityFeed.jsx
import { useState, useEffect } from "react";
import { C, cardStyle, inputStyle, btnStyle, Ic } from "../theme.jsx";
import { add, subscribe } from "../firebase.js";

const TYPES = {
  note:    { label: "Notiz",   icon: "edit",    color: C.acc },
  call:    { label: "Anruf",  icon: "phone",   color: C.ok },
  email:   { label: "E-Mail", icon: "mail",    color: "#8B5CF6" },
  meeting: { label: "Meeting",icon: "users",   color: C.warn },
  status:  { label: "Status", icon: "refresh", color: C.txM },
};

export default function ActivityFeed({ parentId, parentType, user }) {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState("note");
  const [text, setText] = useState("");

  useEffect(() => {
    if (!parentId) return;
    // nutzt deine bestehende subscribe() Funktion aus firebase.js
    return subscribe("crm_activities", (all) => {
      setEntries(all.filter(a => a.parentId === parentId && a.parentType === parentType));
    });
  }, [parentId, parentType]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      // nutzt deine bestehende add() Funktion aus firebase.js
      await add("crm_activities", {
        parentId,
        parentType,
        type,
        text: text.trim(),
        createdBy: user?.displayName || user?.email || "Unbekannt",
        createdByUid: user?.uid || null,
      });
      setText("");
      setType("note");
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const fmtTs = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  // Sortiere nach Datum absteigend
  const sorted = [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: C.txM, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>
          Aktivitäten & Notizen ({sorted.length})
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          style={btnStyle(showForm ? C.sf : C.acc, showForm ? C.tx : C.wh, { fontSize: 12, padding: "6px 14px" })}
        >
          <Ic name={showForm ? "x" : "add"} size={14} color={showForm ? C.tx : C.wh} />
          {showForm ? "Abbrechen" : "Eintrag"}
        </button>
      </div>

      {/* Eingabe-Formular */}
      {showForm && (
        <div style={{ ...cardStyle, marginBottom: 16, padding: 16, border: `1px solid ${C.acc}` }}>
          {/* Typ-Auswahl */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {Object.entries(TYPES).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setType(k)}
                style={btnStyle(
                  type === k ? C.acc : C.sf,
                  type === k ? C.wh : C.txM,
                  { fontSize: 11, padding: "5px 12px", borderRadius: 20 }
                )}
              >
                <Ic name={v.icon} size={12} color={type === k ? C.wh : C.txM} />
                {v.label}
              </button>
            ))}
          </div>

          {/* Textfeld */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && handleSubmit()}
            placeholder={`${TYPES[type].label} eintragen... (Strg+Enter zum Speichern)`}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button
              onClick={() => { setShowForm(false); setText(""); }}
              style={btnStyle(C.sf, C.txM, { fontSize: 12 })}
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !text.trim()}
              style={btnStyle(
                submitting || !text.trim() ? C.bd : C.acc,
                C.wh,
                { fontSize: 12, cursor: submitting || !text.trim() ? "not-allowed" : "pointer" }
              )}
            >
              <Ic name="check" size={14} color={C.wh} />
              {submitting ? "Speichert..." : "Speichern"}
            </button>
          </div>
        </div>
      )}

      {/* Feed / Timeline */}
      {sorted.length === 0 ? (
        <p style={{ color: C.txD, padding: "20px 0", fontSize: 13 }}>Noch keine Aktivitäten</p>
      ) : (
        <div style={{ position: "relative", paddingLeft: 28 }}>
          {/* Vertikale Linie */}
          <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: C.bd }} />

          {sorted.map((entry, i) => {
            const t = TYPES[entry.type] || TYPES.note;
            return (
              <div
                key={entry.id}
                style={{ marginBottom: 16, position: "relative", animation: `slideUp .3s ease ${i * .04}s both` }}
              >
                {/* Dot auf der Timeline-Linie */}
                <div style={{
                  position: "absolute", left: -22, top: 4,
                  width: 12, height: 12, borderRadius: "50%",
                  background: t.color, border: `2px solid ${C.bg}`
                }} />

                {/* Karte */}
                <div style={{ ...cardStyle, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Ic name={t.icon} size={13} color={t.color} />
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: ".06em", color: t.color
                      }}>
                        {t.label}
                      </span>
                      <span style={{ fontSize: 11, color: C.txM }}>· {entry.createdBy}</span>
                    </div>
                    <span style={{ fontSize: 10, color: C.txD }}>{fmtTs(entry.createdAt)}</span>
                  </div>
                  {entry.htmlBody ? (
                    <div style={{ marginTop: 8, borderTop: `1px solid ${C.bd}`, paddingTop: 12 }}>
                      <div style={{ zoom: 0.85, transformOrigin: "top left" }} dangerouslySetInnerHTML={{ __html: entry.htmlBody }} />
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: C.tx, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {entry.text}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
