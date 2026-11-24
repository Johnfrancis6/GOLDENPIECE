/** C9 Bottom sheet (components/bottom-sheet.md): short (≤ 60 %) or tall (92 %). */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, BackHandler, Modal, PanResponder, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, resolve, useTheme } from '../theme';
import { useT } from '../i18n';
import { EASE, Icon, ND, Txt, useReducedMotion } from './base';
import { IconButton } from './Button';

const SH = T.component.bottomSheet;

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'short' | 'tall';
  footer?: ReactNode;
  children: ReactNode;
};

export function Sheet({ open, onClose, title, size = 'short', footer, children }: SheetProps) {
  const { c, scheme } = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [visible, setVisible] = useState(open);
  const [h, setH] = useState(winH);
  const [scrolled, setScrolled] = useState(false);
  const y = useState(() => new Animated.Value(winH))[0]; // translateY
  const op = useState(() => new Animated.Value(0))[0]; // scrim / reduced-motion opacity
  const closing = useRef(false);

  const animateOpen = () => {
    closing.current = false;
    if (reduced) {
      y.setValue(0);
      Animated.timing(op, { toValue: 1, duration: T.motion.reducedMotion.fadesMaxMs, useNativeDriver: ND }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: T.motion.duration.sheet, easing: EASE.enter, useNativeDriver: ND }),
      Animated.timing(op, { toValue: 1, duration: SH.motion.scrimInMs, useNativeDriver: ND }),
    ]).start();
  };
  const animateClose = (then?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    const d = reduced ? T.motion.reducedMotion.fadesMaxMs : SH.motion.closeMs;
    Animated.parallel([
      reduced ? Animated.delay(0) : Animated.timing(y, { toValue: h, duration: d, easing: EASE.exit, useNativeDriver: ND }),
      Animated.timing(op, { toValue: 0, duration: d, easing: EASE.exit, useNativeDriver: ND }),
    ]).start(() => { setVisible(false); then?.(); });
  };

  // open → mount the modal now (state adjusted during render), then slide in
  if (open && !visible) setVisible(true);
  useEffect(() => {
    if (open) { y.setValue(winH); op.setValue(0); requestAnimationFrame(animateOpen); }
    else if (visible) animateClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [visible, onClose]);

  const hRef = useRef(h);
  const onCloseRef = useRef(onClose);
  const reducedRef = useRef(reduced);
  useEffect(() => { hRef.current = h; onCloseRef.current = onClose; reducedRef.current = reduced; });
  // the responder reads the latest height / handlers through refs (gesture callbacks, not render)
  // eslint-disable-next-line react-hooks/refs
  const pan = useState(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => {
      const d = Math.max(0, g.dy); // follows 1:1 down, no upward travel
      y.setValue(d);
      op.setValue(1 - d / Math.max(1, hRef.current));
    },
    onPanResponderRelease: (_, g) => {
      const d = Math.max(0, g.dy);
      if (d > hRef.current * (SH.motion.dismissThresholdPct / 100) || g.vy * 1000 > SH.motion.dismissFlingDpPerS) onCloseRef.current();
      else Animated.parallel([
        Animated.timing(y, { toValue: 0, duration: reducedRef.current ? 0 : SH.motion.snapBackMs, easing: EASE.enter, useNativeDriver: ND }),
        Animated.timing(op, { toValue: 1, duration: reducedRef.current ? 0 : SH.motion.snapBackMs, useNativeDriver: ND }),
      ]).start();
    },
  }))[0];

  const maxH = size === 'tall' ? winH * (SH.sizes.tall.heightPct / 100) : winH * (SH.sizes.short.maxHeightPct / 100);
  const fill = SH[scheme].fill;
  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: resolve(SH[scheme].scrim, scheme), opacity: op }}>
          <Pressable accessibilityLabel={t('close')} style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View accessibilityViewIsModal onLayout={(e) => setH(e.nativeEvent.layout.height)}
          style={{ backgroundColor: fill, borderTopLeftRadius: SH.radiusTop, borderTopRightRadius: SH.radiusTop,
            height: size === 'tall' ? maxH : undefined, maxHeight: maxH, alignSelf: 'center', width: '100%', maxWidth: T.layout.maxContentWidth + 2 * T.layout.screenMargin,
            transform: [{ translateY: y }], opacity: reduced ? op : 1 }}>
          <View {...pan.panHandlers}>
            <View style={{ height: SH.handle.zoneHeight, alignItems: 'center', justifyContent: 'center' }} importantForAccessibility="no">
              <View style={{ width: SH.handle.width, height: SH.handle.height, borderRadius: SH.handle.radius, backgroundColor: SH[scheme].handle }} />
            </View>
            <View style={{ minHeight: SH.header.height, flexDirection: 'row', alignItems: 'center', paddingLeft: SH.header.paddingLeft, paddingRight: SH.header.paddingRight }}>
              <Txt spec={SH.header.title} accessibilityRole="header" style={{ flex: 1 }}>{title}</Txt>
              <IconButton icon="x" ghost onPress={onClose} a11yLabel={t('close')} />
            </View>
          </View>
          <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} scrollEventThrottle={32}
            onScroll={(e) => { const n = e.nativeEvent; setScrolled(n.contentOffset.y + n.layoutMeasurement.height < n.contentSize.height - 1); }}
            onContentSizeChange={(_, ch) => setScrolled(ch > maxH - 140)}
            contentContainerStyle={{ paddingHorizontal: SH.body.paddingX, paddingBottom: footer ? 8 : 24 + insets.bottom }}>
            {children}
          </ScrollView>
          {footer ? (
            <View style={{ paddingTop: SH.footer.padding[0], paddingHorizontal: SH.footer.padding[1], paddingBottom: SH.footer.padding[2] + insets.bottom,
              borderTopWidth: scrolled ? 1 : 0, borderTopColor: c.border.hairline }}>
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Option row inside a sheet: 48 dp, selected = orange SemiBold + check. */
export function SheetOption({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const { c, scheme } = useTheme();
  const sel = SH.body.selectedText;
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: !!selected }} onPress={onPress}
      style={{ minHeight: SH.body.optionRowHeight, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Txt v="body" color={selected ? sel[scheme] : undefined} weight={selected ? 600 : 400} style={{ flex: 1 }}>{label}</Txt>
      {selected ? <Icon name="check" size={SH.body.check.size} color={c.brand.text} /> : null}
    </Pressable>
  );
}
