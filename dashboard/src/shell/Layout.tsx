import { Outlet, useOutletContext } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { TopBar } from './TopBar';
import { useLive, type Live } from './useLive';

export function Layout() {
  const { client, state, session } = useAuth();
  const live = useLive(client, state === 'ok', session?.access_token);
  return (
    <div className="shell">
      <TopBar live={live.live} />
      <div className="shell-main">
        <Outlet context={live satisfies Live} />
      </div>
    </div>
  );
}

export function useShell(): Live {
  return useOutletContext<Live>();
}
