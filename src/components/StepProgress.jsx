import { useI18n } from '../i18n/I18nContext';

export default function StepProgress({ current, steps }) {
  const { t } = useI18n();
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: 'var(--sp-2)',
      padding: 'var(--sp-4) var(--sp-6)',
      background: 'var(--paper)',
      borderBottom: '2px solid var(--paddy-gold-200)',
      overflowX: 'auto'
    }}>
      {steps.map((k, i) => {
        const label = t(k);
        const done = i < current;
        const active = i === current;
        return (
          <div key={k} style={{
            display: 'flex', alignItems: 'center',
            flex: i < steps.length - 1 ? '1 1 auto' : '0 0 auto',
            minWidth: 0
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
              minWidth: 0
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-sm)',
                fontWeight: 700,
                background: done ? 'var(--success-500)' : active ? 'var(--vermilion-500)' : 'var(--tarpaulin-100)',
                color: (done || active) ? 'var(--white)' : 'var(--earth-700)',
                border: '2px solid ' + (done ? 'var(--success-500)' : active ? 'var(--vermilion-500)' : 'var(--tarpaulin-300)')
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: 'var(--fs-xs)',
                fontWeight: active ? 800 : 700,
                color: active ? 'var(--vermilion-500)' : done ? 'var(--success-500)' : 'var(--earth-700)',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-body)'
              }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: '1 1 32px', height: 3,
                background: done ? 'var(--success-500)' : 'var(--tarpaulin-300)',
                margin: '0 var(--sp-2)',
                borderRadius: 2
              }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}
