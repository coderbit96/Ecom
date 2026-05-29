import type {
  OrderStatus,
  PaymentMethod,
  Prisma,
  ProductStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";

import { db } from "@/lib/db";

export const PAGE_SIZE = 50;
export const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80";

const USER_ROLES = new Set(["GUEST", "CUSTOMER", "ADMIN", "SUPER_ADMIN"]);
const USER_STATUSES = new Set(["ACTIVE", "SUSPENDED"]);
const PRODUCT_STATUSES = new Set(["PUBLISHED", "DRAFT", "ARCHIVED"]);
const ORDER_STATUSES = new Set([
  "PROCESSING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
]);
const PAYMENT_METHODS = new Set(["CARD", "NETBANKING", "UPI", "WALLET", "QR"]);

export type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getString(params: SearchParams, key: string) {
  return first(params[key])?.trim() ?? "";
}

export function getPage(params: SearchParams) {
  const parsed = Number(getString(params, "page"));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function getDate(params: SearchParams, key: string) {
  const value = getString(params, key);
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateRangeWhere(params: SearchParams): Prisma.DateTimeFilter | undefined {
  const from = getDate(params, "from");
  const to = getDate(params, "to");

  if (!from && !to) return undefined;

  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

export function buildUserWhere(params: SearchParams): Prisma.UserWhereInput {
  const search = getString(params, "q");
  const role = getString(params, "role").toUpperCase();
  const status = getString(params, "status").toUpperCase();
  const createdAt = dateRangeWhere(params);

  return {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(USER_ROLES.has(role) ? { role: role as UserRole } : {}),
    ...(USER_STATUSES.has(status) ? { status: status as UserStatus } : {}),
    ...(createdAt ? { createdAt } : {}),
  };
}

export function buildProductWhere(params: SearchParams): Prisma.ProductWhereInput {
  const search = getString(params, "q");
  const status = getString(params, "status").toUpperCase();
  const categoryId = getString(params, "categoryId");

  return {
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(PRODUCT_STATUSES.has(status) ? { status: status as ProductStatus } : {}),
    ...(categoryId ? { categoryId } : {}),
  };
}

export function buildOrderWhere(params: SearchParams): Prisma.OrderWhereInput {
  const search = getString(params, "q");
  const status = getString(params, "status").toUpperCase();
  const method = getString(params, "paymentMethod").toUpperCase();
  const createdAt = dateRangeWhere(params);

  return {
    ...(ORDER_STATUSES.has(status) ? { status: status as OrderStatus } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(PAYMENT_METHODS.has(method)
      ? { payments: { some: { method: method as PaymentMethod } } }
      : {}),
    ...(search
      ? {
          OR: [
            { id: search },
            { user: { is: { name: { contains: search, mode: "insensitive" } } } },
            { user: { is: { email: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDailySeries(days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return {
      key: dayKey(date),
      date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: 0,
      orders: 0,
    };
  });
}

export async function getDashboardData() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 89);

  const [
    currentRevenue,
    lastRevenue,
    totalOrders,
    newUsersToday,
    activeSessions,
    payments,
    orders,
    lowStockProducts,
    recentOrders,
    topProductGroups,
  ] = await Promise.all([
    db.payment.aggregate({
      where: { status: "SUCCESS", paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { status: "SUCCESS", paidAt: { gte: lastMonthStart, lt: monthStart } },
      _sum: { amount: true },
    }),
    db.order.count(),
    db.user.count({ where: { createdAt: { gte: today } } }),
    db.session.count({ where: { expires: { gt: now } } }),
    db.payment.findMany({
      where: { status: "SUCCESS", paidAt: { gte: ninetyDaysAgo } },
      select: { amount: true, paidAt: true, order: { select: { createdAt: true } } },
    }),
    db.order.findMany({
      where: { createdAt: { gte: ninetyDaysAgo } },
      select: { createdAt: true },
    }),
    db.product.findMany({
      where: { stock: { lt: 10 } },
      orderBy: { stock: "asc" },
      take: 8,
      include: { images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }], take: 1 } },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: true, payments: true, items: true },
    }),
    db.orderItem.groupBy({
      by: ["productId"],
      _sum: { qty: true, totalPrice: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 5,
    }),
  ]);

  const chartData = buildDailySeries(90);
  const byDay = new Map(chartData.map((item) => [item.key, item]));

  payments.forEach((payment) => {
    const paidAt = payment.paidAt ?? payment.order.createdAt;
    const item = byDay.get(dayKey(paidAt));
    if (item) item.revenue += payment.amount;
  });

  orders.forEach((order) => {
    const item = byDay.get(dayKey(order.createdAt));
    if (item) item.orders += 1;
  });

  const productIds = topProductGroups.map((item) => item.productId);
  const topProducts = productIds.length
    ? await db.product.findMany({
        where: { id: { in: productIds } },
        include: {
          images: {
            orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
            take: 1,
          },
        },
      })
    : [];
  const productMap = new Map(topProducts.map((product) => [product.id, product]));
  const lastMonthValue = lastRevenue._sum.amount ?? 0;
  const totalRevenue = currentRevenue._sum.amount ?? 0;

  return {
    kpis: {
      totalRevenue,
      revenueChange:
        lastMonthValue > 0
          ? ((totalRevenue - lastMonthValue) / lastMonthValue) * 100
          : totalRevenue > 0
            ? 100
            : 0,
      totalOrders,
      newUsersToday,
      activeSessions,
    },
    chartData,
    lowStockProducts,
    recentOrders,
    topProducts: topProductGroups.map((group, index) => {
      const product = productMap.get(group.productId);
      return {
        rank: index + 1,
        id: group.productId,
        name: product?.title ?? "Deleted product",
        image: product?.images[0]?.url ?? FALLBACK_IMAGE,
        unitsSold: group._sum.qty ?? 0,
        revenue: group._sum.totalPrice ?? 0,
      };
    }),
  };
}

export async function getUserList(params: SearchParams) {
  const page = getPage(params);
  const where = buildUserWhere(params);
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { orders: { include: { payments: true } } },
    }),
    db.user.count({ where }),
  ]);

  return {
    users: users.map((user) => ({
      ...user,
      orderCount: user.orders.length,
      totalSpend: user.orders.reduce((sum, order) => sum + order.total, 0),
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getProductList(params: SearchParams) {
  const page = getPage(params);
  const where = buildProductWhere(params);
  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }], take: 1 },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
  ]);

  return {
    products,
    categories,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getOrderList(params: SearchParams) {
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

  return { orders, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getCategoryOptions() {
  const categories = await db.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true },
  });
  const byId = new Map(categories.map((category) => [category.id, category]));

  function labelFor(id: string): string {
    const category = byId.get(id);
    if (!category) return "Unknown";
    return category.parentId ? `${labelFor(category.parentId)} / ${category.name}` : category.name;
  }

  return categories.map((category) => ({ id: category.id, label: labelFor(category.id) }));
}
