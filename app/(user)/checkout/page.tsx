import type { Metadata } from "next";

import {
  CheckoutFlow,
type CheckoutAddress,
} from "@/components/user/checkout-flow";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Checkout | Premium Commerce",
};

type CheckoutUser = {
  name: string;
  email: string;
  phone: string;
};

async function getSavedAddresses(userId?: string): Promise<CheckoutAddress[]> {
  if (!userId) return [];

  try {
    const addresses = await db.address.findMany({
      where: { userId },
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
    });

    return addresses;
  } catch {
    return [];
  }
}

export default async function CheckoutPage() {
  const session = await auth();
  const savedAddresses = await getSavedAddresses(session?.user?.id);
  const profile = session?.user?.id
    ? await db.user
        .findUnique({
          where: { id: session.user.id },
          select: {
            name: true,
            email: true,
            phone: true,
          },
        })
        .catch(() => null)
    : null;
  const user: CheckoutUser = {
    name: profile?.name ?? session?.user?.name ?? "",
    email: profile?.email ?? session?.user?.email ?? "",
    phone: profile?.phone ?? "",
  };

  return <CheckoutFlow savedAddresses={savedAddresses} user={user} />;
}
