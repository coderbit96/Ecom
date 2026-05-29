"use client";

import { AlertTriangle, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";

export function GoogleSignInButton({ enabled }: { enabled: boolean }) {
  const handleGoogleSignIn = async () => {
    if (!enabled) return;
    await signIn("google", { callbackUrl: "/user" });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={!enabled}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-[#dadce0] bg-white px-4 py-3 text-sm font-medium text-[#3c4043] transition hover:bg-[#f8f9fa] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-block rounded bg-[#4285f4] px-2 py-1 text-xs font-semibold text-white">
          G
        </span>
        <span>Sign in with Google</span>
        <LogIn className="h-4 w-4" />
      </button>

      {!enabled ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Google sign-in needs real OAuth credentials in <code>.env.local</code>.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
