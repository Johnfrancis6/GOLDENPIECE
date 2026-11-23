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

/** Call an `api` RPC with the service role. */
export async function rpc<T>(name: string, args: Record<string, unknown> = {}, fetchFn = fetch): Promise<T> {
  const key = serviceKey();
  const res = await fetchFn(`${supabaseUrl()}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`rpc ${name} failed: ${res.status} ${await res.text()}`);
  return await res.json() as T;
}
