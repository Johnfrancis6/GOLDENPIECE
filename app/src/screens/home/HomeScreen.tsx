/**
 * S2 Home v2 (design/screens/s2-home.md): header, card carousel + dots,
 * alert banner / B5 learning card, 4 quick actions, 2 tiles, 3 recent rows,
 * and its states (C18 skeleton, C19 empty, C8 banners, demo tag, hidden
 * amounts, 200 % font). Pure view: data comes in props, so the guided tour
 * (T) renders the same screen with bundled demo data, offline.
 */
import { useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, useTheme } from '../../theme';
import {
  Banner, Card, CategoryBadge, EmptyState, FailedState, Icon, Ring, Sheen, SkeletonBar, SkeletonRow, Sparkline, Txt,
  type SheenHandle,
  institutionColour, initials, tk, useLargeFont, type IconName,
} from '../../ui';
import { TAB_BAR_CLEARANCE, type ScrollRef } from '../../ui/TabBar';
import { useT, type StringKey } from '../../i18n';
import type { Home } from '../../lib/api';
import type { TxRow } from '../../lib/sync';
import { formatAge, formatAmount, formatAmountShort, formatChangePct, formatTime, zoned, type Lang } from '../../lib/format';
import {
  LEARNING_DAYS, LEARNING_OPS, badgeKey, cards, categoryName, hasAccounts, strip, tiles, type CardVM, type Freshness, type Strip,
} from '../../lib/home';
import { TourTarget } from '../tour/targets';
import { BUILD, Enter, OP, seg, useOpening, useOpeningCountUp } from '../../state/opening';
import { EASE } from '../../ui/base';

const H = T.screen.home;
const M = T.layout.screenMargin;
const CARD_TEXT = H.card.text;
const BADGE_TEXT = T.component.badge.institution.text;

export type HomeDest =
  | 'settings' | 'networth' | 'account' | 'alerts' | 'alert' | 'addAccount' | 'addPurchase' | 'budgets' | 'sort'
  | 'asset' | 'category' | 'operations';

export type HomeScreenProps = {
  home: Home | null;
  recent: TxRow[];
  loading: boolean;
  state: Freshness;
  fetchedAt: number | null;
  /** Clock for relative ages (ticks with the data layer). */
  now: number;
  /** First transactions sync finished (else the list shows skeleton rows). */
  txSynced: boolean;
  firstName: string | null;
  demo: boolean;
  hidden: boolean;
  tz: string;
  onEye: () => void;
  onRetry: () => void;
  onOpen: (dest: HomeDest, title: string, id?: string) => void;
  scrollRef?: ScrollRef;
  /** Tour: no scrolling by the user, no taps. */
  frozen?: boolean;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

export function HomeScreen({ scrollRef, onScroll, ...p }: HomeScreenProps) {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const h = p.home;
  const open = h?.alerts.open_count ?? 0;
  return (
    <ScrollView ref={scrollRef} scrollEnabled={!p.frozen} pointerEvents={p.frozen ? 'none' : 'auto'} onScroll={onScroll} scrollEventThrottle={16}
      style={{ flex: 1, backgroundColor: c.bg }} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: TAB_BAR_CLEARANCE + insets.bottom }}>
      <Enter at={BUILD.header} dy={-8}>
        <Header name={p.firstName} alert={open > 0} hidden={p.hidden} onEye={p.onEye}
          onProfile={() => p.onOpen('settings', t('dest.settings'))}
          onAlert={() => (open === 1 && h?.alerts.top ? p.onOpen('alert', t('banner.confirm'), h.alerts.top.id) : p.onOpen('alerts', t('dest.alerts')))} />
      </Enter>
      <StateBanner state={p.state} fetchedAt={p.fetchedAt} now={p.now} tz={p.tz} lang={t.lang} onRetry={p.onRetry} />
      {p.loading && !h ? <HomeSkeleton />
        : !h ? <View style={{ paddingTop: 24 }}><FailedState what={t('dest.home')} onRetry={p.onRetry} /></View>
        : !hasAccounts(h) ? <NoAccount onAdd={() => p.onOpen('addAccount', t('dest.addAccount'))} />
        : <Body {...p} home={h} />}
    </ScrollView>
  );
}

// ── header ──────────────────────────────────────────────────────────────────
function Header({ name, alert, hidden, onEye, onProfile, onAlert }: { name: string | null; alert: boolean; hidden: boolean; onEye: () => void; onProfile: () => void; onAlert: () => void }) {
  const { scheme } = useTheme();
  const t = useT();
  const A = H.header.avatar;
  return (
    <View style={{ minHeight: T.component.navigation.header.height, flexDirection: 'row', alignItems: 'center', paddingHorizontal: M, gap: 8 }}>
      <Pressable onPress={onProfile} accessibilityRole="button" accessibilityLabel={t('dest.settings')} hitSlop={4}
        style={{ width: A, height: A, borderRadius: A / 2, backgroundColor: institutionColour(name ?? 'GP'), alignItems: 'center', justifyContent: 'center' }}>
        <Txt fixed spec={{ size: 14, lineHeight: 18, weight: 600 }} color={BADGE_TEXT}>{initials(name ?? 'GOLDEN PIECE')}</Txt>
      </Pressable>
      <Txt spec={H.header.greeting} accessibilityRole="header" style={{ flex: 1, marginLeft: 4 }} numberOfLines={2}>
        {name ? t('hello', { name }) : t('helloNoName')}
      </Txt>
      {alert ? <RoundButton icon="shield-alert" label={t('a11y.alertOpen')} onPress={onAlert} dot fill={tk(H.header.iconButton.fill, scheme)} /> : null}
      <RoundButton icon={hidden ? 'eye-off' : 'eye'} label={hidden ? t('eye.show') : t('eye.hide')} onPress={onEye} fill={tk(H.header.iconButton.fill, scheme)} />
    </View>
  );
}

function RoundButton({ icon, label, onPress, dot, fill }: { icon: IconName; label: string; onPress: () => void; dot?: boolean; fill: string }) {
  const { c, scheme } = useTheme();
  const S = H.header.iconButton.size;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={2}
      style={{ width: S, height: S, borderRadius: S / 2, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={22} />
      {dot ? <View style={{ position: 'absolute', right: 9, top: 9, width: 10, height: 10, borderRadius: 5, backgroundColor: scheme === 'dark' ? c.loss : '#C8283C', borderWidth: 2, borderColor: fill }} /> : null}
    </Pressable>
  );
}

function StateBanner({ state, fetchedAt, now, tz, lang, onRetry }: { state: Freshness; fetchedAt: number | null; now: number; tz: string; lang: Lang; onRetry: () => void }) {
  const t = useT();
  if (state === 'fresh') return null;
  const age = fetchedAt ? formatAge(new Date(fetchedAt), new Date(now), tz, lang).toLowerCase() : '';
  const b = state === 'offline' ? <Banner kind="warning" text={t('state.offline')} />
    : state === 'old' ? <Banner kind="warning" text={t('state.old')} action={{ label: t('failed.retry'), onPress: onRetry }} />
    : state === 'error' ? <Banner kind="error" text={t('state.error')} action={{ label: t('failed.retry'), onPress: onRetry }} />
    : <Banner kind="info" text={t('state.stale', { age })} />;
  return <View style={{ paddingHorizontal: M, paddingBottom: 8 }}>{b}</View>;
}

// ── body ────────────────────────────────────────────────────────────────────
function Body(p: HomeScreenProps & { home: Home }) {
  const t = useT();
  const h = p.home;
  const s = strip(h);
  return (
    <>
      <Carousel home={h} hidden={p.hidden} demo={p.demo} onOpen={p.onOpen} />
      {s ? <TourTarget k="alert"><Enter at={BUILD.banner} dy={16} style={{ paddingHorizontal: M, marginTop: 14 }}><StripBlock s={s} onOpen={p.onOpen} /></Enter></TourTarget> : null}
      <TourTarget k="actions">
        <Actions count={h.uncategorised_count} onOpen={p.onOpen} />
      </TourTarget>
      <TourTarget k="tiles">
        <Enter at={BUILD.tiles} dy={8}><TilesRow home={h} hidden={p.hidden} onOpen={p.onOpen} /></Enter>
      </TourTarget>
      <TourTarget k="list">
        <Enter at={BUILD.listHead} dy={24} style={{ marginTop: 22, paddingHorizontal: M }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Txt spec={{ size: 17, lineHeight: 24, weight: 600 }} accessibilityRole="header">{t('list')}</Txt>
            <Pressable onPress={() => p.onOpen('operations', t('dest.operations'))} accessibilityRole="button" hitSlop={12}>
              <Txt spec={{ size: 13, lineHeight: 18, weight: 600 }} tone="brand">{t('seeAll')}</Txt>
            </Pressable>
          </View>
          <Recent rows={p.recent} hidden={p.hidden} tz={p.tz} lang={t.lang} now={p.now} syncing={!p.txSynced} />
        </Enter>
      </TourTarget>
    </>
  );
}

// ── card carousel + dots ─────────────────────────────────────────────────────
function Carousel({ home, hidden, demo, onOpen }: { home: Home; hidden: boolean; demo: boolean; onOpen: HomeScreenProps['onOpen'] }) {
  const { width } = useWindowDimensions();
  const t = useT();
  const { c } = useTheme();
  const list = cards(home);
  const [page, setPage] = useState(0);
  const PEEK_VISIBLE = 32; // preview: 12 gap + 32 of the next card at 360 dp
  const GAP = 12;
  const cw = Math.min(H.card.size[0], Math.min(width, T.layout.maxContentWidth) - M - GAP - PEEK_VISIBLE);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (cw + GAP));
    if (i !== page) setPage(Math.max(0, Math.min(list.length - 1, i)));
  };
  const op = useOpening();
  const move = op?.build ? {
    opacity: seg(op.clock, [OP.card.appear, OP.card.appear + 150], [0, 1], EASE.standard),
    transform: [
      { translateX: seg(op.clock, OP.card.moveUp as [number, number], [OP.card.offset[0], 0], EASE.morph) },
      { translateY: seg(op.clock, OP.card.moveUp as [number, number], [OP.card.offset[1], 0], EASE.morph) },
    ],
  } : undefined;
  return (
    <View style={{ marginTop: 8 }}>
      <Animated.View style={move}>
      <TourTarget k="card">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cw + GAP} decelerationRate="fast"
          disableIntervalMomentum onScroll={onScroll} scrollEventThrottle={32}
          contentContainerStyle={{ paddingLeft: M, paddingRight: M, gap: GAP }}>
          {list.map((x, i) => (
            <View key={x.kind === 'account' ? x.id : 'nw'} style={{ width: cw }}
              accessibilityHint={t('a11y.carousel', { i: i + 1, n: list.length })}>
              {x.kind === 'networth'
                ? <NetworthCard v={x} cur={home.ref_currency} hidden={hidden} demo={demo} onPress={() => onOpen('networth', t('dest.networth'))} />
                : <AccountCard v={x} hidden={hidden} visible={page === i && !op} onPress={() => onOpen('account', x.name, x.id)} />}
            </View>
          ))}
        </ScrollView>
      </TourTarget>
      </Animated.View>
      <TourTarget k="dots">
        <Enter at={BUILD.dots} style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {list.map((x, i) => (
            <View key={i} style={{ height: H.dots.size, width: i === page ? H.dots.active[0] : H.dots.size, borderRadius: H.dots.size / 2,
              backgroundColor: i === page ? c.brand.text : c.surface3 }} />
          ))}
        </Enter>
      </TourTarget>
    </View>
  );
}

function CardPill({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: H.card.pillFill, alignSelf: 'flex-start' }}>
      {children}
    </View>
  );
}

function NetworthCard({ v, cur, hidden, demo, onPress }: { v: Extract<CardVM, { kind: 'networth' }>; cur: string; hidden: boolean; demo: boolean; onPress: () => void }) {
  const t = useT();
  const large = useLargeFont();
  const G = H.card.gradient.stops;
  // card amount in the short "F" form (preview: "13 439 800 F"); abbreviated by F6 when it would not fit 256 dp
  const full = formatAmount(v.net, cur, t.lang, { row: true });
  const shown = useOpeningCountUp(v.net); // M7 count-up during M14, else the value
  const amount = hidden ? formatAmount(v.net, cur, t.lang, { hidden: true, row: true })
    : (full.length > (large ? 9 : 14) ? formatAmountShort(shown, cur, t.lang).replace(/F[\s\u00a0]CFA$/, 'F') : formatAmount(shown, cur, t.lang, { row: true }));
  const up = (v.dayAbs ?? 0) >= 0;
  const day = v.dayAbs === null ? null
    : hidden ? formatChangePct(v.dayPct ?? 0, t.lang)
    : t('card.day', { amount: formatAmount(v.dayAbs, cur, t.lang, { signed: true, row: true }) });
  const foot = t(footKey(v.accounts, v.positions, t.lang), { n: v.accounts, m: v.positions });
  const a11y = `${t('card.label')}, ${hidden ? '•••' : full}${day ? `, ${day}` : ''}, ${foot}`;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} accessibilityHint={t('a11y.openChart')}
      style={({ pressed }) => ({ minHeight: H.card.size[1], borderRadius: H.card.radius, overflow: 'hidden', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <LinearGradient colors={G.map((s) => s[1] as string) as [string, string, ...string[]]} locations={G.map((s) => s[0] as number) as [number, number, ...number[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -60, top: -70, width: H.card.ring.size, height: H.card.ring.size, borderRadius: H.card.ring.size / 2, borderWidth: H.card.ring.stroke, borderColor: H.card.ring.colour }} />
      <View style={{ flex: 1, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 14, justifyContent: 'space-between', gap: 8 }}>
        <View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <CardPill><Txt spec={{ size: 12, lineHeight: 16, weight: 600 }} color={CARD_TEXT}>{t('card.label')}</Txt></CardPill>
            {demo ? <CardPill><Txt spec={{ size: 12, lineHeight: 16, weight: 600 }} color={CARD_TEXT}>{t('card.demo')}</Txt></CardPill> : null}
          </View>
          <Txt spec={{ ...H.card.amount, tabular: true, letterSpacing: -0.5, maxFontSizeMultiplier: T.typography.scale.amountHero.maxFontSizeMultiplier }} color={CARD_TEXT} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ marginTop: 18 }}>{amount}</Txt>
          {day ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Icon name={up ? 'trending-up' : 'trending-down'} size={16} color={CARD_TEXT} stroke={2.2} />
              <Txt spec={{ size: 13, lineHeight: 18, weight: 500 }} color={CARD_TEXT}>{day}</Txt>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <Txt spec={{ size: 12, lineHeight: 16, weight: 500 }} color={CARD_TEXT} style={{ flexShrink: 1 }}>{foot}</Txt>
          <CardPill>
            <Icon name="chart-line" size={14} color={CARD_TEXT} stroke={2.2} />
            <Txt spec={{ size: 12, lineHeight: 16, weight: 600 }} color={CARD_TEXT}>{t('card.chart')}</Txt>
          </CardPill>
        </View>
      </View>
    </Pressable>
  );
}

/** Singular forms: FR "0 compte" / "1 compte" are singular, EN only 1. */
export function footKey(n: number, m: number, lang: Lang): StringKey {
  const one = (x: number) => (lang === 'fr' ? x <= 1 : x === 1);
  return one(n) && one(m) ? 'card.foot.11' : one(n) ? 'card.foot.n1' : one(m) ? 'card.foot.m1' : 'card.foot';
}

const KIND_LABEL: Record<string, StringKey> = { bank: 'kind.bank', momo: 'kind.momo', broker: 'kind.broker', card: 'kind.card' };

function AccountCard({ v, hidden, visible, onPress }: { v: Extract<CardVM, { kind: 'account' }>; hidden: boolean; visible: boolean; onPress: () => void }) {
  const { c, scheme } = useTheme();
  const t = useT();
  const sheen = useRef<SheenHandle>(null);
  const bank = v.accKind === 'bank';
  const amount = formatAmount(v.balanceMinor, v.currency, t.lang, { hidden, row: true });
  return (
    <Pressable onPress={() => { if (bank) sheen.current?.play(); onPress(); }} accessibilityRole="button" accessibilityLabel={`${v.name}, ${hidden ? '•••' : amount}`}
      style={({ pressed }) => ({ minHeight: H.card.size[1], borderRadius: H.card.radius, backgroundColor: scheme === 'dark' ? '#1B1B1B' : '#FFFFFF', overflow: 'hidden',
        borderWidth: 1, borderColor: c.border.hairline, padding: 20, justifyContent: 'space-between', gap: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      {bank ? <Sheen ref={sheen} visible={visible} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: institutionColour(v.institution ?? v.id), alignItems: 'center', justifyContent: 'center' }}>
          <Txt fixed spec={{ size: 13, lineHeight: 18, weight: 600 }} color={BADGE_TEXT}>{initials(v.name)}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="bodyStrong" numberOfLines={2}>{v.name}</Txt>
          <Txt v="caption" tone="secondary">{t(KIND_LABEL[v.accKind] ?? 'kind.bank')}</Txt>
        </View>
      </View>
      <Txt spec={{ size: 26, lineHeight: 34, weight: 600, tabular: true }} numberOfLines={1} adjustsFontSizeToFit>{amount}</Txt>
    </Pressable>
  );
}

// ── alert banner / B5 learning card ────────────────────────────────────────
function StripBlock({ s, onOpen }: { s: NonNullable<Strip>; onOpen: HomeScreenProps['onOpen'] }) {
  const { c, scheme } = useTheme();
  const t = useT();
  if (s.kind === 'learning') return <LearningCard days={s.days} ops={s.ops} />;
  const SB = T.component.scoreBadge[scheme];
  const tone = s.kind === 'notified' ? SB.notified : SB.confirm;
  const icon: IconName = s.kind === 'notified' ? 'shield-check' : s.kind === 'many' ? 'shield-alert' : 'rotate-cw-fading-clock';
  const text = s.kind === 'many' ? t('banner.many', { n: s.count }) : s.kind === 'notified' ? t('banner.notified') : t('banner.confirm');
  const action = s.kind === 'notified' ? t('banner.follow') : s.kind === 'many' ? t('seeAll') : t('banner.answer');
  const go = () => (s.kind === 'many' ? onOpen('alerts', t('dest.alerts')) : onOpen('alert', text, s.alertId));
  return (
    <Pressable onPress={go} accessibilityRole="button" accessibilityLabel={`${text}, ${action}`}
      style={({ pressed }) => ({ minHeight: H.alertBanner.height, borderRadius: H.alertBanner.radius, backgroundColor: pressed ? c.surface2 : c.surface1,
        flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8 })}>
      <View style={{ width: H.alertBanner.icon, height: H.alertBanner.icon, borderRadius: H.alertBanner.icon / 2, backgroundColor: tone.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={tone.text} stroke={2.2} />
      </View>
      <Txt spec={{ size: 13, lineHeight: 18, weight: 500 }} style={{ flex: 1 }}>{text}</Txt>
      <Txt spec={{ size: 13, lineHeight: 18, weight: 600 }} tone="brand">{action}</Txt>
    </Pressable>
  );
}

function LearningCard({ days, ops }: { days: number; ops: number }) {
  const { c } = useTheme();
  const t = useT();
  const LC = T.block.learningCard;
  const d = Math.min(days, LEARNING_DAYS), o = Math.min(ops, LEARNING_OPS);
  return (
    <Card>
      <Txt spec={LC.title} accessibilityRole="header">{t('learning.title')}</Txt>
      <Txt v="caption" tone="secondary" style={{ marginTop: 4 }}>{t('learning.text')}</Txt>
      <View style={{ flexDirection: 'row', gap: LC.rings.gap, marginTop: LC.rings.gapTop }}>
        {([[d, LEARNING_DAYS, 'learning.days'], [o, LEARNING_OPS, 'learning.ops']] as const).map(([n, of, k]) => (
          <View key={k} style={{ alignItems: 'center', gap: LC.rings.captionGap }}>
            <Ring size="learning" learning pct={(n / of) * 100} label={String(n)} a11yLabel={`${n} / ${of} ${t(k)}`} />
            <Txt v="caption" tone="secondary">{`${n}/${of} ${t(k)}`}</Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: LC.reassurance.gap, marginTop: LC.reassurance.gapTop }}>
        <Icon name="shield-check" size={LC.reassurance.iconSize} color={c.gain} />
        <Txt v="caption" tone="secondary" style={{ flex: 1 }}>{t('learning.reassure')}</Txt>
      </View>
    </Card>
  );
}

// ── quick actions ───────────────────────────────────────────────────────────
const ACTIONS: { icon: IconName; label: StringKey; dest: HomeDest; title: StringKey }[] = [
  { icon: 'plus', label: 'action.account', dest: 'addAccount', title: 'dest.addAccount' },
  { icon: 'receipt-text', label: 'action.purchase', dest: 'addPurchase', title: 'dest.addPurchase' },
  { icon: 'piggy-bank', label: 'action.budgets', dest: 'budgets', title: 'action.budgets' },
  { icon: 'tags', label: 'action.sort', dest: 'sort', title: 'dest.sort' },
];

function Actions({ count, only, onOpen }: { count: number; only?: boolean; onOpen: HomeScreenProps['onOpen'] }) {
  const { scheme } = useTheme();
  const t = useT();
  const large = useLargeFont();
  const A = H.actions;
  const list = only ? ACTIONS.slice(0, 1) : ACTIONS;
  // 200 %: labels must not break inside a word → 2 × 2 grid with wider cells
  return (
    <View style={{ flexDirection: 'row', flexWrap: large ? 'wrap' : 'nowrap', justifyContent: only ? 'center' : 'space-between',
      paddingHorizontal: large ? M : 28, marginTop: 16, rowGap: 16 }}>
      {list.map((a, i) => {
        const primary = i === 0;
        const a11y = a.dest === 'sort' && count > 0 ? t('a11y.sort', { n: count }) : t(a.title);
        return (
          <Enter key={a.dest} at={BUILD.actions + i * OP.homeBuild.actionStagger} scaleFrom={OP.homeBuild.actionScaleFrom} style={{ width: large ? '50%' : 72 }}>
          <Pressable onPress={() => onOpen(a.dest, t(a.title))} accessibilityRole="button" accessibilityLabel={a11y}
            style={{ alignItems: 'center', gap: 6 }}>
            {({ pressed }) => (
              <>
                <View style={{ width: A.circle, height: A.circle, borderRadius: A.circle / 2, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: primary ? A.primaryFill : tk(A.fill, scheme), opacity: pressed ? 0.8 : 1 }}>
                  <Icon name={a.icon} size={A.icon} color={primary ? T.colour.dark.brand.onFill : undefined} />
                  {a.dest === 'sort' && count > 0 ? (
                    <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
                      backgroundColor: A.primaryFill, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt fixed spec={{ size: 11, lineHeight: 14, weight: 600, tabular: true }} color={T.colour.dark.brand.onFill}>{count > 99 ? '99+' : String(count)}</Txt>
                    </View>
                  ) : null}
                </View>
                <Txt spec={A.label} align="center" numberOfLines={2}>{t(a.label)}</Txt>
              </>
            )}
          </Pressable>
          </Enter>
        );
      })}
    </View>
  );
}

// ── tiles ───────────────────────────────────────────────────────────────────
function Tile({ children, onPress, a11y }: { children: ReactNode; onPress: () => void; a11y: string }) {
  const large = useLargeFont();
  const TL = H.tiles;
  return (
    <Card onPress={onPress} a11yLabel={a11y}
      style={{ flex: large ? undefined : 1, minWidth: 0, minHeight: TL.height, borderRadius: TL.radius, padding: TL.padding }}>
      {children}
    </Card>
  );
}

function TilesRow({ home, hidden, onOpen }: { home: Home; hidden: boolean; onOpen: HomeScreenProps['onOpen'] }) {
  const { scheme } = useTheme();
  const t = useT();
  const large = useLargeFont();
  const tl = tiles(home);
  const cap = { size: 12, lineHeight: 16, weight: 400 } as const;
  const tag = tl.best && tl.best.pct >= 0 ? T.component.changeTag[scheme].gain : T.component.changeTag[scheme].loss;
  const cat = tl.top ? (T.component.badge.category.items as Record<string, { dark: { icon: string }; light: { icon: string } }>)[badgeKey(tl.top.categoryId)] : null;
  const catName = tl.top ? categoryName(tl.top.categoryId, t.lang) ?? '' : '';
  return (
    <View style={{ flexDirection: large ? 'column' : 'row', gap: H.tiles.gap, paddingHorizontal: M, marginTop: 18 }}>
      {tl.best ? (
        <Tile onPress={() => onOpen('asset', tl.best!.name)} a11y={`${t('tile.best')} ${t('tile.best.sub')}, ${tl.best.name}, ${formatChangePct(tl.best.pct, t.lang)}`}>
          <Txt spec={{ size: 12, lineHeight: 16, weight: 500 }} tone="secondary" numberOfLines={1}>{t('tile.best')}</Txt>
          <Txt spec={cap} tone="secondary">{t('tile.best.sub')}</Txt>
          <Txt spec={{ size: 16, lineHeight: 22, weight: 600 }} numberOfLines={1} style={{ marginTop: 2 }}>{tl.best.name}</Txt>
          <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 3, marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: tag.fill }}>
            <Icon name={tl.best.pct >= 0 ? 'trending-up' : 'trending-down'} size={14} color={tag.text} />
            <Txt spec={{ size: 12, lineHeight: 16, weight: 600, tabular: true }} color={tag.text}>{formatChangePct(tl.best.pct, t.lang)}</Txt>
          </View>
          <View style={{ marginTop: 6 }}><Sparkline values={tl.best.spark} size={H.tiles.spark as [number, number]} /></View>
        </Tile>
      ) : (
        <Tile onPress={() => onOpen('addPurchase', t('dest.addPurchase'))} a11y={`${t('tile.noPlacement')}, ${t('tile.noPlacement.sub')}`}>
          <Txt spec={{ size: 12, lineHeight: 16, weight: 500 }} tone="secondary">{t('tile.noPlacement')}</Txt>
          <Txt v="caption" style={{ marginTop: 8 }}>{t('tile.noPlacement.sub')}</Txt>
        </Tile>
      )}
      {tl.top ? (
        <Tile onPress={() => onOpen('category', catName)} a11y={`${t('tile.top')} ${t('tile.top.sub')}, ${catName}, ${hidden ? '•••' : formatAmount(tl.top.spent, home.ref_currency, t.lang, { row: true })}`}>
          <Txt spec={{ size: 12, lineHeight: 16, weight: 500 }} tone="secondary" numberOfLines={1}>{t('tile.top')}</Txt>
          <Txt spec={cap} tone="secondary">{t('tile.top.sub')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <Ring size="mini" pct={Math.round(tl.top.share * 100)} colour={cat ? (cat as Record<string, { icon: string }>)[scheme].icon : undefined} />
            <View style={{ flexShrink: 1 }}>
              <Txt spec={{ size: 14, lineHeight: 20, weight: 600, tabular: true }} numberOfLines={1}>{formatAmount(tl.top.spent, home.ref_currency, t.lang, { row: true, hidden })}</Txt>
              <Txt spec={cap} tone="secondary" numberOfLines={2}>{catName}</Txt>
            </View>
          </View>
        </Tile>
      ) : (
        <Tile onPress={() => onOpen('budgets', t('action.budgets'))} a11y={`${t('tile.noSpend')}, ${t('tile.noSpend.sub')}`}>
          <Txt spec={{ size: 12, lineHeight: 16, weight: 500 }} tone="secondary">{t('tile.noSpend')}</Txt>
          <Txt v="caption" style={{ marginTop: 8 }}>{t('tile.noSpend.sub')}</Txt>
        </Tile>
      )}
    </View>
  );
}

// ── recent operations (local SQLite) ────────────────────────────────────────
export function rowSubtitle(r: TxRow, tz: string, lang: Lang, now = new Date()): string {
  const kind = r.category_id ? categoryName(r.category_id, lang) : null;
  const at = new Date(r.booking_ts);
  const zA = zoned(at, tz), zN = zoned(now, tz);
  const sameDay = zA.y === zN.y && zA.mo === zN.mo && zA.d === zN.d;
  const when = sameDay ? formatTime(at, tz) : formatAge(at, now, tz, lang).toLowerCase();
  return kind ? `${kind} · ${when}` : when;
}

function Recent({ rows, hidden, tz, lang, now, syncing }: { rows: TxRow[]; hidden: boolean; tz: string; lang: Lang; now: number; syncing: boolean }) {
  const { c } = useTheme();
  const t = useT();
  // first sync still running: skeleton rows, not "no operation"
  if (!rows.length && syncing) return <Card variant="list" style={{ borderRadius: H.list.radius }}><SkeletonRow /><SkeletonRow /><SkeletonRow /></Card>;
  if (!rows.length) {
    return (
      <Card style={{ borderRadius: H.list.radius }}>
        <Txt v="caption" tone="secondary">{t('home.listEmpty')}</Txt>
      </Card>
    );
  }
  return (
    <Card variant="list" style={{ borderRadius: H.list.radius, paddingHorizontal: 14 }}>
      {rows.slice(0, H.list.rows).map((r, i) => {
        const name = r.cp_name || r.label || t('category.uncategorised');
        const credit = r.cdt_dbt_ind === 'CRDT';
        const amt = formatAmount(credit ? r.amount_minor : -r.amount_minor, r.currency, lang, { row: true, signed: credit, hidden });
        const sub = rowSubtitle(r, tz, lang, new Date(now));
        return (
          <View key={r.id} accessible accessibilityLabel={`${name}, ${sub}, ${amt}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.border.hairline }}>
            {r.category_id ? <CategoryBadge category={badgeKey(r.category_id)} /> : (
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: institutionColour(name), alignItems: 'center', justifyContent: 'center' }}>
                <Txt fixed spec={{ size: 13, lineHeight: 18, weight: 600 }} color={BADGE_TEXT}>{initials(name)}</Txt>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt spec={{ size: 15, lineHeight: 22, weight: 500 }} numberOfLines={1}>{name}</Txt>
              <Txt v="caption" tone="secondary" numberOfLines={1}>{sub}</Txt>
            </View>
            <Txt spec={{ size: 15, lineHeight: 22, weight: 600, tabular: true }} tone={credit ? 'gain' : 'primary'}>{amt}</Txt>
          </View>
        );
      })}
    </Card>
  );
}

// ── states ──────────────────────────────────────────────────────────────────
export function HomeSkeleton() {
  const { width } = useWindowDimensions();
  const cw = Math.min(H.card.size[0], width - M - 44);
  return (
    <View accessibilityLabel="…" style={{ paddingTop: 8 }}>
      <View style={{ paddingHorizontal: M }}><SkeletonBar width={cw} height={H.card.size[1]} radius={H.card.radius} /></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 36, marginTop: 40 }}>
        {[0, 1, 2, 3].map((i) => <SkeletonBar key={i} width={H.actions.circle} height={H.actions.circle} radius={H.actions.circle / 2} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: H.tiles.gap, paddingHorizontal: M, marginTop: 34 }}>
        <View style={{ flex: 1 }}><SkeletonBar width="100%" height={H.tiles.height} radius={H.tiles.radius} /></View>
        <View style={{ flex: 1 }}><SkeletonBar width="100%" height={H.tiles.height} radius={H.tiles.radius} /></View>
      </View>
      <View style={{ marginTop: 22, paddingHorizontal: M }}>
        <SkeletonRow /><SkeletonRow /><SkeletonRow />
      </View>
    </View>
  );
}

function NoAccount({ onAdd }: { onAdd: () => void }) {
  const t = useT();
  return (
    <View style={{ paddingTop: 8 }}>
      <EmptyState title={t('home.empty.title')} text={t('home.empty.text')} action={{ label: t('home.empty.primary'), icon: 'plus', onPress: onAdd }} />
    </View>
  );
}
