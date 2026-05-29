import { NextResponse } from "next/server";
import type { UserRole, UserStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";

const ROLES = new Set(["GUEST", "CUSTOMER", "ADMIN", "SUPER_ADMIN"]);
const STATUSES = new Set(["ACTIVE", "SUSPENDED"]);

type RouteProps = {
  params: { id: string };
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { response } = await requireAdmin();
  if (response) return response;

  const user = await db.user.findUnique({
    where: { id: params.id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { payments: true } },
      activityLogs: { orderBy: { createdAt: "desc" } },
      reviews: { orderBy: { createdAt: "desc" }, include: { product: true } },
    },
  });

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
    ...(role && ROLES.has(role) ? { role: role as UserRole } : {}),
    ...(status && STATUSES.has(status) ? { status: status as UserStatus } : {}),
  };

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No valid changes supplied" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: params.id },
    data,
  });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: role ? "ROLE_CHANGED" : "STATUS_CHANGED",
      metadata: {
        ...data,
        changedBy: session?.user?.id,
      },
      device: "Admin panel",
    },
  });

  return NextResponse.json({ user });
}
