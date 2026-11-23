/** Edge handlers with a fake database (no network). */
import { assert, assertEquals } from "@std/assert";
import type { Deps } from "./deps.ts";
import { ApiError } from "./http.ts";
import { RpcError } from "./supabase_env.ts";
import { makeHandler as demoStart } from "../account-demo-start/handler.ts";
import { makeHandler as linkComplete } from "../provider-link-complete/handler.ts";
import { makeHandler as linkStart } from "../provider-link-start/handler.ts";
import { makeHandler as tick } from "../provider-tick/handler.ts";

type Call = { name: string; args: any };

function deps(answers: Record<string, (args: any) => unknown>, anon = true): Deps & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    rpc: (name, args) => {
      calls.push({ name, args });
      const f = answers[name];
      if (!f) return Promise.reject(new Error("unexpected rpc " + name));
      try {
        return Promise.resolve(f(args) as any);
      } catch (e) {
        return Promise.reject(e);
      }
    },
    getCaller: (req) =>
      req.headers.get("authorization")
        ? Promise.resolve({ id: "u1", isAnonymous: anon })
        : Promise.reject(new ApiError("UNAUTHORIZED", "auth.missing")),
  };
}

const post = (body: unknown, headers: Record<string, string> = { authorization: "Bearer t" }) =>
  new Request("http://x/fn", { method: "POST", body: JSON.stringify(body), headers });

Deno.test("demo-start: warm-up needs no auth and touches nothing", async () => {
  const d = deps({});
  const r = await demoStart(d)(post({ warmup: true }, {}));
  assertEquals(r.status, 200);
  assertEquals(d.calls, []);
});

Deno.test("demo-start: 401 without token, 403 for a real account, 400 for unknown persona", async () => {
  assertEquals((await demoStart(deps({}))(post({ persona: "dakar_salaried" }, {}))).status, 401);
  assertEquals((await demoStart(deps({}, false))(post({ persona: "dakar_salaried" }))).status, 403);
  const r = await demoStart(deps({}))(post({ persona: "x" }));
  assertEquals(r.status, 400);
  assertEquals((await r.json()).code, "INVALID");
});

Deno.test("demo-start: passes the client IP for the 5/IP/hour limit; RPC 429 keeps Retry-After", async () => {
  const d = deps({ demo_start: () => ({ user_id: "u1", persona: "dakar_salaried", accounts_count: 3 }) });
  const ok = await demoStart(d)(
    post({ persona: "dakar_salaried" }, {
      authorization: "Bearer t",
      "x-forwarded-for": "203.0.113.9, 10.0.0.1",
    }),
  );
  assertEquals(ok.status, 200);
  assertEquals(d.calls[0].args.p_client_ip, "203.0.113.9");
  const limited = deps({
    demo_start: () => {
      throw new RpcError(429, {
        code: "RATE_LIMITED",
        message: "demo.rate_limited",
        details: null,
        hint: "720",
      });
    },
  });
  const r = await demoStart(limited)(post({ persona: "dakar_salaried" }));
  assertEquals(r.status, 429);
  assertEquals(r.headers.get("Retry-After"), "720");
});

Deno.test("link-start: validates institution and scopes", async () => {
  assertEquals((await linkStart(deps({}))(post({ institution: "Bad Name" }))).status, 400);
  assertEquals(
    (await linkStart(deps({}))(post({ institution: "kola_money", scopes: ["payments"] }))).status,
    400,
  );
  const d = deps({ sim_link_start: () => ({ link_id: "l1", consent: { simulated: true } }) });
  const r = await linkStart(d)(post({ institution: "kola_money" }));
  assertEquals(r.status, 200);
  assertEquals(d.calls[0].args.p_scopes, ["balances", "transactions"]);
});

const LINK = "6f1c2a52-8d0e-4d6a-9a77-2f3b7e2c1a10";

Deno.test("link-complete: refusal revokes; a non-pending link is a conflict", async () => {
  const d = deps({
    provider_link_get: () => ({ id: LINK, adapter: "sim", status: "pending" }),
    provider_link_revoke: () => ({ ok: true }),
  });
  const r = await linkComplete(d)(post({ link_id: LINK, approve: false }));
  assertEquals((await r.json()).status, "revoked");
  assertEquals(d.calls.map((c) => c.name), ["provider_link_get", "provider_link_revoke"]);
  const d2 = deps({ provider_link_get: () => ({ id: LINK, adapter: "sim", status: "active" }) });
  assertEquals((await linkComplete(d2)(post({ link_id: LINK, approve: true }))).status, 409);
});

Deno.test("link-complete: accounts, full history paged into ingest, balances", async () => {
  let page = 0;
  const e = {
    providerEntryId: "a",
    accountId: "main",
    status: "BOOK",
    creditDebit: "CRDT",
    amountMinor: 10,
    currency: "XOF",
    bookingTs: "2026-01-01T00:00:00Z",
    valueDate: "2026-01-01",
    bankTxCode: { domain: "PMNT", family: "RCDT", subFamily: "OTHR" },
  };
  const d = deps({
    provider_link_get: () => ({ id: LINK, adapter: "sim", status: "pending" }),
    sim_link_complete: () => [{ providerAccountId: "main", kind: "momo" }],
    provider_accounts_upsert:
      () => [{ id: "a1", provider_account_id: "main", kind: "momo", currency: "XOF" }],
    sim_list_entries:
      () => (++page < 3 ? { entries: [e], next_cursor: "c" + page } : { entries: [e], next_cursor: null }),
    provider_ingest: () => ({ inserted: 1, transaction_ids: ["t"] }),
    sim_security_events: () => [],
    sim_balances: () => [{ accountId: "main", amountMinor: 30, currency: "XOF", at: "2026-01-01T00:00:00Z" }],
    provider_set_balances: () => [{ account_id: "a1", balance: { m: 30, c: "XOF" } }],
  });
  const r = await linkComplete(d)(post({ link_id: LINK, approve: true }));
  const j = await r.json();
  assertEquals(r.status, 200);
  assertEquals(j.new_count, 3);
  assertEquals(j.accounts[0].balance, { m: 30, c: "XOF" });
  assertEquals(d.calls.filter((c) => c.name === "provider_ingest").length, 3);
  assertEquals(d.calls.find((c) => c.name === "provider_set_balances")!.args.p_balances[0].amountMinor, 30);
});

Deno.test("provider-tick: secret required; a failing link is not acknowledged", async () => {
  assertEquals(
    (await tick(deps({ cron_secret_ok: () => false }))(post({}, { "x-gp-cron": "s" }))).status,
    403,
  );
  const d = deps({
    cron_secret_ok: () => true,
    sim_tick_collect: () => [
      {
        link_id: "l1",
        user_id: "u",
        until: "t",
        accounts: [{ account_id: "a", entries: [{}] }],
        security_events: [],
      },
      {
        link_id: "l2",
        user_id: "u",
        until: "t",
        accounts: [{ account_id: "bad", entries: [{}] }],
        security_events: [],
      },
    ],
    provider_ingest: (a) => {
      if (a.p_account_id === "bad") throw new RpcError(400, { code: "INVALID" });
      return { inserted: 1 };
    },
    sim_tick_ack: () => ({ ok: true }),
  });
  const j = await (await tick(d)(post({}, { "x-gp-cron": "s".repeat(64) }))).json();
  assertEquals(j, { links: 2, failed: 1, inserted: 1 });
  const acks = d.calls.filter((c) => c.name === "sim_tick_ack").map((c) => c.args.p_link_id);
  assertEquals(acks, ["l1"]);
  assert(true);
});
