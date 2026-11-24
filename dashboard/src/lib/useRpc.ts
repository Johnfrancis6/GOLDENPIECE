import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';

export type Rpc<T> = { data: T | null; loading: boolean; error: boolean; reload: () => Promise<void> };

/**
 * One `api.*` RPC read for a tab body (settings, Ops). A refusal that names the analyst / aal check re-reads the
 * session so the guard sends the analyst back to the TOTP challenge (same rule as the queue, B9.2).
 */
export function useRpc<T>(fn: string, args: Record<string, unknown> = {}): Rpc<T> {
  const { client, refresh } = useAuth();
  const [s, setS] = useState<{ data: T | null; loading: boolean; error: boolean }>({ data: null, loading: true, error: false });
  const key = JSON.stringify(args);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const n = ++seq.current;
    setS((p) => ({ ...p, loading: true }));
    const { data, error } = await client.rpc(fn, JSON.parse(key) as Record<string, unknown>);
    if (n !== seq.current) return;
    if (error) {
      if (/analyst|forbidden|jwt/i.test(`${error.message} ${error.code}`)) await refresh();
      setS((p) => ({ ...p, loading: false, error: true }));
      return;
    }
    setS({ data: data as T, loading: false, error: false });
  }, [client, refresh, fn, key]);

  useEffect(() => { void Promise.resolve().then(reload); }, [reload]);
  return { ...s, reload };
}
