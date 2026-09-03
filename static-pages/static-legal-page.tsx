import { appHref } from '@/lib/static-pages';

export function StaticLegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy';
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
      <article className="mx-auto max-w-3xl rounded-[28px] border border-border bg-card p-6 shadow-sm sm:p-10">
        <a
          href={appHref()}
          className="text-sm font-bold text-primary hover:underline"
        >
          ← Back to Roam
        </a>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Roam
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          {privacy ? 'Privacy Policy' : 'Terms of Service'}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          GitHub Pages edition · Effective September 3, 2026
        </p>

        <div className="mt-9 space-y-8 text-[15px] leading-7 text-muted-foreground">
          {privacy ? (
            <>
              <section>
                <h2 className="font-heading text-2xl font-semibold text-foreground">
                  What Roam stores
                </h2>
                <p className="mt-2">
                  Browsing does not require an account. If you use Google
                  sign-in, your name, email, profile picture, searches, opened
                  places, and saved visits are stored only in this browser so
                  Roam can personalize recommendations on this device.
                </p>
              </section>
              <section>
                <h2 className="font-heading text-2xl font-semibold text-foreground">
                  Maps, routes, and weather
                </h2>
                <p className="mt-2">
                  Place searches, map views, live routes, and weather are
                  requested from Google. Uber and Rapido open as independent
                  services under their own privacy policies.
                </p>
              </section>
              <section>
                <h2 className="font-heading text-2xl font-semibold text-foreground">
                  Your choices
                </h2>
                <p className="mt-2">
                  You can sign out at any time. Clearing this site’s browser
                  storage removes the device-local profile and activity history
                  used by this edition.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="font-heading text-2xl font-semibold text-foreground">
                  Using Roam
                </h2>
                <p className="mt-2">
                  Roam helps you discover places, compare travel information,
                  view weather, and open third-party ride services. Use the
                  service lawfully and confirm important trip details before
                  travelling.
                </p>
              </section>
              <section>
                <h2 className="font-heading text-2xl font-semibold text-foreground">
                  Information and availability
                </h2>
                <p className="mt-2">
                  Place listings, opening status, distance, duration, weather,
                  and recommendations may be incomplete, delayed, or
                  inaccurate. Google, Uber, and Rapido are independent services
                  with their own terms and pricing.
                </p>
              </section>
            </>
          )}
        </div>

        <div className="mt-10 border-t border-border pt-6 text-sm">
          <a
            href={appHref(privacy ? 'terms' : 'privacy')}
            className="font-bold text-primary hover:underline"
          >
            {privacy ? 'Terms of Service' : 'Privacy Policy'}
          </a>
        </div>
      </article>
    </main>
  );
}
