import { assert, assertEquals } from "@std/assert";
import { type Backlog, buildMessages, groqChat, makeHandler, parseAnswer, pickModel } from "./handler.ts";
import { buildMessages as pushMessages, makeHandler as notifyHandler } from "../notify/handler.ts";

const backlog: Backlog = {
  categories: [{ id: "groceries.supermarket", fr: "Supermarché", en: "Supermarket" }, {
    id: "transfers.family",
    fr: "Famille",
    en: "Family",
  }],
  items: [
    {
      user_id: "u1",
      cp_key: "n:hyper",
      h: "h1",
      cp_name: "Hyper Teranga",
      remittance: "PAIEMENT CB HYPER TERANGA",
      op: null,
      mcc: "5411",
      dc: "DBIT",
      bt: "CCRD.POSD",
      person: false,
      amount_bucket: "5-50k",
      known_people: ["Awa Diop"],
    },
    {
      user_id: "u1",
      cp_key: "m:+22199",
      h: "h2",
      cp_name: "Awa Diop",
      remittance: "Envoi Awa Diop +221 99 123 45 67",
      op: "p2p_out",
      mcc: null,
      dc: "DBIT",
      bt: null,
      person: true,
      amount_bucket: "<5k",
      known_people: ["Awa Diop"],
    },
  ],
};

Deno.test("categorise-llm: the request carries no name, phone, amount or id", () => {
  const { messages, counts } = buildMessages(backlog);
  const user = messages[1].content;
  for (const s of ["Awa", "Diop", "+221", "u1", "m:+22199", "h2"]) {
    assert(!user.includes(s), `${s} leaked: ${user}`);
  }
  assert(user.includes("Hyper Teranga"));
  assert(user.includes("montant=<5k F CFA"));
  assert((counts.person ?? 0) >= 2 && counts.phone === 1);
});

Deno.test("categorise-llm: answers are validated against the category list", () => {
  const a = parseAnswer(
    '{"results":[{"i":0,"category":"groceries.supermarket"},{"i":1,"category":"made.up"}]}',
    backlog,
  );
  assertEquals(a.map((x) => x.category_id), ["groceries.supermarket", null]);
  assertEquals(parseAnswer("not json", backlog).map((x) => x.category_id), [null, null]);
});

Deno.test("categorise-llm: end to end with fakes; 503 without key", async () => {
  const calls: string[] = [];
  const rpc = (name: string, args: any) => {
    calls.push(name);
    if (name === "cron_secret_ok") return Promise.resolve(true);
    if (name === "llm_backlog") return Promise.resolve(backlog);
    if (name === "llm_apply") return Promise.resolve({ updated: 3, labels: args.p_items.length });
    return Promise.resolve(null);
  };
  const d = { rpc: rpc as any, getCaller: () => Promise.reject(new Error("no")) };
  const req = () => new Request("http://x", { method: "POST", body: "{}", headers: { "x-gp-cron": "s" } });
  const r = await makeHandler(
    d,
    () => Promise.resolve('{"results":[{"i":0,"category":"groceries.supermarket"}]}'),
  )(req());
  assertEquals(r.status, 200);
  assertEquals((await r.json()).updated, 3);
  assertEquals(calls, ["cron_secret_ok", "llm_backlog", "llm_apply", "llm_job"]);
  assertEquals((await makeHandler(d, null)(req())).status, 503);
});

Deno.test("notify: stub records the outcome; data message per token; non-queued skipped", async () => {
  const done: any[] = [];
  const q = (status: string, tokens: string[]) => ({
    push_id: 7,
    status,
    demo: true,
    tokens,
    payload: { channel: "security", type: "confirm" },
  });
  const mk = (st: string, tokens: string[]) => ({
    rpc: ((name: string, args: any) => {
      if (name === "cron_secret_ok") return Promise.resolve(true);
      if (name === "notify_get") return Promise.resolve(q(st, tokens));
      if (name === "notify_done") done.push(args);
      return Promise.resolve(null);
    }) as any,
    getCaller: () => Promise.reject(new Error("no")),
  });
  const req = (b: unknown) =>
    new Request("http://x", { method: "POST", body: JSON.stringify(b), headers: { "x-gp-cron": "s" } });
  assertEquals(
    (await notifyHandler(mk("queued", ["ExponentPushToken[a]"]))(req({ push_id: 7 }))).status,
    200,
  );
  assertEquals(done[0].p_status, "stub");
  await notifyHandler(mk("queued", []))(req({ push_id: 7 }));
  assertEquals(done[1].p_status, "no_token");
  assertEquals((await (await notifyHandler(mk("stub", ["t"]))(req({ push_id: 7 }))).json()).skipped, true);
  assertEquals((await notifyHandler(mk("queued", []))(req({ push_id: "x" }))).status, 400);
  const m = pushMessages(q("queued", ["a", "b"]) as any);
  assertEquals(m.length, 2);
  assertEquals(m[0].priority, "high");
  assertEquals(m[0].channelId, "security");
});

Deno.test("groqChat switches to an available model when the configured one is gone (404)", async () => {
  const calls: string[] = [];
  const fake = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = String(url);
    if (u.endsWith("/models")) {
      calls.push("models");
      return Promise.resolve(
        Response.json({ data: [{ id: "whisper-large-v3" }, { id: "llama-3.3-70b-versatile" }] }),
      );
    }
    const m = JSON.parse(String(init?.body)).model;
    calls.push(m);
    if (m === "llama-3.1-8b-instant") {
      return Promise.resolve(new Response("model_not_found", { status: 404 }));
    }
    return Promise.resolve(Response.json({ choices: [{ message: { content: '{"c":[]}' } }] }));
  };
  const chat = groqChat("k", "llama-3.1-8b-instant", fake as typeof fetch);
  assertEquals(await chat([]), '{"c":[]}');
  assertEquals(calls, ["llama-3.1-8b-instant", "models", "llama-3.3-70b-versatile"]);
  assertEquals(await chat([]), '{"c":[]}'); // remembered
  assertEquals(calls.length, 4);
});

Deno.test("pickModel prefers the list, skips audio/guard models", () => {
  assertEquals(pickModel(["openai/gpt-oss-20b", "llama-3.3-70b-versatile"]), "llama-3.3-70b-versatile");
  assertEquals(pickModel(["whisper-large-v3", "llama-guard-4-12b", "qwen/qwen3-32b"]), "qwen/qwen3-32b");
  assertEquals(pickModel([]), null);
});
