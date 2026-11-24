/** Gallery: B19 step screen variants — /gallery/step?v=O2|O5|O10strong|O10weak|O10secret|O10none|O17. */
import { useState } from 'react';
import { router } from 'expo-router';
import { useT, type StringKey } from '../../i18n';
import { ChoiceList, StepScreen, Txt, type IconName } from '../../ui';
import { useGalleryParams } from '../../dev/GalleryFrame';

type V = { icon: IconName; tone?: 'warning'; back?: boolean; dots?: number; secondary?: StringKey | 'later'; slot?: 'lang' | 'version' };
const VARIANTS: Record<string, V> = {
  O2: { icon: 'languages', dots: 1, slot: 'lang' },
  O5: { icon: 'user-round-plus', dots: 2, back: true, secondary: 'O5.secondary' },
  O10strong: { icon: 'fingerprint', dots: 4, back: true, secondary: 'later' },
  O10weak: { icon: 'scan-face', tone: 'warning', dots: 4, back: true, secondary: 'later' },
  O10secret: { icon: 'smartphone', dots: 4, back: true, secondary: 'later' },
  O10none: { icon: 'lock-open', tone: 'warning', dots: 4, back: true, secondary: 'O10none.secondary' },
  O17: { icon: 'refresh-cw', slot: 'version' },
};

export default function StepGallery() {
  const q = useGalleryParams();
  const t = useT();
  const key = q.v && VARIANTS[q.v] ? q.v : 'O2';
  const v = VARIANTS[key];
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [loading, setLoading] = useState(false);
  const k = (s: string) => `${key}.${s}` as StringKey;
  return (
    <StepScreen
      icon={v.icon}
      tone={v.tone}
      title={t(k('title'))}
      text={t(k('text'))}
      primaryLabel={t(k('primary'))}
      primaryLoading={loading}
      onPrimary={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}
      secondary={v.secondary ? { label: t(v.secondary === 'later' ? 'later' : v.secondary), onPress: () => {} } : undefined}
      progress={v.dots ? { index: v.dots, total: 6 } : undefined}
      onBack={v.back ? () => router.back() : undefined}
      slot={v.slot === 'lang' ? (
        <ChoiceList options={[{ key: 'fr', label: 'Français' }, { key: 'en', label: 'English' }]} value={lang} onChange={setLang} />
      ) : v.slot === 'version' ? (
        <Txt v="caption" tone="secondary" align="center" style={{ marginTop: -12 }}>{t('O17.version', { v: '0.1.0', min: '0.2.0' })}</Txt>
      ) : undefined}
    />
  );
}
