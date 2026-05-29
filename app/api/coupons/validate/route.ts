import { NextResponse } from "next/server";

import { validateCoupon } from "@/lib/coupons";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
    subtotal?: unknown;
  } | null;
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const subtotal =
    typeof body?.subtotal === "number" ? body.subtotal : Number(body?.subtotal ?? 0);

  if (!code) {
    return NextResponse.json(
      { valid: false, discount: 0, message: "Enter a coupon code." },
      { status: 400 }
    );
  }

  try {
    const coupon = await db.coupon.findUnique({
      where: { code },
    });
    return NextResponse.json(validateCoupon(coupon, subtotal));
  } catch {
    return NextResponse.json(
      {
        valid: false,
        discount: 0,
        message: "Coupon validation is unavailable right now.",
      },
      { status: 503 }
    );
  }
}
