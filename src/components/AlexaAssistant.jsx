import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useNavigate } from "react-router-dom";
import { getCurrentBooking, getMockServingToken, getAllMspRates } from "../firebase/firestoreService";

const LANG_MAP = { ta:"ta-IN", en:"en-IN", hi:"hi-IN", te:"te-IN" };

// Deep Rural Tamil Dialect and Multi-lingual Intent Detection Engine
function detectIntent(text, lang) {
  const t = text.toLowerCase();

  // 1. Token & Queue Status
  if (
    t.includes("டோக்கன்") || t.includes("token") || t.includes("வரிசை") || 
    t.includes("எப்போ போகணும்") || t.includes("என் எண்") || t.includes("நிலை") ||
    t.includes("status") || t.includes("queue") || t.includes("my turn") || t.includes("waiting")
  ) {
    return "check_token";
  }

  // 2. MSP & Paddy Price
  if (
    t.includes("விலை") || t.includes("ரேட்") || t.includes("rate") || t.includes("msp") || 
    t.includes("price") || t.includes("குவிண்டால்") || t.includes("பணம் எவ்வளவு") || t.includes("விவசாய விலை")
  ) {
    return "check_msp";
  }

  // 3. Payment & DBT Timeline
  if (
    t.includes("பணம் எப்போ") || t.includes("வரவு") || t.includes("payment") || 
    t.includes("வங்கி") || t.includes("dbt") || t.includes("bank") || t.includes("account") || t.includes("காசு")
  ) {
    return "check_payment";
  }

  // 4. Weather & Rain Alert
  if (
    t.includes("மழை") || t.includes("வானிலை") || t.includes("ஈரப்பதம்") || 
    t.includes("weather") || t.includes("rain") || t.includes("moisture")
  ) {
    return "check_weather";
  }

  // 5. Slot Booking
  if (
    t.includes("புக்") || t.includes("பதிவு") || t.includes("slot") || 
    t.includes("book") || t.includes("booking") || t.includes("இடம்") || t.includes("நேரம் ஒதுக்கீடு")
  ) {
    return "book_slot";
  }

  // 6. Grievance & Complaint
  if (
    t.includes("புகார்") || t.includes("பிரச்சனை") || t.includes("complaint") || 
    t.includes("grievance") || t.includes("problem") || t.includes("உதவி")
  ) {
    return "raise_grievance";
  }

  return "general";
}

export default function AlexaAssistant({ open, onClose }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [phase, setPhase] = useState("idle"); // idle | listening | thinking | responding | error
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const recogRef = useRef(null);

  const supported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const speak = useCallback((text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_MAP[lang] || "ta-IN";
    u.rate = 0.92;
    u.pitch = 1.05;

    // Pick Tamil voice if available in system
    const voices = window.speechSynthesis.getVoices?.() || [];
    const tamilVoice = voices.find(v => v.lang.includes("ta") || v.name.includes("Tamil"));
    if (tamilVoice) u.voice = tamilVoice;

    window.speechSynthesis.speak(u);
  }, [lang]);

  const handleIntent = useCallback(async (text) => {
    const intent = detectIntent(text, lang);
    setPhase("responding");

    const curBooking = getCurrentBooking();
    const serving = getMockServingToken();
    let msg = "";
    let route = null;

    switch (intent) {
      case "check_token":
        if (curBooking) {
          const ahead = Math.max(0, curBooking.tokenNumber - serving);
          msg = `வணக்கம்! உங்கள் டோக்கன் எண் #${curBooking.tokenNumber}. மையம்: ${curBooking.dpcName}. தற்போது #${serving} அழைக்கப்படுகிறது. உங்களுக்கு முன் ${ahead} விவசாயிகள் உள்ளனர்.`;
          route = "/farmer/token";
        } else {
          msg = "உங்களிடம் தற்போது முன்பதிவு இல்லை. உடனடியாக முன்பதிவு செய்ய 'இட ஒதுக்கீடு' பக்கத்திற்கு செல்கிறேன்.";
          route = "/farmer/booking";
        }
        break;

      case "check_msp":
        msg = "இன்றைய தமிழ்நாடு அரசு நேரடி நெல் கொள்முதல் விலை: வெள்ளை பொன்னி குவிண்டாலுக்கு ₹2,183, தரம் ஏ ரகம் குவிண்டாலுக்கு ₹2,203 ஆகும். ஈர்ப்பு கழிவு 17 சதவீதத்திற்குள் பூஜ்ஜியம்.";
        route = "/farmer/msp";
        break;

      case "check_payment":
        msg = "கொள்முதல் முடிந்த 48 மணி நேரத்திற்குள் DBT மூலம் உங்கள் ஆதார் இணைக்கப்பட்ட வங்கிக் கணக்கிற்கு பணம் நேரடியாக வரவு வைக்கப்படும்.";
        route = "/farmer";
        break;

      case "check_weather":
        msg = "காவிரி டெல்டா மண்டலத்தில் இன்று வானிலை தெளிவாக உள்ளது. உங்கள் நெல்லின் ஈரப்பதம் 17 சதவீதத்திற்குள் இருப்பதை உறுதி செய்து DPC-க்கு கொண்டு வாருங்கள்.";
        break;

      case "book_slot":
        msg = "நிச்சயமாக! உழவர் நேரடி நெல் கொள்முதல் முன்பதிவு பக்கத்திற்கு அழைத்துச் செல்கிறேன்.";
        route = "/farmer/booking";
        break;

      case "raise_grievance":
        msg = "உங்கள் புகாரை பதிவு செய்ய குறைதீர்ப்பு பக்கத்திற்கு அழைத்துச் செல்கிறேன். 72 மணி நேரத்திற்குள் தீர்வு காணப்படும்.";
        route = "/farmer/grievance";
        break;

      default:
        msg = "மன்னிக்கவும், உங்கள் குரல் சரியாக புரியவில்லை. டோக்கன் எண், இன்றைய விலை, அல்லது முன்பதிவு பற்றி என்னிடம் கேளுங்கள்.";
        break;
    }

    setResponse(msg);
    speak(msg);

    if (route) {
      setTimeout(() => {
        onClose();
        navigate(route);
      }, 3500);
    }
  }, [lang, speak, navigate, onClose]);

  const startListening = useCallback(() => {
    if (!supported) { setPhase("error"); return; }
    setTranscript("");
    setResponse("");
    setPhase("listening");

    const Cls = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new Cls();
    r.lang = LANG_MAP[lang] || "ta-IN";
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (e) => {
      const t2 = Array.from(e.results).map(x => x[0].transcript).join(" ");
      setTranscript(t2);
      if (e.results[e.results.length - 1].isFinal) {
        setPhase("thinking");
        setTimeout(() => handleIntent(t2), 300);
      }
    };
    r.onerror = () => setPhase("error");
    r.onend = () => { if (phase === "listening") setPhase("idle"); };
    recogRef.current = r;
    r.start();
  }, [lang, supported, handleIntent, phase]);

  const stopListening = useCallback(() => {
    try { recogRef.current?.stop(); } catch {}
    setPhase("idle");
  }, []);

  useEffect(() => {
    if (open) {
      setPhase("idle");
      setTranscript("");
      setResponse("");
      setTimeout(startListening, 300);
    } else {
      try { recogRef.current?.stop(); } catch {}
      window.speechSynthesis?.cancel();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="பேசும் உழவன் AI"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(10, 15, 20, 0.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "var(--sp-4)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%",
        maxWidth: 520,
        background: "linear-gradient(180deg, #FFFDF7 0%, #FBF3DC 100%)",
        borderRadius: "28px 28px 20px 20px",
        padding: "var(--sp-6) var(--sp-5)",
        boxShadow: "0 -12px 48px rgba(0,0,0,0.5)",
        borderTop: "5px solid var(--paddy-gold-500)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--sp-4)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 24 }}>🌾</span>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "var(--fs-lg)", color: "var(--earth-800)" }}>
                பேசும் உழவன் (Tamil Voice AI)
              </div>
              <div style={{ fontSize: 11, color: "var(--earth-700)", fontWeight: 600 }}>
                தமிழ் குரல் உதவியாளர் · TNCSC Official
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "var(--ink-500)" }}>✕</button>
        </div>

        {/* Transcript / Response Box */}
        {(transcript || response) && (
          <div style={{
            width: "100%",
            background: "white",
            borderRadius: "var(--r-lg)",
            padding: "var(--sp-4)",
            border: "1.5px solid var(--paddy-gold-300)",
            boxShadow: "var(--sh-sm)",
          }}>
            {transcript && (
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--ink-700)", marginBottom: response ? 8 : 0 }}>
                🗣️ நீங்கள் கேட்டது: <strong style={{ color: "var(--earth-800)" }}>"{transcript}"</strong>
              </div>
            )}
            {response && (
              <div style={{ fontSize: "var(--fs-sm)", color: "#1B5E20", fontWeight: 700, lineHeight: 1.4, background: "#E8F5E9", padding: 10, borderRadius: 8, border: "1px solid #A5D6A7" }}>
                🤖 {response}
              </div>
            )}
          </div>
        )}

        {/* Status prompt */}
        <div style={{ fontSize: "var(--fs-sm)", color: phase === "listening" ? "var(--vermilion-500)" : "var(--earth-800)", fontWeight: 800, textAlign: "center" }}>
          {phase === "listening" ? "🎙️ உங்கள் கேள்வியை தமிழில் பேசுங்கள் (Listening...)" :
           phase === "thinking" ? "⚡ யோசிக்கிறது (Thinking...)" :
           phase === "responding" ? "🔊 பதில் கூறுகிறது..." :
           "மைக் பொத்தானை அழுத்தி பேசவும்"}
        </div>

        {/* Big Mic Button */}
        <button
          onClick={phase === "listening" ? stopListening : startListening}
          aria-label="Mic Button"
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: phase === "listening"
              ? "linear-gradient(135deg, #B71C1C, #E53935)"
              : "linear-gradient(135deg, var(--vermilion-500), #E05F00)",
            border: "4px solid white",
            boxShadow: phase === "listening"
              ? "0 0 0 14px rgba(229, 57, 53, 0.25), 0 8px 24px rgba(0,0,0,0.3)"
              : "0 8px 24px rgba(194,37,28,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            animation: phase === "listening" ? "voicePulse 1.2s infinite" : "none",
            transition: "all .25s",
          }}
        >
          <span style={{ fontSize: 38 }}>{phase === "listening" ? "⏹" : "🎤"}</span>
        </button>

        {/* Interactive Tamil Voice Prompts */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
          {[
            { q: "என் டோக்கன் எண் என்ன?", icon: "🎫" },
            { q: "இன்றைய நெல் கொள்முதல் விலை என்ன?", icon: "💰" },
            { q: "எனக்கு பணம் எப்போ வரும்?", icon: "🏦" },
            { q: "இன்னைக்கு மழை வருமா?", icon: "🌧️" },
            { q: "இட ஒதுக்கீடு செய்ய வேண்டும்", icon: "📅" },
          ].map(({ q, icon }) => (
            <button
              key={q}
              onClick={() => {
                setTranscript(q);
                handleIntent(q);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--r-md)",
                background: "white",
                border: "1.5px solid var(--paddy-gold-400)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--earth-800)",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{icon}</span>
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes voicePulse {
          0%, 100% { box-shadow: 0 0 0 12px rgba(229, 57, 53, 0.25), 0 8px 24px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 0 22px rgba(229, 57, 53, 0.1), 0 8px 32px rgba(0,0,0,0.4); }
        }
      `}</style>
    </div>
  );
}
