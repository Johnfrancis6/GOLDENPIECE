/** C16 choice controls: Switch, Checkbox, Radio, ChoiceList. */
import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { T, useTheme } from '../theme';
import { EASE, Icon, useReducedMotion } from './base';
import { ListCard, ListRow } from './Card';

const CC = T.component.choiceControl;
const SEL = T.component.navigation.periodSelector.menu.selectedText;

function useOn(on: boolean) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(on ? 1 : 0))[0];
  useEffect(() => {
    if (reduced) v.setValue(on ? 1 : 0);
    else Animated.timing(v, { toValue: on ? 1 : 0, duration: CC.motion.ms, easing: EASE.standard, useNativeDriver: false }).start();
  }, [on, reduced, v]);
  return v;
}

/** Visual only (the row is the target); use SwitchRow / onPress for a standalone control. */
export function Switch({ on, onChange, a11yLabel }: { on: boolean; onChange?: (v: boolean) => void; a11yLabel?: string }) {
  const { c } = useTheme();
  const v = useOn(on);
  const [W, H] = CC.switch.size;
  const thumb = v.interpolate({ inputRange: [0, 1], outputRange: [CC.switch.thumbOff, CC.switch.thumbOn] });
  const x = v.interpolate({ inputRange: [0, 1], outputRange: [(H - CC.switch.thumbOff) / 2, W - (H - CC.switch.thumbOn) / 2 - CC.switch.thumbOn] });
  const body = (
    <View style={{ width: W, height: H, borderRadius: H / 2, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: H / 2, backgroundColor: c.surface3, borderWidth: CC.off.borderWidth, borderColor: c.border.control }} />
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: H / 2, backgroundColor: CC.on.fill, opacity: v }} />
      <Animated.View style={{ position: 'absolute', left: x, width: thumb, height: thumb, borderRadius: 999,
        backgroundColor: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [c.text.secondary, c.text.secondary, CC.on.mark] }) }} />
    </View>
  );
  if (!onChange) return body;
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={a11yLabel} hitSlop={8} onPress={() => onChange(!on)}>
      {body}
    </Pressable>
  );
}

export function Checkbox({ on }: { on: boolean }) {
  const { c } = useTheme();
  const v = useOn(on);
  const s = CC.checkbox.size;
  return (
    <View style={{ width: s, height: s, borderRadius: CC.checkbox.radius, borderWidth: CC.off.borderWidth, borderColor: on ? CC.on.fill : c.border.control, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: CC.checkbox.radius, backgroundColor: CC.on.fill, alignItems: 'center', justifyContent: 'center',
        opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: CC.motion.markScale }) }] }}>
        <Icon name="check" size={CC.checkbox.check} color={CC.on.mark} stroke={2.5} />
      </Animated.View>
    </View>
  );
}

export function Radio({ on }: { on: boolean }) {
  const { c } = useTheme();
  const v = useOn(on);
  const s = CC.radio.size;
  return (
    <View style={{ width: s, height: s, borderRadius: s / 2, borderWidth: CC.off.borderWidth, borderColor: on ? CC.on.fill : c.border.control, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: s, backgroundColor: CC.on.fill, alignItems: 'center', justifyContent: 'center',
        opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: CC.motion.markScale }) }] }}>
        <View style={{ width: CC.radio.dot, height: CC.radio.dot, borderRadius: CC.radio.dot / 2, backgroundColor: CC.on.mark }} />
      </Animated.View>
    </View>
  );
}

export type ChoiceOption<K extends string> = { key: K; label: string; subtitle?: string };

/** Single choice in one card, radio right, selected label orange SemiBold (C16/C9 rule). */
export function ChoiceList<K extends string>({ options, value, onChange, minHeight = 56 }: { options: ChoiceOption<K>[]; value: K | null; onChange: (k: K) => void; minHeight?: number }) {
  const { scheme } = useTheme();
  return (
    <View accessibilityRole="radiogroup">
      <ListCard inset="none">
        {options.map((o) => {
          const on = o.key === value;
          return (
            <ListRow key={o.key} title={o.label} subtitle={o.subtitle} minHeight={minHeight} onPress={() => onChange(o.key)}
              titleColor={on ? SEL[scheme] : undefined} titleWeight={on ? SEL.weight as 600 : undefined}
              a11yLabel={o.label + (on ? ', sélectionné' : '')} trailing={<Radio on={on} />} />
          );
        })}
      </ListCard>
    </View>
  );
}

/** Settings-style row with a switch; the whole row toggles. */
export function SwitchRow({ title, subtitle, on, onChange }: { title: string; subtitle?: string; on: boolean; onChange: (v: boolean) => void }) {
  return <ListRow title={title} subtitle={subtitle} onPress={() => onChange(!on)} a11yLabel={title} trailing={<Switch on={on} />} />;
}
