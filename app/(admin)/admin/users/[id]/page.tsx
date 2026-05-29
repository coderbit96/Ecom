import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/admin/status-badge";
import { UserDetailActions } from "@/components/admin/user-detail-actions";
import { findUserById } from "@/lib/app-auth";
import { formatDate } from "@/lib/admin/format";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const user = await findUserById(params.id);

  if (!user) notFound();

  const tab = searchParams.tab ?? "orders";
  const tabs = ["orders", "activity", "reviews"];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="size-16 rounded-full object-cover" />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold">
                {(user.name ?? user.email).slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">{user.name ?? "Unnamed user"}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
              <p className="text-sm text-slate-500">Joined {formatDate(user.createdAt)}</p>
              <div className="mt-2 flex gap-2">
                <StatusBadge value={user.role} />
                <StatusBadge value={user.status} />
              </div>
            </div>
          </div>
          <UserDetailActions userId={user.id} role={user.role} status={user.status} />
        </div>
      </section>

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((item) => (
          <Link
            key={item}
            className={`px-3 py-2 text-sm font-medium capitalize ${
              tab === item
                ? "border-b-2 border-slate-950 text-slate-950"
                : "text-slate-500"
            }`}
            href={`/admin/users/${user.id}?tab=${item}`}
          >
            {item}
          </Link>
        ))}
      </div>

      {tab === "activity" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-100 p-3">
              <p className="font-medium">Account created</p>
              <p className="text-sm text-slate-500">{formatDate(user.createdAt)}</p>
            </div>
            {user.lastLoginAt ? (
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="font-medium">Last login</p>
                <p className="text-sm text-slate-500">{formatDate(user.lastLoginAt)}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "reviews" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            No reviews tracked for local auth users yet.
          </p>
        </section>
      ) : null}

      {tab === "orders" ? (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  No orders tracked for local auth users yet.
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
