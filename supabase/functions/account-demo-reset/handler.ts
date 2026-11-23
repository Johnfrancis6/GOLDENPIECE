/** `account-demo-reset`: delete the caller's demo data and clone the same persona again. */
import type { Deps } from "../_shared/deps.ts";
import { json, serve } from "../_shared/http.ts";

export function makeHandler(d: Deps) {
  return serve(async (req) => {
    const caller = await d.getCaller(req);
    return json(await d.rpc("demo_reset", { p_user_id: caller.id }));
  });
}
