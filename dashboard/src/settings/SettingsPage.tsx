import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useLang, useT, type StringKey } from '../i18n';
import type { ParamChange, ScoringParams } from '../lib/types';
import { useRpc } from '../lib/useRpc';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { bounds, changeTitle, isChanged, paramGroup, paramLabel, paramValue, sortParams, when } from './params';

export const LOG_PAGE = 20;

/** "Réglages du modèle" (D §4): bounded parameters + change log; "Rétablir les valeurs par défaut" → C10 → reset_params('all'). */
export function SettingsPage() {
  const t = useT();
  const lang = useLang();
  const { client } = useAuth();
  const rpc = useRpc<ScoringParams>('scoring_params');
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; g?: number; u?: number } | null>(null);

  const reset = async () => {
    setBusy(true);
    const { data, error } = await client.rpc('reset_params', { p_scope: 'all' });
    setBusy(false);
    setDialog(false);
    if (error) { setResult({ ok: false }); return; }
    const r = data as { global_params: number; user_params: number };
    setResult({ ok: true, g: r.global_params, u: r.user_params });
    setPage(0);
    await rpc.reload();
  };

  const d = rpc.data;
  const changes = Array.isArray(d?.changes) ? d.changes : [];
  const pages = Math.max(1, Math.ceil(changes.length / LOG_PAGE));
  const shown = changes.slice(page * LOG_PAGE, page * LOG_PAGE + LOG_PAGE);

  return (
    <section className="page" aria-labelledby="set-title">
      <div className="page-head">
        <div>
          <h1 id="set-title" className="page-title">{t('settings.title')}</h1>
          <p className="page-intro">{t('settings.intro')}</p>
        </div>
        <Button kind="outlined" size="small" className="btn-icon" onClick={() => { setResult(null); setDialog(true); }} disabled={!d}>
          <RotateCcw size={18} aria-hidden />{t('settings.reset')}
        </Button>
      </div>

      {result ? <div className="page-banner"><Banner kind={result.ok ? 'info' : 'error'}>
        {result.ok ? t('settings.reset.done', { g: result.g ?? 0, u: result.u ?? 0 }) : t('settings.reset.failed')}
      </Banner></div> : null}
      {rpc.error && !d ? <div className="page-banner"><Banner kind="error">{t('load.failed')} <button type="button" className="link" onClick={() => void rpc.reload()}>{t('retry')}</button></Banner></div> : null}

      {d ? (
        <div className="cols2">
          <div className="card tb">
            <table className="ptable">
              <thead><tr>
                <th scope="col">{t('settings.col.param')}</th><th scope="col">{t('settings.col.group')}</th>
                <th scope="col" className="num">{t('settings.col.value')}</th><th scope="col" className="num">{t('settings.col.default')}</th>
                <th scope="col" className="num">{t('settings.col.bounds')}</th><th scope="col">{t('settings.col.changed')}</th>
              </tr></thead>
              <tbody>
                {sortParams(Array.isArray(d.params) ? d.params : []).map((p) => {
                  const g = paramGroup(p.key);
                  const changed = isChanged(p);
                  return (
                    <tr key={p.key} data-key={p.key}>
                      <th scope="row">{paramLabel(p.key, lang)}</th>
                      <td className="mut">{g ? t(`settings.group.${g}` as StringKey) : '—'}</td>
                      <td className={`num${changed ? ' chg' : ''}`}>{paramValue(p.key, p.value, lang)}</td>
                      <td className="num mut">{paramValue(p.key, p.default, lang)}</td>
                      <td className="num mut">{bounds(p, lang, t('settings.fixed'))}</td>
                      <td className="mut">{changed ? when(p.updated_at) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="log-col">
            <h2 className="sec-title">{t('settings.log')}</h2>
            <div className="card">
              {shown.length === 0 ? <p className="lg-empty">{t('settings.log.empty')}</p> : (
                <ol className="log" aria-label={t('settings.log')}>
                  {shown.map((c) => <LogLine key={c.id} c={c} />)}
                </ol>
              )}
            </div>
            {changes.length > LOG_PAGE ? (
              <div className="pager">
                <span>{t('settings.log.range', { from: page * LOG_PAGE + 1, to: page * LOG_PAGE + shown.length, n: changes.length })}</span>
                <Button kind="text" size="small" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('settings.log.prev')}</Button>
                <Button kind="text" size="small" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>{t('settings.log.next')}</Button>
              </div>
            ) : null}
            {(d.user_overrides ?? 0) > 0 ? <p className="tl">{t('settings.overrides', { n: d.user_overrides })}</p> : null}
            <p className="tl">{d.model
              ? t('settings.model', { version: d.model.version, rules: d.rules_version ?? '—' })
              : t('settings.model.none', { rules: d.rules_version ?? '—' })}</p>
          </div>
        </div>
      ) : null}

      {dialog ? (
        <Dialog title={t('settings.dialog.title')} body={t('settings.dialog.body')} cancel={t('settings.dialog.cancel')}
          confirm={t('settings.dialog.confirm')} busy={busy} onCancel={() => setDialog(false)} onConfirm={() => void reset()} />
      ) : null}
    </section>
  );
}

function LogLine({ c }: { c: ParamChange }) {
  const t = useT();
  const lang = useLang();
  const parts = [t(`cause.${c.cause}` as StringKey)];
  if (c.alert_id) parts.push(t('log.alert', { id: c.alert_id.slice(0, 8) }));
  if (c.cause !== 'user_me' && c.by) parts.push(c.simulated ? t('log.simulated') : t('log.analyst', { ref: c.by }));
  return (
    <li className="lg">
      <div className="lt">{changeTitle(c, lang)}</div>
      <div className="ls">{parts.join(' · ')} · <span className="nw">{when(c.at)}</span></div>
    </li>
  );
}
