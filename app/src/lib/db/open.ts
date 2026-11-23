/** Open the local database: SQLCipher on Android (expo-sqlite plugin option
 * `useSQLCipher`), 256-bit random key kept in expo-secure-store (§8.1). */
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { secureGet, secureSet } from '../platform/secure';
import { randomHex } from '../platform/crypto';
import { migrate } from './schema';
import type { Db } from './types';

const KEY = 'db_key_v1';
let opened: Promise<Db> | null = null;

export function openDb(): Promise<Db> {
  if (!opened) opened = open();
  return opened;
}

async function open(): Promise<Db> {
  const db = await SQLite.openDatabaseAsync('goldenpiece.db');
  if (Platform.OS !== 'web') {
    let key = await secureGet(KEY);
    if (!key) { key = randomHex(32); await secureSet(KEY, key); }
    // raw key (no KDF): must be the very first statement on the connection
    await db.execAsync(`PRAGMA key = "x'${key}'"`);
  }
  await db.execAsync('PRAGMA journal_mode = WAL');
  await migrate(db as unknown as Db);
  return db as unknown as Db;
}
