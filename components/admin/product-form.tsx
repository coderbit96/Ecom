"use client";

import StarterKit from "@tiptap/starter-kit";
import { useEditor, EditorContent } from "@tiptap/react";
import { GripVertical, Plus, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/slug";

type CategoryOption = {
  id: string;
  label: string;
};

type ProductFormValue = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  sku: string;
  brand: string;
  price: number;
  discountPct: number;
  costPrice: number;
  categoryId: string;
  stock: number;
  lowStockThreshold: number;
  trackStock: boolean;
  status: string;
  images: Array<{ id?: string; url: string; isPrimary: boolean; order: number }>;
  variants: Array<{
    id?: string;
    name: string;
    value: string;
    extraPrice: number;
    stock: number;
  }>;
};

function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function ProductForm({
  categories,
  initialProduct,
}: {
  categories: CategoryOption[];
  initialProduct?: Partial<ProductFormValue>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValue>({
    title: initialProduct?.title ?? "",
    slug: initialProduct?.slug ?? "",
    description: initialProduct?.description ?? "",
    sku: initialProduct?.sku ?? "",
    brand: initialProduct?.brand ?? "",
    price: initialProduct?.price ?? 0,
    discountPct: initialProduct?.discountPct ?? 0,
    costPrice: initialProduct?.costPrice ?? 0,
    categoryId: initialProduct?.categoryId ?? categories[0]?.id ?? "",
    stock: initialProduct?.stock ?? 0,
    lowStockThreshold: initialProduct?.lowStockThreshold ?? 10,
    trackStock: initialProduct?.trackStock ?? true,
    status: initialProduct?.status ?? "DRAFT",
    images: initialProduct?.images ?? [],
    variants: initialProduct?.variants ?? [],
  });
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const editor = useEditor({
    extensions: [StarterKit],
    content: form.description,
    editorProps: {
      attributes: {
        class:
          "min-h-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
      },
    },
    onUpdate({ editor }) {
      setForm((current) => ({ ...current, description: editor.getHTML() }));
    },
  });

  const salePrice = useMemo(
    () => Math.max(0, form.price * (1 - form.discountPct / 100)),
    [form.discountPct, form.price]
  );

  function setField<K extends keyof ProductFormValue>(
    key: K,
    value: ProductFormValue[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addImage(url: string) {
    const clean = url.trim();
    if (!clean) return;
    setForm((current) => ({
      ...current,
      images: [
        ...current.images,
        {
          url: clean,
          isPrimary: current.images.length === 0,
          order: current.images.length,
        },
      ],
    }));
    setImageUrl("");
  }

  async function save(status: "DRAFT" | "PUBLISHED") {
    setPending(true);
    const body = {
      ...form,
      status,
      images: form.images.map((image, index) => ({ ...image, order: index })),
      variants: form.variants,
    };
    const response = await fetch(
      initialProduct?.id
        ? `/api/admin/products/${initialProduct.id}`
        : "/api/admin/products",
      {
        method: initialProduct?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    setPending(false);
    if (response.ok) {
      router.push("/admin/products");
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Basic Info</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Title</span>
              <input
                className="h-9 w-full rounded-lg border border-slate-200 px-3"
                value={form.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setForm((current) => ({
                    ...current,
                    title,
                    slug: current.slug ? current.slug : slugify(title),
                  }));
                }}
                onBlur={() => setField("slug", slugify(form.slug || form.title))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Slug</span>
              <input
                className="h-9 w-full rounded-lg border border-slate-200 px-3"
                value={form.slug}
                onChange={(event) => setField("slug", slugify(event.target.value))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">SKU</span>
              <input
                className="h-9 w-full rounded-lg border border-slate-200 px-3"
                value={form.sku}
                onChange={(event) => setField("sku", event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Brand</span>
              <input
                className="h-9 w-full rounded-lg border border-slate-200 px-3"
                value={form.brand}
                onChange={(event) => setField("brand", event.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 space-y-1 text-sm">
            <span className="font-medium">Description</span>
            <EditorContent editor={editor} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Images</h2>
          <div
            className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const text = event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text");
              addImage(text);
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                placeholder="Paste Cloudinary image URL"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
              />
              <Button type="button" onClick={() => addImage(imageUrl)}>
                <Plus className="size-4" />
                Add image
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {form.images.map((image, index) => (
              <div key={`${image.url}-${index}`} className="rounded-lg border border-slate-200 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="aspect-square w-full rounded-md object-cover" />
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        images: current.images.map((item, itemIndex) => ({
                          ...item,
                          isPrimary: itemIndex === index,
                        })),
                      }))
                    }
                    title="Set primary"
                  >
                    <Star className={`size-4 ${image.isPrimary ? "fill-amber-400 text-amber-500" : ""}`} />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        images: current.images.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                    title="Remove image"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={index === 0}
                    onClick={() => setField("images", move(form.images, index, index - 1))}
                  >
                    Up
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={index === form.images.length - 1}
                    onClick={() => setField("images", move(form.images, index, index + 1))}
                  >
                    Down
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Variants</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setField("variants", [
                  ...form.variants,
                  { name: "size", value: "", extraPrice: 0, stock: 0 },
                ])
              }
            >
              <Plus className="size-4" />
              Add row
            </Button>
          </div>
          <div className="space-y-2">
            {form.variants.map((variant, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-2 md:grid-cols-[32px_1fr_1fr_120px_100px_32px]">
                <div className="flex items-center justify-center text-slate-400">
                  <GripVertical className="size-4" />
                </div>
                {(["name", "value"] as const).map((key) => (
                  <input
                    key={key}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder={key === "name" ? "size, color, material" : "value"}
                    value={variant[key]}
                    onChange={(event) =>
                      setField(
                        "variants",
                        form.variants.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, [key]: event.target.value } : item
                        )
                      )
                    }
                  />
                ))}
                {(["extraPrice", "stock"] as const).map((key) => (
                  <input
                    key={key}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                    type="number"
                    placeholder={key}
                    value={variant[key]}
                    onChange={(event) =>
                      setField(
                        "variants",
                        form.variants.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, [key]: Number(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                ))}
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  onClick={() =>
                    setField(
                      "variants",
                      form.variants.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Pricing</h2>
          <div className="space-y-3">
            {[
              ["price", "Price"],
              ["discountPct", "Discount %"],
              ["costPrice", "Cost price"],
            ].map(([key, label]) => (
              <label key={key} className="space-y-1 text-sm">
                <span className="font-medium">{label}</span>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 px-3"
                  type="number"
                  value={form[key as "price" | "discountPct" | "costPrice"]}
                  onChange={(event) =>
                    setField(
                      key as "price" | "discountPct" | "costPrice",
                      Number(event.target.value)
                    )
                  }
                />
              </label>
            ))}
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              Sale price: <span className="font-semibold">₹{salePrice.toFixed(2)}</span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Category</h2>
          <select
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={form.categoryId}
            onChange={(event) => setField("categoryId", event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Inventory</h2>
          <div className="space-y-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Stock quantity</span>
              <input
                className="h-9 w-full rounded-lg border border-slate-200 px-3"
                type="number"
                value={form.stock}
                onChange={(event) => setField("stock", Number(event.target.value))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Low-stock threshold</span>
              <input
                className="h-9 w-full rounded-lg border border-slate-200 px-3"
                type="number"
                value={form.lowStockThreshold}
                onChange={(event) =>
                  setField("lowStockThreshold", Number(event.target.value))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.trackStock}
                onChange={(event) => setField("trackStock", event.target.checked)}
              />
              Track stock
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Visibility</h2>
          <select
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={form.status}
            onChange={(event) => setField("status", event.target.value)}
          >
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <div className="mt-4 grid gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => save("DRAFT")}>
              Save as Draft
            </Button>
            <Button type="button" disabled={pending} onClick={() => save("PUBLISHED")}>
              Publish
            </Button>
          </div>
        </section>
      </aside>
    </div>
  );
}
