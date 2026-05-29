import Link from "next/link";

import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { StatusBadge } from "@/components/admin/status-badge";
import { getDashboardData } from "@/lib/admin/data";
import { formatCurrency, formatDate } from "@/lib/admin/format";

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const kpis = [
    {
      label: "Total Revenue",
      value: formatCurrency(data.kpis.totalRevenue),
      meta: `${data.kpis.revenueChange >= 0 ? "+" : ""}${data.kpis.revenueChange.toFixed(1)}% vs last month`,
    },
    { label: "Total Orders", value: data.kpis.totalOrders.toLocaleString("en-IN"), meta: "All time" },
    { label: "New Users Today", value: data.kpis.newUsersToday.toLocaleString("en-IN"), meta: "Since midnight" },
    { label: "Active Sessions", value: data.kpis.activeSessions.toLocaleString("en-IN"), meta: "Live placeholder" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{kpi.value}</p>
            <p className="mt-1 text-sm text-slate-500">{kpi.meta}</p>
          </div>
        ))}
      </section>

      <DashboardCharts data={data.chartData} />

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Top 5 Selling Products</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Rank</th>
                  <th className="py-2">Product</th>
                  <th className="py-2">Units</th>
                  <th className="py-2">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.topProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="py-3 font-medium">#{product.rank}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.image} alt="" className="size-10 rounded-md object-cover" />
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3">{product.unitsSold}</td>
                    <td className="py-3">{formatCurrency(product.revenue)}</td>
                  </tr>
                ))}
                {!data.topProducts.length ? (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={4}>
                      No selling data yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Low Stock Alerts</h2>
          <div className="space-y-3">
            {data.lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.images[0]?.url ?? "/favicon.ico"} alt="" className="size-10 rounded-md object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.title}</p>
                    <p className="text-xs text-slate-500">{product.stock} in stock</p>
                  </div>
                </div>
                <Link
                  className="inline-flex h-7 items-center rounded-lg border border-slate-200 px-2.5 text-sm font-medium hover:bg-slate-50"
                  href={`/admin/products/${product.id}/edit`}
                >
                  Restock
                </Link>
              </div>
            ))}
            {!data.lowStockProducts.length ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                No low-stock products.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Order ID</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Payment</th>
                <th className="py-2">Status</th>
                <th className="py-2">Date</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="py-3 font-medium">{order.id.slice(-8).toUpperCase()}</td>
                  <td className="py-3">{order.user.name ?? order.user.email}</td>
                  <td className="py-3">{formatCurrency(order.total)}</td>
                  <td className="py-3">{order.payments[0]?.method ?? "N/A"}</td>
                  <td className="py-3"><StatusBadge value={order.status} /></td>
                  <td className="py-3">{formatDate(order.createdAt)}</td>
                  <td className="py-3">
                    <Link className="text-sm font-medium text-blue-700 hover:underline" href={`/admin/orders/${order.id}`}>
                      View
                    </Link>
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
