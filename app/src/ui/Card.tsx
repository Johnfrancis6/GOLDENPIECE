/** C7 Card + C6 List row (components/list-row-card.md). */
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T, useTheme } from '../theme';
import { Icon, Txt, useLargeFont } from './base';

const CARD = T.component.card;
const ROW = T.component.listRow;
const EDGE = T.colour.glow.edge;

export type CardProps = {
  children: ReactNode;
  /** list = a card holding C6 rows (padding 0). highlighted = 2 dp glow edge on top. */
  variant?: 'plain' | 'list' | 'highlighted';
  onPress?: () => void;
  a11yLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, variant = 'plain', onPress, a11yLabel, style }: CardProps) {
  const { c, scheme } = useTheme();
  const base: ViewStyle = { borderRadius: CARD.radius, backgroundColor: c.surface1, overflow: 'hidden', padding: variant === 'list' ? 0 : CARD.padding };
  const edge = variant === 'highlighted' ? (
    <LinearGradient pointerEvents="none" colors={EDGE.stops.map((s) => s.colour) as [string, string, ...string[]]}
      locations={EDGE.stops.map((s) => s.at) as [number, number, ...number[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CARD.highlightEdge.height }} />
  ) : null;
  if (!onPress) return <View style={[base, style]}>{edge}{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11yLabel} onPress={onPress}
      style={({ pressed }) => [base, pressed && { backgroundColor: ROW.pressed[scheme] }, style]}>
      {edge}{children}
    </Pressable>
  );
}

export type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  value?: ReactNode;
  valueSub?: ReactNode;
  trailing?: ReactNode;
  /** Settings rows that open a sub-page only. */
  chevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  a11yLabel?: string;
  titleColor?: string;
  titleWeight?: 400 | 500 | 600;
  minHeight?: number;
};

export function ListRow(p: ListRowProps) {
  const { c, scheme } = useTheme();
  const large = useLargeFont();
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: p.minHeight ?? ROW.minHeight, paddingHorizontal: ROW.paddingX, paddingVertical: 10, gap: ROW.gap, opacity: p.disabled ? 0.4 : 1 }}>
      {p.leading}
      <View style={{ flex: 1, flexDirection: large ? 'column' : 'row', alignItems: large ? 'stretch' : 'center', gap: large ? ROW.valueGap : ROW.gap }}>
        <View style={{ flex: large ? undefined : 1, minWidth: 0 }}>
          <Txt v="body" color={p.titleColor} weight={p.titleWeight}>{p.title}</Txt>
          {p.subtitle ? <Txt v="caption" tone="secondary">{p.subtitle}</Txt> : null}
        </View>
        {p.value || p.valueSub ? (
          <View style={{ alignItems: large ? 'flex-start' : 'flex-end', gap: ROW.valueGap }}>
            {typeof p.value === 'string' ? <Txt v="amountRow">{p.value}</Txt> : p.value}
            {p.valueSub}
          </View>
        ) : null}
      </View>
      {p.trailing}
      {p.chevron ? <Icon name="chevron-right" size={ROW.chevron.size} color={c.text.secondary} /> : null}
    </View>
  );
  if (!p.onPress) return <View accessible accessibilityLabel={p.a11yLabel}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={p.a11yLabel} accessibilityHint={p.chevron ? 'ouvre une page' : undefined}
      onPress={p.onPress} disabled={p.disabled} style={({ pressed }) => ({ backgroundColor: pressed ? ROW.pressed[scheme] : 'transparent' })}>
      {content}
    </Pressable>
  );
}

/** Rows of one list in one card with hairlines inset to the text start. */
export function ListCard({ children, inset = 'leading', style }: { children: ReactNode; inset?: 'leading' | 'none'; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const items = Children.toArray(children).filter(isValidElement);
  const left = inset === 'leading' ? ROW.separator.insetWithLeading : ROW.separator.insetWithout;
  return (
    <Card variant="list" style={style}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={{ height: ROW.separator.width, marginLeft: left, backgroundColor: c.border.hairline }} /> : null}
          {child}
        </Fragment>
      ))}
    </Card>
  );
}
