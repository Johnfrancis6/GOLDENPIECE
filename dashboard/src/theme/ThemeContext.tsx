import { createContext } from 'react';
import type { Scheme } from './index';

export const ThemeContext = createContext<{ scheme: Scheme; setScheme: (s: Scheme) => void }>({ scheme: 'light', setScheme: () => {} });

/** Light by default (D: "Light theme by default, dark option"); the choice is kept per browser. */
export function initialScheme(): Scheme {
  try {
    const s = localStorage.getItem('gp.theme');
    if (s === 'dark' || s === 'light') return s;
  } catch { /* storage blocked */ }
  return 'light';
}
