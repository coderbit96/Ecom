import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { getOrderList, getString, type SearchParams } from "@/lib/admin/data";
import { formatCurrency, formatDate } from "@/lib/admin/format";

const STATUS_TABS = ["", "PROCESSING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const data = await getOrderList(searchParams);
  const activeStatus = getString(searchParams, "status").toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {STATUS_TABS.map((status) => (
          <Link
            key={status || "all"}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${activeStatus === status || (!activeStatus && !status) ? "bg-slate-950 text-white" : "bg-white text-slate-600"}`}
            href={status ? `/admin/orders?status=${status}` : "/admin/orders"}
          >
            {status || "All"}
          </Link>
        ))}
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
        <input className="h-9 rounded-lg border border-slate-200 px-3 text-sm md:col-span-2" name="q" placeholder="Search order or customer" defaultValue={getString(searchParams, "q")} />
        <select className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" name="paymentMethod" defaultValue={getString(searchParams, "paymentMethod")}>
          <option value="">All payments</option>
          <option value="CARD">Card</option>
          <option value="NETBANKING">Netbanking</option>
          <option value="UPI">UPI</option>
          <option value="WALLET">Wallet</option>
          <option value="QR">QR</option>
        </select>
        <input className="h-9 rounded-lg border border-slate-200 px-3 text-sm" type="date" name="from" defaultValue={getString(searchParams, "from")} />
        <div className="flex gap-2">
          <input className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm" type="date" name="to" defaultValue={getString(searchParams, "to")} />
          <button className="h-9 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white" type="submit">
            Filter
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-medium">{order.id.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {order.user.avatarUrl || order.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={order.user.avatarUrl ?? order.user.image ?? ""} alt="" className="size-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">
                          {(order.user.name ?? order.user.email).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span>{order.user.name ?? order.user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{order.items.reduce((sum, item) => sum + item.qty, 0)}</td>
                  <td className="px-4 py-3">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3"><StatusBadge value={order.payments[0]?.method ?? "PENDING"} /></td>
                  <td className="px-4 py-3"><StatusBadge value={order.status} /></td>
                  <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-blue-700 hover:underline" href={`/admin/orders/${order.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
