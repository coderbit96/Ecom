import Link from "next/link";

import { ProductDeleteButton } from "@/components/admin/product-delete-button";
import { ProductBulkActions } from "@/components/admin/product-bulk-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { FALLBACK_IMAGE, getProductList, getString, type SearchParams } from "@/lib/admin/data";
import { formatCurrency, formatDate } from "@/lib/admin/format";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const data = await getProductList(searchParams);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && value) query.set(key, value);
  }
  const exportHref = `/api/admin/products?export=csv&${query.toString()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="grid flex-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <input className="h-9 rounded-lg border border-slate-200 px-3 text-sm" name="q" placeholder="Search title or SKU" defaultValue={getString(searchParams, "q")} />
          <select className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" name="categoryId" defaultValue={getString(searchParams, "categoryId")}>
            <option value="">All categories</option>
            {data.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" name="status" defaultValue={getString(searchParams, "status")}>
            <option value="">All status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button className="h-9 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white" type="submit">
            Filter
          </button>
        </form>
        <div className="flex gap-2">
          <Link className="inline-flex h-9 items-center rounded-lg bg-slate-950 px-3 text-sm font-medium text-white" href="/admin/products/new">
            Add New Product
          </Link>
          <a className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50" href={exportHref}>
            Export CSV
          </a>
        </div>
      </div>

      <ProductBulkActions productIds={data.products.map((product) => product.id)} />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Thumbnail</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.images[0]?.url ?? FALLBACK_IMAGE} alt="" className="size-11 rounded-md object-cover" />
                  </td>
                  <td className="px-4 py-3 font-medium">{product.title}</td>
                  <td className="px-4 py-3 text-slate-600">{product.sku ?? "N/A"}</td>
                  <td className="px-4 py-3">{product.category.name}</td>
                  <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-3">{product.stock}</td>
                  <td className="px-4 py-3"><StatusBadge value={product.status} /></td>
                  <td className="px-4 py-3">{formatDate(product.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link className="font-medium text-blue-700 hover:underline" href={`/admin/products/${product.id}/edit`}>Edit</Link>
                      <ProductDeleteButton productId={product.id} />
                    </div>
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
