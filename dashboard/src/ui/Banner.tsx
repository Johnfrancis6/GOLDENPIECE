import type { ReactNode } from 'react';
import { CircleAlert, WifiOff } from 'lucide-react';

/** C8 banner (components/feedback.md): radius 12, icon 20, text 13/18 Medium. */
export function Banner({ kind, children }: { kind: 'warning' | 'error'; children: ReactNode }) {
  const Icon = kind === 'warning' ? WifiOff : CircleAlert;
  return (
    <div className={`banner banner-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={20} aria-hidden className="banner-icon" />
      <span>{children}</span>
    </div>
  );
}
