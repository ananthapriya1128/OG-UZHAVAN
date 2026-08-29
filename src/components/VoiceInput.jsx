import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

const LANG_MAP = { ta: 'ta-IN', en: 'en-IN', hi: 'hi-IN' };

export default function VoiceInput({ value, onChange, inputRef }) {
  const { lang, t } = useI18n();
  const [listening, setListening] = useState(false);
  const [pending, setPending] = useState(null);
  const recogRef = useRef(null);
  const synthReady = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const recogSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!recogSupported) return;
    const Cls = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new Cls();
    r.lang = LANG_MAP[lang] || 'ta-IN';
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript?.trim();
      setListening(false);
      if (transcript) confirmTranscript(transcript);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recogRef.current = r;
    return () => { try { r.abort(); } catch {} };
  }, [lang, recogSupported]);

  const confirmTranscript = (text) => {
    setPending(text);
    speak(t('voice_confirm', { val: text }));
  };

  const speak = (text) => {
    if (!synthReady) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LANG_MAP[lang] || 'ta-IN';
      u.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const start = () => {
    if (!recogSupported) {
      alert(t('voice_error'));
      return;
    }
    setPending(null);
    setListening(true);
    try { recogRef.current.start(); } catch {
      try { recogRef.current.stop(); recogRef.current.start(); } catch {}
    }
  };

  const accept = () => {
    if (!pending) return;
    onChange(pending);
    setPending(null);
    try { if (inputRef?.current) inputRef.current.focus(); } catch {}
  };
  const reject = () => { setPending(null); };

  if (!recogSupported && !synthReady) return null;

  const primaryBtn = {
    flex: 1,
    minHeight: 'var(--touch-target)',
    background: 'var(--vermilion-500)',
    color: 'var(--white)',
    borderRadius: 'var(--r-md)',
    fontWeight: 700,
    fontSize: 'var(--fs-lg)',
    fontFamily: 'var(--font-display)',
    letterSpacing: 0.3
  };
  const secondaryBtn = {
    flex: 1,
    minHeight: 'var(--touch-target)',
    background: 'var(--tarpaulin-100)',
    color: 'var(--ink-900)',
    borderRadius: 'var(--r-md)',
    fontWeight: 600,
    fontSize: 'var(--fs-lg)',
    border: '2px solid var(--tarpaulin-300)'
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        aria-label={t('mic_aria')}
        title={t('mic_aria')}
        style={{
          width: 'var(--touch-target)',
          height: 'var(--touch-target)',
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: listening ? 'var(--vermilion-500)' : 'var(--tarpaulin-100)',
          color: listening ? 'var(--white)' : 'var(--ink-900)',
          border: listening ? '2px solid var(--vermilion-600)' : '2px solid var(--tarpaulin-300)',
          flexShrink: 0,
          boxShadow: listening ? '0 0 0 4px rgba(194,37,28,.18)' : 'none',
          transition: `all var(--dur-fast) var(--ease-out)`
        }}
      >
        <MicIcon active={listening} />
      </button>

      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(26,18,8,.55)',
            zIndex: 50,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 'var(--sp-4)'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) reject(); }}
        >
          <div
            style={{
              width: '100%', maxWidth: 'var(--content-max)',
              background: 'var(--paper)',
              borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
              padding: 'var(--sp-6)',
              boxShadow: 'var(--sh-lg)',
              borderTop: '4px solid var(--paddy-gold-500)'
            }}
          >
            <p style={{
              margin: '0 0 var(--sp-5)',
              fontSize: 'var(--fs-lg)',
              fontFamily: 'var(--font-body)',
              color: 'var(--ink-900)',
              lineHeight: 'var(--lh-snug)'
            }}>
              {t('voice_confirm', { val: '' })}
              <strong style={{ display: 'block', marginTop: 'var(--sp-2)', color: 'var(--earth-700)' }}>
                "{pending}"
              </strong>
            </p>
            <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              <button type="button" onClick={reject} style={secondaryBtn}>{t('no')}</button>
              <button type="button" onClick={accept} style={primaryBtn}>{t('yes')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MicIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={active ? 2.4 : 2}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}
