/** Main tabs (C12 v2 pill bar): Accueil, Comptes, Dépenses, Placements.
 * The data provider (sync, outbox, Realtime) lives as long as the tabs. */
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { useT } from '../../i18n';
import { DataProvider } from '../../state/data';
import { TabBarPill, TabButton, TabScrollProvider } from '../../ui/TabBar';

const TABS = [
  { name: 'home', href: '/home', icon: 'house', label: 'tab.home' },
  { name: 'accounts', href: '/accounts', icon: 'wallet', label: 'tab.accounts' },
  { name: 'spending', href: '/spending', icon: 'chart-pie', label: 'tab.spending' },
  { name: 'placements', href: '/placements', icon: 'chart-line', label: 'tab.placements' },
] as const;

export default function TabsLayout() {
  const t = useT();
  return (
    <DataProvider>
      <TabScrollProvider>
        <Tabs>
          <TabSlot />
          <TabList asChild>
            <TabBarPill>
              {TABS.map((x) => (
                <TabTrigger key={x.name} name={x.name} href={x.href} asChild>
                  <TabButton name={x.name} icon={x.icon} label={t(x.label)} />
                </TabTrigger>
              ))}
            </TabBarPill>
          </TabList>
        </Tabs>
      </TabScrollProvider>
    </DataProvider>
  );
}
