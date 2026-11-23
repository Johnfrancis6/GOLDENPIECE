/** `provider-link-start` (API.md §2.1): consent descriptor for the in-app consent screen. */
import type { Deps } from "../_shared/deps.ts";
import { ApiError, json, serve } from "../_shared/http.ts";
import { adapterForInstitution } from "../_shared/provider/registry.ts";
import type { Scope } from "../_shared/provider/types.ts";

const SCOPES: Scope[] = ["balances", "transactions"];

export function makeHandler(d: Deps) {
  return serve(async (req, body) => {
    const caller = await d.getCaller(req);
    const institution = body.institution;
    if (typeof institution !== "string" || !/^[a-z_]{2,40}$/.test(institution)) {
      throw new ApiError("INVALID", "link.institution");
    }
    const scopes = (body.scopes ?? SCOPES) as Scope[];
    if (!Array.isArray(scopes) || scopes.length === 0 || scopes.some((s) => !SCOPES.includes(s))) {
      throw new ApiError("INVALID", "link.scopes");
    }
    const options = body.options ?? {};
    if (typeof options !== "object" || options === null || Array.isArray(options)) {
      throw new ApiError("INVALID", "link.options");
    }
    const adapter = adapterForInstitution(institution, d.rpc);
    const r = await adapter.startLink({
      userId: caller.id,
      institution,
      scopes,
      options: options as Record<string, unknown>,
    });
    return json({ link_id: r.linkId, consent: r.consent });
  });
}
