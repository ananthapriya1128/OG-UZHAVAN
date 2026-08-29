import { useRef, useState } from 'react';
import VoiceInput from './VoiceInput';

export function maskAadhaarFn(val) {
  const s = String(val || '').replace(/\D/g, '');
  if (s.length < 4) return s;
  return 'XXXX XXXX ' + s.slice(-4);
}

// Aadhaar uses the Verhoeff checksum. It detects mistyped digits but does not
// disclose whether a number has been issued to a particular person.
const verhoeffD = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const verhoeffP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];

export function isValidAadhaar(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!/^\d{12}$/.test(digits) || /^([0-9])\1{11}$/.test(digits) || digits[0] === '0') return false;
  return [...digits].reverse().reduce((check, digit, index) => verhoeffD[check][verhoeffP[index % 8][Number(digit)]], 0) === 0;
}

// The demo is Tamil Nadu-specific: TN + a two-digit district code + eight digits.
export function formatTamilNaduRationCard(value) {
  const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = compact.match(/^(TN\d{2})(\d{0,8})$/);
  return match ? `${match[1]}${match[2] ? ` ${match[2]}` : ''}` : compact;
}

export function isValidTamilNaduRationCard(value) {
  return /^TN\d{2}\s?\d{8}$/.test(String(value || '').toUpperCase());
}

const inputBase = {
  width: '100%',
  minHeight: 'var(--touch-target)',
  padding: '12px 16px',
  fontSize: 'var(--fs-lg)',
  fontFamily: 'var(--font-body)',
  color: 'var(--ink-900)',
  background: 'var(--white)',
  border: '2px solid var(--tarpaulin-300)',
  borderRadius: 'var(--r-md)',
  boxShadow: 'inset 0 1px 2px rgba(26,18,8,.06)',
  transition: `border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)`
};

const selectStyle = {
  ...inputBase,
  appearance: 'none',
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2334424A' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  paddingRight: 48,
  paddingTop: 10,
  paddingBottom: 10
};

export default function FormField({
  id, label, value, onChange, type = 'text',
  placeholder, options, required, maskAadhaar
}) {
  const inputRef = useRef(null);
  const [touched, setTouched] = useState(false);
  const empty = value == null || String(value).trim() === '';
  const invalid = touched && required && empty;

  const handleChange = (e) => onChange(e.target.value);

  const inputEl = options ? (
    <select
      id={id}
      ref={inputRef}
      value={value ?? ''}
      onChange={handleChange}
      onBlur={() => setTouched(true)}
      required={required}
      style={{
        ...selectStyle,
        borderColor: invalid ? 'var(--danger-500)' : 'var(--tarpaulin-300)',
        paddingRight: '60px'
      }}
    >
      <option value="">—</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ) : (
    <input
      id={id}
      ref={inputRef}
      type={type}
      value={value ?? ''}
      onChange={handleChange}
      onBlur={() => setTouched(true)}
      placeholder={placeholder}
      required={required}
      style={{
        ...inputBase,
        borderColor: invalid ? 'var(--danger-500)' : 'var(--tarpaulin-300)',
        paddingRight: '60px'
      }}
      autoComplete="off"
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      <label htmlFor={id} style={{
        fontSize: 'var(--fs-sm)',
        fontWeight: 700,
        color: 'var(--ink-900)',
        fontFamily: 'var(--font-body)',
        lineHeight: 1.4,
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}>
        <span>{label}</span>
        {required && <span aria-hidden style={{ color: 'var(--vermilion-500)', fontWeight: 800 }}>*</span>}
      </label>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {inputEl}
        {!maskAadhaar && (
          <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}>
            <VoiceInput value={value} onChange={onChange} inputRef={inputRef} />
          </div>
        )}
      </div>

      {invalid && (
        <span style={{ color: 'var(--danger-500)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>
          * தேவைப்படுகிறது / Required
        </span>
      )}
      {maskAadhaar && value && (
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-700)', fontWeight: 600 }}>
          🔒 {maskAadhaarFn(value)}
        </span>
      )}
    </div>
  );
}
