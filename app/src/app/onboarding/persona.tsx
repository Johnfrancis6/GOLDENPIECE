/** O6 Persona (delegated D13, composed): 3 C7 cards with C21 profile circle,
 * name and one line; tap → anonymous sign-in + account-demo-start (clone
 * < 2 s), "Préparation de votre démo" while it runs; C8 banner on failure. */
import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../../state/app';
import { useT, type StringKey } from '../../i18n';
import { useTheme } from '../../theme';
import { Banner, Card, Icon, ProfileCircle, Spinner, Txt } from '../../ui';
import type { Persona } from '../../lib/flow';
import { FormFrame, useBack, useOnline, useStep } from '../../screens/frames';

const PERSONAS: Persona[] = ['dakar_salaried', 'abidjan_trader', 'diaspora_investor'];

export default function PersonaScreen() {
  useStep('persona');
  const back = useBack('persona');
  const { startDemo } = useApp();
  const { c } = useTheme();
  const t = useT();
  const online = useOnline();
  const [busy, setBusy] = useState<Persona | null>(null);
  const [failed, setFailed] = useState(false);
  const pick = async (p: Persona) => {
    if (busy) return;
    setBusy(p); setFailed(false);
    const f = await startDemo(p, t(`persona.${p}.name` as StringKey));
    if (f) { setFailed(true); setBusy(null); }
    // success: the phase gate opens Home
  };
  return (
    <FormFrame title={t('O6.title')} line={t('O6.line')} onBack={busy ? undefined : back}
      banner={!online ? <Banner kind="warning" text={t('offline.banner')} /> : failed ? <Banner kind="error" text={t('O6.error')} /> : undefined}>
      <View style={{ marginTop: 24, gap: 12 }}>
        {PERSONAS.map((p) => {
          const name = t(`persona.${p}.name` as StringKey);
          const line = t(`persona.${p}.line` as StringKey);
          return (
            <Card key={p} onPress={online && !busy ? () => void pick(p) : undefined} a11yLabel={`${name}. ${line}`}
              variant={busy === p ? 'highlighted' : 'plain'} style={{ opacity: busy && busy !== p ? 0.4 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ProfileCircle id={p} name={name} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyStrong">{name}</Txt>
                  <Txt v="caption" tone="secondary">{busy === p ? t('O6.loading') : line}</Txt>
                </View>
                {busy === p ? <Spinner color={c.brand.text} /> : <Icon name="chevron-right" size={20} color={c.text.secondary} />}
              </View>
            </Card>
          );
        })}
      </View>
    </FormFrame>
  );
}
