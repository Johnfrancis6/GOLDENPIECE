import { Outlet } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { useT } from '../i18n';
import { Banner } from '../ui/Banner';
import { TopBar } from './TopBar';
import { useLive } from './useLive';

export function Layout() {
  const { client, state } = useAuth();
  const live = useLive(client, state === 'ok');
  const t = useT();
  return (
    <div className="shell">
      <TopBar live={live} />
      <div className="shell-main">
        <Outlet context={{ live, offlineBanner: <Banner kind="warning">{t('offline')}</Banner> }} />
      </div>
    </div>
  );
}
