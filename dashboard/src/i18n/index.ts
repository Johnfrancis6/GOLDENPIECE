/**
 * Dashboard FR / EN strings. D §7 (screens/d-bank-dashboard.md) copy is used
 * as is; login/TOTP strings are composed by B9.1 (delegated, CHAIN_LOG) and
 * reuse the app wording where it exists (O7/O9 e-mail and password).
 */
import { createContext, useContext } from 'react';

export type Lang = 'fr' | 'en';

const fr = {
  'brand': 'GOLDENPIECE',
  'bank.demo': 'Banque de démonstration',
  'tabs.queue': "File d'alertes",
  'tabs.settings': 'Réglages du modèle',
  'tabs.ops': 'Ops',
  'live': 'En direct',
  'offline': 'Hors ligne',
  'filters.status': 'Statut',
  'filters.score': 'Score',
  'filters.type': 'Type',
  'filters.24h': '24 h',
  'groups.review': 'En analyse · {n}',
  'groups.decided': "Décidées aujourd'hui",
  'simulated': 'Décision simulée',
  'empty.title': 'Aucune alerte en analyse',
  'empty.body': 'Les nouvelles alertes arrivent ici en direct.',
  'settings.title': 'Réglages du modèle',
  'settings.intro': 'Les seuils 40 et 70 ne bougent jamais. Les paramètres ci-dessous évoluent dans leurs bornes, chaque changement est enregistré.',
  'settings.reset': 'Rétablir les valeurs par défaut',
  'ops.title': 'Ops',
  'soon': 'Cette vue arrive dans une prochaine étape.',
  // Login + TOTP (delegated, composed B9.1)
  'login.title': 'Espace analyste',
  'login.sub': 'Réservé aux analystes de la banque.',
  'login.email': 'E-mail',
  'login.password': 'Mot de passe',
  'login.submit': 'Se connecter',
  'login.err.invalid': 'E-mail ou mot de passe incorrect.',
  'login.err.network': 'Connexion impossible. Vérifiez le réseau, puis réessayez.',
  'login.err.role': "Ce compte n'a pas accès à l'espace analyste.",
  'password.show': 'Afficher le mot de passe',
  'password.hide': 'Masquer le mot de passe',
  'totp.enroll.title': 'Activez la double vérification',
  'totp.enroll.sub': "Scannez ce code avec votre application d'authentification, puis entrez le code à 6 chiffres affiché.",
  'totp.enroll.secret': 'Ou saisissez cette clé : {secret}',
  'totp.challenge.title': 'Code de vérification',
  'totp.challenge.sub': "Entrez le code à 6 chiffres de votre application d'authentification.",
  'totp.code': 'Code à 6 chiffres',
  'totp.err': 'Code incorrect. Réessayez avec le code affiché maintenant.',
  'totp.verify': 'Vérifier',
  'signout': 'Se déconnecter',
  'theme.dark': 'Thème sombre',
  'theme.light': 'Thème clair',
  'lang.switch': 'English',
  'menu': 'Menu du compte',
  'legal.link': 'Mentions légales',
};

type Key = keyof typeof fr;

const en: Record<Key, string> = {
  'brand': 'GOLDENPIECE',
  'bank.demo': 'Demo bank',
  'tabs.queue': 'Alert queue',
  'tabs.settings': 'Model settings',
  'tabs.ops': 'Ops',
  'live': 'Live',
  'offline': 'Offline',
  'filters.status': 'Status',
  'filters.score': 'Score',
  'filters.type': 'Type',
  'filters.24h': '24 h',
  'groups.review': 'Under review · {n}',
  'groups.decided': 'Decided today',
  'simulated': 'Simulated decision',
  'empty.title': 'No alerts under review',
  'empty.body': 'New alerts arrive here live.',
  'settings.title': 'Model settings',
  'settings.intro': 'The 40 and 70 thresholds never move. The parameters below change within their bounds, and every change is logged.',
  'settings.reset': 'Restore defaults',
  'ops.title': 'Ops',
  'soon': 'This view comes in a next step.',
  'login.title': 'Analyst workspace',
  'login.sub': "For the bank's analysts only.",
  'login.email': 'Email',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.err.invalid': 'Wrong email or password.',
  'login.err.network': "Can't connect. Check the network, then try again.",
  'login.err.role': "This account can't access the analyst workspace.",
  'password.show': 'Show password',
  'password.hide': 'Hide password',
  'totp.enroll.title': 'Turn on two-step verification',
  'totp.enroll.sub': 'Scan this code with your authenticator app, then enter the 6-digit code it shows.',
  'totp.enroll.secret': 'Or enter this key: {secret}',
  'totp.challenge.title': 'Verification code',
  'totp.challenge.sub': 'Enter the 6-digit code from your authenticator app.',
  'totp.code': '6-digit code',
  'totp.err': 'Wrong code. Try again with the code shown now.',
  'totp.verify': 'Verify',
  'signout': 'Sign out',
  'theme.dark': 'Dark theme',
  'theme.light': 'Light theme',
  'lang.switch': 'Français',
  'menu': 'Account menu',
  'legal.link': 'Legal notice',
};

export const STRINGS: Record<Lang, Record<Key, string>> = { fr, en };
export type StringKey = Key;

export function translate(lang: Lang, key: Key, args?: Record<string, string | number>): string {
  let s = STRINGS[lang][key] ?? STRINGS.fr[key] ?? key;
  if (args) for (const [k, v] of Object.entries(args)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('gp.lang');
    if (saved === 'fr' || saved === 'en') return saved;
  } catch { /* storage blocked */ }
  return typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'fr';
}

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'fr', setLang: () => {} });

export function useT() {
  const { lang } = useContext(LangContext);
  return (key: Key, args?: Record<string, string | number>) => translate(lang, key, args);
}
