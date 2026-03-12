import { useState, useEffect } from "react";
import { C, cardStyle, inputStyle, btnStyle, labelStyle, Ic } from "../theme.jsx";

const SMTP_PRESETS = [
  { label: "Google / Gmail", host: "smtp.gmail.com", port: "465" },
  { label: "Microsoft 365", host: "smtp.office365.com", port: "587" },
  { label: "United Domains", host: "smtp.udag.de", port: "465" },
  { label: "IONOS", host: "smtp.ionos.de", port: "465" },
  { label: "Strato", host: "smtp.strato.de", port: "465" },
  { label: "Hetzner", host: "mail.your-server.de", port: "465" },
];

export default function Settings({ user, settings, onSave, notify }) {
  const [s, setS] = useState({
    smtpHost: "", smtpPort: "465", smtpUser: "", smtpPass: "", smtpFrom: "",
    senderName: user?.displayName || "",
    companyName: "Windoform",
    signature: `Mit freundlichen Grüßen,\n${user?.displayName || ""}\nWindoform\nDoor and Window Accessories\nwww.windoform.com.tr`,
    ...settings,
  });
  const [testing, setTesting] = useState(false);
  const [tab, setTab] = useState("email"); // email | signature | profile

  const upd = (k, v) => setS((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (tab === "email" && (!s.smtpHost || !s.smtpUser || !s.smtpPass)) { notify("Bitte alle SMTP-Felder ausfüllen", "error"); return; }
    await onSave(s);
    notify("Einstellungen gespeichert!");
  };

  const testEmail = async () => {
    if (!s.smtpHost || !s.smtpUser || !s.smtpPass) { notify("Erst SMTP-Daten eingeben", "error"); return; }
    setTesting(true);
    try {
      const res = await fetch("/api/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: s.smtpFrom || s.smtpUser,
          subject: "Windoform CRM – Test Email",
          html: `<div style="font-family:sans-serif;padding:20px;"><h2>Test Email</h2><p>Deine Email-Einstellungen funktionieren!</p><pre style="background:#f5f5f5;padding:12px;border-radius:8px;">${s.signature.replace(/\n/g, "<br>")}</pre></div>`,
          smtpHost: s.smtpHost, smtpPort: s.smtpPort, smtpUser: s.smtpUser, smtpPass: s.smtpPass, smtpFrom: s.smtpFrom || s.smtpUser,
          senderName: s.senderName, trackingId: "test_" + Date.now(),
        }),
      });
      const data = await res.json();
      if (data.success) notify("Test-Email gesendet an " + (s.smtpFrom || s.smtpUser));
      else notify("Fehler: " + data.error, "error");
    } catch (e) { notify("Fehler: " + e.message, "error"); }
    setTesting(false);
  };

  return (
    <>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Einstellungen</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["email", "Email & SMTP"], ["signature", "Signatur"], ["profile", "Profil"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: tab === k ? C.accG : "transparent", border: `1px solid ${tab === k ? C.acc : C.bd}`, color: tab === k ? C.tx : C.txM,
          }}>{l}</button>
        ))}
      </div>

      {/* Email & SMTP */}
      {tab === "email" && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Email-Versand</h3>

          <label style={labelStyle}>Anbieter (Schnellauswahl)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {SMTP_PRESETS.map((p) => (
              <button key={p.label} onClick={() => { upd("smtpHost", p.host); upd("smtpPort", p.port); }} style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: "pointer",
                background: s.smtpHost === p.host ? C.accG : C.bg, border: `1px solid ${s.smtpHost === p.host ? C.acc : C.bd}`, color: s.smtpHost === p.host ? C.acc : C.txM,
              }}>{p.label}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>SMTP Server</label><input style={inputStyle} value={s.smtpHost} onChange={(e) => upd("smtpHost", e.target.value)} placeholder="smtp.gmail.com" /></div>
            <div><label style={labelStyle}>Port</label><input style={inputStyle} value={s.smtpPort} onChange={(e) => upd("smtpPort", e.target.value)} placeholder="465" /></div>
          </div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>SMTP Benutzername</label><input style={inputStyle} value={s.smtpUser} onChange={(e) => upd("smtpUser", e.target.value)} placeholder="Login / Benutzername" />
            <p style={{ fontSize: 10, color: C.txD, marginTop: 2 }}>Bei den meisten Anbietern = Email. Bei United Domains kann es ein separater Login sein.</p>
          </div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Passwort / App-Passwort</label><input style={inputStyle} type="password" value={s.smtpPass} onChange={(e) => upd("smtpPass", e.target.value)} placeholder="••••••••" /></div>
          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Absender-Email</label><input style={inputStyle} value={s.smtpFrom} onChange={(e) => upd("smtpFrom", e.target.value)} placeholder="name@windoform.de" /></div>
          <div style={{ marginBottom: 16 }}><label style={labelStyle}>Absender-Name</label><input style={inputStyle} value={s.senderName} onChange={(e) => upd("senderName", e.target.value)} placeholder="Dein Name" /></div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={save} style={{ ...btnStyle(`linear-gradient(135deg,${C.acc},#1E4080)`, C.wh), flex: 1, justifyContent: "center" }}><Ic name="check" size={16} color={C.wh} /> Speichern</button>
            <button onClick={testEmail} disabled={testing} style={{ ...btnStyle(C.sf2, C.txM), border: `1px solid ${C.bd}`, opacity: testing ? .5 : 1 }}>
              {testing ? "..." : "Test-Email"}
            </button>
          </div>
        </div>
      )}

      {/* Signature */}
      {tab === "signature" && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Email-Signatur</h3>
          <p style={{ fontSize: 12, color: C.txM, marginBottom: 12 }}>Diese Signatur wird an jede Email angehängt.</p>

          <textarea
            value={s.signature}
            onChange={(e) => upd("signature", e.target.value)}
            rows={8}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}
          />

          <div style={{ marginTop: 16, padding: 16, background: C.bg, borderRadius: 10, border: `1px solid ${C.bd}` }}>
            <p style={{ fontSize: 11, color: C.txM, fontWeight: 600, marginBottom: 8 }}>VORSCHAU</p>
            <div style={{ fontSize: 13, color: C.tx, lineHeight: 1.6, whiteSpace: "pre-line" }}>{s.signature}</div>
          </div>

          <button onClick={save} style={{ ...btnStyle(`linear-gradient(135deg,${C.acc},#1E4080)`, C.wh), marginTop: 16, justifyContent: "center", width: "100%" }}><Ic name="check" size={16} color={C.wh} /> Signatur speichern</button>
        </div>
      )}

      {/* Profile */}
      {tab === "profile" && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Profil</h3>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: 16, background: C.bg, borderRadius: 10, border: `1px solid ${C.bd}` }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: C.accG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: C.acc }}>
              {(user?.displayName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700 }}>{user?.displayName}</p>
              <p style={{ fontSize: 13, color: C.txM }}>{user?.email}</p>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}><label style={labelStyle}>Firmenname</label><input style={inputStyle} value={s.companyName} onChange={(e) => upd("companyName", e.target.value)} /></div>

          <button onClick={save} style={{ ...btnStyle(`linear-gradient(135deg,${C.acc},#1E4080)`, C.wh), marginTop: 12, justifyContent: "center", width: "100%" }}><Ic name="check" size={16} color={C.wh} /> Speichern</button>
        </div>
      )}

      {/* Email Tracking Stats */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Email-Tracking</h3>
        <p style={{ fontSize: 12, color: C.txM, lineHeight: 1.6 }}>
          Jede Email die über das CRM gesendet wird, enthält ein unsichtbares Tracking-Pixel. Wenn der Empfänger die Email öffnet, wird das automatisch erfasst. Du siehst den Status bei jedem Angebot/Deal.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1, padding: 12, background: C.bg, borderRadius: 8, textAlign: "center" }}>
            <p style={{ fontSize: 10, color: C.txM, fontWeight: 600, marginBottom: 4 }}>TRACKING</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.ok }}>Aktiv</p>
          </div>
          <div style={{ flex: 1, padding: 12, background: C.bg, borderRadius: 8, textAlign: "center" }}>
            <p style={{ fontSize: 10, color: C.txM, fontWeight: 600, marginBottom: 4 }}>METHODE</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.acc }}>Pixel</p>
          </div>
        </div>
      </div>
    </>
  );
}
