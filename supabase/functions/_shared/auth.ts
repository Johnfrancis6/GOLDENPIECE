/** Caller identity for user-facing functions (verify_jwt = false: the token is checked here). */
import { ApiError } from "./http.ts";
import { serviceKey, supabaseUrl } from "./supabase_env.ts";
import type { Rpc } from "./supabase_env.ts";

export type Caller = { id: string; isAnonymous: boolean };
export type GetCaller = (req: Request) => Promise<Caller>;

/** Validates the bearer token with Supabase Auth (GET /auth/v1/user). */
export async function getCaller(req: Request, fetchFn = fetch): Promise<Caller> {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new ApiError("UNAUTHORIZED", "auth.missing");
  const res = await fetchFn(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: serviceKey(), Authorization: `Bearer ${m[1]}` },
  });
  if (!res.ok) throw new ApiError("UNAUTHORIZED", "auth.invalid");
  const u = await res.json();
  if (typeof u?.id !== "string") throw new ApiError("UNAUTHORIZED", "auth.invalid");
  return { id: u.id, isAnonymous: u.is_anonymous === true };
}

/** Server-to-server calls (pg_cron / pg_net): shared secret kept in Vault. */
export async function requireCron(req: Request, rpc: Rpc): Promise<void> {
  const s = req.headers.get("x-gp-cron");
  if (!s || !(await rpc<boolean>("cron_secret_ok", { p_secret: s }))) {
    throw new ApiError("FORBIDDEN", "cron.secret");
  }
}
