import { useT, type StringKey } from '../i18n';

/** Tab bodies until B9.2 (queue), B9.4 (settings, Ops, /legal). */
export function Placeholder({ title }: { title: StringKey }) {
  const t = useT();
  return (
    <section className="placeholder" aria-labelledby="ph-title">
      <h1 id="ph-title">{t(title)}</h1>
      <p>{t('soon')}</p>
    </section>
  );
}
