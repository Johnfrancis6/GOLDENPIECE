/** Server-side Supabase settings for Edge Functions (service role; never in the app). */
export function serviceKey(): string {
  const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (k) return k;
  // New API keys: SUPABASE_SECRET_KEYS = {"default": "sb_secret_…"} [assumed format]
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const v = JSON.parse(keys);
      if (typeof v?.default === "string") return v.default;
    } catch { /* fall through */ }
  }
  throw new Error("no service key in the function environment");
}

export function supabaseUrl(): string {
  const u = Deno.env.get("SUPABASE_URL");
  if (!u) throw new Error("SUPABASE_URL missing");
  return u;
}

/** Error from PostgREST: HTTP status + API.md §1 body ({code, message, details, hint}). */
export class RpcError extends Error {
  constructor(readonly status: number, readonly body: Record<string, unknown>) {
    super(`rpc failed: ${status} ${JSON.stringify(body)}`);
  }
}

/** Signature of `rpc` (injected in handlers so tests can fake the database). */
export type Rpc = <T = any>(name: string, args?: Record<string, unknown>) => Promise<T>;

/** Call an `api` RPC with the service role. */
export async function rpc<T>(name: string, args: Record<string, unknown> = {}, fetchFn = fetch): Promise<T> {
  const key = serviceKey();
  const res = await fetchFn(`${supabaseUrl()}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      body = { code: "UNAVAILABLE", message: "rpc." + name, details: text.slice(0, 200), hint: null };
    }
    throw new RpcError(res.status, body);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T; // void functions answer 204 / empty body
}
