import { useState } from "react";
import { C, cardStyle, inputStyle, btnStyle, labelStyle, Ic } from "../theme.jsx";
import { loginUser, registerUser } from "../firebase.js";

export default function Login({ onDemo }) {
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try { await loginUser(email.trim(), pass); }
    catch (e) { setError(e.code === "auth/invalid-credential" ? "Email oder Passwort falsch" : e.message); }
    setLoading(false);
  };
  const handleRegister = async () => {
    setError(""); if (!name.trim()) { setError("Name eingeben"); return; }
    setLoading(true);
    try { await registerUser(email.trim(), pass, name.trim()); }
    catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Montserrat',sans-serif", color: C.tx }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src="/logo.jpg" alt="W" style={{ width: 72, height: 72, borderRadius: 18, margin: "0 auto 16px", display: "block" }} />
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>WINDOFORM</h1>
          <p style={{ fontSize: 14, color: C.txM, letterSpacing: ".12em", marginTop: 4, fontWeight: 500 }}>CRM</p>
        </div>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>{view === "login" ? "Anmelden" : "Registrieren"}</h2>
          {view === "register" && <div style={{ marginBottom: 12 }}><label style={labelStyle}>Name</label><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" /></div>}
          <div style={{ marginBottom: 12 }}><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@windoform.de" /></div>
          <div style={{ marginBottom: 16 }}><label style={labelStyle}>Passwort</label><input style={inputStyle} type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••" onKeyDown={(e) => e.key === "Enter" && (view === "login" ? handleLogin() : handleRegister())} /></div>
          {error && <p style={{ color: C.err, fontSize: 12, marginBottom: 12, textAlign: "center" }}>{error}</p>}
          <button onClick={view === "login" ? handleLogin : handleRegister} disabled={loading} style={{ ...btnStyle(`linear-gradient(135deg,${C.acc},#1E4080)`, C.wh), width: "100%", justifyContent: "center", padding: 14, fontSize: 15 }}>{loading ? "..." : view === "login" ? "Anmelden" : "Registrieren"}</button>
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: C.txM }}>
            {view === "login" ? "Kein Konto? " : "Schon ein Konto? "}
            <button onClick={() => { setView(view === "login" ? "register" : "login"); setError(""); }} style={{ background: "none", border: "none", color: C.acc, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{view === "login" ? "Registrieren" : "Anmelden"}</button>
          </p>
          {onDemo && <button onClick={onDemo} style={{ ...btnStyle("transparent", C.txD), width: "100%", justifyContent: "center", marginTop: 12, fontSize: 11, border: `1px solid ${C.bd}` }}>Demo-Daten laden</button>}
        </div>
      </div>
    </div>
  );
}
