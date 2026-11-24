/** Sub-page placeholder for destinations built by later sessions (B7/B8):
 * Patrimoine, accounts, alerts B13/B14/L1, actions. For Settings (S7, B8)
 * it already lists the entries B6 owns: questionnaire (O14), tour replay (T),
 * and sign-out / leave the demo. */
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, useTheme } from '../theme';
import { EmptyState, ListCard, ListRow, TopBar } from '../ui';
import { useT } from '../i18n';
import { useApp } from '../state/app';

export default function Soon() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { reset, st } = useApp();
  const { title, dest } = useLocalSearchParams<{ title?: string; dest?: string }>();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <TopBar onBack={back} title={title ?? ''} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: T.layout.screenMargin, paddingBottom: insets.bottom + 48 }}>
        {dest === 'settings' ? (
          <View style={{ marginTop: 16 }}>
            <ListCard>
              <ListRow title={t('O14.title')} chevron onPress={() => router.push('/questionnaire')} />
              <ListRow title={t('tour.replay')} chevron onPress={() => router.push('/tour')} />
              <ListRow title={st.mode === 'demo' ? t('settings.leaveDemo') : t('settings.signout')} titleColor={c.loss} onPress={() => void reset()} />
            </ListCard>
          </View>
        ) : null}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState title={t('soon.title')} text={t('soon.text')} />
        </View>
      </ScrollView>
    </View>
  );
}
