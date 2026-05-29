import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { hasFirebaseConfig } from "@/lib/firebase-config";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020617] px-6 py-10 text-white">
      <section className="w-full max-w-xl rounded-[28px] border border-slate-800 bg-[#0f172a] p-8 shadow-2xl shadow-black/30 sm:p-10">
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight">
            Ecom<span className="text-cyan-300">Store</span>
          </h1>
          <p className="mt-3 text-base text-slate-400">
            Sign up and continue to the store.
          </p>
        </div>

        <EmailAuthForm mode="signup" />

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-700" />
          <span className="text-xs uppercase text-slate-500">or</span>
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        <GoogleSignInButton enabled={hasFirebaseConfig()} />
      </section>
    </main>
  );
}
