/**
 * Simulated provider (ARCHITECTURE §3.3): templates in `sim.*`, time = anchor + offset.
 * Every call is a service-role RPC; nothing here holds state.
 */
import type { Rpc } from "../supabase_env.ts";
import { RpcError } from "../supabase_env.ts";
import { ProviderError } from "./errors.ts";
import type { Capabilities, ProviderAdapter, ProviderSecurityEvent } from "./types.ts";
import { balanceFromWire, entryFromWire } from "./wire.ts";

async function call<T>(rpc: Rpc, name: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await rpc<T>(name, args);
  } catch (e) {
    if (e instanceof RpcError) {
      if (e.status === 429) throw new ProviderError("RATE_LIMITED", name, Number(e.body.hint) || 60);
      if (e.status >= 500) throw new ProviderError("UNAVAILABLE", name);
      throw e; // business errors (NOT_FOUND, CONFLICT…) go back to the caller as they are
    }
    throw new ProviderError("UNAVAILABLE", name);
  }
}

export class SimAdapter implements ProviderAdapter {
  readonly id = "sim";
  constructor(private rpc: Rpc) {}

  capabilities(_institution: string): Capabilities {
    return {
      balances: true,
      statementHistory: true,
      pushNotifications: true,
      securityEvents: true,
      maxHistoryDays: 365,
    };
  }

  async startLink(i: Parameters<ProviderAdapter["startLink"]>[0]) {
    const r = await call<any>(this.rpc, "sim_link_start", {
      p_user_id: i.userId,
      p_institution: i.institution,
      p_scopes: i.scopes,
      p_country: i.country ?? null,
      p_options: i.options ?? {},
    });
    return { linkId: r.link_id, consent: r.consent };
  }

  completeLink(i: { userId: string; linkId: string }) {
    return call<any[]>(this.rpc, "sim_link_complete", { p_user_id: i.userId, p_link_id: i.linkId });
  }

  async getBalances(linkId: string, accountIds?: string[]) {
    const r = await call<any[]>(this.rpc, "sim_balances", {
      p_link_id: linkId,
      p_account_ids: accountIds ?? null,
    });
    return r.map(balanceFromWire);
  }

  async listEntries(i: Parameters<ProviderAdapter["listEntries"]>[0]) {
    const r = await call<any>(this.rpc, "sim_list_entries", {
      p_link_id: i.linkId,
      p_account_id: i.accountId,
      p_cursor: i.cursor ?? null,
      p_booked_from: i.bookedFrom ?? null,
      p_page_size: i.pageSize,
    });
    return { entries: (r.entries as any[]).map(entryFromWire), nextCursor: r.next_cursor ?? undefined };
  }

  listSecurityEvents(i: { linkId: string; since?: string }) {
    return call<ProviderSecurityEvent[]>(this.rpc, "sim_security_events", {
      p_link_id: i.linkId,
      p_since: i.since ?? null,
    });
  }

  async revokeLink(linkId: string) {
    await call(this.rpc, "sim_revoke", { p_link_id: linkId });
  }
}
