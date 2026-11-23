/** Crash reports (O12 consent "Rapports de plantage"): Sentry starts only
 * after the user said yes, never on web. DSN is public by design (env file);
 * while `sentryDsn` is empty nothing is sent. */
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import env from '../data/env.dev.json';

let started = false;
export function initCrashReports(): boolean {
  const dsn = (env as { sentryDsn?: string }).sentryDsn;
  if (started || !dsn || Platform.OS === 'web') return false;
  Sentry.init({ dsn, environment: env.env, sendDefaultPii: false, tracesSampleRate: 0, attachScreenshot: false });
  started = true;
  return true;
}
