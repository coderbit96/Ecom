import { ProductForm } from "@/components/admin/product-form";
import { getCategoryOptions } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getCategoryOptions();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Add New Product</h2>
        <p className="text-sm text-slate-500">Create catalog details, images, variants, inventory, and visibility.</p>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}
