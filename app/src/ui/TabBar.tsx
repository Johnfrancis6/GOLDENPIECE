/**
 * C12 v2 bottom bar (components/navigation.md §1): floating pill, 4 tabs,
 * labels always visible, no icon animation, active capsule. Tapping the
 * active tab scrolls its screen to the top (screens register their scroll
 * view with `useTabScrollRef`). A 150 dp `bg` fade sits behind the pill.
 */
import { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Pressable, View, type ScrollView, type PressableProps } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, useTheme } from '../theme';
import { Icon, Txt, tk, type IconName } from './base';

export type ScrollRef = RefObject<ComponentRef<typeof ScrollView> | null>;
type ViewRef = ComponentRef<typeof View>;

const BB = T.component.navigation.bottomBar;

/** Bottom padding a tab screen reserves so its last item clears the pill. */
export const TAB_BAR_CLEARANCE = BB.height + BB.inset + 24;

type Registry = { refs: Map<string, ScrollRef>; scrollTop: (name: string) => void };
const TabScrollContext = createContext<Registry | null>(null);

export function TabScrollProvider({ children }: { children: ReactNode }) {
  const [refs] = useState(() => new Map<string, ScrollRef>());
  const scrollTop = useCallback((name: string) => {
    refs.get(name)?.current?.scrollTo({ y: 0, animated: true });
  }, [refs]);
  const v = useMemo(() => ({ refs, scrollTop }), [refs, scrollTop]);
  return <TabScrollContext.Provider value={v}>{children}</TabScrollContext.Provider>;
}

/** A tab screen's main ScrollView ref, registered under the tab name. */
export function useTabScrollRef(name: string): ScrollRef {
  const reg = useContext(TabScrollContext);
  const ref = useRef<ComponentRef<typeof ScrollView> | null>(null);
  useEffect(() => { reg?.refs.set(name, ref); }, [reg, name]);
  return ref;
}
export const useTabScroll = () => useContext(TabScrollContext);

/** The pill (absolute, bottom); children are the 4 buttons. */
export const TabBarPill = forwardRef<ViewRef, { children?: ReactNode }>(function TabBarPill({ children, ...rest }, ref) {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <LinearGradient pointerEvents="none" colors={[`${c.bg}00`, c.bg]} locations={[0, 0.55]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BB.fadeBehind + insets.bottom }} />
      <View ref={ref} accessibilityRole="tablist" {...rest}
        style={{ marginHorizontal: BB.inset, marginBottom: insets.bottom + BB.inset, minHeight: BB.height, borderRadius: BB.radius,
          backgroundColor: tk(BB.fill, scheme), flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 6 }}>
        {children}
      </View>
    </View>
  );
});

export type TabButtonProps = PressableProps & { icon: IconName; label: string; name: string; isFocused?: boolean };

/** One tab (used as the `asChild` of expo-router's TabTrigger). */
export const TabButton = forwardRef<ViewRef, TabButtonProps>(function TabButton({ icon, label, name, isFocused, onPress, ...rest }, ref) {
  const { scheme } = useTheme();
  const reg = useTabScroll();
  const colour = isFocused ? tk(BB.active, scheme) : tk(BB.inactive, scheme);
  const [cw, ch] = BB.activeCapsule.size;
  return (
    <Pressable ref={ref} {...rest} accessibilityRole="tab" accessibilityState={{ selected: !!isFocused }} accessibilityLabel={label}
      onPress={(e) => { if (isFocused) reg?.scrollTop(name); onPress?.(e); }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 2, minHeight: 48 }}>
      <View style={{ width: cw, height: ch, borderRadius: ch / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: isFocused ? BB.activeCapsule.fill : 'transparent' }}>
        <Icon name={icon} size={BB.icon} color={colour} />
      </View>
      <Txt spec={{ ...BB.label, maxFontSizeMultiplier: T.typography.largeFont.fixedRowHeightUpToScale }} color={colour} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Txt>
    </Pressable>
  );
});
