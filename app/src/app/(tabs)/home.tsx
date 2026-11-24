/** Accueil tab: S2 Home v2 wired to the data layer (cache paint → refresh). */
import { router } from 'expo-router';
import { useApp } from '../../state/app';
import { useData } from '../../state/data';
import { useT, type StringKey } from '../../i18n';
import { countryByIso } from '../../lib/countries';
import { HomeScreen, type HomeDest } from '../../screens/home/HomeScreen';
import { useTabScrollRef } from '../../ui/TabBar';

export default function HomeTab() {
  const { st, amountsHidden, toggleAmounts } = useApp();
  const d = useData();
  const t = useT();
  const ref = useTabScrollRef('home');
  const persona = st.persona ? t(`persona.${st.persona}.name` as StringKey) : null;
  const firstName = d.boot?.profile.first_name ?? persona;
  const tz = d.boot?.profile.timezone ?? countryByIso(st.country)?.tz ?? 'Africa/Dakar';
  const open = (dest: HomeDest, title: string) => router.push({ pathname: '/soon', params: { title, dest } });
  return (
    <HomeScreen home={d.home} recent={d.recent} loading={d.loading} state={d.state} fetchedAt={d.fetchedAt} now={d.now} txSynced={d.txSynced}
      firstName={firstName} demo={st.mode === 'demo'} hidden={amountsHidden} tz={tz}
      onEye={() => void toggleAmounts()} onRetry={() => void d.refresh()} onOpen={open} scrollRef={ref} />
  );
}
