/** C3 PIN dots / e-mail code boxes + C4 numeric keypad (components/input-pin-keypad.md). */
import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { T, useTheme } from '../theme';
import { useT } from '../i18n';
import { EASE, Icon, ND, Txt, useReducedMotion } from './base';

const PE = T.component.pinEntry;
const KP = T.component.keypad;

function PinDot({ filled, error }: { filled: boolean; error: boolean }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const s = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    if (!filled || reduced) return;
    s.setValue(PE.dots.fillScale[0]);
    Animated.timing(s, { toValue: 1, duration: PE.dots.fillMs, easing: EASE.enter, useNativeDriver: ND }).start();
  }, [filled, reduced, s]);
  const d = PE.dots.size;
  const col = error ? c.loss : c.text.primary;
  return (
    <Animated.View style={{ width: d, height: d, borderRadius: d / 2, transform: [{ scale: s }],
      borderWidth: filled ? 0 : PE.dots.ring, borderColor: c.border.control, backgroundColor: filled ? col : 'transparent' }} />
  );
}

/**
 * 6 PIN dots. `shakeKey` changes on each wrong code → shake (−8, +7, −5, +3, 0 dp, 360 ms)
 * and red dots; the caller clears the entry after `errorClearMs`.
 */
export function PinDots({ length, total = 6, error, shakeKey, locked }: { length: number; total?: number; error?: boolean; shakeKey?: number; locked?: boolean }) {
  const t = useT();
  const reduced = useReducedMotion();
  const x = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!shakeKey || reduced) return;
    const step = PE.shake.durationMs / PE.shake.offsetsDp.length;
    Animated.sequence(PE.shake.offsetsDp.map((o) => Animated.timing(x, { toValue: o, duration: step, easing: EASE.standard, useNativeDriver: ND }))).start();
  }, [shakeKey, reduced, x]);
  return (
    <Animated.View accessible accessibilityLabel={t('pin.a11y', { n: length, N: total })}
      style={{ flexDirection: 'row', justifyContent: 'center', gap: PE.dots.gap, transform: [{ translateX: x }], opacity: locked ? PE.lock.opacity : 1 }}>
      {Array.from({ length: total }, (_, i) => <PinDot key={i} filled={i < length} error={!!error && i < length} />)}
    </Animated.View>
  );
}

/** 6 e-mail code boxes (display only; the C4 keypad or a paste fills them). */
export function CodeBoxes({ value, total = 6, error }: { value: string; total?: number; error?: boolean }) {
  const { c, scheme } = useTheme();
  const B = PE.boxes;
  const fill = scheme === 'dark' ? c.surface2 : '#FFFFFF';
  return (
    <View accessible accessibilityLabel={value.split('').join(' ')} style={{ flexDirection: 'row', justifyContent: 'center', gap: B.gap }}>
      {Array.from({ length: total }, (_, i) => {
        const current = i === value.length;
        const bw = error || current ? 2 : scheme === 'light' ? 1 : 0;
        const bc = error ? c.loss : current ? c.focus : 'rgba(0,0,0,0.10)';
        return (
          <View key={i} style={{ width: B.width, height: B.height, borderRadius: B.radius, backgroundColor: fill, borderWidth: bw, borderColor: bc, alignItems: 'center', justifyContent: 'center' }}>
            {value[i] ? <Txt spec={{ size: B.digit.size, lineHeight: 28, weight: B.digit.weight, tabular: true }} fixed>{value[i]}</Txt>
              : current ? <View style={{ width: 2, height: 24, backgroundColor: c.focus }} /> : null}
          </View>
        );
      })}
    </View>
  );
}

/** Message line under the dots: 18 dp reserved, no jump. */
export function PinMessage({ text, kind }: { text?: string | null; kind?: 'error' | 'locked' }) {
  const { c } = useTheme();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    v.setValue(0);
    if (text) Animated.timing(v, { toValue: 1, duration: T.motion.duration.quick, easing: EASE.enter, useNativeDriver: ND }).start();
  }, [text, v]);
  const col = kind === 'locked' ? c.text.secondary : c.loss;
  return (
    <Animated.View accessibilityLiveRegion="polite" style={{ minHeight: PE.messageLine, opacity: v, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
      {text ? <Icon name={kind === 'locked' ? 'lock-keyhole' : 'circle-alert'} size={16} color={col} /> : null}
      {text ? <Txt spec={T.component.input.error.message} color={col} style={{ fontVariant: ['tabular-nums'] }}>{text}</Txt> : null}
    </Animated.View>
  );
}

type KeyDef = { k: string; label?: string; icon?: 'fingerprint' | 'delete' };

function Key({ def, onPress, onLong, disabled }: { def: KeyDef; onPress: () => void; onLong?: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  const t = useT();
  if (!def.k) return <View style={{ flex: 1, height: KP.keyHeight }} />;
  const a11y = def.icon === 'delete' ? t('key.delete') : def.icon === 'fingerprint' ? t('key.fingerprint') : def.label;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} onLongPress={onLong} disabled={disabled}
      style={{ flex: 1, height: KP.keyHeight, alignItems: 'center', justifyContent: 'center' }}>
      {({ pressed }) => (
        <>
          <View style={{ position: 'absolute', width: '80%', height: '100%', borderRadius: 999, backgroundColor: pressed ? c.surface3 : 'transparent' }} />
          {def.icon ? <Icon name={def.icon} size={def.icon === 'fingerprint' ? 28 : 26} color={c.text.primary} />
            : <Txt spec={KP.digit} fixed>{def.label}</Txt>}
        </>
      )}
    </Pressable>
  );
}

export type KeypadProps = {
  variant: 'pin' | 'code' | 'amount';
  onDigit: (d: string) => void;
  onDelete: () => void;
  onClear?: () => void;
  onBiometric?: () => void;
  /** amount: ',' key only for currencies with decimals. */
  decimals?: boolean;
  disabled?: boolean;
};

/** 3 × 4 keypad, keys 64 dp, row gap 8, no letters, no haptics. */
export function Keypad({ variant, onDigit, onDelete, onClear, onBiometric, decimals, disabled }: KeypadProps) {
  const rows: KeyDef[][] = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((r) => r.map((k) => ({ k, label: k })));
  const left: KeyDef = variant === 'pin' && onBiometric ? { k: 'bio', icon: 'fingerprint' } : variant === 'amount' && decimals ? { k: ',', label: ',' } : { k: '' };
  rows.push([left, { k: '0', label: '0' }, { k: 'del', icon: 'delete' }]);
  return (
    <View style={{ gap: KP.rowGap, opacity: disabled ? PE.lock.opacity : 1 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row' }}>
          {r.map((d) => (
            <Key key={d.k || `e${i}`} def={d} disabled={disabled}
              onPress={() => (d.k === 'del' ? onDelete() : d.k === 'bio' ? onBiometric?.() : onDigit(d.k))}
              onLong={d.k === 'del' ? onClear : undefined} />
          ))}
        </View>
      ))}
    </View>
  );
}
