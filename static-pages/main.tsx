import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import Home from '@/app/page';
import LoginPage from '@/app/login/page';
import '@/app/globals.css';
import { StaticLegalPage } from '@/static-pages/static-legal-page';

function currentRoute() {
  const base = (import.meta.env.BASE_URL as string | undefined) || '/';
  const path = window.location.pathname.startsWith(base)
    ? window.location.pathname.slice(base.length)
    : window.location.pathname.replace(/^\//, '');
  return path.replace(/^\/+|\/+$/g, '');
}

function App() {
  const route = currentRoute();
  if (route === 'login') return <LoginPage />;
  if (route === 'privacy') return <StaticLegalPage kind="privacy" />;
  if (route === 'terms') return <StaticLegalPage kind="terms" />;
  return <Home />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
