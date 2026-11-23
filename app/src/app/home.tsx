/** Home placeholder until B6.4 builds the tabs and S2 Home: proves the
 * onboarding reaches Home (demo tag, first name). */
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state/app';
import { useT, type StringKey } from '../i18n';
import { T, useTheme } from '../theme';
import { Button, EmptyState, Txt } from '../ui';

export default function Home() {
  const { st, reset } = useApp();
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const name = st.persona ? t(`persona.${st.persona}.name` as StringKey) : null;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 16, paddingHorizontal: T.layout.screenMargin }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt v="titleScreen" accessibilityRole="header">{name ? t('hello', { name }) : t('helloNoName')}</Txt>
        {st.mode === 'demo' ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: c.surface2 }}>
            <Txt v="micro" tone="brand">{t('card.demo')}</Txt>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState title={t('soon.title')} text={t('soon.text')} />
      </View>
      {__DEV__ ? <Button variant="text" label={t('home.signout')} onPress={() => void reset()} block style={{ marginBottom: insets.bottom + 16 }} /> : null}
    </View>
  );
}
