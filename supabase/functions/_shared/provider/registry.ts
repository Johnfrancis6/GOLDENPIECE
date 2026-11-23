/** Adapter registry: which adapter serves an institution / a stored link. */
import type { Rpc } from "../supabase_env.ts";
import { SimAdapter } from "./sim_adapter.ts";
import type { ProviderAdapter } from "./types.ts";

/** Every institution of the prototype is fictitious (ref.banks / ref.operators) → sim. */
export function adapterForInstitution(_institution: string, rpc: Rpc): ProviderAdapter {
  return new SimAdapter(rpc);
}

export function adapterById(id: string, rpc: Rpc): ProviderAdapter {
  if (id === "sim") return new SimAdapter(rpc);
  throw new Error(`no adapter registered for ${id}`); // 'mtn_momo_sandbox' comes later (§3.4)
}
