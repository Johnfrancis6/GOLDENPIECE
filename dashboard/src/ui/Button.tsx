import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

type Kind = 'primary' | 'secondary' | 'outlined' | 'danger' | 'text';

/** C1 button (components/button.md): pill, large 52 / small 40, spinner while busy. */
export function Button({ kind = 'primary', size = 'large', busy, children, className, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { kind?: Kind; size?: 'large' | 'small'; busy?: boolean; children: ReactNode }) {
  return (
    <button {...rest} className={`btn btn-${kind} btn-${size} ${className ?? ''}`} disabled={rest.disabled || busy} aria-busy={busy || undefined}>
      {busy ? <LoaderCircle className="spin" size={20} aria-hidden /> : null}
      <span>{children}</span>
    </button>
  );
}
