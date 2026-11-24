import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { supabase } from './lib/supabase';
import './theme/global.css';
import { applyTheme } from './theme';
import { initialScheme } from './theme/ThemeContext';

applyTheme(initialScheme()); // before the first paint (no light flash in dark)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App client={supabase} />
  </StrictMode>,
);
