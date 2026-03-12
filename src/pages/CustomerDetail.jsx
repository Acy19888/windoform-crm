import { useState, useEffect } from "react";
import { C, cardStyle, inputStyle, btnStyle, labelStyle, Ic, STATUS, fmt, fmtDate } from "../theme.jsx";
import { upd as updDoc, add as addDoc, subscribe } from "../firebase.js";

// ============================================================
// Customer Detail Page – HubSpot-style
// ============================================================
export default function CustomerDetail({ customer, deals, tasks, user, settings, onBack, onEditCustomer, notify }) {
  const [tab, setTab] = useState("timeline"); // timeline | details | emails
  const [activities, setActivities] = useState([]);
  const [showEmail, setShowEmail] = useState(false);
  const [emailTo, setEmailTo] = useState(customer.email || "");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [emailTracking, setEmailTracking] = useState([]);

  // Build activity timeline
  useEffect(() => {
    const items = [];

    // Customer created
    if (customer.createdAt) {
      items.push({ type: "created", date: customer.createdAt, title: "Kunde angelegt", detail: customer.source ? `Quelle: ${customer.source}` : "" });
    }

    // Deals for this customer
    const custDeals = deals.filter((d) => d.customerName?.toLowerCase() === customer.name?.toLowerCase() || d.customerName?.toLowerCase() === customer.company?.toLowerCase());
    custDeals.forEach((d) => {
      items.push({ type: "deal", date: d.createdAt, title: `Angebot: ${d.title || "—"}`, detail: `${fmt(d.amount)} · ${STATUS[d.status]?.label || d.status}`, status: d.status, id: d.id });
    });

    // Tasks for this customer
    const custTasks = tasks.filter((t) => t.customerName?.toLowerCase() === customer.name?.toLowerCase() || t.customerName?.toLowerCase() === customer.company?.toLowerCase());
    custTasks.forEach((t) => {
      items.push({ type: "task", date: t.createdAt, title: `Aufgabe: ${t.title}`, detail: t.dueDate ? `Fällig: ${fmtDate(t.dueDate)}` : "", done: t.done });
    });

    // Notes from customer
    if (customer.notes) {
      items.push({ type: "note", date: customer.updatedAt || customer.createdAt, title: "Notiz", detail: customer.notes });
    }

    // Email history from customer data
    if (customer.emailHistory) {
      customer.emailHistory.forEach((e) => {
        items.push({ type: "email", date: e.sentAt, title: `Email: ${e.subject}`, detail: e.to, opened: e.opened, trackingId: e.trackingId });
      });
    }

    // WhatsApp
    if (customer.whatsappSent) {
      items.push({ type: "whatsapp", date: customer.whatsappAt || customer.updatedAt || customer.createdAt, title: "WhatsApp gesendet", detail: customer.phone || customer.mobile || "" });
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setActivities(items);
  }, [customer, deals, tasks]);

  // Load email tracking data
  useEffect(() => {
    if (!customer.id) return;
    return subscribe("crm_email_tracking", (data) => {
      setEmailTracking(data.filter((t) => t.customerId === customer.id));
    });
  }, [customer.id]);

  // AI Email Assistant
  const generateWithAI = async () => {
    if (!aiPrompt.trim()) { notify("Beschreibe was du schreiben möchtest", "error"); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          customerName: customer.name,
          company: customer.company,
          context: `Kunde: ${customer.name}, Firma: ${customer.company}, Position: ${customer.position || ""}. Bisherige Notizen: ${customer.notes || "keine"}. Status: ${STATUS[customer.status]?.label || customer.status}`,
          senderName: user?.displayName || "",
          signature: settings?.signature || "",
          language: detectLanguageFromEmail(customer.email),
        }),
      });
      const data = await res.json();
      if (data.subject) setEmailSubject(data.subject);
      if (data.body) setEmailBody(data.body);
      notify("Email generiert!");
    } catch (e) {
      // Fallback: generate locally
      const lang = detectLanguageFromEmail(customer.email);
      setEmailSubject(lang === "tr" ? `${customer.company || customer.name} – Takip` : lang === "en" ? `${customer.company || customer.name} – Follow-up` : `${customer.company || customer.name} – Nachfassen`);
      setEmailBody(generateFallbackEmail(lang, customer, aiPrompt, user?.displayName, settings?.signature));
      notify("Email lokal generiert (AI nicht verfügbar)");
    }
    setAiLoading(false);
  };

  // Send email
  const sendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) { notify("Bitte alle Felder ausfüllen", "error"); return; }
    if (!settings?.smtpHost) { notify("Bitte SMTP in Einstellungen konfigurieren", "error"); return; }
    setSending(true);
    const trackingId = `${customer.id}_${Date.now()}`;
    try {
      const sig = settings?.signature ? `\n\n---\n${settings.signature}` : "";
      const htmlBody = (emailBody + sig).replace(/\n/g, "<br>");
      const res = await fetch("/api/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo, subject: emailSubject,
          html: `<div style="font-family:'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#333;">${htmlBody}</div>`,
          smtpHost: settings.smtpHost, smtpPort: settings.smtpPort,
          smtpUser: settings.smtpUser, smtpPass: settings.smtpPass,
          smtpFrom: settings.smtpFrom || settings.smtpUser,
          senderName: settings.senderName || user?.displayName,
          trackingId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Save email to customer history
        const history = customer.emailHistory || [];
        history.push({ sentAt: new Date().toISOString(), subject: emailSubject, to: emailTo, opened: false, trackingId, sentBy: user?.displayName });
        await updDoc("crm_customers", customer.id, { emailHistory: history });
        notify("Email gesendet an " + emailTo);
        setShowEmail(false); setEmailSubject(""); setEmailBody(""); setAiPrompt("");
      } else { notify("Fehler: " + data.error, "error"); }
    } catch (e) { notify("Fehler: " + e.message, "error"); }
    setSending(false);
  };

  // Add note
  const addNote = async () => {
    if (!noteText.trim()) return;
    const notes = customer.notes ? customer.notes + "\n\n" + `[${new Date().toLocaleDateString("de-DE")} ${user?.displayName}] ${noteText}` : `[${new Date().toLocaleDateString("de-DE")} ${user?.displayName}] ${noteText}`;
    await updDoc("crm_customers", customer.id, { notes });
    setNoteText("");
    notify("Notiz hinzugefügt");
  };

  const initials = (customer.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // ============================================================
  return (
    <div style={{ animation: "fadeIn .3s" }}>
      {/* Header with profile */}
      <div style={{ ...cardStyle, marginBottom: 20, padding: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 6, color: C.txM, fontSize: 13 }}>
          <Ic name="back" size={16} color={C.txM} /> Zurück
        </button>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ width: 72, height: 72, borderRadius: 18, background: `linear-gradient(135deg, ${C.acc}, ${C.accL})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: C.wh, flexShrink: 0 }}>
            {initials}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>{customer.name}</h2>
              {customer.status && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, color: STATUS[customer.status]?.color, background: STATUS[customer.status]?.bg }}>{STATUS[customer.status]?.label}</span>}
            </div>
            <p style={{ fontSize: 14, color: C.accL, fontWeight: 500 }}>{customer.position}</p>
            <p style={{ fontSize: 14, color: C.txM }}>{customer.company}</p>

            <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              {customer.email && <a href={`mailto:${customer.email}`} style={{ fontSize: 12, color: C.txD, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}><Ic name="mail" size={12} color={C.txD} /> {customer.email}</a>}
              {customer.phone && <span style={{ fontSize: 12, color: C.txD, display: "flex", alignItems: "center", gap: 4 }}><Ic name="phone" size={12} color={C.txD} /> {customer.phone}</span>}
              {customer.mobile && <span style={{ fontSize: 12, color: C.txD, display: "flex", alignItems: "center", gap: 4 }}><Ic name="phone" size={12} color={C.txD} /> {customer.mobile}</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => { setShowEmail(true); setEmailTo(customer.email || ""); }} style={btnStyle(C.acc, C.wh, { padding: "8px 16px" })}>
              <Ic name="mail" size={14} color={C.wh} /> Email
            </button>
            <button onClick={() => onEditCustomer(customer)} style={btnStyle(C.sf2, C.txM, { border: `1px solid ${C.bd}`, padding: "8px 16px" })}>
              <Ic name="edit" size={14} color={C.txM} /> Bearbeiten
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["timeline", "Aktivitäten"], ["details", "Details"], ["emails", "Emails"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: tab === k ? C.accG : "transparent", border: `1px solid ${tab === k ? C.acc : C.bd}`, color: tab === k ? C.tx : C.txM,
          }}>{l}
            {k === "emails" && customer.emailHistory?.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, background: C.acc, color: C.wh, borderRadius: 10, padding: "1px 6px" }}>{customer.emailHistory.length}</span>}
          </button>
        ))}
      </div>

      {/* ============ TIMELINE ============ */}
      {tab === "timeline" && (
        <>
          {/* Quick note */}
          <div style={{ ...cardStyle, marginBottom: 16, padding: 16 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Notiz hinzufügen..." style={{ ...inputStyle, flex: 1 }}
                onKeyDown={(e) => e.key === "Enter" && addNote()} />
              <button onClick={addNote} style={btnStyle(C.acc, C.wh, { padding: "10px 16px" })}>
                <Ic name="add" size={14} color={C.wh} />
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ position: "relative", paddingLeft: 28 }}>
            {/* Vertical line */}
            <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: C.bd }} />

            {activities.map((a, i) => {
              const colors = { created: C.txM, deal: C.warn, task: a.done ? C.ok : C.err, note: C.accL, email: C.ok, whatsapp: "#25D366" };
              const icons = { created: "customers", deal: "euro", task: "tasks", note: "edit", email: "mail", whatsapp: "phone" };
              return (
                <div key={i} style={{ marginBottom: 16, position: "relative", animation: `slideUp .3s ease ${i * .04}s both` }}>
                  {/* Dot */}
                  <div style={{ position: "absolute", left: -22, top: 4, width: 12, height: 12, borderRadius: "50%", background: colors[a.type] || C.txD, border: `2px solid ${C.bg}` }} />

                  <div style={{ ...cardStyle, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Ic name={icons[a.type] || "edit"} size={14} color={colors[a.type] || C.txD} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</span>
                      </div>
                      <span style={{ fontSize: 10, color: C.txD, flexShrink: 0 }}>{fmtDate(a.date)}</span>
                    </div>
                    {a.detail && <p style={{ fontSize: 12, color: C.txM, marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-line" }}>{a.detail}</p>}

                    {/* Email tracking status */}
                    {a.type === "email" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: C.ok, background: C.okG, padding: "2px 8px", borderRadius: 6 }}>✓ Gesendet</span>
                        {a.opened && <span style={{ fontSize: 10, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,.12)", padding: "2px 8px", borderRadius: 6 }}>✓✓ Gelesen</span>}
                        {!a.opened && <span style={{ fontSize: 10, fontWeight: 600, color: C.txD, background: C.bg, padding: "2px 8px", borderRadius: 6 }}>○ Nicht gelesen</span>}
                      </div>
                    )}

                    {/* Deal status */}
                    {a.type === "deal" && a.status && (
                      <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, marginTop: 8, padding: "2px 8px", borderRadius: 6, color: STATUS[a.status]?.color, background: STATUS[a.status]?.bg }}>{STATUS[a.status]?.label}</span>
                    )}

                    {/* Task done */}
                    {a.type === "task" && (
                      <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, marginTop: 8, padding: "2px 8px", borderRadius: 6, color: a.done ? C.ok : C.warn, background: a.done ? C.okG : C.warnG }}>{a.done ? "✓ Erledigt" : "○ Offen"}</span>
                    )}

                    {/* WhatsApp */}
                    {a.type === "whatsapp" && (
                      <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, marginTop: 8, padding: "2px 8px", borderRadius: 6, color: "#25D366", background: "rgba(37,211,102,.12)" }}>✓ WhatsApp</span>
                    )}
                  </div>
                </div>
              );
            })}

            {activities.length === 0 && <p style={{ color: C.txD, padding: "20px 0", fontSize: 13 }}>Noch keine Aktivitäten</p>}
          </div>
        </>
      )}

      {/* ============ DETAILS ============ */}
      {tab === "details" && (
        <div style={cardStyle}>
          {[
            ["Name", customer.name], ["Firma", customer.company], ["Position", customer.position],
            ["Email", customer.email], ["Telefon", customer.phone], ["Mobil", customer.mobile],
            ["Website", customer.website], ["Adresse", customer.address], ["Quelle", customer.source],
            ["Erstellt", fmtDate(customer.createdAt)],
          ].map(([l, v]) => v ? (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.bd}` }}>
              <span style={{ fontSize: 12, color: C.txM, fontWeight: 600 }}>{l}</span>
              <span style={{ fontSize: 13, color: C.tx, textAlign: "right" }}>{v}</span>
            </div>
          ) : null)}
          {customer.notes && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, color: C.txM, fontWeight: 600, marginBottom: 6 }}>NOTIZEN</p>
              <p style={{ fontSize: 13, color: C.tx, lineHeight: 1.6, whiteSpace: "pre-line", background: C.bg, padding: 14, borderRadius: 10 }}>{customer.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ============ EMAILS ============ */}
      {tab === "emails" && (
        <>
          <button onClick={() => { setShowEmail(true); setEmailTo(customer.email || ""); }} style={{ ...btnStyle(C.acc, C.wh), marginBottom: 16, width: "100%", justifyContent: "center" }}>
            <Ic name="mail" size={16} color={C.wh} /> Neue Email schreiben
          </button>

          {(customer.emailHistory || []).map((e, i) => {
            const trackData = emailTracking.find((t) => t.id === e.trackingId);
            return (
              <div key={i} style={{ ...cardStyle, marginBottom: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{e.subject}</p>
                    <p style={{ fontSize: 12, color: C.txM, marginTop: 2 }}>An: {e.to} · {e.sentBy || "—"}</p>
                  </div>
                  <span style={{ fontSize: 10, color: C.txD }}>{fmtDate(e.sentAt)}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.ok, background: C.okG, padding: "2px 8px", borderRadius: 6 }}>✓ Gesendet</span>
                  {(e.opened || trackData?.openCount > 0) ? (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,.12)", padding: "2px 8px", borderRadius: 6 }}>
                      ✓✓ Gelesen {trackData?.openCount > 1 ? `(${trackData.openCount}x)` : ""} {trackData?.lastOpenedAt ? `· ${fmtDate(trackData.lastOpenedAt)}` : ""}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.txD, background: C.bg, padding: "2px 8px", borderRadius: 6 }}>○ Nicht gelesen</span>
                  )}
                </div>
              </div>
            );
          })}

          {(!customer.emailHistory || customer.emailHistory.length === 0) && <p style={{ color: C.txD, textAlign: "center", padding: 40, fontSize: 13 }}>Noch keine Emails gesendet</p>}
        </>
      )}

      {/* ============ EMAIL COMPOSER ============ */}
      {showEmail && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,22,40,.85)", backdropFilter: "blur(8px)", padding: 16 }} onClick={() => setShowEmail(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, maxWidth: 600, width: "100%", maxHeight: "90vh", overflow: "auto", animation: "slideUp .3s ease" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Email an {customer.name}</h3>

            {/* AI Assistant */}
            <div style={{ background: C.accG, borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid ${C.acc}33` }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.acc, marginBottom: 8 }}>🤖 AI-Assistent</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="z.B. 'Angebot nachfassen' oder 'Termin vereinbaren'" style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                  onKeyDown={(e) => e.key === "Enter" && generateWithAI()} />
                <button onClick={generateWithAI} disabled={aiLoading} style={btnStyle(C.acc, C.wh, { padding: "8px 14px", opacity: aiLoading ? .5 : 1 })}>
                  {aiLoading ? "..." : "Generieren"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {["Angebot nachfassen", "Termin vereinbaren", "Danke für Besuch", "Rechnung senden"].map((q) => (
                  <button key={q} onClick={() => { setAiPrompt(q); }} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 500, cursor: "pointer",
                    background: "transparent", border: `1px solid ${C.acc}44`, color: C.accL,
                  }}>{q}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}><label style={labelStyle}>An</label><input style={inputStyle} value={emailTo} onChange={(e) => setEmailTo(e.target.value)} /></div>
            <div style={{ marginBottom: 10 }}><label style={labelStyle}>Betreff</label><input style={inputStyle} value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Betreff..." /></div>
            <div style={{ marginBottom: 10 }}><label style={labelStyle}>Nachricht</label><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 160, lineHeight: 1.6 }} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Email Text..." /></div>

            {settings?.signature && (
              <div style={{ padding: 12, background: C.bg, borderRadius: 8, marginBottom: 14, fontSize: 12, color: C.txD, lineHeight: 1.5, whiteSpace: "pre-line", borderLeft: `3px solid ${C.bd}` }}>
                {settings.signature}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={sendEmail} disabled={sending} style={{ ...btnStyle(`linear-gradient(135deg,${C.acc},#1E4080)`, C.wh), flex: 1, justifyContent: "center", opacity: sending ? .5 : 1 }}>
                <Ic name="mail" size={16} color={C.wh} /> {sending ? "Sende..." : "Email senden"}
              </button>
              <button onClick={() => setShowEmail(false)} style={btnStyle(C.sf2, C.txM, { border: `1px solid ${C.bd}` })}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function detectLanguageFromEmail(email) {
  const d = (email || "").toLowerCase().split("@")[1] || "";
  if (d.endsWith(".tr") || d.endsWith(".com.tr")) return "tr";
  if (d.endsWith(".de") || d.endsWith(".at") || d.endsWith(".ch")) return "de";
  if (d.endsWith(".es") || d.endsWith(".mx")) return "es";
  if (d.endsWith(".fr")) return "fr";
  return "en";
}

function generateFallbackEmail(lang, customer, intent, senderName, signature) {
  const name = customer.name || "Herr/Frau";
  const templates = {
    de: `Sehr geehrte/r ${name},\n\nich hoffe, es geht Ihnen gut.\n\n${intent ? `Bezüglich: ${intent}\n\n` : ""}Ich wollte mich kurz bei Ihnen melden.\n\nFür Fragen stehe ich Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen`,
    tr: `Sayın ${name},\n\nUmarım iyisinizdir.\n\n${intent ? `Konu: ${intent}\n\n` : ""}Sizinle kısaca iletişime geçmek istedim.\n\nHerhangi bir sorunuz olursa lütfen bana ulaşın.\n\nSaygılarımla`,
    en: `Dear ${name},\n\nI hope this message finds you well.\n\n${intent ? `Regarding: ${intent}\n\n` : ""}I wanted to briefly reach out to you.\n\nPlease don't hesitate to contact me with any questions.\n\nBest regards`,
    es: `Estimado/a ${name},\n\nEspero que se encuentre bien.\n\n${intent ? `Respecto a: ${intent}\n\n` : ""}Quería ponerme en contacto con usted.\n\nNo dude en contactarme si tiene preguntas.\n\nAtentamente`,
    fr: `Cher/Chère ${name},\n\nJ'espère que vous allez bien.\n\n${intent ? `Concernant: ${intent}\n\n` : ""}Je souhaitais prendre contact avec vous.\n\nN'hésitez pas à me contacter.\n\nCordialement`,
  };
  return templates[lang] || templates.en;
}
