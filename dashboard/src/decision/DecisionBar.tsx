import { useEffect, useId, useRef, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { useT } from '../i18n';
import { isTyping } from '../lib/keys';
import { Button } from '../ui/Button';
import type { Decision } from './useDecision';

const LINE = 22;
const MAX_LINES = 3;

/**
 * D §2 decision bar, pinned under the detail: comment (C2, 48, grows to 3
 * lines) + C1 secondary "Légitime L" + C1 destructive confirm "Fraude F".
 * Keys (D §3): L legit, F fraud (comment first if empty; Enter confirms),
 * C comment, Esc leaves the field. Off while typing and while offline.
 */
export function DecisionBar({ disabled, legend, onDecide }: { disabled: boolean; legend: boolean; onDecide: (d: Decision, comment: string) => void }) {
  const t = useT();
  const id = useId();
  const box = useRef<HTMLTextAreaElement>(null);
  const [comment, setComment] = useState('');
  const [armed, setArmed] = useState(false);
  const has = comment.trim().length > 0;

  const grow = () => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, LINE * MAX_LINES + 26)}px`;
  };

  const fraud = () => {
    if (disabled) return;
    if (!box.current?.value.trim()) { setArmed(true); box.current?.focus(); return; }
    onDecide('fraud', box.current.value);
  };
  const legit = () => { if (!disabled) onDecide('legit', box.current?.value ?? ''); };

  // Refs so the window listener is installed once.
  const act = useRef({ fraud, legit });
  useEffect(() => { act.current = { fraud, legit }; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (isTyping(document.activeElement)) return;
      const k = e.key.toLowerCase();
      if (k === 'l') { e.preventDefault(); act.current.legit(); }
      else if (k === 'f') { e.preventDefault(); act.current.fraud(); }
      else if (k === 'c') { e.preventDefault(); box.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="ft ft-decide" role="group" aria-label={t('decide.bar')}>
      {legend ? <p className="keys-legend" aria-hidden>{t('keys.legend')}</p> : null}
      <div className="cm">
        <label htmlFor={id} className="sr-only">{t('decide.commentLabel')}</label>
        <div className={`cm-box${armed && !has ? ' field-error' : ''}`}>
          <textarea id={id} ref={box} rows={1} value={comment} maxLength={500} disabled={disabled}
            placeholder={t('decide.comment')} aria-describedby={armed && !has ? `${id}-hint` : undefined}
            aria-invalid={armed && !has ? true : undefined}
            onChange={(e) => { setComment(e.target.value); grow(); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); setArmed(false); e.currentTarget.blur(); }
              else if (e.key === 'Enter' && !e.shiftKey && armed) { e.preventDefault(); fraud(); }
            }} />
        </div>
        {armed && !has ? <p id={`${id}-hint`} className="cm-hint" role="status"><CircleAlert size={14} aria-hidden />{t('decide.needComment')}</p> : null}
      </div>
      <Button kind="secondary" className="btn-decide" disabled={disabled} onClick={legit}
        aria-keyshortcuts="L">{t('decide.legit')} <kbd>L</kbd></Button>
      <Button kind="danger" className="btn-decide" disabled={disabled} onClick={fraud}
        aria-keyshortcuts="F">{t('decide.fraud')} <kbd>F</kbd></Button>
    </div>
  );
}
