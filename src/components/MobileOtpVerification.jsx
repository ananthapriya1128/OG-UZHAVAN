import { useEffect, useRef, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth, isConfigured } from "../firebase/config";
import { sendOtpSMS } from "../services/smsService";

const button = { minHeight:"var(--touch-target)", padding:"0 var(--sp-4)", borderRadius:"var(--r-md)", fontWeight:800, cursor:"pointer" };

export default function MobileOtpVerification({ mobile, verified, onVerified }) {
  const verifierRef = useRef(null);
  const confirmationRef = useRef(null);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [autoFillCountdown, setAutoFillCountdown] = useState(null);
  const [expectedOtp, setExpectedOtp] = useState("123456");

  const cleanMobile = String(mobile || "").replace(/\D/g, "");
  const validMobile = /^\d{10}$/.test(cleanMobile);

  useEffect(() => () => verifierRef.current?.clear(), []);

  // Timer countdown for resend
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  async function sendOtp() {
    if (!validMobile) {
      setError("முதலில் சரியான 10 இலக்க கைபேசி எண்ணை உள்ளிடவும் (Enter valid 10-digit mobile number).");
      return;
    }
    setBusy(true);
    setError("");

    // Generate dynamic 6-digit OTP
    const dynamicOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setExpectedOtp(dynamicOtp);

    try {
      if (!isConfigured || !auth) {
        // Fire live government SMS alert banner to phone screen
        await sendOtpSMS(cleanMobile, dynamicOtp);
        setSent(true);
        setCountdown(30);

        // Auto-fill dynamic OTP after 800ms
        setAutoFillCountdown(1);
        setTimeout(() => {
          setCode(dynamicOtp);
          setAutoFillCountdown(null);
        }, 1000);
        return;
      }

      verifierRef.current?.clear();
      verifierRef.current = new RecaptchaVerifier(auth, "mobile-otp-recaptcha", { size:"invisible" });
      confirmationRef.current = await signInWithPhoneNumber(auth, `+91${cleanMobile}`, verifierRef.current);
      setSent(true);
      setCountdown(30);
    } catch (err) {
      verifierRef.current?.clear();
      verifierRef.current = null;
      setError(err?.message?.replace("Firebase: ", "") || "OTP அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmOtp() {
    if (code.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      if (!isConfigured || !auth) {
        if (code !== expectedOtp && code !== "123456") {
          throw new Error(`தவறான OTP. உங்கள் திரையில் வந்த OTP: ${expectedOtp}`);
        }
      } else {
        await confirmationRef.current?.confirm(code);
      }
      onVerified();
    } catch (err) {
      setError(err?.message?.replace("Firebase: ", "") || "தவறான OTP குறியீடு.");
    } finally {
      setBusy(false);
    }
  }

  if (verified) return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      color: "#1B5E20",
      background: "#E8F5E9",
      border: "1.5px solid #4CAF50",
      padding: "6px 14px",
      borderRadius: "var(--r-md)",
      fontWeight: 800,
      fontSize: "var(--fs-sm)",
      marginTop: 6,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }}>
      <span>✓</span> கைபேசி எண் சரிபார்க்கப்பட்டது (+91 {cleanMobile})
    </div>
  );

  return (
    <div style={{ marginTop: 8 }}>
      <div id="mobile-otp-recaptcha" />

      {/* Target phone number banner */}
      <div style={{
        fontSize: "var(--fs-xs)",
        color: "var(--earth-800)",
        fontWeight: 700,
        marginBottom: 6,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <span>📱</span>
        <span>
          OTP அனுப்பப்படும் எண்: <strong>{cleanMobile ? `+91 ${cleanMobile}` : "(கைபேசி எண் உள்ளிடவும்)"}</strong>
        </span>
      </div>

      {!sent ? (
        <button
          type="button"
          disabled={busy || !validMobile}
          onClick={sendOtp}
          style={{
            ...button,
            background: "var(--earth-700)",
            color: "white",
            border: "none",
            opacity: busy || !validMobile ? 0.55 : 1,
            boxShadow: "var(--sh-sm)",
          }}
        >
          {busy ? "OTP அனுப்பப்படுகிறது…" : "📲 OTP அனுப்பவும் (Send OTP)"}
        </button>
      ) : (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input
              aria-label="Mobile OTP"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength="6"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6 இலக்க OTP"
              style={{
                minHeight: 48,
                padding: "0 14px",
                border: "2px solid var(--paddy-gold-500)",
                borderRadius: "var(--r-md)",
                maxWidth: 200,
                fontWeight: 800,
                fontSize: "var(--fs-md)",
                letterSpacing: 4,
                textAlign: "center",
                background: "white",
              }}
            />
            <button
              type="button"
              disabled={busy || code.length !== 6}
              onClick={confirmOtp}
              style={{
                ...button,
                minHeight: 48,
                background: "#2E7D32",
                color: "white",
                border: "none",
                opacity: busy || code.length !== 6 ? 0.55 : 1,
                boxShadow: "0 2px 8px rgba(46,125,50,0.3)",
              }}
            >
              {busy ? "சரிபார்க்கப்படுகிறது…" : "உறுதி செய் (Verify OTP) ✓"}
            </button>
            <button
              type="button"
              onClick={sendOtp}
              disabled={busy || countdown > 0}
              style={{
                ...button,
                minHeight: 48,
                background: "var(--tarpaulin-100)",
                color: "var(--ink-900)",
                border: "1px solid var(--tarpaulin-300)",
              }}
            >
              {countdown > 0 ? `மீண்டும் அனுப்பு (${countdown}s)` : "மீண்டும் அனுப்பு"}
            </button>
          </div>

          {/* Auto-fill notification */}
          {autoFillCountdown !== null && (
            <div style={{
              marginTop: 6,
              fontSize: 11,
              color: "#1B5E20",
              fontWeight: 700,
            }}>
              ⚡ SMS-லிருந்து OTP '{expectedOtp}' தானாக நிரப்பப்படுகிறது (Auto-filling)...
            </div>
          )}

          {!isConfigured && (
            <p style={{
              margin: "8px 0 0",
              fontSize: "var(--fs-xs)",
              color: "#5C3A16",
              background: "#FFF8E1",
              border: "1px solid #FFE082",
              padding: "6px 10px",
              borderRadius: "var(--r-sm)",
              fontWeight: 600
            }}>
              💡 குறிப்பு: திரையின் மேற்பகுதியில் வந்த SMS-ல் உள்ள OTP: <strong>{expectedOtp}</strong>
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" style={{ margin: "8px 0 0", color: "var(--danger-500)", fontSize: "var(--fs-sm)", fontWeight: 700 }}>
          {error}
        </p>
      )}
    </div>
  );
}
