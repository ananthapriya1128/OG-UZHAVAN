import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";

export default function PortalSelectionScreen() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      paddingBottom: "var(--sp-8)",
      background: "#1E1305",
    }}>
      {/* Fullscreen Background Landscape Image */}
      <img
        src="/images/paddy_landscape_bg.jpg"
        alt="Paddy Field Landscape"
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

      {/* Ambient Vignette & Gradient Overlay */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: `
            linear-gradient(180deg,
              rgba(20, 12, 3, 0.55) 0%,
              rgba(20, 12, 3, 0.20) 40%,
              rgba(20, 12, 3, 0.75) 100%)
          `,
          pointerEvents: "none",
        }}
      />

      {/* Header Banner */}
      <header style={{
        position: "relative",
        zIndex: 2,
        background: "rgba(30, 19, 5, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "var(--sp-6) var(--sp-6)",
        color: "var(--paper)",
        borderBottom: "1px solid rgba(251, 243, 220, 0.2)",
        boxShadow: "var(--sh-md)",
      }}>
        <div style={{
          maxWidth: "var(--content-max, 560px)",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "var(--vermilion-500)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid var(--paper)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              fontSize: 22,
            }}>
              🌾
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "var(--fs-lg)", color: "var(--paper)", lineHeight: 1.2, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                ஓ ஜி உழவன் · OG Uzhavan
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--paddy-gold-200)", opacity: 0.95, fontWeight: 600 }}>
                தமிழ்நாடு அரசு நேரடி நெல் கொள்முதல்
              </div>
            </div>
          </div>

          {/* Quick Language Toggle */}
          <button
            onClick={() => navigate("/lang")}
            style={{
              padding: "6px 14px",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(251,243,220,0.4)",
              borderRadius: "var(--r-md)",
              color: "var(--paper)",
              fontSize: "var(--fs-xs)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
            }}
            aria-label="Change language"
          >
            🌐 {lang === "ta" ? "தமிழ்" : lang === "en" ? "English" : lang === "hi" ? "हिंदी" : "తెలుగు"} ▾
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        position: "relative",
        zIndex: 2,
        maxWidth: "var(--content-max, 560px)",
        margin: "0 auto",
        width: "100%",
        padding: "var(--sp-6) var(--sp-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--sp-5)",
        flex: 1,
      }}>
        {/* Title & Guidance */}
        <div style={{ textAlign: "center", marginTop: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-2xl)",
            fontWeight: 800,
            color: "var(--paper)",
            lineHeight: 1.25,
            marginBottom: 6,
            textShadow: "0 2px 6px rgba(0,0,0,0.6)",
          }}>
            {t("portal_title")}
          </h1>
          <p style={{
            margin: 0,
            fontSize: "var(--fs-sm)",
            color: "var(--paddy-gold-200)",
            fontWeight: 600,
            lineHeight: 1.4,
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}>
            {t("portal_subtitle")}
          </p>
        </div>

        {/* 🌾 PORTAL 1: FARMER PORTAL */}
        <section aria-labelledby="farmer-portal-heading" style={{
          background: "rgba(251, 243, 220, 0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "var(--r-xl)",
          border: "2px solid var(--paddy-gold-300)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Card Top Image Banner */}
          <div style={{
            position: "relative",
            height: 140,
            overflow: "hidden",
            background: "#2A1A06",
          }}>
            <img
              src="/images/paddy_landscape_bg.jpg"
              alt="Paddy Field Landscape"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 40%",
              }}
            />
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(42,26,6,0.2) 0%, rgba(42,26,6,0.85) 100%)",
            }} />
            <div style={{
              position: "absolute",
              bottom: 12,
              left: 16,
              right: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{
                background: "var(--vermilion-500)",
                color: "white",
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: 12,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }}>
                🌾 Farmer Section · உழவர் பகுதி
              </span>
              <span style={{ color: "var(--paddy-gold-200)", fontSize: 12, fontWeight: 700 }}>
                Direct TN Mandi
              </span>
            </div>
          </div>

          <div style={{ padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            <div>
              <h2 id="farmer-portal-heading" style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--fs-xl)",
                fontWeight: 800,
                color: "var(--earth-700)",
                margin: 0,
              }}>
                {t("portal_farmer_title")}
              </h2>
              <p style={{
                margin: "4px 0 0",
                fontSize: "var(--fs-xs)",
                color: "var(--ink-700)",
                lineHeight: 1.45,
              }}>
                {t("portal_farmer_desc")}
              </p>
            </div>

            {/* Quick Badges */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: "8px 10px",
              background: "rgba(42,26,6,0.06)",
              borderRadius: "var(--r-md)",
              fontSize: "var(--fs-xs)",
              color: "var(--earth-700)",
              fontWeight: 600,
            }}>
              <span>✓ VAO Survey No.</span>
              <span>·</span>
              <span>✓ Slot Booking</span>
              <span>·</span>
              <span>✓ Live Queue</span>
              <span>·</span>
              <span>✓ MSP Calculator</span>
            </div>

            {/* Buttons: New Farmer Reg vs Existing Dashboard */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--sp-3)" }}>
              <button
                onClick={() => navigate("/register")}
                style={{
                  width: "100%",
                  minHeight: 52,
                  background: "var(--vermilion-500)",
                  color: "var(--white)",
                  borderRadius: "var(--r-md)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "var(--fs-md)",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(226,75,41,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "transform var(--dur-fast)",
                }}
              >
                <span>📝 {t("portal_farmer_new_btn")}</span>
                <span>→</span>
              </button>

              <button
                onClick={() => navigate("/farmer")}
                style={{
                  width: "100%",
                  minHeight: 46,
                  background: "rgba(255,255,255,0.9)",
                  color: "var(--earth-700)",
                  borderRadius: "var(--r-md)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 700,
                  fontSize: "var(--fs-sm)",
                  border: "2px solid var(--paddy-gold-300)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>🏠 {t("portal_farmer_existing_btn")}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 🏢 PORTAL 2: DPC PROCUREMENT CENTRE PORTAL */}
        <section aria-labelledby="dpc-portal-heading" style={{
          background: "rgba(251, 243, 220, 0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "var(--r-xl)",
          border: "2px solid var(--tarpaulin-300)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Card Top Image Banner */}
          <div style={{
            position: "relative",
            height: 140,
            overflow: "hidden",
            background: "#163C5A",
          }}>
            <img
              src="/images/dpc_mandi_bg.jpg"
              alt="DPC Mandi Procurement Centre"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 40%",
              }}
            />
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(22,60,90,0.2) 0%, rgba(22,60,90,0.85) 100%)",
            }} />
            <div style={{
              position: "absolute",
              bottom: 12,
              left: 16,
              right: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{
                background: "#163C5A",
                color: "white",
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: 12,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                border: "1px solid rgba(255,255,255,0.3)",
              }}>
                🏢 DPC Officers · கொள்முதல் அலுவலர்
              </span>
              <span style={{ color: "var(--tarpaulin-100)", fontSize: 12, fontWeight: 700 }}>
                Centre Operations
              </span>
            </div>
          </div>

          <div style={{ padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            <div>
              <h2 id="dpc-portal-heading" style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--fs-xl)",
                fontWeight: 800,
                color: "#163C5A",
                margin: 0,
              }}>
                {t("portal_dpc_title")}
              </h2>
              <p style={{
                margin: "4px 0 0",
                fontSize: "var(--fs-xs)",
                color: "var(--ink-700)",
                lineHeight: 1.45,
              }}>
                {t("portal_dpc_desc")}
              </p>
            </div>

            {/* Quick Badges */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: "8px 10px",
              background: "rgba(22,60,90,0.06)",
              borderRadius: "var(--r-md)",
              fontSize: "var(--fs-xs)",
              color: "var(--tarpaulin-700)",
              fontWeight: 600,
            }}>
              <span>✓ QR Token Scan</span>
              <span>·</span>
              <span>✓ Weighbridge</span>
              <span>·</span>
              <span>✓ Queue Call Next</span>
              <span>·</span>
              <span>✓ Moisture Check</span>
            </div>

            <button
              onClick={() => navigate("/dpc")}
              style={{
                width: "100%",
                minHeight: 52,
                background: "#163C5A",
                color: "var(--white)",
                borderRadius: "var(--r-md)",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "var(--fs-md)",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(22,60,90,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span>🔐 {t("portal_dpc_btn")}</span>
              <span>→</span>
            </button>
          </div>
        </section>

        {/* 🏛️ PORTAL 3: STATE ADMIN PORTAL */}
        <section aria-labelledby="admin-portal-heading" style={{
          background: "rgba(251, 243, 220, 0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "var(--r-xl)",
          border: "2px solid #D0B0F0",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          padding: "var(--sp-4) var(--sp-5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--sp-3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "var(--r-md)",
              background: "#F3E8FF", border: "2px solid #D0B0F0",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>
              🏛️
            </div>
            <div>
              <h3 id="admin-portal-heading" style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--fs-md)",
                fontWeight: 700,
                color: "#5A1FAF",
                margin: 0,
              }}>
                {t("portal_admin_title")}
              </h3>
              <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--ink-700)", fontWeight: 500 }}>
                {t("portal_admin_desc")}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/admin")}
            style={{
              padding: "10px 16px",
              background: "#5A1FAF",
              color: "white",
              borderRadius: "var(--r-md)",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: "var(--fs-xs)",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(90,31,175,0.35)",
            }}
          >
            {t("portal_admin_btn")} →
          </button>
        </section>

        {/* Change Language Footer Link */}
        <div style={{ textAlign: "center", marginTop: "var(--sp-3)" }}>
          <button
            onClick={() => navigate("/lang")}
            style={{
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(251,243,220,0.3)",
              color: "var(--paddy-gold-200)",
              fontSize: "var(--fs-sm)",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 24,
            }}
          >
            ← {t("choose_lang")}
          </button>
        </div>
      </main>
    </div>
  );
}
