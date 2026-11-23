/** One SyncEngine per app run, on the encrypted local DB (§8.1). The web
 * preview may have no SQLite: callers fall back to direct calls. */
import { openDb } from '../lib/db/open';
import { SyncEngine } from '../lib/sync';
import type { Api } from '../lib/api';

let engine: Promise<SyncEngine> | null = null;

export function getEngine(api: Api): Promise<SyncEngine> {
  if (!engine) {
    engine = openDb().then((db) => new SyncEngine(db, api.rpc));
    engine.catch(() => { engine = null; });
  }
  return engine;
}
