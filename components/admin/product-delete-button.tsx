"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProductDeleteButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="font-medium text-rose-700 hover:underline disabled:opacity-50"
      disabled={pending}
      onClick={async () => {
        if (!window.confirm("Delete this product?")) return;
        setPending(true);
        await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
        setPending(false);
        router.refresh();
      }}
    >
      Delete
    </button>
  );
}
