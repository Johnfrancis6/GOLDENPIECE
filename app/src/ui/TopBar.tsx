/** C12 header (sub-page form) + C17 step dots. */
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { T, useTheme } from '../theme';
import { useT } from '../i18n';
import { EASE, Txt, useReducedMotion } from './base';
import { IconButton } from './Button';

const P = T.component.progress.steps;
const SEL = T.component.navigation.periodSelector.menu.selectedText;

function Dot({ state }: { state: 'done' | 'current' | 'todo' }) {
  const { c, scheme } = useTheme();
  const reduced = useReducedMotion();
  const w = useState(() => new Animated.Value(state === 'current' ? P.current[0] : P.dot))[0];
  useEffect(() => {
    const to = state === 'current' ? P.current[0] : P.dot;
    if (reduced) w.setValue(to);
    else Animated.timing(w, { toValue: to, duration: T.motion.duration.quick, easing: EASE.enter, useNativeDriver: false }).start();
  }, [state, reduced, w]);
  const bg = state === 'current' ? P.currentFill : state === 'done' ? SEL[scheme] : c.border.control;
  return <Animated.View style={{ width: w, height: P.dot, borderRadius: P.dot / 2, backgroundColor: bg, opacity: state === 'done' ? P.doneOpacity : 1 }} />;
}

/** "●●▬○○  Étape 3 sur 6" — index is 1-based. */
export function StepDots({ index, total, showLabel = true }: { index: number; total: number; showLabel?: boolean }) {
  const t = useT();
  const label = t('progress', { n: index, N: total });
  return (
    <View accessible accessibilityLabel={label} style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: P.gap }}>
        {Array.from({ length: total }, (_, i) => (
          <Dot key={i} state={i + 1 < index ? 'done' : i + 1 === index ? 'current' : 'todo'} />
        ))}
      </View>
      {showLabel ? <Txt v="caption" tone="secondary" align="center">{label}</Txt> : null}
    </View>
  );
}

export type TopBarProps = {
  onBack?: () => void;
  title?: string;
  center?: ReactNode;
  right?: ReactNode;
  /** Scrolled state: page background + hairline (C12). */
  hairline?: boolean;
};

/** 56 dp bar: back arrow (48 target, left 8), centred title or content, ≤ 1 action. */
export function TopBar({ onBack, title, center, right, hairline }: TopBarProps) {
  const { c } = useTheme();
  const t = useT();
  const H = T.component.navigation.header;
  return (
    <View style={{ minHeight: H.height, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4,
      backgroundColor: hairline ? c.bg : 'transparent', borderBottomWidth: hairline ? 1 : 0, borderBottomColor: c.border.hairline }}>
      <View style={{ width: 48, alignItems: 'center' }}>
        {onBack ? <IconButton icon="arrow-left" ghost onPress={onBack} a11yLabel={t('back')} /> : null}
      </View>
      <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
        {center ?? (title ? <Txt spec={H.smallTitle} align="center" accessibilityRole="header">{title}</Txt> : null)}
      </View>
      <View style={{ width: 48, alignItems: 'center' }}>{right}</View>
    </View>
  );
}
