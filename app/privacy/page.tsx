import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Roam',
  description:
    'How Roam handles account, search, visit, maps, and weather data.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
      <article className="mx-auto max-w-3xl rounded-[28px] border border-border bg-card p-6 shadow-sm sm:p-10">
        <Link
          href="/"
          className="text-sm font-bold text-primary hover:underline"
        >
          ← Back to Roam
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Roam
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective September 3, 2026
        </p>

        <div className="mt-9 space-y-8 text-[15px] leading-7 text-muted-foreground">
          <section>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              What Roam collects
            </h2>
            <p className="mt-2">
              You can browse Roam without signing in. If you choose Google
              sign-in, Roam receives your Google account identifier, name, email
              address, and profile picture. Roam also stores searches, places
              you open, and places you mark as visited so it can build your
              personal recommendations.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              How the information is used
            </h2>
            <p className="mt-2">
              Account information keeps your history separate from other users.
              Activity information is used only to show recent activity and
              recommend categories and places that may interest you. Roam does
              not sell personal information or use it for advertising.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Maps, routes, weather, and ride apps
            </h2>
            <p className="mt-2">
              When configured, place searches, map views, routes, and weather
              requests are provided through Google services. Opening Uber or
              Rapido sends the selected destination to that service under its
              own privacy policy. A Google Maps key you enter manually is kept
              in your browser and used only to load Google Maps.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Storage and security
            </h2>
            <p className="mt-2">
              Roam uses a secure, HTTP-only session cookie after sign-in and
              stores account and activity records in its hosted database.
              Reasonable safeguards are used to protect this information, but no
              internet service can guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Your choices
            </h2>
            <p className="mt-2">
              You may use Roam without a Google account and can sign out at any
              time. To request access to or deletion of your Roam account and
              activity data, contact{' '}
              <a
                href="mailto:kukrejadhairya@gmail.com"
                className="font-bold text-primary hover:underline"
              >
                kukrejadhairya@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Policy updates
            </h2>
            <p className="mt-2">
              This policy may be updated when Roam changes. The effective date
              above will be revised when that happens.
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-sm">
          <Link
            href="/terms"
            className="font-bold text-primary hover:underline"
          >
            Terms of Service
          </Link>
        </div>
      </article>
    </main>
  );
}
