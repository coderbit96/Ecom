import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  ProfileView,
  type LoginHistoryEntry,
  type ProfileAddress,
} from "@/components/user/profile-view";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Profile | Premium Commerce",
};

function formatLoginEntry(log: {
  id: string;
  createdAt: Date;
  device: string | null;
  ip: string | null;
  metadata: unknown;
}): LoginHistoryEntry {
  const date = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(log.createdAt);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(log.createdAt);
  const metadata =
    log.metadata && typeof log.metadata === "object"
      ? (log.metadata as Record<string, unknown>)
      : {};

  return {
    id: log.id,
    date,
    time,
    device: log.device ?? "Web browser",
    browser: typeof metadata.browser === "string" ? metadata.browser : "Browser",
    ip: log.ip ?? "Not captured",
  };
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, addresses, loginHistory] = await Promise.all([
    db.user
      .findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          image: true,
          avatarUrl: true,
          phone: true,
        },
      })
      .catch(() => null),
    db.address
      .findMany({
        where: { userId: session.user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          label: true,
          line1: true,
          line2: true,
          city: true,
          state: true,
          pincode: true,
          isDefault: true,
        },
      })
      .catch(() => [] as ProfileAddress[]),
    db.activityLog
      .findMany({
        where: {
          userId: session.user.id,
          action: "LOGIN",
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          device: true,
          ip: true,
          metadata: true,
        },
      })
      .catch(() => []),
  ]);

  if (!user) {
    redirect("/login");
  }

  return (
    <ProfileView
      user={{
        name: user.name ?? "",
        email: user.email,
        image: user.avatarUrl ?? user.image,
        phone: user.phone ?? "",
      }}
      addresses={addresses}
      loginHistory={loginHistory.map(formatLoginEntry)}
    />
  );
}
