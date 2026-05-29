import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { listUsers } from "@/lib/app-auth";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const searchParams = Object.fromEntries(new URL(request.url).searchParams);
  const { users } = await listUsers(searchParams);
  const rows = [
    ["Name", "Email", "Role", "Status", "Registered", "Order Count", "Total Spend"],
    ...users.map((user) => [
      user.name,
      user.email,
      user.role,
      user.status,
      user.createdAt,
      0,
      "0.00",
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
