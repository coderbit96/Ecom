"use client";

import { AlertTriangle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase-client";

export function GoogleSignInButton({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (!enabled) return;

    setIsSigningIn(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(getFirebaseAuth(), provider);
      const response = await fetch("/api/app-auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: credential.user.email,
          name: credential.user.displayName,
          image: credential.user.photoURL,
        }),
      });

      if (!response.ok) {
        throw new Error("APP_SESSION_FAILED");
      }

      router.push("/");
      router.refresh();
    } catch (signInError) {
      const code =
        signInError && typeof signInError === "object" && "code" in signInError
          ? String(signInError.code)
          : "";

      setError(
        code === "auth/popup-closed-by-user"
          ? "Google sign-in was cancelled."
          : "Google sign-in failed. Check Firebase Authentication setup."
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={!enabled || isSigningIn}
        className="flex h-16 w-full items-center justify-center gap-3 rounded-3xl border border-slate-700/80 bg-[#111827] px-4 text-base font-semibold text-white transition hover:border-cyan-300/70 hover:bg-[#172033] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex size-7 items-center justify-center rounded-full text-xl font-bold text-red-500">
          G
        </span>
        <span>{isSigningIn ? "Signing in..." : "Continue with Google"}</span>
        <LogIn className="h-4 w-4" />
      </button>

      {!enabled ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Google sign-in needs Firebase config in <code>.env.local</code>.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
    </div>
  );
}
