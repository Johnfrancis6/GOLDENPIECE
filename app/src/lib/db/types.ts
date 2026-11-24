/** Minimal async SQLite surface (subset of expo-sqlite's SQLiteDatabase) so the
 * sync engine runs on the phone and in Jest (node:sqlite adapter). */
export type Bind = string | number | null;
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: Bind[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, ...params: Bind[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: Bind[]): Promise<T | null>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}
