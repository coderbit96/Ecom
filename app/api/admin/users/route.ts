import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { buildUserWhere, getPage, PAGE_SIZE } from "@/lib/admin/data";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const searchParams = Object.fromEntries(new URL(request.url).searchParams);
  const page = getPage(searchParams);
  const where = buildUserWhere(searchParams);
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { orders: true },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl ?? user.image,
      registeredAt: user.createdAt,
      orderCount: user.orders.length,
      totalSpend: user.orders.reduce((sum, order) => sum + order.total, 0),
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
  });
}
