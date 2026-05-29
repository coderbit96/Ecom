import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { listUsers } from "@/lib/app-auth";

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const searchParams = Object.fromEntries(new URL(request.url).searchParams);
  const data = await listUsers(searchParams);

  return NextResponse.json({
    users: data.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatarUrl: user.image,
      registeredAt: user.createdAt,
      orderCount: 0,
      totalSpend: 0,
    })),
    total: data.total,
    page: data.page,
    pageSize: 20,
  });
}
