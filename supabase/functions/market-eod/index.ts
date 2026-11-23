import { realMarketDeps } from "../_shared/market/deps.ts";
import { makeHandler } from "./handler.ts";

Deno.serve(makeHandler(realMarketDeps));
