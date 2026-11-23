/** O5 Account or demo (B19, no dots). */
import { useEffect } from 'react';
import { useApp } from '../../state/app';
import { useT } from '../../i18n';
import { StepScreen } from '../../ui';
import { go, useBack, useStep } from '../../screens/frames';

export default function Choice() {
  useStep('choice');
  const back = useBack('choice');
  const { warmup } = useApp();
  const t = useT();
  useEffect(() => { warmup(); }, [warmup]);
  return (
    <StepScreen
      icon="user-round-plus"
      title={t('O5.title')}
      text={t('O5.text')}
      primaryLabel={t('O5.primary')}
      onPrimary={() => go('signup')}
      secondary={{ label: t('O5.secondary'), onPress: () => go('persona') }}
      onBack={back}
    />
  );
}
