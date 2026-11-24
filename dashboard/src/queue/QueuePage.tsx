import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useT } from '../i18n';
import { useShell } from '../shell/Layout';
import { Detail } from './Detail';
import { applyFilters, DEFAULT_FILTERS, flat, groupItems, neighbour, type Filters } from './model';
import { QueuePane } from './QueuePane';
import { useQueue } from './useQueue';

/** Typing in a field: shortcuts are off except Esc (D §3). */
export function isTyping(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}

/** D master-detail: queue (left, 420) + alert detail; URL `/alerts/:id` keeps the selection. */
export function QueuePage() {
  const t = useT();
  const live = useShell();
  const q = useQueue(live);
  const { id } = useParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const searchRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => groupItems(applyFilters(q.items, filters)), [q.items, filters]);
  const order = useMemo(() => flat(groups), [groups]);
  const select = useCallback((next: string | undefined) => {
    if (next && next !== id) navigate(`/alerts/${next}`, { replace: !id });
  }, [id, navigate]);

  // First visit: open the first row (the longest-waiting alert under review).
  useEffect(() => {
    if (!id && order.length) select(order[0].alert_id);
  }, [id, order, select]);

  // Keyboard: J / K next / previous, "/" search (L/F/C/?/Esc decisions come with the decision bar, B9.3).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(document.activeElement)) return;
      const k = e.key;
      if (k === 'j' || k === 'J') { e.preventDefault(); select(neighbour(order, id, 1)); }
      else if (k === 'k' || k === 'K') { e.preventDefault(); select(neighbour(order, id, -1)); }
      else if (k === '/') {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>('.q-title .icon-btn')?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, id, select]);

  // Page title count "(1) GOLDENPIECE" for new alerts under review; cleared when the window gets focus.
  useEffect(() => {
    document.title = q.unseen > 0 && !document.hasFocus() ? `(${q.unseen}) ${t('brand')}` : t('brand');
    if (q.unseen > 0 && document.hasFocus()) q.markSeen();
  }, [q.unseen, q, t]);
  useEffect(() => {
    const focus = () => { q.markSeen(); document.title = t('brand'); };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [q, t]);

  const item = q.items.find((i) => i.alert_id === id);
  const nav = (
    <div className="nav" aria-label={`${t('nav.prev')} · ${t('nav.next')}`}>
      <button className="nav-btn" onClick={() => select(neighbour(order, id, -1))}><kbd>K</kbd> {t('nav.prev')}</button>
      <span className="dot" aria-hidden>·</span>
      <button className="nav-btn" onClick={() => select(neighbour(order, id, 1))}>{t('nav.next')} <kbd>J</kbd></button>
    </div>
  );

  return (
    <div className="qd">
      <QueuePane ref={searchRef} groups={groups} total={q.items.length} selected={id} onSelect={select}
        filters={filters} setFilters={setFilters} fresh={q.fresh} loading={q.loading} error={q.error}
        onRetry={() => void q.reload()} hasMore={!!q.cursor} onMore={() => void q.loadMore()} />
      {id ? <Detail key={id} id={id} item={item} live={live} nav={nav} /> : (
        <section className="d d-msg"><p>{q.loading || q.items.length ? t('detail.pick') : ''}</p></section>
      )}
    </div>
  );
}
