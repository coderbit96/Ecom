"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function ProductBulkActions({ productIds }: { productIds: string[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  async function updateSelected(status?: string, remove = false) {
    if (!selected.length) return;
    if (remove && !window.confirm("Delete selected products?")) return;
    setPending(true);
    await Promise.all(
      selected.map((id) =>
        fetch(`/api/admin/products/${id}`, {
          method: remove ? "DELETE" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: remove ? undefined : JSON.stringify({ status }),
        })
      )
    );
    setPending(false);
    setSelected([]);
    router.refresh();
  }

  async function importCsv(file: File) {
    setPending(true);
    const body = new FormData();
    body.set("file", file);
    await fetch("/api/admin/products/import", { method: "POST", body });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={selected.length === productIds.length && productIds.length > 0}
            onChange={(event) =>
              setSelected(event.target.checked ? productIds : [])
            }
          />
          Select page
        </label>
        <span className="text-sm text-slate-500">{selected.length} selected</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!selected.length || pending}
          onClick={() => updateSelected("PUBLISHED")}
        >
          Bulk publish
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!selected.length || pending}
          onClick={() => updateSelected("ARCHIVED")}
        >
          Bulk archive
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={!selected.length || pending}
          onClick={() => updateSelected(undefined, true)}
        >
          Bulk delete
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          Import CSV
        </Button>
        <a
          className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
          href="data:text/csv;charset=utf-8,title,sku,brand,description,price,discountPct,costPrice,stock,categoryId,status%0A"
          download="product-template.csv"
        >
          Template
        </a>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) importCsv(file);
          event.target.value = "";
        }}
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {productIds.map((id) => (
          <label key={id} className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={selected.includes(id)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, id]
                    : current.filter((item) => item !== id)
                )
              }
            />
            {id.slice(-8)}
          </label>
        ))}
      </div>
    </div>
  );
}
