import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";

function parseCsv(text: string) {
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(",").map((header) => header.trim());

  return lines.map((line) => {
    const cells = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function number(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const rows = parseCsv(await file.text());
  const created = [];

  for (const row of rows) {
    if (!row.title || !row.categoryId) continue;
    const product = await db.product.create({
      data: {
        title: row.title,
        slug: (row.slug || row.title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        sku: row.sku || null,
        brand: row.brand || null,
        description: row.description || "",
        price: number(row.price),
        discountPct: number(row.discountPct),
        costPrice: row.costPrice ? number(row.costPrice) : null,
        stock: number(row.stock),
        categoryId: row.categoryId,
        status: row.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      },
    });
    created.push(product.id);
  }

  return NextResponse.json({ ok: true, imported: created.length, ids: created });
}
