/** `account-demo-start` (API.md §2.1, §4.6): clone a persona into the anonymous caller (< 2 s). */
import type { Deps } from "../_shared/deps.ts";
import { ApiError, clientIp, json, serve } from "../_shared/http.ts";

export const PERSONAS = ["dakar_salaried", "abidjan_trader", "diaspora_investor"];

export function makeHandler(d: Deps) {
  return serve(async (req, body) => {
    // Warm-up (no auth, no work): the app sends it during the guided tour so the
    // isolate is hot when the user taps "Continuer en démo" (cold boot ≈ +2 s).
    if (body.warmup === true) return json({ warm: true });
    const caller = await d.getCaller(req);
    if (!caller.isAnonymous) throw new ApiError("FORBIDDEN", "demo.anonymous_only");
    const { persona, lang, country } = body as any;
    if (typeof persona !== "string" || !PERSONAS.includes(persona)) {
      throw new ApiError("INVALID", "demo.persona");
    }
    if (lang !== undefined && lang !== "fr" && lang !== "en") throw new ApiError("INVALID", "demo.lang");
    if (country !== undefined && (typeof country !== "string" || !/^[A-Z]{2}$/.test(country))) {
      throw new ApiError("INVALID", "demo.country");
    }
    const r = await d.rpc<any>("demo_start", {
      p_user_id: caller.id,
      p_persona: persona,
      p_lang: lang ?? null,
      p_country: country ?? null,
      p_client_ip: clientIp(req) ?? "unknown",
    });
    return json(r);
  });
}
