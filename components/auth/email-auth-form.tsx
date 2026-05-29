"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Eye, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingAnimation } from "@/components/shared/loading-animation";

type EmailAuthFormProps = {
  mode: "login" | "signup";
};

export function EmailAuthForm({ mode }: EmailAuthFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/app-auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      redirectTo?: string;
    } | null;

    setPending(false);

    if (!response.ok) {
      setError(payload?.error ?? "Authentication failed.");
      return;
    }

    router.push(payload?.redirectTo ?? "/");
    router.refresh();
  }

  const isSignup = mode === "signup";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {isSignup ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-100">Name</span>
          <input
            className="h-16 w-full rounded-3xl border border-slate-700/80 bg-[#050816] px-5 text-base text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
            name="name"
            autoComplete="name"
            placeholder="Your name"
          />
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-100">Email</span>
        <input
          className="h-16 w-full rounded-3xl border border-slate-700/80 bg-[#050816] px-5 text-base text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Enter your email"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-100">Password</span>
        <span className="flex h-16 items-center rounded-3xl border border-slate-700/80 bg-[#050816] px-5 transition focus-within:border-cyan-300">
          <input
            className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-400"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={6}
            placeholder="Enter your password"
          />
          <button
            type="button"
            className="ml-3 text-slate-400 transition hover:text-white"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
          >
            <Eye className="size-5" />
          </button>
        </span>
      </label>

      {error ? (
        <div className="flex gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <Button
        className="h-16 w-full rounded-3xl bg-cyan-400 text-base font-bold text-[#06101f] hover:bg-cyan-300"
        type="submit"
        disabled={pending}
      >
        {pending ? (
          <LoadingAnimation label={isSignup ? "Creating account" : "Signing in"} variant="inline" />
        ) : (
          <>
            {isSignup ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
            {isSignup ? "Sign Up" : "Sign In"}
          </>
        )}
      </Button>

      <p className="text-center text-sm text-slate-400">
        {isSignup ? "Already have an account?" : "New here?"}{" "}
        <Link className="font-semibold text-cyan-300 hover:underline" href={isSignup ? "/login" : "/signup"}>
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
