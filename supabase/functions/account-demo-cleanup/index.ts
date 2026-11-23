import { realDeps } from "../_shared/deps.ts";
import { makeHandler } from "./handler.ts";

Deno.serve(makeHandler(realDeps));
