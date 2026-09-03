'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  History,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  appHref,
  IS_STATIC_PAGES,
  readStaticProfile,
  saveStaticGoogleCredential,
} from '@/lib/static-pages';

type GoogleCredentialResponse = { credential?: string };

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: Record<string, string | number | boolean>,
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const STATIC_GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined) ?? '';

export default function LoginPage() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [connected, setConnected] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (IS_STATIC_PAGES) {
      const profile = readStaticProfile();
      setClientId(STATIC_GOOGLE_CLIENT_ID);
      setConfigured(Boolean(STATIC_GOOGLE_CLIENT_ID));
      setConnected(Boolean(profile?.googleConnected));
      setDisplayName(profile?.user.displayName ?? '');
      return;
    }
    void Promise.all([
      fetch('/api/config').then((response) => response.json()),
      fetch('/api/profile', { cache: 'no-store' }).then((response) =>
        response.json(),
      ),
    ])
      .then(([config, profile]) => {
        const nextClientId =
          typeof config.googleClientId === 'string'
            ? config.googleClientId
            : '';
        setClientId(nextClientId);
        setConfigured(Boolean(nextClientId));
        setConnected(Boolean(profile.googleConnected));
        setDisplayName(profile.user?.displayName ?? '');
      })
      .catch(() => {
        setConfigured(false);
        setError('Roam could not load sign-in settings. Please try again.');
      });
  }, []);

  useEffect(() => {
    if (!clientId || connected) return;
    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || !window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: (response) => {
          if (!response.credential) {
            setError('Google did not return a sign-in credential.');
            return;
          }
          setWorking(true);
          setError('');
          if (IS_STATIC_PAGES) {
            try {
              saveStaticGoogleCredential(response.credential);
              window.location.assign(appHref());
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : 'Google sign-in failed.',
              );
              setWorking(false);
            }
            return;
          }
          void fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential }),
          })
            .then(async (result) => {
              const body = await result.json();
              if (!result.ok)
                throw new Error(body.error ?? 'Google sign-in failed.');
              window.location.assign(appHref());
            })
            .catch((reason: Error) => setError(reason.message))
            .finally(() => setWorking(false));
        },
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 320,
      });
    };

    if (window.google) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    script.onerror = () => setError('Google sign-in could not be loaded.');
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [clientId, connected]);

  return (
    <main className="min-h-screen bg-[#f5f1e8] px-4 py-5 text-foreground sm:px-6 lg:grid lg:grid-cols-[1.05fr_.95fr] lg:gap-5 lg:p-5">
      <section className="relative hidden min-h-[calc(100vh-40px)] overflow-hidden rounded-[32px] bg-[#173f36] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#d8a85c]/25 blur-2xl" />
        <div className="absolute -bottom-32 left-20 h-80 w-80 rounded-full bg-[#7aa99d]/25 blur-3xl" />
        <a
          href={appHref()}
          className="relative flex items-center gap-3 font-heading text-xl font-semibold"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[#173f36]">
            <MapPin size={20} />
          </span>
          Roam
        </a>
        <div className="relative max-w-xl">
          <p className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#c7e0d8]">
            <Sparkles size={14} /> Your city, more personal
          </p>
          <h1 className="font-heading text-6xl font-semibold leading-[.96] tracking-[-0.055em]">
            Find the places that feel like you.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/72">
            Connect Google once and Roam will remember what you explore, learn
            from places you visit, and surface better ideas next time.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-3">
          {[
            ['History', 'Keep searches and visits'],
            ['Ideas', 'Get personal recommendations'],
            ['One tap', 'Open routes and ride apps'],
          ].map(([title, copy]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur"
            >
              <p className="text-sm font-bold">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">
                {copy}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-[calc(100vh-40px)] items-center justify-center rounded-[28px] bg-[#fffdf8] px-5 py-10 shadow-[0_24px_70px_rgba(34,48,42,.10)] sm:px-10 lg:rounded-[32px] lg:px-16">
        <div className="w-full max-w-md">
          <a
            href={appHref()}
            className="mb-10 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft size={16} /> Back to discovery
          </a>
          <div className="mb-7 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
            <MapPin size={25} />
          </div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary/65">
            Welcome to Roam
          </p>
          <h2 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.045em]">
            Make every search count.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Use your Google account to create a personal Roam profile. Your
            recommendations and history stay with you
            {IS_STATIC_PAGES ? ' in this browser.' : '.'}
          </p>

          <div className="mt-7 rounded-2xl border border-border bg-background p-4">
            {connected ? (
              <div className="text-center">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={21} />
                </span>
                <p className="mt-3 font-bold">
                  You’re connected
                  {displayName ? `, ${displayName.split(' ')[0]}` : ''}.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your personalized discovery is ready.
                </p>
                <Button
                  className="mt-5 w-full rounded-full"
                  size="lg"
                  onClick={() => window.location.assign(appHref())}
                >
                  Continue to Roam
                </Button>
              </div>
            ) : configured === null ? (
              <p className="py-3 text-center text-sm font-semibold text-muted-foreground">
                Loading secure sign-in…
              </p>
            ) : configured ? (
              <div
                className="flex min-h-12 justify-center"
                ref={buttonRef}
                aria-label="Continue with Google"
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Google sign-in is being connected. The discovery map is still
                available.
              </p>
            )}
            {working && (
              <p className="mt-3 text-center text-xs font-bold text-primary">
                Verifying your Google account…
              </p>
            )}
            {error && (
              <p
                className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 space-y-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" />{' '}
              Your Google password is never shared with Roam. Google verifies
              the sign-in directly.
            </p>
            <p className="flex items-start gap-2">
              <History size={15} className="mt-0.5 shrink-0 text-primary" /> You
              can disconnect Google anytime without deleting your saved Roam
              history{IS_STATIC_PAGES ? ' from this device.' : '.'}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
