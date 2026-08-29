import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { getCurrentBooking } from "../../firebase/firestoreService";

export default function TokenQRScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const booking = getCurrentBooking();

  const qrData = encodeURIComponent(JSON.stringify({
    token: booking.tokenNumber, dpc: booking.dpcName,
    date: booking.slotDate, time: booking.slotTime,
    farmer: booking.farmerName,
  }));
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}&bgcolor=FBF3DC&color=5C3A16`;

  const statusColors = { booked:"var(--paddy-gold-500)", arrived:"#1A7FAB", weighing:"#8A4FCF", approved:"#3A7A1E", paid:"var(--vermilion-500)" };
  const sColor = statusColors[booking.status] || "var(--paddy-gold-500)";

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
        <div style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-xl)", fontWeight:700 }}>{t("token_title")}</div>
      </div>

      <div style={{ padding:"var(--sp-6)", maxWidth:"var(--content-max)", margin:"0 auto" }}>
        {/* Token card */}
        <div style={{
          background:"var(--paper)", borderRadius:"var(--r-lg)", overflow:"hidden",
          boxShadow:"var(--sh-lg)", border:"3px solid var(--paddy-gold-300)",
        }}>
          {/* Top banner */}
          <div style={{ background:"var(--earth-700)", padding:"var(--sp-4) var(--sp-5)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ color:"var(--paddy-gold-300)", fontSize:"var(--fs-xs)", fontWeight:600 }}>ஓ ஜி உழவன் · OG Uzhavan</div>
              <div style={{ color:"var(--paper)", fontFamily:"var(--font-display)", fontSize:"var(--fs-sm)", fontWeight:700 }}>தமிழ்நாடு அரசு கொள்முதல்</div>
            </div>
            <div style={{ background:sColor, borderRadius:"var(--r-md)", padding:"4px 10px", color:"white", fontSize:"var(--fs-xs)", fontWeight:800 }}>
              {t("token_status_" + booking.status) || booking.status.toUpperCase()}
            </div>
          </div>

          {/* Token number large */}
          <div style={{ textAlign:"center", padding:"var(--sp-6) var(--sp-6) var(--sp-4)", borderBottom:"2px dashed var(--paddy-gold-200)" }}>
            <div style={{ fontSize:"var(--fs-xs)", color:"var(--ink-500)", fontWeight:600, letterSpacing:2, marginBottom:4 }}>{t("token_num")}</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:80, fontWeight:900, color:"var(--earth-700)", lineHeight:1 }}>
              {String(booking.tokenNumber).padStart(2,"0")}
            </div>
          </div>

          {/* QR code */}
          <div style={{ display:"flex", justifyContent:"center", padding:"var(--sp-5)", borderBottom:"2px dashed var(--paddy-gold-200)" }}>
            <div style={{ padding:"var(--sp-3)", background:"#FBF3DC", borderRadius:"var(--r-md)", border:"2px solid var(--paddy-gold-200)" }}>
              <img src={qrUrl} alt="Token QR Code" width={180} height={180}
                onError={(e) => { e.currentTarget.style.display="none"; }}
                style={{ display:"block", borderRadius:4 }}
              />
            </div>
          </div>

          {/* Details */}
          <div style={{ padding:"var(--sp-5)" }}>
            {[
              [t("token_farmer"), booking.farmerName],
              [t("token_dpc"),    booking.dpcName],
              [t("token_date"),   booking.slotDate],
              [t("token_report"), booking.slotTime],
              [t("f_crop"),       booking.cropVarietyName],
            ].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"var(--sp-2) 0", borderBottom:"1px solid var(--earth-50)", fontSize:"var(--fs-sm)" }}>
                <span style={{ color:"var(--ink-500)", fontWeight:600 }}>{k}</span>
                <span style={{ color:"var(--ink-900)", fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ background:"var(--paddy-gold-100)", padding:"var(--sp-3) var(--sp-5)", textAlign:"center", fontSize:"var(--fs-xs)", color:"var(--earth-700)", fontWeight:600 }}>
            இந்த டோக்கனை DPC-ல் காட்டுங்கள் · Show this token at DPC
          </div>
        </div>

        <button
          onClick={() => navigate("/farmer/queue")}
          style={{
            width:"100%", marginTop:"var(--sp-5)", minHeight:52,
            background:"var(--vermilion-500)", color:"white",
            borderRadius:"var(--r-md)", fontFamily:"var(--font-display)", fontWeight:800,
            fontSize:"var(--fs-lg)", border:"none", cursor:"pointer",
          }}
        >
          {t("track_queue")} →
        </button>

        <button
          onClick={() => navigate("/farmer")}
          style={{
            width:"100%", marginTop:"var(--sp-3)", minHeight:46,
            background:"transparent", color:"var(--paper)",
            border:"1.5px solid rgba(255,255,255,0.4)",
            borderRadius:"var(--r-md)", fontWeight:700,
            fontSize:"var(--fs-sm)", cursor:"pointer",
          }}
        >
          ← {t("go_to_dashboard", "விவசாயி முகப்புக்கு செல்")}
        </button>
      </div>
      </div>
    </div>
  );
}
