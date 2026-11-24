/**
 * Dev gallery of the UI kit (HANDOFF "What build sessions do first" §2).
 * Query: ?scheme=dark|light&lang=fr|en&scale=1|2&reduced=1&open=sheet|toast|tallsheet
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, useTheme } from '../../theme';
import { useT } from '../../i18n';
import {
  Banner, Button, Card, CategoryBadge, Checkbox, ChoiceList, CodeBoxes, EmptyState, FailedState, IconButton, Input,
  InstitutionBadge, Keypad, ListCard, ListRow, PinDots, PinMessage, ProfileCircle, Radio, Ring, Sheet, SheetOption,
  SkeletonBar, SkeletonRow, Sparkline, StepDots, Switch, SwitchRow, TopBar, Txt, useToast,
} from '../../ui';
import { useGalleryParams } from '../../dev/GalleryFrame';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: T.layout.sectionGap, gap: T.layout.sectionTitleToContent }}>
      <Txt v="titleSection" accessibilityRole="header">{title}</Txt>
      {children}
    </View>
  );
}
const Row = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{children}</View>;

export default function Gallery() {
  const { c } = useTheme();
  const t = useT();
  const q = useGalleryParams();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [sheet, setSheet] = useState<null | 'short' | 'tall'>(q.open === 'sheet' ? 'short' : q.open === 'tallsheet' ? 'tall' : null);
  const [period, setPeriod] = useState('YTD');
  const [sw, setSw] = useState(true);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [email, setEmail] = useState('awa@exemple');
  const [pw, setPw] = useState('Baobab-2026!');
  const [search, setSearch] = useState('Séné');
  const [pin, setPin] = useState('123');
  const [shake, setShake] = useState(0);
  useEffect(() => {
    if (q.open === 'toast') toast.show({ text: 'Catégorie modifiée', action: { label: t('toast.undo'), onPress: () => {} } });
  }, [q.open, toast, t]);
  const go = (v: string) => router.push({ pathname: '/gallery/step', params: { ...q, v } });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <TopBar title="Galerie UI · B6.2" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: T.layout.screenMargin, paddingBottom: 120 }}>
        <Txt v="caption" tone="secondary">tokens {T.version} · {q.scheme ?? 'system'} · {q.lang ?? 'fr'} · font ×{q.scale ?? 1}</Txt>

        <Section title="F2 Typographie">
          {(['amountHero', 'titleScreen', 'amountLarge', 'titleSection', 'bodyStrong', 'body', 'label', 'caption', 'micro'] as const).map((n) => (
            <Txt key={n} v={n}>{n === 'amountHero' ? '12 450 000' : n} · Épargne 1 250 000</Txt>
          ))}
        </Section>

        <Section title="C1 Boutons">
          <Button label="Continuer" onPress={() => toast.show({ text: 'Réglages enregistrés' })} />
          <Button label="Plus tard" variant="secondary" />
          <Button label="Continuer" loading />
          <Button label="Continuer" disabled />
          <Row>
            <Button label="Voir tout" variant="text" size="small" />
            <Button label="Ajouter" size="small" icon="plus" block={false} />
            <Button label="Non" variant="secondary" size="small" block={false} />
            <IconButton icon="plus" a11yLabel="Ajouter" />
            <IconButton icon="ellipsis" ghost a11yLabel="Plus" />
          </Row>
          <Row>
            <Button label="Supprimer le compte" variant="destructiveText" size="small" />
            <Button label="Supprimer" variant="destructiveConfirm" size="small" block={false} />
          </Row>
        </Section>

        <Section title="C12 Barre · C17 Étapes">
          <Card variant="list"><TopBar onBack={() => {}} title="Détail du compte" right={<IconButton icon="ellipsis" ghost a11yLabel="Menu" />} /></Card>
          <Card variant="list"><TopBar onBack={() => {}} center={<StepDots index={3} total={6} />} /></Card>
          <Row>
            <Button label="Écran O2" variant="secondary" size="small" block={false} onPress={() => go('O2')} />
            <Button label="O5" variant="secondary" size="small" block={false} onPress={() => go('O5')} />
            <Button label="O10 fort" variant="secondary" size="small" block={false} onPress={() => go('O10strong')} />
            <Button label="O10 faible" variant="secondary" size="small" block={false} onPress={() => go('O10weak')} />
            <Button label="O10 aucun" variant="secondary" size="small" block={false} onPress={() => go('O10none')} />
            <Button label="O17" variant="secondary" size="small" block={false} onPress={() => go('O17')} />
          </Row>
        </Section>

        <Section title="C7 Cartes · C6 Lignes · C21 Badges">
          <Card variant="highlighted"><Txt v="bodyStrong">Carte mise en avant</Txt><Txt v="caption" tone="secondary">Bord lumineux 2 dp, une par écran au plus.</Txt></Card>
          <Card onPress={() => {}} a11yLabel="Carte"><Txt v="bodyStrong">Carte tactile</Txt><Txt v="caption" tone="secondary">Appuyer pour voir l’état pressé.</Txt></Card>
          <ListCard>
            <ListRow leading={<InstitutionBadge id="bank-baobab" name="Banque Baobab" />} title="Banque Baobab" subtitle="Banque · •• 4821" value="1 250 000 F" onPress={() => {}} />
            <ListRow leading={<InstitutionBadge id="kola-money" name="Kola Money" />} title="Kola Money" subtitle="Mobile money · •• 77" value="86 500 F" onPress={() => {}} />
            <ListRow leading={<CategoryBadge category="Transport" />} title="Taxi Dakar" subtitle="Hier, 18:40" value="−3 500 F" onPress={() => {}} />
            <ListRow leading={<CategoryBadge category="Revenus" />} title="Salaire novembre" subtitle="25 nov." value={<Txt v="amountRow" tone="gain">+650 000 F</Txt>} onPress={() => {}} />
          </ListCard>
          <Row>
            {(['Courses', 'Transport', 'Restaurant', 'Logement', 'Factures', 'Santé', 'Éducation', 'Loisirs', 'Revenus', 'Épargne', 'Transferts', 'Autres'] as const).map((k) => <CategoryBadge key={k} category={k} />)}
          </Row>
          <Row>
            <InstitutionBadge id="caisse-sahel" name="Caisse Sahel" size="small" />
            <InstitutionBadge id="savane-pay" name="Savane Pay" />
            <InstitutionBadge id="bank-baobab" name="Banque Baobab" size="large" />
            <InstitutionBadge name="Banque" generic />
            <ProfileCircle id="u1" name="Awa Diop" />
          </Row>
        </Section>

        <Section title="C16 Choix">
          <ChoiceList options={[{ key: 'fr', label: 'Français' }, { key: 'en', label: 'English' }]} value={lang} onChange={setLang} />
          <ListCard inset="none">
            <SwitchRow title="Alertes de sécurité" subtitle="Toujours actives" on={sw} onChange={setSw} />
            <SwitchRow title="Marchés" on={!sw} onChange={(v) => setSw(!v)} />
          </ListCard>
          <Row><Switch on /><Switch on={false} /><Checkbox on /><Checkbox on={false} /><Radio on /><Radio on={false} /></Row>
        </Section>

        <Section title="C2 Champs">
          <Input label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" error="Cette adresse n'est pas complète." />
          <Input label="Mot de passe" value={pw} onChangeText={setPw} password strength="strong" strengthLabel="Mot de passe solide" />
          <Input label="Prénom" value="" placeholder="Awa" help="Affiché sur l’accueil." onChangeText={() => {}} />
          <Input variant="search" placeholder="Rechercher" value={search} onChangeText={setSearch} />
          <Input label="Carte" leadingIcon="credit-card" value="4970 12•• •••• 4821" onChangeText={() => {}} disabled />
        </Section>

        <Section title="C8 Bannières">
          <Banner kind="warning" text="Hors ligne. Données du 18 nov., 14:05." />
          <Banner kind="error" text="Synchronisation impossible." action={{ label: 'Réessayer', onPress: () => {} }} />
          <Banner kind="info" text="Données de plus de 7 jours." />
        </Section>

        <Section title="C3 Code · C4 Clavier">
          <Txt v="titleScreen" align="center">{t('O18.title')}</Txt>
          <PinDots length={pin.length} shakeKey={shake} error={shake > 0 && pin.length === 6} />
          <PinMessage text={shake ? t('pin.wrong', { n: 3 }) : null} />
          <Keypad variant="pin" onBiometric={() => {}} onDigit={(d) => {
            const n = (pin + d).slice(0, 6);
            setPin(n);
            if (n.length === 6) { setShake((s) => s + 1); setTimeout(() => setPin(''), T.component.pinEntry.errorClearMs); }
          }} onDelete={() => setPin(pin.slice(0, -1))} onClear={() => setPin('')} />
          <CodeBoxes value="4821" />
          <PinDots length={2} locked />
          <PinMessage kind="locked" text={t('pin.locked', { t: '0:42' })} />
        </Section>

        <Section title="C9 Feuille · C11 Toast">
          <Row>
            <Button label="Feuille courte" variant="secondary" size="small" block={false} onPress={() => setSheet('short')} />
            <Button label="Feuille haute" variant="secondary" size="small" block={false} onPress={() => setSheet('tall')} />
            <Button label="Toast" variant="secondary" size="small" block={false} onPress={() => toast.show({ kind: 'queued', text: t('toast.queued') })} />
          </Row>
        </Section>

        <Section title="C17 Anneaux · G2 Sparkline">
          <Row>
            <Ring pct={42} />
            <Ring pct={86} size="mini" />
            <Ring pct={112} size="tile" />
            <Ring pct={40} size="learning" learning label="12/30" />
            <Ring pct={0} />
          </Row>
          <Row>
            <Sparkline values={[10, 11, 10.5, 12, 12.4, 13, 12.8, 13.6]} />
            <Sparkline values={[13, 12.2, 12.6, 11.8, 11, 11.2, 10.4]} />
            <Sparkline values={[655.957, 655.957, 655.957]} />
          </Row>
        </Section>

        <Section title="C18 Chargement">
          <ListCard>
            <SkeletonRow />
            <SkeletonRow />
          </ListCard>
          <SkeletonBar width="60%" height={T.component.skeleton.bars.heights.hero} />
        </Section>

        <Section title="C19 Vide · échec">
          <Card><EmptyState title="Aucun compte pour l'instant" text="Ajoutez un compte bancaire ou mobile money pour suivre votre argent ici." action={{ label: 'Ajouter un compte', icon: 'plus', onPress: () => {} }} /></Card>
          <Card><FailedState what="vos comptes" onRetry={() => {}} /></Card>
        </Section>
      </ScrollView>

      <Sheet open={sheet === 'short'} onClose={() => setSheet(null)} title="Période">
        {[['1M', 'Mois'], ['YTD', 'Année'], ['ITD', 'Depuis le début']].map(([k, l]) => (
          <SheetOption key={k} label={l} selected={period === k} onPress={() => { setPeriod(k); setSheet(null); }} />
        ))}
      </Sheet>
      <Sheet open={sheet === 'tall'} onClose={() => setSheet(null)} title="Filtres" size="tall"
        footer={<Button label="Appliquer" onPress={() => setSheet(null)} />}>
        {Array.from({ length: 14 }, (_, i) => <SheetOption key={i} label={`Catégorie ${i + 1}`} selected={i === 2} onPress={() => {}} />)}
      </Sheet>
    </View>
  );
}
