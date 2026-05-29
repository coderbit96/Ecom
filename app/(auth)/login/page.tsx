import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { hasGoogleOAuthCredentials } from "@/lib/auth.config";

export default function LoginPage() {
  const googleEnabled = hasGoogleOAuthCredentials();
  const appUrl = process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
  const callbackUrl = `${appUrl.replace(/\/$/, "")}/api/auth/callback/google`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6">
      <section className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-lg font-semibold text-white">
            ES
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Ecom Store</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue shopping.
          </p>
        </div>

        <GoogleSignInButton enabled={googleEnabled} />

        {!googleEnabled ? (
          <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Google OAuth setup</p>
            <p className="mt-1">
              Create a Google Cloud OAuth Client ID for a web application, then set
              <code className="mx-1">GOOGLE_CLIENT_ID</code>
              and
              <code className="mx-1">GOOGLE_CLIENT_SECRET</code>
              in <code>.env.local</code>.
            </p>
            <p className="mt-2 break-all">
              Authorized redirect URI: <code>{callbackUrl}</code>
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
