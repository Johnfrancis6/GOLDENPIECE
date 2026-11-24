import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';

/** Analyst role + aal2, else login + TOTP (D §5). */
export function Guard({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const loc = useLocation();
  if (state === 'loading') return <div className="page-loading" aria-busy="true" />;
  if (state !== 'ok') return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
