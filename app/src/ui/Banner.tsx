/** C8 Banner (components/feedback.md §1): persistent state, no close button. */
import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { T, useTheme } from '../theme';
import { EASE, Icon, ND, Txt, useLargeFont, useReducedMotion, type IconName } from './base';
import { Button } from './Button';

const BN = T.component.banner;

export function Banner({ kind, text, action }: { kind: 'warning' | 'error' | 'info'; text: string; action?: { label: string; onPress: () => void } }) {
  const { scheme } = useTheme();
  const reduced = useReducedMotion();
  const large = useLargeFont();
  const k = BN.kinds[kind];
  const v = useState(() => new Animated.Value(reduced ? 1 : 0))[0];
  useEffect(() => {
    if (!reduced) Animated.timing(v, { toValue: 1, duration: T.motion.duration.quick, easing: EASE.enter, useNativeDriver: ND }).start();
  }, [v, reduced]);
  return (
    <Animated.View accessibilityLiveRegion="polite" accessibilityRole="alert"
      style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [T.motion.distance.enterTranslateDp, 0] }) }] }}>
      <View style={{ borderRadius: BN.radius, backgroundColor: k[scheme].fill, paddingVertical: BN.paddingY, paddingHorizontal: BN.paddingX,
        flexDirection: 'row', alignItems: 'center', gap: BN.gap }}>
        <Icon name={k.icon as IconName} size={BN.icon} color={k[scheme].icon} />
        <View style={{ flex: 1, flexDirection: large ? 'column' : 'row', alignItems: large ? 'flex-start' : 'center', gap: large ? 4 : BN.gap }}>
          <Txt spec={BN.text} style={{ flex: large ? undefined : 1 }}>{text}</Txt>
          {action ? <Button variant="text" size="small" label={action.label} onPress={action.onPress} style={{ marginVertical: -8, marginLeft: large ? -12 : 0 }} /> : null}
        </View>
      </View>
    </Animated.View>
  );
}
