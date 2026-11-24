import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import type { Client as SupabaseClient } from './lib/supabase';
import { AuthProvider } from './auth/AuthProvider';
import { Guard } from './auth/Guard';
import { LangContext, initialLang, type Lang } from './i18n';
import { Layout } from './shell/Layout';
import { Login } from './screens/Login';
import { Placeholder } from './screens/Placeholder';
import { applyTheme, type Scheme } from './theme';
import { ThemeContext, initialScheme } from './theme/ThemeContext';

export function App({ client }: { client: SupabaseClient }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [scheme, setSchemeState] = useState<Scheme>(initialScheme);

  useEffect(() => {
    applyTheme(scheme);
  }, [scheme]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const langCtx = useMemo(() => ({
    lang,
    setLang: (l: Lang) => {
      setLangState(l);
      try { localStorage.setItem('gp.lang', l); } catch { /* storage blocked */ }
    },
  }), [lang]);
  const themeCtx = useMemo(() => ({
    scheme,
    setScheme: (s: Scheme) => {
      setSchemeState(s);
      try { localStorage.setItem('gp.theme', s); } catch { /* storage blocked */ }
    },
  }), [scheme]);

  return (
    <LangContext.Provider value={langCtx}>
      <ThemeContext.Provider value={themeCtx}>
        <AuthProvider client={client}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/legal" element={<Placeholder title="legal.link" />} />
              <Route element={<Guard><Layout /></Guard>}>
                <Route index element={<Placeholder title="tabs.queue" />} />
                <Route path="settings" element={<Placeholder title="settings.title" />} />
                <Route path="ops" element={<Placeholder title="ops.title" />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeContext.Provider>
    </LangContext.Provider>
  );
}
