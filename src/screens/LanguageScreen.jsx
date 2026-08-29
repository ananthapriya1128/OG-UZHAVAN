import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { SUPPORTED_LANGS } from '../i18n/translations';

export default function LanguageScreen({ onProceed, onBack }) {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();

  const opts = [
    { code: 'ta', label: 'தமிழ்', sub: 'Tamil' },
    { code: 'en', label: 'English', sub: 'ஆங்கிலம்' },
    { code: 'hi', label: 'हिंदी', sub: 'Hindi' },
    { code: 'te', label: 'తెలుగు', sub: 'Telugu' }
  ];

  const handleProceed = () => {
    if (onProceed) {
      onProceed();
    } else {
      navigate('/portal');
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: '#2A1A06',
    }}>
      {/* Fullscreen Paddy Landscape Background */}
      <img
        src="/images/paddy_landscape_bg.jpg"
        alt="Paddy Field Landscape"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 30%',
          zIndex: 0,
        }}
      />

      {/* Subtle Warm Golden Ambient Gradient (Farmers & field are 100% visible) */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: `
            linear-gradient(180deg,
              rgba(26, 18, 8, 0.45) 0%,
              rgba(0, 0, 0, 0.15) 40%,
              rgba(26, 18, 8, 0.65) 100%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Top Header */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        padding: 'var(--sp-6) var(--sp-6) var(--sp-4)',
        borderBottom: '1px solid rgba(251, 243, 220, 0.2)',
        background: 'rgba(26, 18, 8, 0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-3)',
        }}>
          <button
            onClick={handleBack}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(251,243,220,0.4)',
              borderRadius: '50%',
              width: 42,
              height: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              cursor: 'pointer',
              color: 'var(--paper)',
              transition: 'transform var(--dur-fast), background var(--dur-fast)',
              flexShrink: 0,
            }}
            aria-label="Back to welcome"
          >
            ←
          </button>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-2xl)',
              color: 'var(--paper)',
              margin: 0,
              fontWeight: 800,
              textShadow: '0 2px 4px rgba(0,0,0,0.6)',
            }}>
              {t('choose_lang')}
            </h1>
            <div style={{
              fontSize: 'var(--fs-xs)',
              color: 'var(--paddy-gold-200)',
              marginTop: 2,
              fontWeight: 600,
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}>
              Select your preferred language / உங்கள் மொழியைத் தேர்வுசெய்க
            </div>
          </div>
        </div>
      </div>

      {/* Language Options Cards Container */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        padding: 'var(--sp-4) var(--sp-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-3)',
        maxWidth: 440,
        margin: '0 auto',
        width: '100%',
        flex: 1,
        justifyContent: 'center',
      }}>
        {SUPPORTED_LANGS.map((code) => {
          const o = opts.find(x => x.code === code);
          const selected = lang === code;
          return (
            <button
              key={code}
              onClick={() => setLang(code)}
              aria-pressed={selected}
              style={{
                minHeight: 70,
                padding: 'var(--sp-3) var(--sp-5)',
                borderRadius: 'var(--r-xl)',
                background: selected
                  ? 'rgba(251, 243, 220, 0.88)'
                  : 'rgba(255, 255, 255, 0.68)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: selected
                  ? '3px solid var(--vermilion-500)'
                  : '1.5px solid rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                boxShadow: selected
                  ? '0 10px 24px rgba(0,0,0,0.35), 0 0 0 2px rgba(226,75,41,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.2)',
                transform: selected ? 'scale(1.02)' : 'none',
                transition: `all var(--dur-fast) var(--ease-out)`,
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--fs-2xl)',
                  fontWeight: 800,
                  color: selected ? 'var(--vermilion-500)' : 'var(--ink-900)',
                  letterSpacing: 0.5,
                }}>
                  {o?.label ?? code.toUpperCase()}
                </div>
                <div style={{
                  fontSize: 'var(--fs-sm)',
                  color: selected ? 'var(--earth-700)' : 'var(--ink-700)',
                  fontWeight: 600,
                  marginTop: 2,
                }}>
                  {o?.sub ?? ''}
                </div>
              </div>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '3px solid',
                borderColor: selected ? 'var(--vermilion-500)' : 'var(--tarpaulin-300)',
                background: selected ? 'var(--vermilion-500)' : 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--white)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                fontSize: 16,
                boxShadow: selected ? '0 2px 6px rgba(226,75,41,0.4)' : 'none',
              }}>
                {selected ? '✓' : ''}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Proceed CTA */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        padding: 'var(--sp-4) var(--sp-6) var(--sp-8)',
        maxWidth: 'var(--content-max)',
        width: '100%',
        margin: '0 auto',
      }}>
        <button
          onClick={handleProceed}
          style={{
            width: '100%',
            minHeight: 62,
            background: 'var(--vermilion-500)',
            color: 'var(--white)',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-xl)',
            fontWeight: 800,
            letterSpacing: 1.5,
            borderRadius: 'var(--r-lg)',
            boxShadow: '0 8px 24px rgba(226,75,41,0.45), 0 4px 8px rgba(0,0,0,0.3)',
            border: '2px solid rgba(255,255,255,0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'transform var(--dur-fast)',
          }}
        >
          <span>{t('proceed')}</span>
          <span style={{ fontSize: 22 }}>→</span>
        </button>
      </div>
    </div>
  );
}
