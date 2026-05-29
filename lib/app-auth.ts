import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { UserRole, UserStatus } from "@prisma/client";

import { db } from "@/lib/db";

export type AppUserRole = Extract<UserRole, "CUSTOMER" | "ADMIN" | "SUPER_ADMIN">;
export type AppUserStatus = UserStatus;

export type PublicAppUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: AppUserRole;
  status: AppUserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

const SESSION_COOKIE = "ecom_app_session";
const PAGE_SIZE = 20;
const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const LOCAL_SECRET = "local-ecom-app-auth-secret-change-before-production";

function getAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || "admin@coderbit.in";
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "123456";
}

function getSessionSecret() {
  return (
    process.env.APP_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "local-development-secret"
  );
}

export function getAuthConfigError() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const appSecret = process.env.APP_AUTH_SECRET?.trim();

  if (!databaseUrl) {
    return "DATABASE_URL is missing in server environment variables.";
  }

  if (databaseUrl.startsWith("\"") || databaseUrl.startsWith("'")) {
    return "DATABASE_URL must be added without quotes in Vercel Environment Variables.";
  }

  if (!databaseUrl.startsWith("mongodb://") && !databaseUrl.startsWith("mongodb+srv://")) {
    return "DATABASE_URL must be a MongoDB connection string.";
  }

  if (process.env.NODE_ENV === "production" && (!appSecret || appSecret === LOCAL_SECRET)) {
    return "APP_AUTH_SECRET must be set to a strong production secret.";
  }

  return null;
}

export function getAuthDatabaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Environment variable not found: DATABASE_URL")) {
    return "DATABASE_URL is missing in server environment variables.";
  }

  if (
    message.includes("Can't reach database server") ||
    message.includes("Server selection timeout") ||
    message.includes("ETIMEDOUT")
  ) {
    return "Database connection failed. Check MongoDB Atlas Network Access for Vercel.";
  }

  if (
    message.includes("Authentication failed") ||
    message.includes("SCRAM failure") ||
    message.includes("bad auth")
  ) {
    return "Database authentication failed. Check the MongoDB username and password in DATABASE_URL.";
  }

  if (message.includes("Invalid scheme") || message.includes("must start with the protocol")) {
    return "DATABASE_URL is invalid. Use a MongoDB URI without extra quotes.";
  }

  return "Authentication database request failed. Check Vercel logs and environment variables.";
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash?: string | null) {
  if (!passwordHash) return false;

  const [salt, hash] = passwordHash.split(":");
  if (!salt || !hash) return false;

  const currentHash = scryptSync(password, salt, 64);
  const storedHash = Buffer.from(hash, "hex");

  return storedHash.length === currentHash.length && timingSafeEqual(storedHash, currentHash);
}

function toPublicUser(user: {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}): PublicAppUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? user.role : "CUSTOMER",
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function createSessionToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    })
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

function readSessionToken(token?: string) {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || signPayload(payload) !== signature) return null;

  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    userId?: string;
    expiresAt?: number;
  };

  if (!data.userId || !data.expiresAt || data.expiresAt < Date.now()) return null;
  return data.userId;
}

async function ensureAdminUser() {
  const email = getAdminEmail();
  const existing = await db.user.findUnique({ where: { email } });
  const passwordHash = hashPassword(getAdminPassword());

  if (!existing) {
    return db.user.create({
      data: {
        email,
        name: "Admin",
        passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
  }

  if (
    existing.role !== "SUPER_ADMIN" ||
    existing.status !== "ACTIVE" ||
    !existing.passwordHash
  ) {
    return db.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: existing.passwordHash || passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
  }

  return existing;
}

export async function getUsers() {
  await ensureAdminUser();
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  return users.map(toPublicUser);
}

export async function listUsers(params: Record<string, string | string[] | undefined>) {
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Number(pageValue) || 1);
  const q = ((Array.isArray(params.q) ? params.q[0] : params.q) ?? "").toLowerCase();
  const role = ((Array.isArray(params.role) ? params.role[0] : params.role) ?? "").toUpperCase();
  const status = ((Array.isArray(params.status) ? params.status[0] : params.status) ?? "").toUpperCase();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const to = Array.isArray(params.to) ? params.to[0] : params.to;

  let users = await getUsers();

  if (q) {
    users = users.filter(
      (user) =>
        user.email.toLowerCase().includes(q) ||
        (user.name ?? "").toLowerCase().includes(q)
    );
  }
  if (role) users = users.filter((user) => user.role === role);
  if (status) users = users.filter((user) => user.status === status);
  if (from) users = users.filter((user) => user.createdAt >= new Date(`${from}T00:00:00.000Z`));
  if (to) users = users.filter((user) => user.createdAt <= new Date(`${to}T23:59:59.999Z`));

  const total = users.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    users: users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total,
    page,
    pageCount,
  };
}

export async function findUserById(id: string) {
  if (!MONGO_OBJECT_ID_PATTERN.test(id)) return null;

  const user = await db.user.findUnique({ where: { id } });
  return user ? toPublicUser(user) : null;
}

export async function createUser({
  email,
  name,
  password,
}: {
  email: string;
  name: string;
  password: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      name: name.trim() || normalizedEmail.split("@")[0],
      passwordHash: hashPassword(password),
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });

  return toPublicUser(user);
}

export async function createOrUpdateExternalUser({
  email,
  name,
  image,
}: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: {
          name: name?.trim() || existing.name,
          image: image ?? existing.image,
          avatarUrl: image ?? existing.avatarUrl,
          lastLoginAt: new Date(),
        },
      })
    : await db.user.create({
        data: {
          email: normalizedEmail,
          name: name?.trim() || normalizedEmail.split("@")[0],
          image: image ?? null,
          avatarUrl: image ?? null,
          role: "CUSTOMER",
          status: "ACTIVE",
          lastLoginAt: new Date(),
        },
      });

  return toPublicUser(user);
}

export async function authenticateUser(email: string, password: string) {
  await ensureAdminUser();

  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !verifyPassword(password, user.passwordHash) || user.status === "SUSPENDED") {
    return null;
  }

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return toPublicUser(updatedUser);
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<PublicAppUser, "role" | "status" | "name">>
) {
  if (!MONGO_OBJECT_ID_PATTERN.test(id)) return null;

  const user = await db.user.update({
    where: { id },
    data: updates,
  });

  return toPublicUser(user);
}

export async function setSession(userId: string) {
  cookies().set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSession() {
  cookies().set(SESSION_COOKIE, "", {
    expires: new Date(0),
    path: "/",
  });
}

export async function getCurrentUser() {
  const userId = readSessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  if (!MONGO_OBJECT_ID_PATTERN.test(userId)) {
    return null;
  }

  const user = await findUserById(userId);
  if (!user || user.status === "SUSPENDED") return null;

  return user;
}

export async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return null;
  }

  return user;
}
