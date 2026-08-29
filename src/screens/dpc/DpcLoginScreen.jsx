import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { getDpcCentres, getDpcSession, saveDpcSession } from "../../firebase/firestoreService";

const card = { background:"var(--paper)", borderRadius:"var(--r-lg)", padding:"var(--sp-5)", boxShadow:"var(--sh-md)" };

export default function DpcLoginScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [centres, setCentres] = useState([]);
  const [centreId, setCentreId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (getDpcSession()) { navigate("/dpc/dashboard", { replace:true }); return; }
    getDpcCentres().then((items) => { setCentres(items); setCentreId(items[0]?.id || ""); });
  }, [navigate]);

  function submit(e) {
    e.preventDefault();
    if (pin !== "1234") { setError("Enter the demo PIN shown below."); return; }
    const centre = centres.find((item) => item.id === centreId);
    saveDpcSession({ officerName:"DPC Officer", dpcId:centreId, dpcName:centre?.name || "DPC Centre" });
    navigate("/dpc/dashboard", { replace:true });
  }

  return (
    <div style={{
      minHeight: "100vh",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      background: "#0A1C2A",
    }}>
      {/* Fullscreen DPC Mandi Background */}
      <img
        src="/images/paddy_landscape_bg.jpg"
        alt="Paddy Landscape"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 30%",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: `
            radial-gradient(circle at 50% 20%, rgba(10,28,42,0.25) 0%, rgba(5,15,25,0.55) 100%),
            linear-gradient(180deg, rgba(10,28,42,0.3) 0%, rgba(5,15,25,0.45) 100%)
          `,
          pointerEvents: "none",
        }}
      />

      {/* Top Header */}
      <div style={{
        position: "relative",
        zIndex: 2,
        background: "rgba(10, 28, 42, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
        boxShadow: "var(--sh-md)",
      }}>
        <div style={{
          position: "relative",
          padding: "var(--sp-6) var(--sp-6)",
          maxWidth: 480,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "var(--sp-3)",
          color: "white",
        }}>
          <button
            onClick={() => navigate("/portal")}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              cursor: "pointer",
              color: "white",
            }}
            aria-label="Back to Portal"
          >
            ←
          </button>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--paddy-gold-200)" }}>
              TN CSC · Official Portal
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-2xl)", color: "white", margin: 0, fontWeight: 800, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
              {t("dpc_login_title")}
            </h1>
          </div>
        </div>
      </div>

      <main style={{ position: "relative", zIndex: 2, maxWidth: 480, margin: "0 auto", padding: "var(--sp-8) var(--sp-4)", width: "100%", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <form onSubmit={submit} style={{
          background: "rgba(251, 243, 220, 0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "var(--r-xl)",
          padding: "var(--sp-6)",
          boxShadow: "0 16px 36px rgba(0,0,0,0.5)",
          border: "2px solid rgba(255,255,255,0.4)",
        }}>
          <label htmlFor="centre" style={{ display: "block", fontWeight: 800, marginBottom: 8, color: "var(--earth-700)" }}>{t("dpc_login_select")}</label>
          <select id="centre" value={centreId} onChange={(e) => setCentreId(e.target.value)} style={{ width: "100%", minHeight: 50, padding: "0 14px", border: "2px solid var(--tarpaulin-300)", borderRadius: "var(--r-md)", marginBottom: 20, fontSize: "var(--fs-sm)", background: "white", fontWeight: 600 }}>
            {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.nameEn || centre.name}</option>)}
          </select>
          <label htmlFor="pin" style={{ display: "block", fontWeight: 800, marginBottom: 8, color: "var(--earth-700)" }}>{t("dpc_login_pin")}</label>
          <input id="pin" type="password" inputMode="numeric" maxLength="4" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }} style={{ width: "100%", minHeight: 50, padding: "0 14px", border: "2px solid var(--tarpaulin-300)", borderRadius: "var(--r-md)", fontSize: "var(--fs-lg)", letterSpacing: 6, textAlign: "center", fontWeight: 700 }} placeholder="••••" />
          <p style={{ color: "var(--ink-700)", fontSize: "var(--fs-xs)", marginTop: 8, fontWeight: 600 }}>{t("dpc_login_demo")}</p>
          {error && <p role="alert" style={{ color: "var(--danger-500)", fontWeight: 800, marginTop: 8 }}>{error}</p>}
          <button type="submit" style={{ width: "100%", minHeight: 54, color: "white", background: "#163C5A", borderRadius: "var(--r-md)", fontWeight: 800, fontSize: "var(--fs-md)", border: "none", cursor: "pointer", marginTop: "var(--sp-4)", boxShadow: "0 4px 12px rgba(22,60,90,0.4)" }}>
            {t("dpc_login_submit")} →
          </button>
        </form>
      </main>
    </div>
  );
}
