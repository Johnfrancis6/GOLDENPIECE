/** C1 Button (components/button.md). */
import { useEffect, useState } from 'react';
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { T, useTheme } from '../theme';
import { EASE, Icon, ND, Txt, useReducedMotion, type IconName } from './base';

const B = T.component.button;
export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'destructiveText' | 'destructiveConfirm';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'large' | 'small';
  /** Large buttons are full width by default; empty states use auto width. */
  block?: boolean;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  a11yLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** C19 empty-state button: padding 24. */
  padX?: number;
};

function usePressScale(scaleTo: number) {
  const s = useState(() => new Animated.Value(1))[0];
  const to = (v: number) => Animated.timing(s, { toValue: v, duration: B.pressMs, easing: EASE.standard, useNativeDriver: ND }).start();
  return { s, onPressIn: () => to(scaleTo), onPressOut: () => to(1) };
}

export function Spinner({ color, size = B.spinner.size }: { color: string; size?: number }) {
  const reduced = useReducedMotion();
  const r = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const anim = reduced
      ? Animated.loop(Animated.sequence([
          Animated.timing(r, { toValue: 1, duration: 450, useNativeDriver: ND }),
          Animated.timing(r, { toValue: 0, duration: 450, useNativeDriver: ND }),
        ]))
      : Animated.loop(Animated.timing(r, { toValue: 1, duration: B.spinner.turnMs, easing: (x) => x, useNativeDriver: ND }));
    anim.start();
    return () => anim.stop();
  }, [r, reduced]);
  if (reduced) {
    // reduced motion: 3-dot opacity pulse instead of a turning glyph
    return (
      <View style={{ flexDirection: 'row', gap: 4, height: size, alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <Animated.View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color,
            opacity: r.interpolate({ inputRange: [0, 1], outputRange: i === 1 ? [1, 0.3] : [0.3, 1] }) }} />
        ))}
      </View>
    );
  }
  const rotate = r.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={{ transform: [{ rotate }] }}><Icon name="loader-circle" size={size} color={color} /></Animated.View>;
}

export function Button({ label, onPress, variant = 'primary', size = 'large', block, icon, loading, disabled, a11yLabel, style, testID, padX }: ButtonProps) {
  const { c, scheme } = useTheme();
  const { s, onPressIn, onPressOut } = usePressScale(B.pressedScale);
  const sz = B.size[size];
  const isText = variant === 'text' || variant === 'destructiveText';
  let fill = 'transparent', pressed = 'transparent', fg = c.brand.text;
  if (variant === 'primary') { fill = c.brand.fill; pressed = c.brand.fillPressed; fg = B.primary.label; }
  if (variant === 'secondary') { fill = B.secondary[scheme].fill; pressed = B.secondary[scheme].pressed; fg = c.text.primary; }
  if (variant === 'destructiveText') fg = scheme === 'dark' ? B.destructiveText.dark : c.loss;
  if (variant === 'destructiveConfirm') { fill = c.loss; pressed = c.loss; fg = scheme === 'dark' ? B.destructiveConfirm.dark.label : B.destructiveConfirm.light.label; }
  if (disabled && !isText) { fill = c.surface2; pressed = c.surface2; fg = c.text.disabled; }
  if (disabled && isText) fg = c.text.disabled;
  const labelSpec = size === 'large' ? T.typography.scale.button : B.size.small.label;
  const fullWidth = block ?? (size === 'large' && !isText);
  const hit = Math.max(0, (B.minTouch - sz.height) / 2);
  return (
    <Animated.View style={[{ transform: [{ scale: s }], alignSelf: fullWidth ? 'stretch' : 'flex-start' }, style]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel ?? label}
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        disabled={disabled}
        onPress={loading ? undefined : onPress}
        onPressIn={disabled || loading ? undefined : onPressIn}
        onPressOut={onPressOut}
        hitSlop={hit}
        style={({ pressed: p }) => ({
          minHeight: isText && size === 'large' ? 48 : sz.height,
          paddingHorizontal: padX ?? (isText ? (size === 'small' ? 12 : sz.paddingX) : sz.paddingX),
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: p ? pressed : fill,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: B.gap,
          opacity: isText && p ? 0.7 : 1,
        })}
      >
        {loading ? (
          <View style={{ height: labelSpec.lineHeight, justifyContent: 'center' }}>
            <Spinner color={fg} />
            {/* keeps the width of the label */}
            <Txt spec={labelSpec} color="transparent" style={{ position: 'absolute', opacity: 0 }}>{label}</Txt>
          </View>
        ) : (
          <>
            {icon ? <Icon name={icon} size={20} color={fg} /> : null}
            <Txt spec={labelSpec} color={fg} align="center" style={{ flexShrink: 1 }}>{label}</Txt>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Icon button: 40 dp circle surface3 (or ghost), 24 dp glyph, 48 dp target. */
export function IconButton({ icon, onPress, a11yLabel, ghost, color, disabled }: { icon: IconName; onPress?: () => void; a11yLabel: string; ghost?: boolean; color?: string; disabled?: boolean }) {
  const { c, scheme } = useTheme();
  const { s, onPressIn, onPressOut } = usePressScale(T.icon.press.scale);
  const fill = ghost ? 'transparent' : c.surface3;
  return (
    <Animated.View style={{ transform: [{ scale: s }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={a11yLabel} onPress={onPress} disabled={disabled}
        onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={4}
        style={({ pressed }) => ({ width: B.size.icon.size, height: B.size.icon.size, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
          backgroundColor: pressed ? (ghost ? c.surface3 : B.secondary[scheme].pressed) : fill })}>
        <Icon name={icon} size={B.size.icon.icon} color={color ?? c.text.primary} />
      </Pressable>
    </Animated.View>
  );
}
