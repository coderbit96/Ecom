"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function UserBulkActions({ userIds }: { userIds: string[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  async function applyBulk(action: "suspend" | "role", role?: string) {
    if (!selected.length) return;
    setPending(true);
    await Promise.all(
      selected.map((id) =>
        fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "suspend" ? { status: "SUSPENDED" } : { role }
          ),
        })
      )
    );
    setPending(false);
    setSelected([]);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={selected.length === userIds.length && userIds.length > 0}
            onChange={(event) =>
              setSelected(event.target.checked ? userIds : [])
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
          onClick={() => applyBulk("suspend")}
        >
          Bulk suspend
        </Button>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm"
          disabled={!selected.length || pending}
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) applyBulk("role", event.target.value);
            event.target.value = "";
          }}
        >
          <option value="">Change role</option>
          <option value="CUSTOMER">Customer</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super admin</option>
        </select>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {userIds.map((id) => (
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
