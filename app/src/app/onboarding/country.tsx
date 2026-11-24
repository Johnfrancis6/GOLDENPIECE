/** O3 Country (S1 §2): search pill, 5 suggestions (phone country, then the
 * F CFA zone), all countries A-Z; no default selection; tap = next step. */
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useApp, phoneCountry } from '../../state/app';
import { useT } from '../../i18n';
import { Input, ListCard, ListRow, Txt } from '../../ui';
import { byName, searchCountries, suggestions, type Country } from '../../lib/countries';
import { FormFrame, go, useBack, useStep } from '../../screens/frames';

export default function CountryScreen() {
  useStep('country');
  const back = useBack('country');
  const { patch, lang, warmup } = useApp();
  const t = useT();
  const [q, setQ] = useState('');
  const sugg = useMemo(() => suggestions(phoneCountry()), []);
  const all = useMemo(() => (q.trim() ? searchCountries(q, lang) : byName(lang)), [q, lang]);
  const pick = (c: Country) => {
    void patch({ country: c.iso2 });
    warmup(); // the demo clone warms up while the tour runs
    go('tour');
  };
  const row = (c: Country) => (
    <ListRow key={c.iso2} title={c[lang]} minHeight={56} onPress={() => pick(c)}
      a11yLabel={t('O3.a11y', { name: c[lang], dial: (c.dial ?? '').replace('+', 'plus ') })}
      value={c.dial ? <Txt v="body" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>{c.dial}</Txt> : undefined} />
  );
  return (
    <FormFrame step="country" title={t('O3.title')} line={t('O3.line')} onBack={back}>
      <View style={{ marginTop: 20 }}>
        <Input variant="search" leadingIcon="search" placeholder={t('O3.search')} value={q} onChangeText={setQ}
          autoCorrect={false} autoCapitalize="none" accessibilityLabel={t('O3.search')} />
      </View>
      {q.trim() ? (
        <View style={{ marginTop: 24 }}>
          {all.length ? <ListCard inset="none">{all.map(row)}</ListCard> : <Txt v="body" tone="secondary">{t('O3.none')}</Txt>}
        </View>
      ) : (
        <>
          <Txt v="bodyStrong" weight={600} accessibilityRole="header" style={{ marginTop: 24, marginBottom: 12 }}>{t('O3.suggest')}</Txt>
          <ListCard inset="none">{sugg.map(row)}</ListCard>
          <Txt v="bodyStrong" weight={600} accessibilityRole="header" style={{ marginTop: 24, marginBottom: 12 }}>{t('O3.all')}</Txt>
          <ListCard inset="none">{all.map(row)}</ListCard>
        </>
      )}
    </FormFrame>
  );
}
