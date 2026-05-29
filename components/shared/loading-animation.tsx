import { cn } from "@/lib/utils";

type LoadingAnimationProps = {
  label?: string;
  className?: string;
  variant?: "page" | "panel" | "inline";
};

export function LoadingAnimation({
  label = "Loading",
  className,
  variant = "panel",
}: LoadingAnimationProps) {
  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-2", className)} aria-live="polite">
        <span className="relative size-4 rounded-full border-2 border-current/25 border-t-current motion-safe:animate-spin" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[320px] w-full items-center justify-center px-4 py-10",
        variant === "page" ? "min-h-screen bg-[#020617]" : "",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative flex w-full max-w-sm flex-col items-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="relative size-24">
          <div className="absolute inset-0 rounded-full border border-slate-200" />
          <div className="absolute inset-2 rounded-full border-4 border-slate-100 border-t-amber-500 motion-safe:animate-spin" />
          <div className="absolute inset-7 rounded-full bg-slate-950" />
          <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.7)]" />
          <div className="loading-pulse-dot absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-400/40" />
        </div>

        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-slate-950">
          {label}
        </p>
        <div className="mt-4 flex h-2 w-40 items-center gap-1 overflow-hidden rounded-full bg-slate-100 p-0.5">
          {[0, 1, 2, 3].map((item) => (
            <span
              key={item}
              className="loading-bar h-full flex-1 rounded-full bg-amber-500"
              style={{ animationDelay: `${item * 120}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
