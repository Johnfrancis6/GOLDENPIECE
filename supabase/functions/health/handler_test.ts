import { assertEquals } from "@std/assert";
import { handle } from "./handler.ts";

const ok = { ok: true, failing: [], warnings: [], checks: { db: "ok" } };

Deno.test("health: 200 when ok", async () => {
  const r = await handle(new Request("http://x/health"), () => Promise.resolve(ok));
  assertEquals(r.status, 200);
  assertEquals((await r.json()).ok, true);
});

Deno.test("health: 503 with failing checks", async () => {
  const bad = { ...ok, ok: false, failing: ["batch_late"] };
  const r = await handle(new Request("http://x/health"), () => Promise.resolve(bad));
  assertEquals(r.status, 503);
  assertEquals((await r.json()).failing, ["batch_late"]);
});

Deno.test("health: 503 db_unreachable when the RPC throws", async () => {
  const r = await handle(new Request("http://x/health"), () => Promise.reject(new Error("down")));
  assertEquals(r.status, 503);
  assertEquals((await r.json()).failing, ["db_unreachable"]);
});

Deno.test("health: POST refused", async () => {
  const r = await handle(new Request("http://x/health", { method: "POST" }), () => Promise.resolve(ok));
  assertEquals(r.status, 405);
});
