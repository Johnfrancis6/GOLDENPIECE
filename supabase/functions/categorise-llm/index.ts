import { realDeps } from "../_shared/deps.ts";
import { groqChat, makeHandler } from "./handler.ts";

const key = Deno.env.get("GROQ_API_KEY");
const model = Deno.env.get("GROQ_MODEL") ?? "llama-3.1-8b-instant";
Deno.serve(makeHandler(realDeps, key ? groqChat(key, model) : null));
