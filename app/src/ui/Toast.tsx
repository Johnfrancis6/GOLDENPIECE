/** C11 Toast (components/feedback.md §3): bottom pill, unfold animation, one at a time. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, useTheme } from '../theme';
import { EASE, Icon, ND, Txt, useReducedMotion } from './base';

const TO = T.component.toast;
export type ToastKind = 'success' | 'queued' | 'conflict';
export type ToastSpec = { kind?: ToastKind; text: string; action?: { label: string; onPress: () => void } };

const ToastContext = createContext<{ show: (t: ToastSpec) => void; setBottomOffset: (n: number) => void }>({ show: () => {}, setBottomOffset: () => {} });
export const useToast = () => useContext(ToastContext);

function ToastView({ spec, onDone }: { spec: ToastSpec; onDone: () => void }) {
  const { c, scheme } = useTheme();
  const reduced = useReducedMotion();
  const bg = useState(() => new Animated.Value(0))[0];
  const content = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const sr = await AccessibilityInfo.isScreenReaderEnabled().catch(() => false);
      const life = spec.action && sr ? TO.durationWithActionA11yMs : TO.durationMs;
      AccessibilityInfo.announceForAccessibility?.(spec.text);
      if (reduced) {
        Animated.timing(bg, { toValue: 1, duration: 150, useNativeDriver: ND }).start();
        content.setValue(1);
      } else {
        Animated.parallel([
          Animated.timing(bg, { toValue: 1, duration: TO.unfold.bgMs, easing: EASE.enter, useNativeDriver: ND }),
          Animated.sequence([Animated.delay(TO.unfold.contentDelayMs),
            Animated.timing(content, { toValue: 1, duration: TO.unfold.contentMs, easing: EASE.enter, useNativeDriver: ND })]),
        ]).start();
      }
      setTimeout(() => {
        if (!alive) return;
        const out = reduced
          ? Animated.timing(bg, { toValue: 0, duration: 150, useNativeDriver: ND })
          : Animated.sequence([
              Animated.timing(content, { toValue: 0, duration: TO.unfold.exit.contentMs, useNativeDriver: ND }),
              Animated.timing(bg, { toValue: 0, duration: TO.unfold.exit.bgMs, easing: EASE.exit, useNativeDriver: ND }),
            ]);
        out.start(() => alive && onDone());
      }, life);
    };
    run();
    return () => { alive = false; };
  }, [spec, reduced, bg, content, onDone]);

  const k = spec.kind ?? 'success';
  const fill = TO[scheme].fill;
  const iconColour = k === 'conflict' ? c.warning : k === 'queued' ? TO[scheme].text : T.colour.dark.gain;
  return (
    <View style={{ height: TO.height, justifyContent: 'center' }} accessibilityLiveRegion="polite">
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, backgroundColor: fill,
        borderWidth: scheme === 'dark' ? 1 : 0, borderColor: TO.dark.border,
        opacity: bg.interpolate({ inputRange: [0, 0.44, 1], outputRange: [0, 1, 1] }),
        transform: [{ scaleX: reduced ? 1 : bg.interpolate({ inputRange: [0, 1], outputRange: [TO.unfold.fromScaleX, 1] }) }] }} />
      <Animated.View style={{ opacity: reduced ? bg : content, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
        <Icon name={TO.icon[k] as 'circle-check'} size={20} color={iconColour} />
        <Txt v="label" color={TO[scheme].text} style={{ flex: 1 }} numberOfLines={2}>{spec.text}</Txt>
        {spec.action ? (
          <Pressable accessibilityRole="button" onPress={() => { spec.action?.onPress(); onDone(); }} hitSlop={12}>
            <Txt v="label" weight={600} color={TO[scheme].action}>{spec.action.label}</Txt>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [cur, setCur] = useState<(ToastSpec & { id: number }) | null>(null);
  const [offset, setBottomOffset] = useState(0);
  const n = useRef(0);
  const show = useCallback((t: ToastSpec) => setCur({ ...t, id: ++n.current }), []);
  const done = useCallback(() => setCur(null), []);
  const value = useMemo(() => ({ show, setBottomOffset }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {cur ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: T.layout.screenMargin, right: T.layout.screenMargin, bottom: insets.bottom + 16 + offset }}>
          <ToastView key={cur.id} spec={cur} onDone={done} />
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}
