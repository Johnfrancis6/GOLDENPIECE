/** O2 Language (B19, dots 1/5). Choosing flips the app language at once. */
import { useApp } from '../../state/app';
import { useT } from '../../i18n';
import { ChoiceList, StepScreen } from '../../ui';
import { DOTS_TOTAL } from '../../lib/flow';
import { go, useBack, useStep } from '../../screens/frames';

export default function Language() {
  useStep('language');
  const back = useBack('language');
  const { st, lang, patch } = useApp();
  const t = useT();
  return (
    <StepScreen
      icon="languages"
      title={t('O2.title')}
      text={t('O2.text')}
      primaryLabel={t('O2.primary')}
      onPrimary={() => { void patch({ lang: st.lang ?? lang }); go('country'); }}
      progress={{ index: 1, total: DOTS_TOTAL }}
      onBack={back}
      slot={<ChoiceList options={[{ key: 'fr', label: 'Français' }, { key: 'en', label: 'English' }]} value={st.lang ?? lang}
        onChange={(l) => void patch({ lang: l })} />}
    />
  );
}
