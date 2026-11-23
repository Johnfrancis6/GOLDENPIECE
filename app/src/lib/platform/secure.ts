/** Secrets on the device: expo-secure-store (Android Keystore). Web preview
 * only: localStorage (never used on the phone). */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const web = Platform.OS === 'web';

export async function secureGet(key: string): Promise<string | null> {
  if (web) return globalThis.localStorage?.getItem(`gp.${key}`) ?? null;
  return SecureStore.getItemAsync(key);
}
export async function secureSet(key: string, value: string): Promise<void> {
  if (web) { globalThis.localStorage?.setItem(`gp.${key}`, value); return; }
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
export async function secureDelete(key: string): Promise<void> {
  if (web) { globalThis.localStorage?.removeItem(`gp.${key}`); return; }
  await SecureStore.deleteItemAsync(key);
}
