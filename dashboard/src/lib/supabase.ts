import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- no generated DB types yet; RPC payloads are typed per call
export type Client = SupabaseClient<any, any, any>;

/** One client for the SPA. The analyst RPCs live in the `api` schema. */
export const supabase: Client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'api' },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'gp.dashboard.auth' },
});
