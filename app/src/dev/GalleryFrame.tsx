/**
 * Dev-only overrides for the gallery: ?scheme=dark|light&lang=fr|en&scale=1|2&reduced=1.
 * On native the system font scale applies by itself; `scale` simulates it on web.
 */
import { useMemo, type ReactNode } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ThemeContext, makeTheme, useTheme, type Scheme } from '../theme';
import { LangContext } from '../i18n';
import { FontScaleContext, ReducedMotionProvider } from '../ui';

export function useGalleryParams() {
  const q = useLocalSearchParams<{ scheme?: string; lang?: string; scale?: string; reduced?: string; open?: string; v?: string }>();
  return q;
}

export function GalleryFrame({ children }: { children: ReactNode }) {
  const q = useGalleryParams();
  const base = useTheme();
  const scheme: Scheme = q.scheme === 'light' ? 'light' : q.scheme === 'dark' ? 'dark' : base.scheme;
  const theme = useMemo(() => makeTheme(scheme), [scheme]);
  const scale = Number(q.scale) > 0 ? Number(q.scale) : 1;
  return (
    <ThemeContext.Provider value={theme}>
      <LangContext.Provider value={q.lang === 'en' ? 'en' : 'fr'}>
        <FontScaleContext.Provider value={scale}>
          <ReducedMotionProvider value={q.reduced === '1' ? true : undefined}>{children}</ReducedMotionProvider>
        </FontScaleContext.Provider>
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}
