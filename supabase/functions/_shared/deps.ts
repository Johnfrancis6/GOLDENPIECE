/** Real dependencies of the handlers (tests inject fakes). */
import { type GetCaller, getCaller } from "./auth.ts";
import { type Rpc, rpc } from "./supabase_env.ts";

export type Deps = { rpc: Rpc; getCaller: GetCaller };

export const realDeps: Deps = { rpc: (name, args) => rpc(name, args), getCaller: (req) => getCaller(req) };
