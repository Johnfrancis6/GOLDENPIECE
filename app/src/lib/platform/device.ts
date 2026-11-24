/** Device security detection and the system biometric prompt (§1.2b). */
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { levelFrom, type SecurityLevel } from '../security';
import { secureGet, secureSet } from './secure';
import { uuidv7 } from '../uuid';

export async function detectSecurityLevel(): Promise<SecurityLevel> {
  if (Platform.OS === 'web') return 'none';
  try {
    const lvl = await LocalAuthentication.getEnrolledLevelAsync();
    return levelFrom(lvl);
  } catch {
    return 'none';
  }
}

/** System prompt; biometricsSecurityLevel 'weak' lets class-2 face unlock open the app. */
export async function systemAuthenticate(prompt: string, cancel: string, allowWeak: boolean): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const r = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt, cancelLabel: cancel, disableDeviceFallback: false,
    biometricsSecurityLevel: allowWeak ? 'weak' : 'strong',
  });
  return r.success;
}

export async function deviceId(): Promise<string> {
  let id = await secureGet('device_id');
  if (!id) { id = uuidv7(); await secureSet('device_id', id); }
  return id;
}

export function deviceInfo() {
  return {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    label: Device.modelName ?? null,
    os_version: Device.osVersion ?? null,
    app_version: Application.nativeApplicationVersion ?? '0.1.0',
  };
}
