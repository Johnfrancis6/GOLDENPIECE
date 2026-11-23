/**
 * `categorise-llm` (API.md §3, ARCHITECTURE §9.4): pg_cron every 5 min when rows are left
 * uncategorised by the rules. ≤ 40 distinct labels per run, pseudonymised, sent to Groq
 * (JSON mode); answers are validated against the category list and applied with
 * category_source 'ai'. The score is not recomputed (§4.1).
 */
import type { Deps } from "../_shared/deps.ts";
import { requireCron } from "../_shared/auth.ts";
import { ApiError, json, serve } from "../_shared/http.ts";
import { pseudonymise } from "../_shared/pseudo.ts";

export type Item = {
  user_id: string;
  cp_key: string;
  h: string;
  cp_name: string | null;
  remittance: string | null;
  op: string | null;
  mcc: string | null;
  dc: string;
  bt: string | null;
  person: boolean;
  amount_bucket: string;
  known_people: string[];
};
export type Backlog = { categories: { id: string; fr: string; en: string }[]; items: Item[] };
export type Chat = (messages: { role: string; content: string }[]) => Promise<string>;

/** What leaves the server for one label: no amount, date, account or identifier. */
export function promptLine(i: number, it: Item): { line: string; counts: Record<string, number> } {
  const people = it.known_people ?? [];
  const name = it.person
    ? { text: "<PERSONNE>", counts: { person: 1 } }
    : pseudonymise(it.cp_name ?? "", people);
  const rem = pseudonymise(it.remittance ?? "", people);
  const counts: Record<string, number> = {};
  for (const c of [name.counts, rem.counts]) {
    for (const [k, v] of Object.entries(c)) counts[k] = (counts[k] ?? 0) + v;
  }
  const fields = [
    `#${i}`,
    `sens=${it.dc === "CRDT" ? "entrée" : "sortie"}`,
    it.op ? `type=${it.op}` : it.bt ? `code=${it.bt}` : "",
    it.mcc ? `mcc=${it.mcc}` : "",
    `montant=${it.amount_bucket} F CFA`,
    `contrepartie=${name.text}`,
    `libellé=${rem.text}`,
  ].filter(Boolean);
  return { line: fields.join(" | "), counts };
}

export function buildMessages(
  b: Backlog,
): { messages: { role: string; content: string }[]; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  const lines = b.items.map((it, i) => {
    const p = promptLine(i, it);
    for (const [k, v] of Object.entries(p.counts)) counts[k] = (counts[k] ?? 0) + v;
    return p.line;
  });
  const cats = b.categories.map((c) => `${c.id} (${c.fr})`).join(", ");
  return {
    counts,
    messages: [
      {
        role: "system",
        content:
          "Tu catégorises des opérations bancaires et mobile money en Afrique de l'Ouest et centrale. " +
          'Réponds uniquement en JSON: {"results":[{"i":<numéro>,"category":"<id>"|null}]}. ' +
          "Utilise seulement ces catégories: " + cats + ". Si tu n'es pas sûr, mets null.",
      },
      { role: "user", content: lines.join("\n") },
    ],
  };
}

export function parseAnswer(
  text: string,
  b: Backlog,
): { user_id: string; cp_key: string; h: string; category_id: string | null }[] {
  const valid = new Set(b.categories.map((c) => c.id));
  let results: { i: number; category: string | null }[] = [];
  try {
    const j = JSON.parse(text);
    results = Array.isArray(j?.results) ? j.results : [];
  } catch {
    results = [];
  }
  const byI = new Map(results.filter((r) => Number.isInteger(r?.i)).map((r) => [r.i, r.category]));
  return b.items.map((it, i) => {
    const c = byI.get(i);
    return {
      user_id: it.user_id,
      cp_key: it.cp_key,
      h: it.h,
      category_id: typeof c === "string" && valid.has(c) ? c : null,
    };
  });
}

export function groqChat(key: string, model: string, fetchFn = fetch): Chat {
  return async (messages) => {
    const res = await fetchFn("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0, response_format: { type: "json_object" } }),
    });
    if (!res.ok) throw new ApiError("UNAVAILABLE", `groq.${res.status}`);
    const j = await res.json();
    return j?.choices?.[0]?.message?.content ?? "";
  };
}

export function makeHandler(d: Deps, chat: Chat | null) {
  return serve(async (req) => {
    await requireCron(req, d.rpc);
    const b = await d.rpc<Backlog>("llm_backlog", { p_limit: 40 });
    if (!b.items.length) return json({ labels: 0, updated: 0 });
    if (!chat) {
      await d.rpc("llm_job", {
        p_status: "failed",
        p_items: 0,
        p_detail: { labels: b.items.length },
        p_error: "groq.no_key",
      });
      throw new ApiError("UNAVAILABLE", "groq.no_key");
    }
    const { messages, counts } = buildMessages(b);
    const t0 = Date.now();
    try {
      const answer = parseAnswer(await chat(messages), b);
      const r = await d.rpc<{ updated: number; labels: number }>("llm_apply", { p_items: answer });
      const detail = {
        labels: b.items.length,
        categorised: answer.filter((a) => a.category_id).length,
        replaced: counts,
        ms: Date.now() - t0,
      };
      await d.rpc("llm_job", { p_status: "ok", p_items: r.updated, p_detail: detail });
      return json({ ...r, ...detail });
    } catch (e) {
      await d.rpc("llm_job", {
        p_status: "failed",
        p_items: 0,
        p_detail: { labels: b.items.length },
        p_error: String(e),
      });
      throw e;
    }
  });
}
