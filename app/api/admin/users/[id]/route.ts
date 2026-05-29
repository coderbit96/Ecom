import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import {
  findUserById,
  updateUser,
  type AppUserRole,
  type AppUserStatus,
} from "@/lib/app-auth";

const ROLES = new Set(["CUSTOMER", "ADMIN", "SUPER_ADMIN"]);
const STATUSES = new Set(["ACTIVE", "SUSPENDED"]);

type RouteProps = {
  params: { id: string };
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { response } = await requireAdmin();
  if (response) return response;

  const user = await findUserById(params.id);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { session, response } = await requireAdmin();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as {
    role?: unknown;
    status?: unknown;
  } | null;
  const role = typeof body?.role === "string" ? body.role.toUpperCase() : undefined;
  const status =
    typeof body?.status === "string" ? body.status.toUpperCase() : undefined;

  if (role && session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only a super admin can change user roles" },
      { status: 403 }
    );
  }

  const data = {
    ...(role && ROLES.has(role) ? { role: role as AppUserRole } : {}),
    ...(status && STATUSES.has(status) ? { status: status as AppUserStatus } : {}),
  };

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No valid changes supplied" }, { status: 400 });
  }

  const user = await updateUser(params.id, data);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
