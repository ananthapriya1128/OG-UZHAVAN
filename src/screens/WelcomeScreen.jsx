import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';

const PADDY_BG_URL = "/images/welcome_paddy_farmers.jpg";

export default function WelcomeScreen({ onContinue }) {
  const { t } = useI18n();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakTamilGreeting = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const greetingText = "வணக்கம் உழவர் பெருமக்களே! தமிழ்நாடு அரசு நேரடி நெல் கொள்முதல் போர்ட்டலான ஓ ஜி உழவன் உங்களை அன்போடு வரவேற்கிறது. உங்கள் உழைப்பிற்கு ஏற்ற நியாயமான விலை.";

    const u = new SpeechSynthesisUtterance(greetingText);
    u.lang = "ta-IN";
    u.rate = 0.88;
    u.pitch = 1.05;

    // Pick Tamil voice if available in browser
    const voices = window.speechSynthesis.getVoices?.() || [];
    const tamilVoice = voices.find(v => v.lang.includes("ta") || v.name.includes("Tamil"));
    if (tamilVoice) u.voice = tamilVoice;

    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(u);
  }, []);

  // Try auto-speak on initial screen load
  useEffect(() => {
    const timer = setTimeout(() => {
      speakTamilGreeting();
    }, 600);

    return () => {
      clearTimeout(timer);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speakTamilGreeting]);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#2A1A06',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 'var(--sp-8) var(--sp-6) var(--sp-8)'
    }}>
      {/* Real paddy-field photo with farmers */}
      <img
        src={PADDY_BG_URL}
        alt="Tamil Nadu Farmers in Golden Paddy Field"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 20%',
          zIndex: 0
        }}
      />

      {/* Green-tinted overlay for lush paddy-field ambience */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: `
          linear-gradient(180deg,
            rgba(34,110,52,0.50) 0%,
            rgba(22,90,38,0.25) 25%,
            rgba(18,78,32,0.18) 50%,
            rgba(10,58,22,0.70) 78%,
            rgba(5,32,12,0.95) 100%),
          linear-gradient(90deg,
            rgba(10,58,22,0.30) 0%,
            rgba(10,58,22,0.00) 30%,
            rgba(10,58,22,0.00) 70%,
            rgba(10,58,22,0.30) 100%)`
      }} />

      {/* Header & Logo */}
      <div style={{ position: 'relative', textAlign: 'center', zIndex: 3 }}>
        <div style={{
          display: 'inline-flex',
          width: 76, height: 76, borderRadius: '50%',
          background: 'var(--vermilion-500)',
          border: '3px solid var(--paper)',
          boxShadow: 'var(--sh-stamp), 0 4px 16px rgba(0,0,0,.5)',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 'var(--sp-3)'
        }}>
          <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
            <path d="M24 4 C 14 14, 10 24, 10 34 C 10 40, 16 44, 24 44 C 32 44, 38 40, 38 34 C 38 24, 34 14, 24 4 Z"
              fill="#FBF3DC" />
            <path d="M24 10 V38 M24 18 L 18 14 M24 18 L 30 14 M24 26 L 16 22 M24 26 L 32 22"
              stroke="#5C3A16" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-2xl)',
          fontWeight: 900,
          color: 'var(--paper)',
          letterSpacing: 1,
          textShadow: '0 2px 8px rgba(0,0,0,.8)'
        }}>
          ஓ ஜி உழவன்
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-xs)',
          color: 'var(--paddy-gold-200)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          marginTop: 2,
          textShadow: '0 1px 3px rgba(0,0,0,.8)'
        }}>
          TNCSC · Direct Paddy Procurement Portal
        </div>
      </div>

      {/* Main Greeting & Audio Speaker Pill */}
      <div style={{
        position: 'relative', zIndex: 3,
        maxWidth: 'var(--content-max, 480px)',
        margin: '0 auto',
        textAlign: 'center',
        color: 'var(--paper)'
      }}>
        {/* Tamil Voice Speaker Button */}
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <button
            type="button"
            onClick={speakTamilGreeting}
            style={{
              padding: '10px 20px',
              background: isSpeaking ? '#2E7D32' : 'rgba(255, 255, 255, 0.92)',
              color: isSpeaking ? 'white' : 'var(--earth-900)',
              borderRadius: 'var(--r-full, 999px)',
              border: isSpeaking ? '2px solid #A5D6A7' : '2px solid var(--paddy-gold-400)',
              fontWeight: 800,
              fontSize: 'var(--fs-sm)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              animation: isSpeaking ? 'pulseSpeaker 1s infinite' : 'none',
              transition: 'all .25s ease',
            }}
          >
            <span style={{ fontSize: 20 }}>{isSpeaking ? '🔊' : '🔈'}</span>
            <span>{isSpeaking ? 'பேசுகிறது (Speaking Tamil...)' : '🔊 தமிழில் கேட்க (Listen Voice)'}</span>
          </button>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-3xl)',
          fontWeight: 900,
          lineHeight: 1.25,
          textShadow: '0 3px 10px rgba(0,0,0,.8)',
          marginBottom: 'var(--sp-3)',
          color: '#FFF8E7'
        }}>
          {t('welcome_line1')}
        </h1>
        <p style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-lg)',
          fontWeight: 700,
          lineHeight: 1.45,
          textShadow: '0 2px 6px rgba(0,0,0,.8)',
          color: '#F4F9F2',
          opacity: 0.95
        }}>
          {t('welcome_line2')}<br />
          {t('welcome_line3')}
        </p>
      </div>

      {/* CTA Button */}
      <div style={{ position: 'relative', zIndex: 3, maxWidth: 'var(--content-max, 480px)', margin: '0 auto', width: '100%' }}>
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            onContinue();
          }}
          style={{
            width: '100%',
            minHeight: 58,
            background: 'var(--paper)',
            color: 'var(--vermilion-500)',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-xl)',
            fontWeight: 900,
            letterSpacing: 1.5,
            borderRadius: 'var(--r-lg)',
            border: '3px solid var(--vermilion-500)',
            boxShadow: '0 12px 28px rgba(0,0,0,.6), inset 0 -4px 0 rgba(194,37,28,.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span>{t('continue_cta')}</span>
          <span style={{ fontSize: 22 }}>→</span>
        </button>
      </div>

      <style>{`
        @keyframes pulseSpeaker {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.5); }
          50% { transform: scale(1.04); box-shadow: 0 0 0 12px rgba(76, 175, 80, 0); }
        }
      `}</style>
    </div>
  );
}
