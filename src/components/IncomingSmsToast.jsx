import { useEffect, useState } from "react";

export default function IncomingSmsToast() {
  const [activeSms, setActiveSms] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail;
      if (!detail) return;
      setActiveSms(detail);
      setVisible(true);

      // Play soft chime sound simulation if audio is permitted
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch {}

      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 8000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("ogu_incoming_sms", handler);
    return () => window.removeEventListener("ogu_incoming_sms", handler);
  }, []);

  if (!visible || !activeSms) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        maxWidth: 480,
        width: "calc(100% - 32px)",
        background: "rgba(20, 24, 30, 0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        color: "white",
        borderRadius: "var(--r-xl, 16px)",
        border: "1.5px solid rgba(255, 215, 0, 0.5)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.6), 0 0 20px rgba(255, 193, 7, 0.25)",
        padding: "14px 18px",
        cursor: "pointer",
        animation: "slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -24px) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "#2E7D32", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, border: "1.5px solid white",
          }}>
            🏛️
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: 13, color: "var(--paddy-gold-300, #FFD54F)" }}>
              {activeSms.title || "TNCSC GOVT SMS"}
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginLeft: 6 }}>
              • இப்போது (Just now)
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 10, color: "#90CAF9", fontWeight: 700 }}>
            {activeSms.to}
          </span>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>✕</span>
        </div>
      </div>

      {/* SMS Body Content */}
      <div style={{
        fontSize: 12.5,
        lineHeight: 1.45,
        color: "rgba(255,255,255,0.95)",
        fontWeight: 600,
        whiteSpace: "pre-line",
        background: "rgba(255,255,255,0.06)",
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {activeSms.message}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
        <span>ID: {activeSms.messageId}</span>
        <span style={{ color: "#81C784", fontWeight: 700 }}>✓ மொபைலுக்கு அனுப்பப்பட்டது (Delivered)</span>
      </div>
    </div>
  );
}
