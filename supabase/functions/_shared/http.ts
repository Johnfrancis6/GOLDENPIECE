/** HTTP helpers shared by the Edge Functions (API.md §1 error body). */
import { RpcError } from "./supabase_env.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS, ...headers },
  });
}

const STATUS: Record<string, number> = {
  INVALID: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  REJECTED: 422,
  MIN_VERSION: 426,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
};

/** Error with an API.md §1 code and a message key (texts live in shared/i18n). */
export class ApiError extends Error {
  constructor(readonly code: string, readonly messageKey: string, readonly retryAfterS?: number) {
    super(`${code} ${messageKey}`);
  }
}

export function errorResponse(e: unknown): Response {
  if (e instanceof ApiError) {
    const h: Record<string, string> = e.retryAfterS ? { "Retry-After": String(e.retryAfterS) } : {};
    return json(
      {
        code: e.code,
        message: e.messageKey,
        details: null,
        hint: e.retryAfterS ? String(e.retryAfterS) : null,
      },
      STATUS[e.code] ?? 400,
      h,
    );
  }
  if (e instanceof RpcError) {
    const h: Record<string, string> = typeof e.body.hint === "string" && e.status === 429
      ? { "Retry-After": e.body.hint }
      : {};
    return json(e.body, e.status >= 400 && e.status < 600 ? e.status : 500, h);
  }
  console.error(e);
  return json({ code: "UNAVAILABLE", message: "server.unavailable", details: null, hint: null }, 503);
}

/** Wrap a handler: OPTIONS, POST only, JSON body, typed errors. */
export function serve(handler: (req: Request, body: Record<string, unknown>) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (req.method !== "POST") {
      return json({ code: "INVALID", message: "http.method", details: null, hint: null }, 405, {
        Allow: "POST",
      });
    }
    try {
      let body: Record<string, unknown> = {};
      const text = await req.text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
          body = parsed;
        } catch {
          throw new ApiError("INVALID", "http.body");
        }
      }
      return await handler(req, body);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/** First client IP (Supabase edge sets x-forwarded-for). */
export function clientIp(req: Request): string | null {
  const f = req.headers.get("x-forwarded-for");
  return f ? f.split(",")[0].trim() || null : null;
}
