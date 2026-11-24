import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useT } from '../i18n';
import { useShell } from '../shell/Layout';
import { Detail } from './Detail';
import { applyFilters, DEFAULT_FILTERS, flat, groupItems, neighbour, type Filters } from './model';
import { QueuePane } from './QueuePane';
import { useQueue } from './useQueue';
import { isTyping } from '../lib/keys';
import { isPending, type QueueItem } from '../lib/types';
import { DecisionBar } from '../decision/DecisionBar';
import { ShortcutSheet } from '../decision/ShortcutSheet';
import { Toast } from '../decision/Toast';
import { useDecision, type Decision, type Held } from '../decision/useDecision';
import { Button } from '../ui/Button';
import { OutcomeBadge } from '../ui/Badge';

export { isTyping } from '../lib/keys';

/** D master-detail: queue (left, 420) + alert detail; URL `/alerts/:id` keeps the selection. */
export function QueuePage() {
  const t = useT();
  const live = useShell();
  const q = useQueue(live);
  const { id } = useParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const searchRef = useRef<HTMLInputElement>(null);

  const dec = useDecision(q.reload);
  const [sheet, setSheet] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Held / sent decisions show at once in the queue; the server row wins once it says decided.
  const items = useMemo(() => withDecisions(q.items, dec.held, dec.sent), [q.items, dec.held, dec.sent]);
  const groups = useMemo(() => groupItems(applyFilters(items, filters)), [items, filters]);
  const order = useMemo(() => flat(groups), [groups]);
  const select = useCallback((next: string | undefined) => {
    if (next && next !== id) navigate(`/alerts/${next}`, { replace: !id });
  }, [id, navigate]);

  // First visit: open the first row (the longest-waiting alert under review).
  useEffect(() => {
    if (!id && order.length) select(order[0].alert_id);
  }, [id, order, select]);

  // Keyboard: J / K next / previous, "/" search, "?" sheet, Esc closes it (L/F/C live in the decision bar).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sheet) { e.preventDefault(); setSheet(false); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(document.activeElement)) return;
      const k = e.key;
      if (k === '?') { e.preventDefault(); setSheet((v) => !v); }
      else if (k === 'j' || k === 'J') { e.preventDefault(); select(neighbour(order, id, 1)); }
      else if (k === 'k' || k === 'K') { e.preventDefault(); select(neighbour(order, id, -1)); }
      else if (k === '/') {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>('.q-title .icon-btn')?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, id, select, sheet]);

  // Shortcut legend: only after the detail is scrolled (or on "?", D §2).
  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el?.classList?.contains('d-scroll')) setScrolled(el.scrollTop > 0);
    };
    document.addEventListener('scroll', onScroll, true);
    return () => document.removeEventListener('scroll', onScroll, true);
  }, []);
  useEffect(() => { void Promise.resolve().then(() => setScrolled(false)); }, [id]);

  const decide = useCallback((d: Decision, comment: string) => {
    if (!id) return;
    const next = nextPending(order, id);
    dec.decide(id, d, comment);
    if (next) navigate(`/alerts/${next}`);
  }, [id, order, dec, navigate]);
  const undo = useCallback(() => {
    const back = dec.undo();
    if (back) navigate(`/alerts/${back}`);
  }, [dec, navigate]);

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
  const heldHere = dec.held && dec.held.id === id ? dec.held : null;
  const sentHere = id ? dec.sent[id] : undefined;
  const footer = heldHere || sentHere ? (
    <div className="ft ft-outcome ft-held">
      <OutcomeBadge decision={heldHere?.decision ?? sentHere!} />
      <span>{heldHere ? t('decide.held', { outcome: t(heldHere.decision === 'legit' ? 'outcome.legit' : 'outcome.fraud') })
        : t('decided.outcome', { outcome: t(sentHere === 'legit' ? 'outcome.legit' : 'outcome.fraud') })}</span>
      {heldHere ? <Button kind="secondary" size="small" onClick={undo}>{t('toast.undo')}</Button> : null}
    </div>
  ) : <DecisionBar key={id} disabled={!live.live} legend={scrolled && !sheet} onDecide={decide} />;
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
      {id ? <Detail key={id} id={id} item={item} live={live} nav={nav} footer={footer} /> : (
        <section className="d d-msg"><p>{q.loading || q.items.length ? t('detail.pick') : ''}</p></section>
      )}
      <Toast toast={dec.toast} onUndo={undo} onDismiss={dec.dismiss} />
      {sheet ? <ShortcutSheet onClose={() => setSheet(false)} /> : null}
    </div>
  );
}

/** Queue rows with the analyst's held / sent decisions applied (until the server row is decided). */
export function withDecisions(items: QueueItem[], held: Held | null, sent: Record<string, Decision>): QueueItem[] {
  if (!held && !Object.keys(sent).length) return items;
  return items.map((i) => {
    const d = held?.id === i.alert_id ? held.decision : sent[i.alert_id];
    if (!d || !isPending(i.status)) return i;
    return { ...i, status: `decided_${d}` as const, decided: { by: 'me', at: held?.at ?? new Date().toISOString(), simulated: false, decision: d } };
  });
}

/** After a decision: the next alert under review (older ones first, then wrap), none if the queue is clear. */
export function nextPending(order: QueueItem[], id: string): string | undefined {
  const cur = order.find((i) => i.alert_id === id);
  const pend = order.filter((i) => isPending(i.status) && i.alert_id !== id);
  if (!pend.length) return undefined;
  const after = cur ? pend.find((i) => i.created_at > cur.created_at) : undefined;
  return (after ?? pend[0]).alert_id;
}
