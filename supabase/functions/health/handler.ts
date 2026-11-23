/**
 * `health` (ARCHITECTURE §11): one JSON verdict for UptimeRobot.
 * 200 {ok:true, …} or 503 {ok:false, failing:[…]}. No secrets, no user data.
 */
export type HealthVerdict = {
  ok: boolean;
  failing: string[];
  warnings: string[];
  checks: Record<string, string>;
  db_size_mb?: number;
  at?: string;
};

export async function handle(
  req: Request,
  getVerdict: () => Promise<HealthVerdict>,
): Promise<Response> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(JSON.stringify({ error: { code: "INVALID", message_key: "method" } }), {
      status: 405,
      headers: { "Content-Type": "application/json", Allow: "GET, HEAD" },
    });
  }
  let body: HealthVerdict;
  try {
    body = await getVerdict();
  } catch (_e) {
    body = { ok: false, failing: ["db_unreachable"], warnings: [], checks: { db: "failing" } };
  }
  return new Response(req.method === "HEAD" ? null : JSON.stringify(body), {
    status: body.ok ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
