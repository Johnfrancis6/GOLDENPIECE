import { rpc } from "../_shared/supabase_env.ts";
import { handle, type HealthVerdict } from "./handler.ts";

Deno.serve((req) => handle(req, () => rpc<HealthVerdict>("health_internal")));
