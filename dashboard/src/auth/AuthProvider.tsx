import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Client as SupabaseClient } from '../lib/supabase';
import { access, claims, displayName, type Access } from './access';

type Auth = {
  state: Access;
  session: Session | null;
  name: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  client: SupabaseClient;
};

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ client, children }: { client: SupabaseClient; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(0);

  const refresh = useCallback(async () => {
    const { data } = await client.auth.getSession();
    setSession(data.session);
    if (data.session) {
      const f = await client.auth.mfa.listFactors();
      setVerified(f.data?.totp.filter((x) => x.status === 'verified').length ?? 0);
    } else {
      setVerified(0);
    }
    setLoading(false);
  }, [client]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    const { data } = client.auth.onAuthStateChange((event) => {
      // Defer: calling auth methods inside the callback can deadlock supabase-js.
      if (event !== 'INITIAL_SESSION') setTimeout(() => void refresh(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [client, refresh]);

  const signOut = useCallback(async () => {
    await client.auth.signOut();
    await refresh();
  }, [client, refresh]);

  const value = useMemo<Auth>(() => {
    const c = claims(session?.access_token);
    const appMeta = (c.app_metadata as Record<string, unknown> | undefined) ?? session?.user.app_metadata;
    const state = access({
      loading,
      role: appMeta?.role as string | undefined,
      aal: session ? ((c.aal as 'aal1' | 'aal2') ?? 'aal1') : null,
      verifiedTotp: verified,
    });
    return { state, session, name: displayName(session?.user.user_metadata, session?.user.email), refresh, signOut, client };
  }, [session, loading, verified, refresh, signOut, client]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
