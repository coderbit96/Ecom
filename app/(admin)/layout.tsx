import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { auth, signOut } from "@/lib/auth";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user || !role || !ADMIN_ROLES.has(role)) {
    redirect("/login");
  }

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AdminShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      logoutAction={logoutAction}
    >
      {children}
    </AdminShell>
  );
}
