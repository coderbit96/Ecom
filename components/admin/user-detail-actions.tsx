"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function UserDetailActions({
  userId,
  role,
  status,
}: {
  userId: string;
  role: string;
  status: string;
}) {
  const router = useRouter();
  const [nextRole, setNextRole] = useState(role);
  const [pending, setPending] = useState(false);

  async function patch(body: Record<string, string>) {
    setPending(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(false);
    router.refresh();
  }

  async function sendEmail() {
    setPending(true);
    await fetch(`/api/admin/users/${userId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: "Account update", message: "Hello from Premium Commerce." }),
    });
    setPending(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        value={nextRole}
        onChange={(event) => setNextRole(event.target.value)}
      >
        <option value="CUSTOMER">Customer</option>
        <option value="ADMIN">Admin</option>
        <option value="SUPER_ADMIN">Super admin</option>
      </select>
      <Button
        type="button"
        disabled={pending || nextRole === role}
        onClick={() => {
          if (window.confirm(`Change this user's role to ${nextRole}?`)) {
            patch({ role: nextRole });
          }
        }}
      >
        Change Role
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          patch({ status: status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" })
        }
      >
        {status === "SUSPENDED" ? "Unsuspend" : "Suspend Account"}
      </Button>
      <Button type="button" variant="outline" disabled={pending} onClick={sendEmail}>
        Send Email
      </Button>
    </div>
  );
}
