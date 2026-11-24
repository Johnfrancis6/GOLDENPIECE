import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { useLang, useT, type StringKey } from '../i18n';
import type { LegalText } from '../lib/types';
import { markdown } from '../lib/markdown';
import { BrandTile } from '../shell/BrandTile';
import { Banner } from '../ui/Banner';

const ORDER = ['terms', 'privacy'];
const rank = (k: string) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length);

/**
 * `/legal` (delegated, D §8: text page). Public (anon `api.legal_texts(p_lang)`), no guard. Brand bar 56 like the
 * top bar, a 720-wide column: title 24/32, the disclaimer as a C8 info banner, then each text (Markdown subset)
 * with its version line.
 */
export function Legal() {
  const t = useT();
  const lang = useLang();
  const { client } = useAuth();
  const [texts, setTexts] = useState<LegalText[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    void client.rpc('legal_texts', { p_lang: lang }).then(({ data, error: e }) => {
      if (!live) return;
      if (e) { setError(true); return; }
      setError(false);
      setTexts(data as LegalText[]);
    });
    return () => { live = false; };
  }, [client, lang]);

  useEffect(() => { document.title = `${t('legal.title')} · ${t('brand')}`; }, [t]);

  const disclaimer = texts?.find((x) => x.kind === 'disclaimer');
  const docs = (texts ?? []).filter((x) => x.kind !== 'disclaimer')
    .sort((a, b) => rank(a.kind) - rank(b.kind));

  return (
    <div className="legal-page">
      <header className="top legal-top">
        <div className="top-brand"><BrandTile /><b>{t('brand')}</b></div>
        <Link to="/" className="btn btn-text btn-small legal-back"><ArrowLeft size={18} aria-hidden /><span>{t('legal.back')}</span></Link>
      </header>
      <main className="legal">
        <h1 className="page-title">{t('legal.title')}</h1>
        {error ? <Banner kind="error">{t('load.failed')}</Banner> : null}
        {disclaimer ? <Banner kind="info">{disclaimer.body_md}</Banner> : null}
        {docs.map((d) => (
          <article key={d.kind} className="legal-doc" aria-label={t(`legal.kind.${d.kind}` as StringKey) ?? d.kind}>
            {markdown(d.body_md)}
            <p className="tl">{t('legal.version', { v: d.version })}</p>
          </article>
        ))}
      </main>
    </div>
  );
}
