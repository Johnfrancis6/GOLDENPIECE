/** Tabs built by B7/B8: large title (C12 header) + "Bientôt" (C19). */
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, useTheme } from '../theme';
import { EmptyState, Txt } from '../ui';
import { TAB_BAR_CLEARANCE, useTabScrollRef } from '../ui/TabBar';
import { useT, type StringKey } from '../i18n';

export function TabPlaceholder({ name, title }: { name: string; title: StringKey }) {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const ref = useTabScrollRef(name);
  return (
    <ScrollView ref={ref} style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + T.component.navigation.header.height, paddingHorizontal: T.layout.screenMargin, paddingBottom: TAB_BAR_CLEARANCE + insets.bottom }}>
      <Txt v="titleScreen" accessibilityRole="header">{t(title)}</Txt>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState title={t('soon.title')} text={t('soon.text')} />
      </View>
    </ScrollView>
  );
}
