import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useT, type StringKey } from '../i18n';

const ROWS: [string, StringKey][] = [['J / K', 'keys.jk'], ['L', 'keys.l'], ['F', 'keys.f'], ['C', 'keys.c'], ['/', 'keys.search'], ['?', 'keys.help'], ['Esc', 'keys.esc']];

/** "?" shortcut sheet (D §3). Esc or "?" closes it. */
export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="sheet" role="dialog" aria-labelledby="keys-title" tabIndex={-1} ref={ref}>
      <div className="sheet-head">
        <h2 id="keys-title">{t('keys.title')}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t('keys.close')}><X size={20} /></button>
      </div>
      <dl>
        {ROWS.map(([k, key]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{t(key)}</dd></div>)}
      </dl>
    </div>
  );
}
