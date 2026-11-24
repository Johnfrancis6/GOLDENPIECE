import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { initials } from '../auth/access';
import { useT, LangContext } from '../i18n';
import { useContext } from 'react';
import { ThemeContext } from '../theme/ThemeContext';
import { BrandTile } from './BrandTile';

/** D top bar: 56, surface1, hairline under; brand · bank; tab pills; live state, analyst, avatar 32. */
export function TopBar({ live }: { live: boolean }) {
  const t = useT();
  const { name } = useAuth();
  return (
    <header className="top">
      <div className="top-brand">
        <BrandTile />
        <b>{t('brand')}</b>
        <span className="sep" aria-hidden>·</span>
        <span className="bank">{t('bank.demo')}</span>
      </div>
      <nav className="tabs" aria-label={t('brand')}>
        <NavLink to="/" end className="tab">{t('tabs.queue')}</NavLink>
        <NavLink to="/settings" className="tab">{t('tabs.settings')}</NavLink>
        <NavLink to="/ops" className="tab">{t('tabs.ops')}</NavLink>
      </nav>
      <div className="top-right">
        <span className={live ? 'live' : 'live live-off'} role="status"><i aria-hidden />{live ? t('live') : t('offline')}</span>
        <span className="who">{name}</span>
        <AccountMenu label={initials(name)} />
      </div>
    </header>
  );
}

function AccountMenu({ label }: { label: string }) {
  const t = useT();
  const { signOut } = useAuth();
  const { lang, setLang } = useContext(LangContext);
  const { scheme, setScheme } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="avatar" aria-label={t('menu')} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {label}
      </button>
      {open ? (
        <div className="menu" role="menu">
          <button role="menuitem" onClick={() => { setScheme(scheme === 'light' ? 'dark' : 'light'); setOpen(false); }}>
            {scheme === 'light' ? t('theme.dark') : t('theme.light')}
          </button>
          <button role="menuitem" onClick={() => { setLang(lang === 'fr' ? 'en' : 'fr'); setOpen(false); }}>{t('lang.switch')}</button>
          <a role="menuitem" href="/legal">{t('legal.link')}</a>
          <button role="menuitem" className="menu-danger" onClick={() => void signOut()}>{t('signout')}</button>
        </div>
      ) : null}
    </div>
  );
}
