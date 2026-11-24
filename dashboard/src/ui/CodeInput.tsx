import { useRef, useState } from 'react';

const N = 6;

/**
 * C3 code entry, boxes variant (components/input-pin-keypad.md §2): 6 boxes
 * 44 × 56, gap 8, current box has the focus border; paste of 6 digits fills
 * all boxes; auto-submit on the 6th digit. One real input keeps it simple
 * for screen readers and password managers (autocomplete one-time-code).
 * The parent clears it after a wrong code by changing its `key`.
 */
export function CodeInput({ label, onComplete, disabled, error }:
  { label: string; onComplete: (code: string) => void; disabled?: boolean; error?: boolean }) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  function change(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, N);
    setValue(digits);
    if (digits.length === N) onComplete(digits);
  }

  return (
    <div className={`code${error ? ' code-error' : ''}`} onClick={() => ref.current?.focus()}>
      <input ref={ref} className="code-input" aria-label={label} inputMode="numeric" autoComplete="one-time-code"
        pattern="[0-9]*" maxLength={N} value={value} disabled={disabled} autoFocus
        onChange={(e) => change(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      <div className="code-boxes" aria-hidden>
        {Array.from({ length: N }, (_, i) => (
          <span key={i} className={`code-box${focused && i === Math.min(value.length, N - 1) ? ' code-current' : ''}`}>
            {value[i] ?? ''}
          </span>
        ))}
      </div>
    </div>
  );
}
