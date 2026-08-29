import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { getCurrentBooking, subscribeToQueue, getMockServingToken } from "../../firebase/firestoreService";

const STATUS_COLOR = { paid:"#3A7A1E", approved:"#3A7A1E", weighing:"var(--paddy-gold-500)", arrived:"var(--ink-700)", booked:"var(--tarpaulin-300)" };
const STATUS_BG    = { paid:"#EAF5EA", approved:"#EAF5EA", weighing:"#FFF8E1", arrived:"var(--earth-50)", booked:"var(--tarpaulin-100)" };

export default function LiveQueueScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const booking = getCurrentBooking();
  const [queueState, setQueueState] = useState({ currentServingToken: getMockServingToken(), queue: [] });

  useEffect(() => {
    const unsub = subscribeToQueue(booking?.dpcId || "dpc_ponneri", (state) => {
      setQueueState(state);
    });
    // Re-sync on visibility change (foreground reconnect)
    const onVis = () => { if (document.visibilityState === "visible") unsub && unsub(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { unsub(); document.removeEventListener("visibilitychange", onVis); };
  }, [booking?.dpcId]);

  const { currentServingToken, queue = [] } = queueState;
  const myToken = booking?.tokenNumber || 47;
  const ahead = Math.max(0, myToken - currentServingToken - 1);
  const estWait = ahead * 8;

  const visibleQueue = queue.filter(f => f.tokenNumber >= currentServingToken - 1 && f.tokenNumber <= currentServingToken + 6);

  return (
    <div style={{ minHeight:"100vh", background:"rgba(20,12,3,0.82)", paddingBottom:80, position:"relative" }}>
      <img src="/images/paddy_landscape_bg.jpg" alt="" aria-hidden="true"
        style={{ position:"fixed", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 30%", zIndex:0 }}
      />
      <div aria-hidden style={{
        position:"fixed", inset:0, zIndex:1,
        background:"linear-gradient(180deg, rgba(20,12,3,0.68) 0%, rgba(20,12,3,0.55) 40%, rgba(20,12,3,0.78) 100%)",
        pointerEvents:"none",
      }} />
      <div style={{ position:"relative", zIndex:2 }}>
      <div style={{ background:"linear-gradient(135deg,var(--earth-700),#2A1A06)", padding:"var(--sp-6)", color:"var(--paper)", display:"flex", alignItems:"center", gap:"var(--sp-3)" }}>
        <button onClick={() => navigate("/farmer")} style={{ background:"none", border:"none", color:"var(--paper)", fontSize:22, cursor:"pointer" }}>←</button>
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-xl)", fontWeight:700 }}>{t("queue_live")}</div>
          <div style={{ fontSize:"var(--fs-xs)", opacity:.8 }}>{booking?.dpcName}</div>
        </div>
      </div>

      <div style={{ padding:"var(--sp-5)", maxWidth:"var(--content-max)", margin:"0 auto" }}>

        {/* Live counters */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--sp-3)", marginBottom:"var(--sp-5)" }}>
          <div style={{ background:"var(--paper)", borderRadius:"var(--r-lg)", padding:"var(--sp-4)", textAlign:"center", boxShadow:"var(--sh-sm)", border:"2px solid var(--paddy-gold-200)" }}>
            <div style={{ fontSize:"var(--fs-xs)", color:"var(--ink-500)", fontWeight:600, marginBottom:4 }}>{t("queue_serving")}</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:48, fontWeight:900, color:"var(--vermilion-500)", lineHeight:1 }}>{currentServingToken}</div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:6 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--vermilion-500)", animation:"blink 1s infinite" }} />
              <span style={{ fontSize:"var(--fs-xs)", color:"var(--vermilion-500)", fontWeight:700 }}>LIVE</span>
            </div>
          </div>
          <div style={{ background: ahead <= 3 ? "#FFF0F0" : "var(--paper)", borderRadius:"var(--r-lg)", padding:"var(--sp-4)", textAlign:"center", boxShadow:"var(--sh-sm)", border:`2px solid ${ahead<=3?"var(--vermilion-500)":"var(--paddy-gold-200)"}` }}>
            <div style={{ fontSize:"var(--fs-xs)", color:"var(--ink-500)", fontWeight:600, marginBottom:4 }}>{t("queue_your_token")}</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:48, fontWeight:900, color:"var(--earth-700)", lineHeight:1 }}>{myToken}</div>
            <div style={{ fontSize:"var(--fs-xs)", color:"var(--ink-500)", marginTop:6 }}>
              <strong style={{ color: ahead<=3?"var(--vermilion-500)":"var(--earth-700)" }}>{ahead}</strong> {t("queue_ahead")}
            </div>
          </div>
        </div>

        {/* Estimated wait */}
        <div style={{ background:"var(--paddy-gold-100)", borderRadius:"var(--r-lg)", padding:"var(--sp-4)", marginBottom:"var(--sp-5)", display:"flex", alignItems:"center", gap:"var(--sp-4)", border:"2px solid var(--paddy-gold-300)" }}>
          <span style={{ fontSize:32 }}>⏱</span>
          <div>
            <div style={{ fontSize:"var(--fs-sm)", color:"var(--earth-700)", fontWeight:600 }}>{t("queue_estimated_wait")}</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-2xl)", fontWeight:900, color:"var(--earth-700)" }}>
              ~{estWait} {t("queue_min")}
            </div>
          </div>
        </div>

        {/* Queue list */}
        <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-lg)", color:"var(--paper)", marginBottom:"var(--sp-3)", textShadow:"0 2px 4px rgba(0,0,0,0.5)" }}>
          {t("queue_live")}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-2)" }}>
          {visibleQueue.map(f => (
            <div key={f.tokenNumber} style={{
              background: f.isCurrentFarmer ? "#FFF0F0" : STATUS_BG[f.status],
              borderRadius:"var(--r-md)", padding:"var(--sp-3) var(--sp-4)",
              border: f.isCurrentFarmer ? "2px solid var(--vermilion-500)" : `1px solid var(--tarpaulin-300)`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:"var(--sp-3)" }}>
                <div style={{
                  width:36, height:36, borderRadius:"50%",
                  background: f.tokenNumber === currentServingToken ? "var(--vermilion-500)" : "var(--tarpaulin-100)",
                  color: f.tokenNumber === currentServingToken ? "white" : "var(--ink-900)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:800, fontSize:"var(--fs-sm)",
                }}>{f.tokenNumber}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:"var(--fs-sm)", color: f.isCurrentFarmer?"var(--vermilion-500)":"var(--ink-900)" }}>
                    {f.isCurrentFarmer ? "👤 " + f.farmerName + " (நீங்கள்)" : f.farmerName}
                  </div>
                  <div style={{ fontSize:"var(--fs-xs)", color:"var(--ink-500)" }}>{f.crop} · {f.qty}</div>
                </div>
              </div>
              <div style={{ fontSize:"var(--fs-xs)", fontWeight:700, color: STATUS_COLOR[f.status], background: STATUS_BG[f.status], padding:"3px 8px", borderRadius:8 }}>
                {f.status}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    </div>
  );
}
