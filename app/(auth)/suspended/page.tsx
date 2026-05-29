import Link from "next/link";

export default function SuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6">
      <section className="w-full max-w-lg rounded-lg border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Account Suspended
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your account is currently suspended. Please contact support to restore
          access.
        </p>
        <Link
          href="mailto:support@ecomstore.com"
          className="mt-6 inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90"
        >
          Contact Support
        </Link>
      </section>
    </main>
  );
}
