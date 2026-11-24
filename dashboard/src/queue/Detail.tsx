import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeftRight, Bell, BellOff, ChartNoAxesColumnIncreasing, KeyRound, LogIn, Mail, Moon, Repeat, Settings,
  ShieldAlert, Shuffle, Smartphone, ThumbsDown, ThumbsUp, TrendingUp, UserPlus, Users, Download, LogOut, Lock, CircleHelp,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { hasKey, useLang, useT } from '../i18n';
import { BUMP, categoryName, reasonLong } from '../i18n/alerts';
import { bankName, dateTimeSec, decimal, fullDate, money, percent, dayMonth, time } from '../lib/format';
import { isDecided, isPending, type AlertDetail, type QueueItem } from '../lib/types';
import type { Live } from '../shell/useLive';
import { OutcomeBadge, ScoreBadge, Tag } from '../ui/Badge';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Bars90 } from './Bars90';
import { history90 } from './history';
import { bandOf } from './model';

const REASON_ICONS: Record<string, LucideIcon> = {
  AMOUNT_VS_PAYEE: ChartNoAxesColumnIncreasing, AMOUNT_VS_CATEGORY: ChartNoAxesColumnIncreasing, NEW_PAYEE: UserPlus,
  UNUSUAL_HOUR: Moon, VELOCITY: Repeat, DAILY_OUTFLOW: Repeat, UNUSUAL_COMBINATION: Shuffle, R1: Smartphone,
  R2: KeyRound, R3: ArrowLeftRight, R4: Users, R5: TrendingUp, R6: Moon,
};
const EVENT_ICONS: Record<string, LucideIcon> = {
  login: LogIn, login_failed: ShieldAlert, new_device: Smartphone, device_security_changed: Lock, pin_failed: ShieldAlert,
  sign_out: LogOut, sign_out_all: LogOut, password_changed: KeyRound, email_changed: Mail, settings_changed: Settings,
  sim_swap: Smartphone, device_revoked: LogOut, export: Download, mfa_enabled: Lock,
};

/** "Compte beaucoup" from weight ≥ 50 (weights are 0-100, the top reason is 100). */
const HIGH_WEIGHT = 50;

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ok'; data: AlertDetail; now: number };

export function useAlert(id: string, live: Live) {
  const { client, refresh } = useAuth();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const fetchIt = useCallback(async () => {
    const { data, error } = await client.rpc('analyst_alert', { p_alert_id: id });
    if (error) {
      if (/analyst|forbidden|jwt/i.test(`${error.message} ${error.code}`)) await refresh();
      setLoad({ state: 'error' });
      return;
    }
    setLoad({ state: 'ok', data: data as AlertDetail, now: Date.now() });
  }, [client, id, refresh]);

  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(() => { if (alive) setLoad({ state: 'loading' }); return fetchIt(); });
    return () => { alive = false; };
  }, [fetchIt]);

  // Decided elsewhere (another analyst, simulated analyst): show it at once.
  useEffect(() => live.onAlert((c) => {
    if (c.id === id && c.status && c.status.startsWith('decided')) void fetchIt();
  }), [live, id, fetchIt]);

  return { load, retry: fetchIt };
}

type Props = { id: string; item: QueueItem | undefined; live: Live; nav: ReactNode; footer?: ReactNode };

export function Detail({ id, item, live, nav, footer }: Props) {
  const t = useT();
  const { load, retry } = useAlert(id, live);
  if (load.state === 'loading') {
    return <section className="d" aria-busy="true" aria-label={t('loading')}><div className="d-skel" aria-hidden><i /><i /><i /></div></section>;
  }
  if (load.state === 'error') {
    return (
      <section className="d d-msg">
        <p>{t('detail.error')}</p>
        <Button kind="secondary" size="small" onClick={() => void retry()}>{t('retry')}</Button>
      </section>
    );
  }
  return <DetailBody d={load.data} now={load.now} item={item} live={live.live} nav={nav} footer={footer} />;
}

function DetailBody({ d, now, item, live, nav, footer }: { d: AlertDetail; now: number; item: QueueItem | undefined; live: boolean; nav: ReactNode; footer?: ReactNode }) {
  const t = useT();
  const a = d.alert;
  const band = bandOf(a.score, a.band);
  const decided = isDecided(a.status);
  const opKey = `op.${a.tx?.op_type ?? 'other'}`;
  const op = hasKey(opKey) ? t(opKey) : t('op.other');
  const operator = d.tx?.momo?.operator ? ` ${d.tx.momo.operator}` : '';
  const payee = a.tx?.cp_name;
  const toLike = ['transfer', 'p2p', 'p2p_out', 'bank_out', 'cash_out'].includes(a.tx?.op_type ?? '');
  const title = payee ? t(toLike ? 'title.to' : 'title.at', { op: `${op}${operator}`, payee }) : `${op}${operator}`;
  const ageMin = Math.max(0, Math.floor((now - new Date(a.created_at).getTime()) / 60000));
  const status = decided && a.decision ? t('status.decided', { date: `${fullDate(a.decision.at)} ${time(a.decision.at)}` })
    : ageMin < 60 ? t('status.review', { n: ageMin }) : t('status.reviewH', { n: Math.floor(ageMin / 60) });
  const simulated = item?.decided?.simulated ?? false;
  const decidedBy = item?.decided ? (item.decided.simulated ? t('decided.simulated') : t('decided.byRef', { ref: item.decided.by })) : null;

  return (
    <section className="d" aria-labelledby="d-title">
      <div className="d-scroll">
        <header className="dh">
          <div>
            <div className="dh-tags">
              <ScoreBadge band={band}>{`${t(band === 'normal' ? 'band.normal' : band === 'ask' ? 'band.ask' : 'band.bank')} · ${a.score}`}</ScoreBadge>
              <span className="st">{status}</span>
              {simulated ? <Tag>{t('simulated')}</Tag> : null}
            </div>
            <h1 id="d-title">{title}</h1>
            <div className="sub">{t('head.sub', { user: a.user_ref, bank: bankName(a.bank_id) ?? '—', id: a.id.slice(0, 8) })}</div>
          </div>
          {nav}
        </header>
        <div className="d-banners">
          {decided && a.decision ? (
            <Banner kind="info">{t('decided.by', { name: decidedBy ?? t('decided.byRef', { ref: '?' }), time: time(a.decision.at) })}</Banner>
          ) : null}
          {!live && isPending(a.status) ? <Banner kind="warning">{t('detail.offline')}</Banner> : null}
        </div>
        <div className="cols">
          <div className="c1">
            <Operation d={d} />
            <Why d={d} />
            <HistorySection d={d} />
          </div>
          <div className="c2">
            <Score d={d} band={band} />
            <Answer d={d} />
            <Security d={d} />
            <Devices d={d} now={now} />
          </div>
        </div>
      </div>
      {decided && a.decision ? (
        <div className="ft ft-outcome"><OutcomeBadge decision={a.decision.value} /><span>{t('decided.outcome', { outcome: t(a.decision.value === 'legit' ? 'outcome.legit' : 'outcome.fraud') })}</span></div>
      ) : footer ?? null}
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sect">
      <h3>{title}</h3>
      <div className="card">{children}</div>
    </section>
  );
}

function KV({ k, children }: { k: string; children: ReactNode }) {
  return <div className="kv"><span>{k}</span><b>{children}</b></div>;
}

function Operation({ d }: { d: AlertDetail }) {
  const t = useT();
  const lang = useLang();
  const x = d.tx;
  const a = d.alert;
  const opKey = `op.${a.tx?.op_type ?? 'other'}`;
  const isNew = d.reasons.some((r) => r.code === 'NEW_PAYEE');
  const share = typeof d.features.f8 === 'number' ? d.features.f8 : null;
  const channel = x?.momo ? t('channel.momo') : t('channel.bank');
  const iso = [x?.btc_domain, x?.btc_family, x?.btc_subfamily].filter(Boolean).join('/');
  return (
    <Section title={t('sec.operation')}>
      {x ? (
        <>
          <KV k={t('kv.amount')}>{money({ m: x.amount_minor, c: x.currency }, lang, { style: 'code', sign: x.cdt_dbt_ind === 'DBIT' ? -1 : 1 })}</KV>
          <KV k={t('kv.booked')}>{dateTimeSec(x.booking_ts)}</KV>
          <KV k={t('kv.direction')}>{t(x.cdt_dbt_ind === 'CRDT' ? 'dir.CRDT' : 'dir.DBIT')}</KV>
          <KV k={t('kv.type')}>{`${hasKey(opKey) ? t(opKey) : t('op.other')} · ${channel}${iso ? ` (${iso})` : ''}`}</KV>
          <KV k={t('kv.cp')}>{`${x.cp_name ?? '—'}${isNew ? ` · ${t('cp.new')}` : ''}`}</KV>
          <KV k={t('kv.category')}>{categoryName(x.category_id, lang)}</KV>
          {share !== null ? <KV k={t('kv.share')}>{percent(share, lang)}</KV> : null}
          <KV k={t('kv.ref')}>{x.end_to_end_id ?? x.acct_svcr_ref ?? x.tx_id ?? '—'}</KV>
        </>
      ) : <KV k={t('kv.amount')}>—</KV>}
    </Section>
  );
}

function Why({ d }: { d: AlertDetail }) {
  const t = useT();
  const lang = useLang();
  const reasons = [...d.reasons].sort((p, q) => (q.weight ?? 0) - (p.weight ?? 0)).slice(0, 3);
  return (
    <Section title={t('sec.why')}>
      {reasons.map((r) => {
        const Icon = REASON_ICONS[r.code] ?? CircleHelp;
        return (
          <div className="rr" key={r.code}>
            <Icon size={18} className="ri" aria-hidden />
            <div className="rt">
              <div>{reasonLong(r, lang)}</div>
              <div className="rc"><Tag>{r.code}</Tag><span>{t((r.weight ?? 0) >= HIGH_WEIGHT ? 'weight.high' : 'weight.low')}</span></div>
            </div>
          </div>
        );
      })}
    </Section>
  );
}

function Score({ d, band }: { d: AlertDetail; band: 'normal' | 'ask' | 'bank' }) {
  const t = useT();
  const lang = useLang();
  const s = d.score_breakdown;
  const rules = s.rules.map((r) => r.code).join(', ');
  const bumps = s.bumps.map((b) => BUMP[b.code]?.[lang].toLowerCase() ?? b.code).join(', ');
  return (
    <Section title={t('sec.score')}>
      <div className="sr"><span>{t('score.athr')}<sub>thr</sub></span><span className="sv">{decimal(s.a_thr, lang)}</span></div>
      <div className="sr"><span>{t('score.aif')}<sub>if</sub></span><span className="sv">{decimal(s.a_if, lang)}</span></div>
      <div className="sr"><span>{t('score.f')}</span><span className="sv">{decimal(s.f, lang)}{rules ? ` · ${rules}` : ''}</span></div>
      <div className="sr"><span>{t('score.m')}</span><span className="sv">{`×${decimal(s.m, lang)}`}{bumps ? ` · ${bumps}` : ''}</span></div>
      <div className={`sr tot tot-${band}`}><span>{t('score.total')}</span><span className="sv">{`${d.alert.score} / 100`}</span></div>
      <div className="fx">S = 100 · (1 − (1 − A)(1 − F)) · M, A = 1 − (1 − A<sub>thr</sub>)(1 − 0{lang === 'fr' ? ',' : '.'}7·A<sub>if</sub>)</div>
      {s.learning ? <div className="fx">{t('score.learning')}</div> : null}
      {s.model_version ? <div className="fx">{t('score.model', { model: s.model_version, rules: s.rules_version ?? '—', params: s.params_version ?? '—' })}</div> : null}
    </Section>
  );
}

function Answer({ d }: { d: AlertDetail }) {
  const t = useT();
  const lines: { icon: LucideIcon; text: string }[] = [];
  const firstNotif = d.user_events.find((e) => e.type.startsWith('notification_') && !/legit|fraud/.test(e.type));
  if (firstNotif) {
    const ok = !firstNotif.status || firstNotif.status === 'sent' || firstNotif.status === 'ok';
    lines.push({ icon: ok ? Bell : BellOff, text: t(ok ? 'answer.notified' : 'answer.notDelivered', { time: time(firstNotif.at) }) });
  }
  const ans = d.user_events.find((e) => e.type === 'answer_yes' || e.type === 'answer_no');
  if (ans) lines.push({ icon: ans.type === 'answer_yes' ? ThumbsUp : ThumbsDown, text: t(ans.type === 'answer_yes' ? 'answer.yes' : 'answer.no', { time: time(ans.at) }) });
  else if (d.user_answer) lines.push({ icon: d.user_answer === 'yes' ? ThumbsUp : ThumbsDown, text: t(d.user_answer === 'yes' ? 'answer.yes' : 'answer.no', { time: d.alert.answered_at ? time(d.alert.answered_at) : '—' }) });
  else lines.push({ icon: CircleHelp, text: t('answer.none') });
  const sent = d.user_events.find((e) => /notification_(legit|fraud)/.test(e.type));
  if (sent) lines.push({ icon: Bell, text: t('answer.decisionSent', { time: time(sent.at) }) });
  return (
    <Section title={t('sec.answer')}>
      {lines.map((l, i) => <div className="ev" key={i}><l.icon size={18} className="ei" aria-hidden /><span className="et">{l.text}</span></div>)}
      {d.previous_decisions.length ? <div className="fx">{t('answer.previous', { n: d.previous_decisions.length })}</div> : null}
    </Section>
  );
}

function HistorySection({ d }: { d: AlertDetail }) {
  const t = useT();
  const lang = useLang();
  const h = history90(d.history_90d, d.tx?.booking_ts ?? d.alert.tx?.booking_ts ?? null, d.tx?.amount_minor ?? null, d.tx?.currency);
  const fmt = (m: number) => money({ m, c: h.currency }, lang, { style: 'row' });
  const isNew = d.reasons.some((r) => r.code === 'NEW_PAYEE') ? 1 : 0;
  return (
    <Section title={t('sec.history')}>
      <div className="cap">{t('hist.caption', { median: fmt(h.median) })}</div>
      <Bars90 h={h} />
      <div className="hs">
        <span>{isNew ? t('hist.payees', { n: h.payees, k: isNew }) : t('hist.payeesNone', { n: h.payees })}</span>
        <span>{h.maxBefore !== null ? t('hist.max', { amount: fmt(h.maxBefore) }) : t('hist.maxNone')}</span>
      </div>
    </Section>
  );
}

function Security({ d }: { d: AlertDetail }) {
  const t = useT();
  return (
    <Section title={t('sec.security')}>
      {d.security_events_30d.length === 0 ? <div className="ev"><span className="et muted">{t('sec.none')}</span></div> : null}
      {d.security_events_30d.slice(0, 8).map((e, i) => {
        const Icon = EVENT_ICONS[e.type] ?? ShieldAlert;
        const k = `se.${e.type}`;
        return (
          <div className="ev" key={i}>
            <Icon size={18} className="ei" aria-hidden />
            <span className="et">{hasKey(k) ? t(k) : e.type}</span>
            <span className="ed">{`${dayMonth(e.at)} ${time(e.at)}`}</span>
          </div>
        );
      })}
    </Section>
  );
}

function Devices({ d, now }: { d: AlertDetail; now: number }) {
  const t = useT();
  return (
    <Section title={t('sec.devices')}>
      {d.devices.length === 0 ? <div className="ev"><span className="et muted">{t('dev.none')}</span></div> : null}
      {d.devices.map((v, i) => {
        const lockKey = v.security_level === 'none' ? 'lock.none' : `lock.${v.unlock_method}`;
        const hours = Math.floor((now - new Date(v.created_at).getTime()) / 3600_000);
        const when = v.revoked_at ? t('dev.revoked') : hours < 48 ? t('dev.added', { n: hours }) : t('dev.since', { date: fullDate(v.created_at) });
        return (
          <div className="ev" key={i}>
            <Smartphone size={18} className="ei" aria-hidden />
            <span className="et">{`${v.label ?? t('dev.unnamed')} · ${hasKey(lockKey) ? t(lockKey) : v.unlock_method}`}</span>
            <span className="ed">{when}</span>
          </div>
        );
      })}
    </Section>
  );
}
