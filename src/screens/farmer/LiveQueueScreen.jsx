import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { getCurrentBooking } from "../../firebase/firestoreService";
import FarmerQueueTracker from "../../components/FarmerQueueTracker";

export default function LiveQueueScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const booking = getCurrentBooking();

  return (
    <div style={{ minHeight: "100vh", background: "rgba(20,12,3,0.88)", paddingBottom: 80, position: "relative" }}>
      {/* Background Image */}
      <img
        src="/images/paddy_landscape_bg.jpg"
        alt=""
        aria-hidden="true"
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
          background: "linear-gradient(180deg, rgba(20,12,3,0.72) 0%, rgba(20,12,3,0.60) 40%, rgba(20,12,3,0.85) 100%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,var(--earth-700),#2A1A06)", padding: "var(--sp-5) var(--sp-6)", color: "var(--paper)", display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          <button onClick={() => navigate("/farmer")} style={{ background: "none", border: "none", color: "var(--paper)", fontSize: 22, cursor: "pointer" }}>←</button>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", fontWeight: 800 }}>🌾 {t("queue_live")}</div>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--paddy-gold-200)", opacity: 0.9 }}>
              {booking?.dpcName || "பொன்னேரி DPC மையம்"} · Realtime Stage Engine
            </div>
          </div>
        </div>

        <div style={{ padding: "var(--sp-5)", maxWidth: 680, margin: "0 auto" }}>
          {/* Real DPC Farmer Queue Tracker */}
          <FarmerQueueTracker tokenNumber={booking?.tokenNumber || 44} dpcId={booking?.dpcId || 'dpc_ponneri'} />
        </div>
      </div>
    </div>
  );
}
