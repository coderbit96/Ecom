import { NextResponse } from "next/server";
import type { OrderStatus, PaymentMethod } from "@prisma/client";

import { auth } from "@/lib/auth";
import { normalizeCartItems } from "@/lib/cart-types";
import { db } from "@/lib/db";
import { getOrderItemsCount } from "@/lib/order-utils";

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

type AddressInput = {
  id?: unknown;
  label?: unknown;
  line1?: unknown;
  line2?: unknown;
  city?: unknown;
  state?: unknown;
  pincode?: unknown;
  isDefault?: unknown;
};

type CreateOrderBody = {
  items?: unknown;
  addressId?: unknown;
  address?: AddressInput;
  shippingMethod?: unknown;
  estimatedDelivery?: unknown;
  paymentMethod?: unknown;
  subtotal?: unknown;
  discount?: unknown;
  tax?: unknown;
  shipping?: unknown;
  total?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapPaymentMethod(value: unknown): PaymentMethod {
  return value === "upi" || value === "qr" ? "QR" : "CARD";
}

function isObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_REGEX.test(value);
}

function getPublicOrder(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      address: true,
      payments: true,
      items: {
        include: {
          variant: true,
          product: {
            include: {
              images: {
                orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
                take: 1,
              },
            },
          },
        },
      },
    },
  });
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ orders: [] }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get("status")?.toUpperCase();
  const status =
    rawStatus &&
    ["PROCESSING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"].includes(
      rawStatus
    )
      ? (rawStatus as OrderStatus)
      : undefined;

  try {
    const orders = await db.order.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        payments: true,
      },
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        total: order.total,
        itemsCount: getOrderItemsCount(order),
        paymentStatus: order.payments[0]?.status ?? "PENDING",
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Orders are unavailable right now.", orders: [] },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateOrderBody | null;
  const items = normalizeCartItems(body?.items ?? []);

  if (!items.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const shippingMethod = readString(body?.shippingMethod) || "Standard Delivery";
  const subtotal =
    body?.subtotal === undefined
      ? items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      : readNumber(body.subtotal);
  const discount = readNumber(body?.discount);
  const tax = readNumber(body?.tax);
  const shipping = readNumber(body?.shipping);
  const total =
    body?.total === undefined
      ? Math.max(0, subtotal - discount + tax + shipping)
      : readNumber(body.total);
  const estimatedDelivery = readString(body?.estimatedDelivery)
    ? new Date(readString(body?.estimatedDelivery))
    : null;

  let addressId = readString(body?.addressId);

  try {
    if (!addressId || addressId.startsWith("new-")) {
      const address = body?.address;
      const label = readString(address?.label);
      const line1 = readString(address?.line1);
      const line2 = readString(address?.line2);
      const city = readString(address?.city);
      const state = readString(address?.state);
      const pincode = readString(address?.pincode);

      if (!label || !line1 || !city || !state || !PINCODE_REGEX.test(pincode)) {
        return NextResponse.json(
          { error: "A valid delivery address is required" },
          { status: 400 }
        );
      }

      if (address?.isDefault === true) {
        await db.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const createdAddress = await db.address.create({
        data: {
          userId,
          label,
          line1,
          line2: line2 || null,
          city,
          state,
          pincode,
          country: "India",
          isDefault: address?.isDefault === true,
        },
      });

      addressId = createdAddress.id;
    } else {
      const address = await db.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
        select: { id: true },
      });

      if (!address) {
        return NextResponse.json(
          { error: "Delivery address was not found" },
          { status: 404 }
        );
      }
    }

    for (const item of items) {
      const updatedProduct = await db.product.updateMany({
        where: {
          id: item.productId,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (updatedProduct.count === 0) {
        return NextResponse.json(
          { error: `${item.name} does not have enough stock` },
          { status: 409 }
        );
      }

      if (isObjectId(item.variantId)) {
        await db.productVariant.updateMany({
          where: {
            id: item.variantId,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });
      }
    }

    const paymentMethod = mapPaymentMethod(body?.paymentMethod);
    const order = await db.order.create({
      data: {
        userId,
        addressId,
        status: "PROCESSING",
        subtotal,
        discount,
        tax,
        shipping,
        total,
        shippingMethod,
        estimatedDelivery:
          estimatedDelivery && !Number.isNaN(estimatedDelivery.getTime())
            ? estimatedDelivery
            : null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            variantId: isObjectId(item.variantId) ? item.variantId : null,
            qty: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          })),
        },
        payments: {
          create: {
            method: paymentMethod,
            gatewayTxnId: null,
            qrRef: null,
            amount: total,
            status: "PENDING",
            paidAt: null,
          },
        },
      },
      select: { id: true },
    });

    const createdOrder = await getPublicOrder(order.id);

    await db.userCart
      .upsert({
        where: { userId },
        create: { userId, items: [] },
        update: { items: [] },
      })
      .catch(() => null);

    return NextResponse.json({ order: createdOrder }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to place order right now" },
      { status: 503 }
    );
  }
}
