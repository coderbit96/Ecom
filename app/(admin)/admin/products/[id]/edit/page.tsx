import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { getCategoryOptions } from "@/lib/admin/data";
import { db } from "@/lib/db";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [categories, product] = await Promise.all([
    getCategoryOptions(),
    db.product.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] },
        variants: true,
      },
    }),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Edit Product</h2>
        <p className="text-sm text-slate-500">{product.title}</p>
      </div>
      <ProductForm
        categories={categories}
        initialProduct={{
          id: product.id,
          title: product.title,
          slug: product.slug,
          description: product.description,
          sku: product.sku ?? "",
          brand: product.brand ?? "",
          price: product.price,
          discountPct: product.discountPct,
          costPrice: product.costPrice ?? 0,
          categoryId: product.categoryId,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold ?? 10,
          trackStock: product.trackStock,
          status: product.status,
          images: product.images.map((image) => ({
            id: image.id,
            url: image.url,
            isPrimary: image.isPrimary,
            order: image.order,
          })),
          variants: product.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            value: variant.value,
            extraPrice: variant.extraPrice,
            stock: variant.stock,
          })),
        }}
      />
    </div>
  );
}
