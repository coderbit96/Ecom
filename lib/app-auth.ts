import "server-only";

import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHmac } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { cookies } from "next/headers";

export type AppUserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";
export type AppUserStatus = "ACTIVE" | "SUSPENDED";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  passwordHash: string;
  role: AppUserRole;
  status: AppUserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

export type PublicAppUser = Omit<AppUser, "passwordHash">;

const SESSION_COOKIE = "ecom_app_session";
const STORE_PATH = path.join(process.cwd(), "data", "users.json");
const PAGE_SIZE = 20;

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

function toPublicUser(user: AppUser): PublicAppUser {
  const { passwordHash, ...publicUser } = user;
  void passwordHash;
  return publicUser;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, hash] = passwordHash.split(":");
  if (!salt || !hash) return false;

  const currentHash = scryptSync(password, salt, 64);
  const storedHash = Buffer.from(hash, "hex");

  return storedHash.length === currentHash.length && timingSafeEqual(storedHash, currentHash);
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

async function saveUsers(users: AppUser[]) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(users, null, 2));
}

export async function getUsers() {
  let users: AppUser[] = [];

  try {
    users = JSON.parse(await readFile(STORE_PATH, "utf8")) as AppUser[];
  } catch {
    users = [];
  }

  const adminEmail = getAdminEmail();
  const adminIndex = users.findIndex((user) => user.email.toLowerCase() === adminEmail);
  const now = new Date().toISOString();

  if (adminIndex === -1) {
    users.unshift({
      id: randomUUID(),
      email: adminEmail,
      name: "Admin",
      passwordHash: hashPassword(getAdminPassword()),
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
    await saveUsers(users);
  } else {
    const admin = users[adminIndex];
    if (admin.role !== "SUPER_ADMIN" || admin.status !== "ACTIVE") {
      users[adminIndex] = {
        ...admin,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        updatedAt: now,
      };
      await saveUsers(users);
    }
  }

  return users;
}

export async function listUsers(params: Record<string, string | string[] | undefined>) {
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Number(pageValue) || 1);
  const q = ((Array.isArray(params.q) ? params.q[0] : params.q) ?? "").toLowerCase();
  const role = ((Array.isArray(params.role) ? params.role[0] : params.role) ?? "").toUpperCase();
  const status = ((Array.isArray(params.status) ? params.status[0] : params.status) ?? "").toUpperCase();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const to = Array.isArray(params.to) ? params.to[0] : params.to;

  let users = (await getUsers()).map(toPublicUser);

  if (q) {
    users = users.filter(
      (user) =>
        user.email.toLowerCase().includes(q) || user.name.toLowerCase().includes(q)
    );
  }
  if (role) users = users.filter((user) => user.role === role);
  if (status) users = users.filter((user) => user.status === status);
  if (from) users = users.filter((user) => user.createdAt >= `${from}T00:00:00.000Z`);
  if (to) users = users.filter((user) => user.createdAt <= `${to}T23:59:59.999Z`);

  users.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
  return (await getUsers()).find((user) => user.id === id) ?? null;
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
  const users = await getUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error("EMAIL_EXISTS");
  }

  const now = new Date().toISOString();
  const user: AppUser = {
    id: randomUUID(),
    email: normalizedEmail,
    name: name.trim() || normalizedEmail.split("@")[0],
    passwordHash: hashPassword(password),
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };

  users.push(user);
  await saveUsers(users);
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
  const users = await getUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();
  const existingIndex = users.findIndex(
    (user) => user.email.toLowerCase() === normalizedEmail
  );

  if (existingIndex >= 0) {
    users[existingIndex] = {
      ...users[existingIndex],
      name: name?.trim() || users[existingIndex].name,
      image: image ?? users[existingIndex].image,
      lastLoginAt: now,
      updatedAt: now,
    };
    await saveUsers(users);
    return toPublicUser(users[existingIndex]);
  }

  const user: AppUser = {
    id: randomUUID(),
    email: normalizedEmail,
    name: name?.trim() || normalizedEmail.split("@")[0],
    image: image ?? null,
    passwordHash: hashPassword(randomUUID()),
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  users.push(user);
  await saveUsers(users);
  return toPublicUser(user);
}

export async function authenticateUser(email: string, password: string) {
  const users = await getUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((item) => item.email.toLowerCase() === normalizedEmail);

  if (!user || !verifyPassword(password, user.passwordHash) || user.status === "SUSPENDED") {
    return null;
  }

  user.lastLoginAt = new Date().toISOString();
  user.updatedAt = user.lastLoginAt;
  await saveUsers(users);

  return toPublicUser(user);
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<AppUser, "role" | "status" | "name">>
) {
  const users = await getUsers();
  const index = users.findIndex((user) => user.id === id);
  if (index === -1) return null;

  const user = users[index];
  users[index] = {
    ...user,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveUsers(users);
  return toPublicUser(users[index]);
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

  const user = await findUserById(userId);
  if (!user || user.status === "SUSPENDED") return null;

  return toPublicUser(user);
}

export async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return null;
  }

  return user;
}
