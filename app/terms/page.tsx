import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Roam',
  description: 'Terms for using Roam place discovery.',
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective September 3, 2026
        </p>

        <div className="mt-9 space-y-8 text-[15px] leading-7 text-muted-foreground">
          <section>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Using Roam
            </h2>
            <p className="mt-2">
              Roam helps you discover places, compare estimated travel
              information, view weather, and open third-party ride services. You
              agree to use the service lawfully and not interfere with its
              operation or other users.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Information and availability
            </h2>
            <p className="mt-2">
              Place listings, opening status, distance, duration, weather, and
              recommendations may be incomplete, delayed, or inaccurate. Confirm
              important details with the venue or service provider before
              travelling. Roam may change or become temporarily unavailable
              without notice.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Third-party services
            </h2>
            <p className="mt-2">
              Google, Uber, Rapido, and other linked services are independent
              providers. Their own terms, privacy policies, pricing, and safety
              rules apply when you use them. Roam does not book, operate, or
              guarantee transportation.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Accounts
            </h2>
            <p className="mt-2">
              Google sign-in is optional. You are responsible for maintaining
              control of your Google account and for activity performed through
              your Roam session.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Contact
            </h2>
            <p className="mt-2">
              Questions about these terms can be sent to{' '}
              <a
                href="mailto:kukrejadhairya@gmail.com"
                className="font-bold text-primary hover:underline"
              >
                kukrejadhairya@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-sm">
          <Link
            href="/privacy"
            className="font-bold text-primary hover:underline"
          >
            Privacy Policy
          </Link>
        </div>
      </article>
    </main>
  );
}
