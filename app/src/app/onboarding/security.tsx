/** O10 Device security (B19, dots 4/5): 4 variants from the matrix §1.2b.
 * strong → system prompt once to enrol; weak / none → O11 app PIN; secret →
 * device code. "Plus tard" never goes below the device secret. */
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useApp } from '../../state/app';
import { useT, type StringKey } from '../../i18n';
import { StepScreen, type IconName } from '../../ui';
import { DOTS_TOTAL } from '../../lib/flow';
import { detectSecurityLevel, systemAuthenticate } from '../../lib/platform/device';
import type { SecurityLevel } from '../../lib/security';
import { Splash } from '../../screens/Splash';
import { go, useBack, useStep } from '../../screens/frames';

const ICON: Record<SecurityLevel, { icon: IconName; tone?: 'warning' }> = {
  strong: { icon: 'fingerprint' }, weak: { icon: 'scan-face', tone: 'warning' },
  secret: { icon: 'smartphone' }, none: { icon: 'lock-open', tone: 'warning' },
};

export default function Security() {
  useStep('security');
  const back = useBack('security');
  const { chooseSecurity } = useApp();
  const t = useT();
  const [level, setLevel] = useState<SecurityLevel | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { detectSecurityLevel().then(setLevel); }, []);
  if (!level) return <Splash />;
  const k = (s: string) => `O10${level}.${s}` as StringKey;
  const decide = async (later: boolean) => {
    setBusy(true);
    if (!later && (level === 'strong' || level === 'secret')) {
      // one system prompt confirms the method works before relying on it
      const ok = await systemAuthenticate(t('bio.prompt'), t('bio.cancel'), false);
      if (!ok) { setBusy(false); return; }
    }
    const next = await chooseSecurity(level, later);
    setBusy(false);
    go(next);
  };
  const lockPhone = () => {
    if (Platform.OS === 'android') Linking.sendIntent('android.settings.SECURITY_SETTINGS').catch(() => Linking.openSettings());
    else Linking.openSettings();
  };
  return (
    <StepScreen
      icon={ICON[level].icon}
      tone={ICON[level].tone}
      title={t(k('title'))}
      text={t(k('text'))}
      primaryLabel={t(k('primary'))}
      primaryLoading={busy}
      onPrimary={() => void decide(false)}
      secondary={level === 'none'
        ? { label: t('O10none.secondary'), onPress: lockPhone }
        : { label: t('later'), onPress: () => void decide(true) }}
      progress={{ index: 4, total: DOTS_TOTAL }}
      onBack={back}
    />
  );
}
