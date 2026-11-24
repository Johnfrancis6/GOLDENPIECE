/** node:sqlite adapter implementing the Db subset, for Jest. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');
import type { Bind, Db } from '../src/lib/db/types';

export function memoryDb(): Db {
  const d = new DatabaseSync(':memory:');
  return {
    async execAsync(sql: string) { d.exec(sql); },
    async runAsync(sql: string, ...p: Bind[]) { const r = d.prepare(sql).run(...p); return { changes: Number(r.changes) }; },
    async getAllAsync<T>(sql: string, ...p: Bind[]) { return d.prepare(sql).all(...p) as T[]; },
    async getFirstAsync<T>(sql: string, ...p: Bind[]) { return (d.prepare(sql).get(...p) ?? null) as T | null; },
    async withTransactionAsync(fn: () => Promise<void>) {
      d.exec('begin');
      try { await fn(); d.exec('commit'); } catch (e) { d.exec('rollback'); throw e; }
    },
  };
}
