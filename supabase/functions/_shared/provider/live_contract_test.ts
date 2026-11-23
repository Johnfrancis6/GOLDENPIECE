/**
 * Provider contract against a real database (CI local stack, or dev with GP_LIVE).
 * Runs only when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEYS)
 * are set and GP_CONTRACT=1. Creates an anonymous user, clones a persona and links
 * an account profile, runs every check on every account, then deletes the user.
 */
import { assertEquals } from "@std/assert";
import { rpc, serviceKey, supabaseUrl } from "../supabase_env.ts";
import { runProviderContract } from "./contract.ts";
import { SimAdapter } from "./sim_adapter.ts";

const enabled = Deno.env.get("GP_CONTRACT") === "1";

Deno.test({
  name: "contract: SimAdapter on a real database (persona clone + linked account profile)",
  ignore: !enabled,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const key = serviceKey();
    const res = await fetch(`${supabaseUrl()}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: "{}",
    });
    const user = (await res.json()).user;
    try {
      await rpc("demo_start", {
        p_user_id: user.id,
        p_persona: Deno.env.get("GP_CONTRACT_PERSONA") ?? "dakar_salaried",
      });
      const r = await rpc<any>("sim_link_start", {
        p_user_id: user.id,
        p_institution: "kola_money",
        p_scopes: ["balances", "transactions"],
        p_country: "SN",
      });
      const accounts = await rpc<any[]>("sim_link_complete", { p_user_id: user.id, p_link_id: r.link_id });
      await rpc("provider_accounts_upsert", {
        p_user_id: user.id,
        p_link_id: r.link_id,
        p_accounts: accounts,
      });
      const links = await rpc<any[]>("provider_user_links", { p_user_id: user.id });
      const adapter = new SimAdapter((n, a) => rpc(n, a));
      for (const l of links) {
        const out = await runProviderContract(adapter, {
          linkId: l.id,
          institution: l.institution,
          accountIds: l.accounts.map((a: any) => a.provider_account_id),
          pageSize: 150,
        });
        assertEquals(out.filter((c) => !c.ok), [], `link ${l.institution}`);
      }
    } finally {
      await fetch(`${supabaseUrl()}/auth/v1/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
    }
  },
});
