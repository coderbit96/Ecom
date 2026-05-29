import type {
  Address,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  Product,
  ProductImage,
  ProductVariant,
} from "@prisma/client";

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  "PROCESSING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
];

export const CANCELLABLE_STATUSES: OrderStatus[] = ["PROCESSING", "CONFIRMED"];

export type OrderWithDetails = Order & {
  address: Address;
  items: Array<
    OrderItem & {
      product: Product & {
        images: ProductImage[];
      };
      variant: ProductVariant | null;
    }
  >;
  payments: Payment[];
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getOrderImage(orderItem: OrderWithDetails["items"][number]) {
  return (
    orderItem.product.images.find((image) => image.isPrimary)?.url ??
    orderItem.product.images[0]?.url ??
    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80"
  );
}

export function getOrderItemsCount(order: { items: Array<{ qty: number }> }) {
  return order.items.reduce((sum, item) => sum + item.qty, 0);
}

export function isReturnEligible(order: Pick<Order, "status" | "updatedAt">) {
  if (order.status !== "DELIVERED") return false;

  const deliveredAt = new Date(order.updatedAt).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return Date.now() - deliveredAt <= sevenDays;
}

export function getTrackingNumber(order: Pick<Order, "trackingNumber" | "id">) {
  return order.trackingNumber ?? `TRK-${order.id.slice(-8).toUpperCase()}`;
}

export function getStatusClassName(status: OrderStatus) {
  switch (status) {
    case "PROCESSING":
      return "bg-[#fffbeb] text-[#92400e] border-[#fde68a]";
    case "CONFIRMED":
      return "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]";
    case "SHIPPED":
      return "bg-[#f0f9ff] text-[#0369a1] border-[#bae6fd]";
    case "DELIVERED":
      return "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]";
    case "CANCELLED":
      return "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]";
    case "RETURNED":
      return "bg-[#f8fafc] text-[#475569] border-[#cbd5e1]";
    default:
      return "bg-[#f8fafc] text-[#475569] border-[#cbd5e1]";
  }
}
