import { useNavigate, useLocation } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";

const C = {
  gold: "var(--paddy-gold-500)",
  earth: "var(--earth-700)",
  vermilion: "var(--vermilion-500)",
  paper: "var(--paper)",
  ink: "var(--ink-900)",
  tarp100: "var(--tarpaulin-100)",
  tarp300: "var(--tarpaulin-300)",
};

function NavBtn({ icon, label, path, active, onClick, accent }) {
  return (
    <button
      onClick={onClick || (() => {})}
      aria-label={label}
      style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 3, padding: "8px 4px 6px",
        background: "transparent", border: "none", cursor: "pointer",
        color: active ? C.vermilion : "#6B7280",
        transition: "color .15s",
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, fontFamily: "var(--font-body)", lineHeight: 1 }}>{label}</span>
      {active && <div style={{ width: 24, height: 3, borderRadius: 2, background: C.vermilion, marginTop: 2 }} />}
    </button>
  );
}

export default function AppShell({ children, onAssistant, isDpc }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useI18n();

  const farmerActive = pathname.startsWith("/farmer");
  const dpcActive    = pathname.startsWith("/dpc");
  const homeActive   = pathname === "/" || pathname === "/portal";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--earth-50)" }}>
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 72 }}>
        {children}
      </div>

      {/* Bottom Toolbar */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          height: 68,
          background: C.paper,
          borderTop: "2px solid var(--paddy-gold-300)",
          display: "flex", alignItems: "stretch",
          boxShadow: "0 -4px 16px rgba(26,18,8,.12)",
          zIndex: 100,
          maxWidth: "var(--content-max, 560px)",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <NavBtn icon="🏠" label={t("nav_home")} active={homeActive} onClick={() => navigate("/portal")} />
        <NavBtn icon="🌾" label={t("nav_farmer")} active={farmerActive} onClick={() => navigate("/farmer")} />
        <NavBtn icon="🏢" label={t("nav_dpc")} active={dpcActive} onClick={() => navigate("/dpc")} />

        {/* AI Assistant centre mic button */}
        <button
          onClick={onAssistant}
          aria-label={t("nav_assistant")}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, padding: "4px 4px 6px",
            background: "transparent", border: "none", cursor: "pointer",
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--vermilion-500), #E05F00)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(194,37,28,.45)",
            marginTop: -16,
            border: "3px solid var(--paper)",
          }}>
            <span style={{ fontSize: 20 }}>🎤</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, fontFamily: "var(--font-body)", color: "#6B7280", lineHeight: 1 }}>
            {t("nav_assistant")}
          </span>
        </button>
      </nav>
    </div>
  );
}
