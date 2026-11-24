import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useLang, useT, type StringKey } from '../i18n';
import { reasonShort } from '../i18n/alerts';
import { age, money } from '../lib/format';
import type { QueueItem } from '../lib/types';
import { OutcomeBadge, ScoreBadge, Tag } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { bandOf, type Filters, type Group } from './model';

type Props = {
  groups: Group[];
  total: number;
  selected: string | undefined;
  onSelect: (id: string) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  fresh: Set<string>;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  hasMore: boolean;
  onMore: () => void;
};

/** D queue: 420 wide, title + search, chips Statut · Score · Type · 24 h, groups, 2-line rows. */
export const QueuePane = forwardRef<HTMLInputElement, Props>(function QueuePane(p, searchRef) {
  const t = useT();
  const [searchOpen, setSearchOpen] = useState(false);
  const showSearch = searchOpen || p.filters.q !== '';
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the selected row visible (J / K).
  useEffect(() => {
    if (!p.selected) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-id="${p.selected}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [p.selected]);

  const set = (patch: Partial<Filters>) => p.setFilters({ ...p.filters, ...patch });

  return (
    <aside className="q" aria-label={t('tabs.queue')}>
      <div className="q-title">
        <h2>{t('tabs.queue')}</h2>
        <button className="icon-btn icon-btn-36" aria-label={t('search')} aria-expanded={showSearch}
          onClick={() => { setSearchOpen(true); setTimeout(() => (searchRef as React.RefObject<HTMLInputElement>)?.current?.focus(), 0); }}>
          <Search size={20} aria-hidden />
        </button>
      </div>
      {showSearch ? (
        <div className="q-search">
          <Search size={16} aria-hidden />
          <input ref={searchRef} type="search" aria-label={t('search')} placeholder={t('search.ph')} value={p.filters.q}
            onChange={(e) => set({ q: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Escape') { set({ q: '' }); setSearchOpen(false); (e.target as HTMLInputElement).blur(); } }} />
          <button className="icon-btn icon-btn-28" aria-label={t('search')} onClick={() => { set({ q: '' }); setSearchOpen(false); }}>
            <X size={16} aria-hidden />
          </button>
        </div>
      ) : null}
      <div className="chips" role="toolbar" aria-label={t('filters.status')}>
        <ChipMenu label={t('filters.status')} value={p.filters.status} onChange={(v) => set({ status: v })}
          options={[['all', 'filters.all'], ['pending', 'filters.status.pending'], ['decided', 'filters.status.decided']]} />
        <ChipMenu label={t('filters.score')} value={p.filters.score} onChange={(v) => set({ score: v })}
          options={[['all', 'filters.all'], ['bank', 'filters.score.bank'], ['ask', 'filters.score.ask'], ['low', 'filters.score.low']]} />
        <ChipMenu label={t('filters.type')} value={p.filters.type} onChange={(v) => set({ type: v })}
          options={[['all', 'filters.all'], ['anomaly', 'filters.type.anomaly'], ['fraud', 'filters.type.fraud']]} />
        <ChipMenu label={t('filters.24h')} value={p.filters.last24h ? 'on' : 'all'} onChange={(v) => set({ last24h: v === 'on' })}
          options={[['all', 'filters.all'], ['on', 'filters.24h.on']]} />
      </div>
      <div className="q-rows" ref={listRef}>
        {p.loading ? <QueueSkeleton /> : p.error ? (
          <div className="q-msg"><p>{t('queue.error')}</p><Button kind="secondary" size="small" onClick={p.onRetry}>{t('retry')}</Button></div>
        ) : p.total === 0 ? (
          <EmptyState title={t('empty.title')} body={t('empty.body')} />
        ) : p.groups.length === 0 ? (
          <div className="q-msg"><p>{t('queue.noMatch')}</p></div>
        ) : (
          <div role="listbox" aria-label={t('queue.label')} aria-activedescendant={p.selected ? `row-${p.selected}` : undefined}>
            {p.groups.map((g) => (
              <div role="group" key={g.key} aria-labelledby={`grp-${g.key}`}>
                <div className="q-head" id={`grp-${g.key}`} role="presentation">
                  {g.key === 'review' ? t('groups.review', { n: g.items.length }) : t(g.key === 'decided' ? 'groups.decided' : 'groups.earlier')}
                </div>
                {g.items.map((it) => (
                  <Row key={it.alert_id} it={it} selected={it.alert_id === p.selected} fresh={p.fresh.has(it.alert_id)} onSelect={p.onSelect} />
                ))}
              </div>
            ))}
            {p.hasMore ? <div className="q-more"><Button kind="text" size="small" onClick={p.onMore}>{t('more')}</Button></div> : null}
          </div>
        )}
      </div>
    </aside>
  );
});

function Row({ it, selected, fresh, onSelect }: { it: QueueItem; selected: boolean; fresh: boolean; onSelect: (id: string) => void }) {
  const t = useT();
  const lang = useLang();
  const amount = it.tx ? money(it.tx.amount, lang, { style: 'row', sign: -1 }) : '';
  return (
    <div id={`row-${it.alert_id}`} data-id={it.alert_id} role="option" aria-selected={selected} tabIndex={-1}
      className={`q-row${selected ? ' sel' : ''}${fresh ? ' fresh' : ''}`} onClick={() => onSelect(it.alert_id)}>
      <div className="l1">
        {it.decided ? <OutcomeBadge decision={it.decided.decision} /> : <ScoreBadge band={bandOf(it.score, it.band)}>{it.score}</ScoreBadge>}
        <span className="kd">{t(it.kind === 'fraud' ? 'kind.fraud' : 'kind.anomaly')}</span>
        <span className="qa">{amount}</span>
      </div>
      <div className="l2">
        <span className="rs">{reasonShort(it.reasons[0], lang)}</span>
        <span className="ag">
          {it.decided?.simulated ? <Tag>{t('simulated')}</Tag> : null}
          {age(it.age_min, it.created_at, lang)}
        </span>
      </div>
    </div>
  );
}

function QueueSkeleton() {
  const t = useT();
  return (
    <div className="q-skel" role="status" aria-label={t('loading')}>
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="skel-row" aria-hidden><i /><i /></div>)}
    </div>
  );
}

function ChipMenu<V extends string>({ label, value, options, onChange }:
  { label: string; value: V; options: [V, StringKey][]; onChange: (v: V) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = value !== options[0][0];
  const current = options.find((o) => o[0] === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const text: ReactNode = active && current ? t(current[1]) : label;
  return (
    <div className="menu-wrap" ref={ref}>
      <button className={`chip${active ? ' on' : ''}`} aria-haspopup="menu" aria-expanded={open}
        aria-label={active && current ? `${label} : ${t(current[1])}` : label} onClick={() => setOpen((v) => !v)}>
        {text}<ChevronDown size={16} aria-hidden />
      </button>
      {open ? (
        <div className="menu menu-left" role="menu">
          {options.map(([v, k]) => (
            <button key={v} role="menuitemradio" aria-checked={v === value} className={v === value ? 'checked' : undefined}
              onClick={() => { onChange(v); setOpen(false); }}>{t(k)}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
