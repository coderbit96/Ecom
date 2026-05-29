import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { clearSession, requireAdminUser } from "@/lib/app-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminUser();

  if (!user) {
    redirect("/login");
  }

  async function logoutAction() {
    "use server";
    clearSession();
    redirect("/login");
  }

  return (
    <AdminShell
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
      }}
      logoutAction={logoutAction}
    >
      {children}
    </AdminShell>
  );
}
