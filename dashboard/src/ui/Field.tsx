import { useId, useState, type InputHTMLAttributes } from 'react';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { useT } from '../i18n';

/** C2 input field (components/input-pin-keypad.md §1): label above, 52 high, radius 12. */
export function Field({ label, error, type = 'text', ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null }) {
  const id = useId();
  const t = useT();
  const [shown, setShown] = useState(false);
  const isPwd = type === 'password';
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`field-box${error ? ' field-error' : ''}`}>
        <input id={id} type={isPwd && shown ? 'text' : type} aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined} {...rest} />
        {isPwd ? (
          <button type="button" className="icon-btn" onClick={() => setShown((v) => !v)}
            aria-label={shown ? t('password.hide') : t('password.show')}>
            {shown ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        ) : null}
      </div>
      {error ? <p id={`${id}-err`} className="field-msg" role="alert"><CircleAlert size={16} aria-hidden />{error}</p> : null}
    </div>
  );
}
