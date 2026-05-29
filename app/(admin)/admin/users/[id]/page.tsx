import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/admin/status-badge";
import { UserDetailActions } from "@/components/admin/user-detail-actions";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/admin/format";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const user = await db.user.findUnique({
    where: { id: params.id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { payments: true } },
      activityLogs: { orderBy: { createdAt: "desc" } },
      reviews: { orderBy: { createdAt: "desc" }, include: { product: true } },
    },
  });

  if (!user) notFound();

  const tab = searchParams.tab ?? "orders";
  const tabs = ["orders", "activity", "reviews"];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {user.avatarUrl || user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl ?? user.image ?? ""} alt="" className="size-16 rounded-full object-cover" />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold">
                {(user.name ?? user.email).slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">{user.name ?? "Unnamed user"}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
              <p className="text-sm text-slate-500">{user.phone ?? "No phone"} · Joined {formatDate(user.createdAt)}</p>
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
            className={`px-3 py-2 text-sm font-medium capitalize ${tab === item ? "border-b-2 border-slate-950 text-slate-950" : "text-slate-500"}`}
            href={`/admin/users/${user.id}?tab=${item}`}
          >
            {item}
          </Link>
        ))}
      </div>

      {tab === "activity" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {user.activityLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-slate-100 p-3">
                <p className="font-medium">{log.action.replaceAll("_", " ")}</p>
                <p className="text-sm text-slate-500">{formatDateTime(log.createdAt)} · {log.ip ?? "No IP"} · {log.device ?? "Unknown device"}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "reviews" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {user.reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-slate-100 p-3">
                <p className="font-medium">{review.product.title} · {review.rating}/5</p>
                <p className="text-sm text-slate-600">{review.comment ?? "No comment"}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(review.createdAt)}</p>
              </div>
            ))}
          </div>
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
            <tbody className="divide-y divide-slate-100">
              {user.orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-medium">
                    <Link className="text-blue-700 hover:underline" href={`/admin/orders/${order.id}`}>
                      {order.id.slice(-8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={order.status} /></td>
                  <td className="px-4 py-3">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">{order.payments[0]?.method ?? "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
