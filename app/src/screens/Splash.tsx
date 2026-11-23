/** O1 Splash (S1 §2): wordmark in brand orange + "Prototype · données
 * fictives"; no network wait. M14 opening motion comes in B6.5. */
import { View } from 'react-native';
import { useTheme } from '../theme';
import { useT } from '../i18n';
import { Txt } from '../ui';

export function Splash() {
  const { c } = useTheme();
  const t = useT();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 8 }}
      accessible accessibilityLabel={`GOLDENPIECE. ${t('app.prototype')}`}>
      <Txt spec={{ size: 20, lineHeight: 28, weight: 600, letterSpacing: 3 }} color={c.brand.text} fixed>GOLDENPIECE</Txt>
      <Txt v="caption" tone="secondary">{t('app.prototype')}</Txt>
    </View>
  );
}
