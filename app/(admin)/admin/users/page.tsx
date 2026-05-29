import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { UserBulkActions } from "@/components/admin/user-bulk-actions";
import { getString, getUserList, type SearchParams } from "@/lib/admin/data";
import { formatCurrency, formatDate } from "@/lib/admin/format";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const data = await getUserList(searchParams);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && value) query.set(key, value);
  }
  const exportHref = `/api/admin/users/export?${query.toString()}`;

  return (
    <div className="space-y-4">
      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6">
        <input
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm md:col-span-2"
          name="q"
          placeholder="Search name or email"
          defaultValue={getString(searchParams, "q")}
        />
        <select className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" name="role" defaultValue={getString(searchParams, "role")}>
          <option value="">All roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super admin</option>
        </select>
        <select className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" name="status" defaultValue={getString(searchParams, "status")}>
          <option value="">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <input className="h-9 rounded-lg border border-slate-200 px-3 text-sm" type="date" name="from" defaultValue={getString(searchParams, "from")} />
        <div className="flex gap-2">
          <input className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm" type="date" name="to" defaultValue={getString(searchParams, "to")} />
          <button className="h-9 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white" type="submit">
            Filter
          </button>
        </div>
      </form>

      <div className="flex justify-end">
        <a className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50" href={exportHref}>
          Export to CSV
        </a>
      </div>

      <UserBulkActions userIds={data.users.map((user) => user.id)} />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Avatar</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total spend</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    {user.avatarUrl || user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl ?? user.image ?? ""} alt="" className="size-9 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{user.name ?? "Unnamed"}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3"><StatusBadge value={user.role} /></td>
                  <td className="px-4 py-3"><StatusBadge value={user.status} /></td>
                  <td className="px-4 py-3">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">{user.orderCount}</td>
                  <td className="px-4 py-3">{formatCurrency(user.totalSpend)}</td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-blue-700 hover:underline" href={`/admin/users/${user.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Page {data.page} of {data.pageCount} ({data.total} users)</span>
        <div className="flex gap-2">
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={data.page <= 1} href={`?${new URLSearchParams({ ...Object.fromEntries(query), page: String(Math.max(1, data.page - 1)) })}`}>
            Previous
          </Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={data.page >= data.pageCount} href={`?${new URLSearchParams({ ...Object.fromEntries(query), page: String(Math.min(data.pageCount, data.page + 1)) })}`}>
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
