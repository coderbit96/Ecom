import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as {
    subject?: unknown;
    message?: unknown;
  } | null;
  const user = await db.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "ADMIN_EMAIL_QUEUED",
      metadata: {
        subject: typeof body?.subject === "string" ? body.subject : "Admin message",
        message: typeof body?.message === "string" ? body.message : "",
        queuedBy: session?.user?.id,
      },
      device: "Admin panel",
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Email queued. Configure Resend or SendGrid credentials to deliver it.",
  });
}
