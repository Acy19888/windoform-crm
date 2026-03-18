import { useState, useEffect } from "react";
import { C, cardStyle, inputStyle, btnStyle, labelStyle, Ic, STATUS, fmt, fmtDate } from "../theme.jsx";
import { upd as updDoc, add as addDoc, subscribe } from "../firebase.js";

// ===========================================================
// Customer Detail Page – HubSpot-style
// ===========================================================
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

  // ---- Activity Feed State ----
  const [feedEntries, setFeedEntries] = useState([]);
  const [feedShowForm, setFeedShowForm] = useState(false);
  const [feedSubmitting, setFeedSubmitting] = useState(false);
  const [feedType, setFeedType] = useState("note");
  const [feedText, setFeedText] = useState("");

  const FEED_TYPES = {
    note:    { label: "Notiz",   icon: "edit",    color: C.acc },
    call:    { label: "Anruf",  icon: "phone",   color: C.ok },
    email:   { label: "E-Mail", icon: "mail",    color: "#8B5CF6" },
    meeting: { label: "Meeting",icon: "users",   color: C.warn },
    status:  { label: "Status", icon: "refresh", color: C.txM },
  };

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
      items.push({ type: "deal", date: d.createdAt, title: `Angebot: ${d.title || "–"}`, detail: `${fmt(d.amount)} · ${STATUS[d.status]?.label || d.status}`, status: d.status, id: d.id });
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
        items.push({ type: "email", date: e.sentAt, title: `Email: ${e.subject}`, detail: `An: ${e.to}`, opened: e.opened, trackingId: e.trackingId });
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

  // ---- Load Activity Feed entries ----
  useEffect(() => {
    if (!customer.id) return;
    return subscribe("crm_activities", (data) => {
      const filtered = data
        .filter((a) => a.parentId === customer.id && a.parentType === "kunde")
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setFeedEntries(filtered);
    });
  }, [customer.id]);

  // ---- Submit Activity Feed entry ----
  const submitFeedEntry = async () => {
    if (!feedText.trim()) return;
    setFeedSubmitting(true);
    try {
      await addDoc("crm_activities", {
        parentId: customer.id,
        parentType: "kunde",
        type: feedType,
        text: feedText.trim(),
        createdBy: user?.displayName || user?.email || "Unbekannt",
        createdByUid: user?.uid || null,
      });
      setFeedText("");
      setFeedType("note");
      setFeedShowForm(false);
      notify("Eintrag gespeichert");
    } catch (err) {
      notify("Fehler: " + err.message, "error");
    } finally {
      setFeedSubmitting(false);
    }
  };

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
    const htmlBody = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#333;">${emailBody}</div>`;
    try {
      const res = await fetch("/api/send-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        const history = customer.emailHistory ? [...customer.emailHistory] : [];
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

  // ===========================================================
  return (
    <div style={{ animation: "fadeIn .3s" }}>
      {/* Header with profile */}
      <div style={{ ...cardStyle, marginBottom: 20, padding: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 6, color: C.txM, fontSize: 13 }}>
          <Ic name="back" size={16} color={C.txM} /> Zurück
        </button>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Avatar */}
          {customer.customerAvatar ? (
            <img src={customer.customerAvatar} alt={customer.name} style={{ width: 72, height: 72, borderRadius: 18, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.bd}` }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 18, background: `linear-gradient(135deg, ${C.acc}, ${C.accL})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: C.wh, flexShrink: 0 }}>
              {initials}
            </div>
          )}

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
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
          }}>
            {l}
            {k === "emails" && customer.emailHistory?.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, background: C.acc, color: C.wh, borderRadius: 10, padding: "1px 6px" }}>{customer.emailHistory.length}</span>}
          </button>
        ))}
      </div>

      {/* ============ TIMELINE ============ */}
      {tab === "timeline" && (
        <>
          {/* ---- NEUER ACTIVITY FEED (ersetzt Quick Note) ---- */}
          <div style={{ ...cardStyle, marginBottom: 16, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: feedShowForm ? 14 : 0 }}>
              <p style={{ fontSize: 11, color: C.txM, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>
                Aktivitäten & Notizen ({feedEntries.length})
              </p>
              <button
                onClick={() => setFeedShowForm(!feedShowForm)}
                style={btnStyle(feedShowForm ? C.sf : C.acc, feedShowForm ? C.tx : C.wh, { fontSize: 12, padding: "6px 14px" })}
              >
                <Ic name={feedShowForm ? "x" : "add"} size={14} color={feedShowForm ? C.tx : C.wh} />
                {feedShowForm ? "Abbrechen" : "Eintrag"}
              </button>
            </div>

            {feedShowForm && (
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  {Object.entries(FEED_TYPES).map(([k, v]) => (
                    <button key={k} onClick={() => setFeedType(k)}
                      style={btnStyle(feedType === k ? C.acc : C.sf, feedType === k ? C.wh : C.txM, { fontSize: 11, padding: "5px 12px", borderRadius: 20 })}>
                      <Ic name={v.icon} size={12} color={feedType === k ? C.wh : C.txM} />
                      {v.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedText}
                  onChange={(e) => setFeedText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && submitFeedEntry()}
                  placeholder={`${FEED_TYPES[feedType].label} eintragen... (Strg+Enter)`}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                  <button onClick={() => { setFeedShowForm(false); setFeedText(""); }} style={btnStyle(C.sf, C.txM, { fontSize: 12 })}>Abbrechen</button>
                  <button onClick={submitFeedEntry} disabled={feedSubmitting || !feedText.trim()}
                    style={btnStyle(feedSubmitting || !feedText.trim() ? C.bd : C.acc, C.wh, { fontSize: 12 })}>
                    <Ic name="check" size={14} color={C.wh} />
                    {feedSubmitting ? "Speichert..." : "Speichern"}
                  </button>
                </div>
              </div>
            )}

            {/* Feed Einträge */}
            {feedEntries.length > 0 && (
              <div style={{ marginTop: feedShowForm ? 16 : 10, position: "relative", paddingLeft: 28 }}>
                <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: C.bd }} />
                {feedEntries.map((entry, i) => {
                  const t = FEED_TYPES[entry.type] || FEED_TYPES.note;
                  return (
                    <div key={entry.id} style={{ marginBottom: 14, position: "relative", animation: `slideUp .3s ease ${i * .04}s both` }}>
                      <div style={{ position: "absolute", left: -22, top: 4, width: 12, height: 12, borderRadius: "50%", background: t.color, border: `2px solid ${C.bg}` }} />
                      <div style={{ ...cardStyle, padding: "10px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Ic name={t.icon} size={13} color={t.color} />
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: t.color }}>{t.label}</span>
                            <span style={{ fontSize: 11, color: C.txM }}>· {entry.createdBy}</span>
                          </div>
                          <span style={{ fontSize: 10, color: C.txD }}>{fmtDate(entry.createdAt)}</span>
                        </div>
                        {entry.htmlBody ? (
                          <div style={{ marginTop: 8, borderTop: `1px solid ${C.bd}`, paddingTop: 12 }}>
                            <div style={{ zoom: 0.85, transformOrigin: "top left" }} dangerouslySetInnerHTML={{ __html: entry.htmlBody }} />
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: 13, color: C.tx, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{entry.text}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {feedEntries.length === 0 && !feedShowForm && (
              <p style={{ color: C.txD, fontSize: 13, marginTop: 10, marginBottom: 0 }}>Noch keine Einträge – füge den ersten hinzu</p>
            )}
          </div>

          {/* ---- BESTEHENDE TIMELINE (Deals, Tasks, Emails) ---- */}
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

                    {/* Email opened */}
                    {a.type === "email" && (
                      <>{a.opened && <span style={{ fontSize: 10, fontWeight: 600, color: "#3B82F6", background: "rgba(59,130,246,.12)", padding: "2px 8px", borderRadius: 6 }}>✓✓ Gelesen</span>}
                      {!a.opened && <span style={{ fontSize: 10, fontWeight: 600, color: C.txD, background: C.bg, padding: "2px 8px", borderRadius: 6 }}>○ Nicht gelesen</span>}</>
                    )}

                    {/* Deal status */}
                    {a.type === "deal" && a.status && (
                      <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, marginTop: 8, padding: "2px 8px", borderRadius: 6, color: STATUS[a.status]?.color, background: STATUS[a.status]?.bg }}>
                        {STATUS[a.status]?.label}
                      </span>
                    )}

                    {/* Task done */}
                    {a.type === "task" && (
                      <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, marginTop: 8, padding: "2px 8px", borderRadius: 6, color: a.done ? C.ok : C.warn, background: a.done ? C.okG : C.warnG }}>
                        {a.done ? "✓ Erledigt" : "○ Offen"}
                      </span>
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
                    <p style={{ fontSize: 12, color: C.txM, marginTop: 2 }}>An: {e.to} · {e.sentBy || "–"}</p>
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
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,22,40,.85)", backdropFilter: "blur(8px)", padding: 24 }} onClick={() => setShowEmail(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, maxWidth: 600, width: "100%", maxHeight: "85vh", overflow: "auto", animation: "slideUp .3s ease" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Email an {customer.name}</h3>

            {/* AI Assistant */}
            <div style={{ background: C.accG, borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid ${C.acc}33` }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.acc, marginBottom: 8 }}>🤖 AI-Assistent</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="z.B. 'Angebot nachfassen' oder 'Termin vereinbaren'"
                  style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                  onKeyDown={(e) => e.key === "Enter" && generateWithAI()} />
                <button onClick={generateWithAI} disabled={aiLoading} style={btnStyle(C.acc, C.wh, { fontSize: 12, flexShrink: 0 })}>
                  {aiLoading ? "..." : "Generieren"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {["Angebot nachfassen", "Termin vereinbaren", "Danke für Besuch", "Rechnung senden"].map((q) => (
                  <button key={q} onClick={() => { setAiPrompt(q); }} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 500, cursor: "pointer",
                    background: "transparent", border: `1px solid ${C.acc}44`, color: C.acc,
                  }}>{q}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>An</label>
              <input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Betreff</label>
              <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Betreff..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nachricht</label>
              <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={8} style={{ ...inputStyle, resize: "vertical", minHeight: 160, lineHeight: 1.6 }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowEmail(false)} style={btnStyle(C.sf, C.txM, { fontSize: 13 })}>Abbrechen</button>
              <button onClick={sendEmail} disabled={sending} style={btnStyle(sending ? C.bd : C.acc, C.wh, { fontSize: 13 })}>
                <Ic name="mail" size={14} color={C.wh} />
                {sending ? "Wird gesendet..." : "Senden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================
// Helpers
// ===========================================================
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
  return (templates[lang] || templates.en) + (senderName ? `\n${senderName}` : "") + (signature ? `\n\n${signature}` : "");
}
