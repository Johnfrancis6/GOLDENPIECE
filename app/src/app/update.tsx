/** O17 Update required (B19, blocking, the only dialog-like screen). */
import { BackHandler, Linking } from 'react-native';
import { useEffect } from 'react';
import { useApp } from '../state/app';
import { useT } from '../i18n';
import { StepScreen, Txt } from '../ui';
import { useOnline } from '../screens/frames';

/** Firebase App Distribution invite page (B10); the store listing later. */
const UPDATE_URL = 'https://appdistribution.firebase.dev/';

export default function Update() {
  const { phase } = useApp();
  const t = useT();
  const online = useOnline();
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);
  const v = phase.kind === 'update' ? phase : { current: '', min: '' };
  return (
    <StepScreen icon="refresh-cw" title={t('O17.title')} text={t('O17.text')} primaryLabel={t('O17.primary')}
      primaryDisabled={!online} onPrimary={() => void Linking.openURL(UPDATE_URL)}
      slot={<Txt v="caption" tone="secondary" align="center" style={{ marginTop: -12 }}>{t('O17.version', { v: v.current, min: v.min })}</Txt>} />
  );
}
