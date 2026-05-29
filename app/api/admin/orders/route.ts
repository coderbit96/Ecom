import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { buildOrderWhere, getPage, PAGE_SIZE } from "@/lib/admin/data";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const page = getPage(params);
  const where = buildOrderWhere(params);
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: true, items: true, payments: true },
    }),
    db.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, pageSize: PAGE_SIZE });
}
