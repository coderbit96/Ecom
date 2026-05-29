import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SUSPENDED: "border-rose-200 bg-rose-50 text-rose-700",
  ADMIN: "border-indigo-200 bg-indigo-50 text-indigo-700",
  SUPER_ADMIN: "border-violet-200 bg-violet-50 text-violet-700",
  CUSTOMER: "border-slate-200 bg-slate-50 text-slate-700",
  GUEST: "border-slate-200 bg-slate-50 text-slate-600",
  PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
  ARCHIVED: "border-slate-200 bg-slate-50 text-slate-600",
  PROCESSING: "border-amber-200 bg-amber-50 text-amber-700",
  CONFIRMED: "border-blue-200 bg-blue-50 text-blue-700",
  SHIPPED: "border-sky-200 bg-sky-50 text-sky-700",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
  RETURNED: "border-slate-200 bg-slate-50 text-slate-700",
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
  REFUNDED: "border-purple-200 bg-purple-50 text-purple-700",
};

export function StatusBadge({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        TONES[value] ?? "border-slate-200 bg-slate-50 text-slate-700",
        className
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
