import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { buildUserWhere } from "@/lib/admin/data";
import { db } from "@/lib/db";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const searchParams = Object.fromEntries(new URL(request.url).searchParams);
  const users = await db.user.findMany({
    where: buildUserWhere(searchParams),
    orderBy: { createdAt: "desc" },
    include: { orders: true },
  });
  const rows = [
    ["Name", "Email", "Role", "Status", "Registered", "Order Count", "Total Spend"],
    ...users.map((user) => [
      user.name ?? "",
      user.email,
      user.role,
      user.status,
      user.createdAt.toISOString(),
      user.orders.length,
      user.orders.reduce((sum, order) => sum + order.total, 0).toFixed(2),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="users.csv"',
    },
  });
}
