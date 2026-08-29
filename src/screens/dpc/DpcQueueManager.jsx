import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { advanceQueue, checkInToken, getDpcSession, subscribeToQueue } from "../../firebase/firestoreService";
import { useI18n } from "../../i18n/I18nContext";

export default function DpcQueueManager() {
  const { t } = useI18n(); const navigate = useNavigate();
  const [session] = useState(getDpcSession); const [centre, setCentre] = useState(null); const [updating, setUpdating] = useState(false); const [tokenInput, setTokenInput] = useState(""); const [checkInMessage, setCheckInMessage] = useState("");
  useEffect(() => { if (!session) { navigate("/dpc", { replace:true }); return; } return subscribeToQueue(session.dpcId, setCentre); }, [session, navigate]);
  if (!session) return null;
  const current = centre?.currentServingToken ?? 0;
  async function callNext() { setUpdating(true); try { await advanceQueue(session.dpcId); } finally { setUpdating(false); } }
  async function checkIn(e) { e.preventDefault(); setUpdating(true); setCheckInMessage(""); try { const result = await checkInToken({ dpcId:session.dpcId, tokenNumber:tokenInput }); setCheckInMessage(`✓ Token #${result.tokenNumber} checked in — ${result.farmerName}`); setTokenInput(""); } catch (error) { setCheckInMessage(error.message || "Could not check in this token."); } finally { setUpdating(false); } }
  return <main style={{ maxWidth:560, margin:"0 auto" }}>
    <header style={{ background:"var(--earth-700)", color:"var(--paper)", padding:"var(--sp-5)", display:"flex", gap:12, alignItems:"center" }}><button onClick={() => navigate("/dpc/dashboard")} style={{ color:"inherit", fontSize:22 }}>←</button><h1 style={{ color:"inherit" }}>{t("dpc_queue_title")}</h1></header>
    <section style={{ padding:"var(--sp-5) var(--sp-4)" }}>
      <form onSubmit={checkIn} style={{ background:"var(--paddy-gold-100)", border:"2px solid var(--paddy-gold-300)", borderRadius:"var(--r-lg)", padding:"var(--sp-4)", marginBottom:"var(--sp-5)" }}>
        <label htmlFor="check-in-token" style={{ display:"block", fontWeight:800, color:"var(--earth-700)", marginBottom:6 }}>📷 Check in farmer token</label>
        <p style={{ margin:"0 0 10px", fontSize:"var(--fs-xs)", color:"var(--ink-700)" }}>Scan with a connected QR/barcode scanner, or enter the token number.</p>
        <div style={{ display:"flex", gap:8 }}><input id="check-in-token" value={tokenInput} inputMode="numeric" onChange={(event) => setTokenInput(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Token no." style={{ flex:1, minHeight:46, padding:"0 12px", border:"2px solid var(--paddy-gold-500)", borderRadius:"var(--r-md)" }} /><button disabled={updating || !tokenInput} style={{ minWidth:100, borderRadius:"var(--r-md)", background:"var(--earth-700)", color:"white", fontWeight:800, opacity:updating || !tokenInput ? .55 : 1 }}>Check in</button></div>
        {checkInMessage && <p role="status" style={{ margin:"10px 0 0", fontWeight:700, color:checkInMessage.startsWith("✓") ? "var(--success-500)" : "var(--danger-500)" }}>{checkInMessage}</p>}
      </form>
      <div style={{ textAlign:"center", background:"var(--paper)", padding:"var(--sp-6)", borderRadius:"var(--r-lg)", boxShadow:"var(--sh-md)", marginBottom:"var(--sp-5)" }}><div>{t("dpc_token_serving")}</div><strong style={{ display:"block", fontSize:64, color:"var(--vermilion-500)" }}>#{current}</strong><button disabled={updating} onClick={callNext} style={{ width:"100%", minHeight:54, background:"var(--vermilion-500)", color:"white", borderRadius:"var(--r-md)", fontWeight:800, opacity:updating?.7:1 }}>{updating ? "…" : `▶ ${t("dpc_call_next")}`}</button></div>
      <h2 style={{ fontSize:"var(--fs-lg)", marginBottom:"var(--sp-3)" }}>Today’s queue</h2>
      <div style={{ display:"grid", gap:8 }}>{(centre?.queue || []).filter((item) => item.tokenNumber >= current - 2).map((item) => <div key={item.tokenNumber} style={{ background:item.tokenNumber===current ? "var(--paddy-gold-100)" : "var(--paper)", borderRadius:"var(--r-md)", padding:"var(--sp-3)", display:"flex", justifyContent:"space-between", boxShadow:"var(--sh-sm)" }}><strong>#{item.tokenNumber} · {item.farmerName}</strong><span>{item.status}</span></div>)}</div>
    </section>
  </main>;
}
