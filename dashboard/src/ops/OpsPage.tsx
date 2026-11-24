import { useContext, useState, type ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { useLang, useT, type StringKey } from '../i18n';
import { fullDate, number, percent, shortDate, time } from '../lib/format';
import type { Latency, OpsDay, OpsMetrics } from '../lib/types';
import { useRpc } from '../lib/useRpc';
import { pick, T } from '../theme';
import { ThemeContext } from '../theme/ThemeContext';
import { Tag } from '../ui/Badge';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { HBars } from './HBars';
import { LineChart } from './LineChart';
import { ms } from './model';

const VENDORS: Record<string, string> = { twelvedata: 'Twelve Data', coingecko: 'CoinGecko', finnhub: 'Finnhub', fred: 'FRED' };

/**
 * Ops tab (delegated, D §8): `api.ops_metrics()` as B7 stat tiles (plain C7 cards, label 13/18 Medium, value
 * 22/28 SemiBold tabular, one sentence) and `api.ops_series(14)` + counts as G1 / G3 charts, one chart per card.
 */
export function OpsPage() {
  const t = useT();
  const lang = useLang();
  const { scheme } = useContext(ThemeContext);
  const m = useRpc<OpsMetrics>('ops_metrics');
  const s = useRpc<OpsDay[]>('ops_series', { p_days: 14 });
  const [scrub, setScrub] = useState<number | null>(null);
  const d = m.data;
  const days = s.data ?? [];
  const reload = () => { void m.reload(); void s.reload(); };

  const lat = (l: Latency, label: string, ctx: string) => (l && l.n > 0 && l.p95 != null
    ? <Tile label={label} value={ms(l.p95, lang)} unit={t('ops.p95')} ctx={t(ctx as StringKey, { p50: ms(l.p50, lang), n: number(l.n, lang) })} />
    : <Tile label={label} insufficient={t('ops.none')} ctx={t('ops.none.ctx')} />);

  const batch = d?.last_batch;
  const quotas = Object.entries(d?.quotas_today ?? {}).sort((a, b) => b[1] - a[1]);
  const series = [T.colour.chart[scheme].series[0], T.colour.chart[scheme].series[1], T.colour.chart[scheme].series[2]];
  // The line starts at the first day with a measurement (dev has a short history); later gaps are skipped.
  const first = days.findIndex((x) => x.push_p95_ms != null);
  const lineDays = first < 0 ? [] : days.slice(first);
  const push = lineDays.map((x) => x.push_p95_ms);
  const withPush = push.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
  const shown = scrub ?? withPush[withPush.length - 1];
  const bars = (title: string, rows: { label: string; value: number; colour: string }[]) => (
    <HBars rows={rows} summary={t('ops.bars.sum', { title, items: rows.map((r) => `${r.label} ${number(r.value, lang)}`).join(', ') })} />
  );
  const alerts = d?.alerts_24h ?? {};
  const funnel = d?.funnel_7d;

  return (
    <section className="page" aria-labelledby="ops-title">
      <div className="page-head">
        <div>
          <h1 id="ops-title" className="page-title">{t('ops.title')}</h1>
          <p className="page-intro">{d ? t('ops.sub', { time: time(d.as_of) }) : ' '}</p>
        </div>
        <Button kind="secondary" size="small" className="btn-icon" onClick={reload} busy={m.loading && !!d}><RotateCw size={18} aria-hidden />{t('ops.refresh')}</Button>
      </div>
      {m.error && !d ? <div className="page-banner"><Banner kind="error">{t('load.failed')} <button type="button" className="link" onClick={reload}>{t('retry')}</button></Banner></div> : null}

      {d ? (
        <>
          <h2 className="sec-title">{t('ops.sec.speed')}</h2>
          <div className="tiles">
            {lat(d.push_latency_ms_24h, t('ops.push'), 'ops.push.ctx')}
            {lat(d.ingest_to_alert_ms_24h, t('ops.ingest'), 'ops.ingest.ctx')}
            {lat(d.score_latency_ms_24h, t('ops.score'), 'ops.score.ctx')}
            {batch ? (
              <Tile label={t('ops.batch')}
                value={batch.status === 'ok' ? t('ops.batch.ok') : batch.status === 'failed' ? <Tag kind="loss">{t('ops.batch.failed')}</Tag> : t('ops.batch.running')}
                ctx={batch.finished_at ? (batch.items != null
                  ? t('ops.batch.ctx', { date: `${shortDate(batch.finished_at, lang)} ${time(batch.finished_at)}`, items: number(batch.items, lang) })
                  : t('ops.batch.ctx.noitems', { date: `${shortDate(batch.finished_at, lang)} ${time(batch.finished_at)}` })) : batch.job} />
            ) : <Tile label={t('ops.batch')} insufficient={t('ops.batch.none')} ctx="batch-nightly" />}
          </div>

          <h2 className="sec-title">{t('ops.sec.data')}</h2>
          <div className="tiles">
            <Tile label={t('ops.groq')} value={number(d.groq_backlog ?? 0, lang)}
              ctx={t('ops.groq.ctx', { all: number(d.groq_uncategorised_all ?? 0, lang) })} />
            <Tile label={t('ops.quotas')} value={number(quotas.reduce((a, [, v]) => a + v, 0), lang)}
              ctx={quotas.length ? quotas.map(([k, v]) => `${VENDORS[k] ?? k} ${number(v, lang)}`).join(' · ') : t('ops.quotas.none')} />
            {d.model ? (
              <Tile label={t('ops.model')} value={d.model.version}
                ctx={t('ops.model.ctx', { date: fullDate(d.model.trained_at), rows: number(d.model.train_rows, lang),
                  parity: t(d.model.parity_ok ? 'ops.model.parity.ok' : 'ops.model.parity.ko') })} />
            ) : <Tile label={t('ops.model')} insufficient={t('ops.none')} ctx="—" />}
            {d.model_eval ? (
              <Tile label={t('ops.eval')} value={percent(d.model_eval.precision_bank, lang)}
                ctx={t('ops.eval.ctx', { recall: percent(d.model_eval.recall_bank, lang), fp: number(d.model_eval.false_prompts_per_user_month, lang, 1) })} />
            ) : <Tile label={t('ops.eval')} insufficient={t('ops.none')} ctx="—" />}
          </div>

          <h2 className="sec-title">{t('ops.sec.charts')}</h2>
          <div className="charts">
            <div className="card chart-card chart-wide">
              <h3 className="chart-title">{t('ops.chart.push', { n: lineDays.length })}</h3>
              {withPush.length >= 2 ? (
                <>
                  <p className="chart-hero"><b>{ms(push[shown], lang)}</b> <span>{shortDate(lineDays[shown].day, lang)}</span></p>
                  <LineChart days={lineDays.map((x) => x.day)} values={push} onScrub={setScrub}
                    alpha={Number(pick(T.chart.line.area.alphaTop, scheme))}
                    summary={t('ops.chart.push.sum', {
                      n: lineDays.length, first: ms(push[withPush[0]], lang), last: ms(push[withPush[withPush.length - 1]], lang),
                      max: ms(Math.max(...withPush.map((i) => push[i] as number)), lang) })} />
                </>
              ) : (
                <div className="g-empty"><b>{t('ops.none')}</b><span>{t('ops.chart.push.empty')}</span></div>
              )}
            </div>
            <div className="card chart-card">
              <h3 className="chart-title">{t('ops.chart.alerts')}</h3>
              {bars(t('ops.chart.alerts'), [
                { label: t('ops.band.info'), value: alerts.info ?? 0, colour: series[2] },
                { label: t('ops.band.ask'), value: alerts.ask ?? 0, colour: series[1] },
                { label: t('ops.band.bank'), value: alerts.bank ?? 0, colour: series[0] },
              ])}
            </div>
            <div className="card chart-card">
              <h3 className="chart-title">{t('ops.chart.funnel')}</h3>
              {bars(t('ops.chart.funnel'), [
                { label: t('ops.funnel.demo'), value: funnel?.demo_starts ?? 0, colour: series[0] },
                { label: t('ops.funnel.signup'), value: funnel?.sign_ups ?? 0, colour: series[0] },
                { label: t('ops.funnel.answers'), value: funnel?.answers ?? 0, colour: series[0] },
              ])}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

/** B7 stat tile (blocks/b7-stat-tiles.md): label, value (+ unit), one sentence; insufficient state. */
function Tile({ label, value, unit, ctx, insufficient }: { label: string; value?: ReactNode; unit?: string; ctx: string; insufficient?: string }) {
  return (
    <div className="card tile">
      <span className="tile-label">{label}</span>
      {insufficient ? <span className="tile-insuf">{insufficient}</span> : (
        <span className="tile-value">{unit ? <span className="tile-unit">{unit} </span> : null}{value}</span>
      )}
      <span className="tile-ctx">{ctx}</span>
    </div>
  );
}
