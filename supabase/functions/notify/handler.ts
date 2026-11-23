/**
 * `notify` (API.md §3, design N, BACKEND_NEEDS #6). Called by pg_net from `ops.notify`
 * (alert inserted / status changed / reminder / held notification released) with
 * `{push_id}`. The payload (FCM data message) is built in SQL; this function sends it.
 *
 * B5: sending is STUBBED — Expo Push (FCM v1) is wired in B8. The outcome is recorded
 * so latency (`alerts.created_at` → `push_log.sent_at`) is measurable from now on:
 * `stub` when the user has push tokens, `no_token` otherwise.
 */
import type { Deps } from "../_shared/deps.ts";
import { requireCron } from "../_shared/auth.ts";
import { ApiError, json, serve } from "../_shared/http.ts";

export type PushMessage = {
  to: string;
  data: Record<string, unknown>;
  priority: "high" | "normal";
  channelId: string;
};

type Queued = {
  push_id: number;
  status: string;
  demo: boolean;
  payload: { channel: string; silent?: boolean } & Record<string, unknown>;
  tokens: string[];
};

/** Expo push messages for one notification (data-only: the app renders the text from i18n keys). */
export function buildMessages(q: Queued): PushMessage[] {
  return q.tokens.map((to) => ({
    to,
    data: q.payload,
    priority: q.payload.channel === "security" && !q.payload.silent ? "high" : "normal",
    channelId: q.payload.channel,
  }));
}

export function makeHandler(d: Deps, send: (m: PushMessage[]) => Promise<string | null> = stubSend) {
  return serve(async (req, body) => {
    await requireCron(req, d.rpc);
    const id = body.push_id;
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      throw new ApiError("INVALID", "notify.push_id");
    }
    const q = await d.rpc<Queued | null>("notify_get", { p_push_id: id });
    if (!q) throw new ApiError("NOT_FOUND", "notify.not_found");
    if (q.status !== "queued") return json({ push_id: id, status: q.status, skipped: true });
    const messages = buildMessages(q);
    let status = "no_token", ticket: string | null = null;
    if (messages.length > 0) {
      ticket = await send(messages);
      status = "stub";
    }
    await d.rpc("notify_done", {
      p_push_id: id,
      p_status: status,
      p_ticket: ticket,
      p_detail: { messages: messages.length, demo: q.demo },
    });
    return json({ push_id: id, status, messages: messages.length });
  });
}

/** Until B8: nothing leaves the server. */
export function stubSend(_m: PushMessage[]): Promise<string | null> {
  return Promise.resolve(null);
}
