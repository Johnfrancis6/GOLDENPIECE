/** Typed adapter errors (ARCHITECTURE §3.2); the app shows one generic sync error. */
export type ProviderErrorCode = "AUTH_EXPIRED" | "RATE_LIMITED" | "UNAVAILABLE" | "INVALID";

export class ProviderError extends Error {
  constructor(readonly code: ProviderErrorCode, message: string = code, readonly retryAfterS?: number) {
    super(message);
  }
}
