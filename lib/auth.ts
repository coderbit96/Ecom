import { PrismaAdapter } from "@auth/prisma-adapter";
import { type UserRole } from "@prisma/client";
import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";
import { db } from "@/lib/db";

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (!user.id) return false;

      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { status: true, name: true, avatarUrl: true },
      });

      if (!dbUser) return false;

      if (dbUser.status === "SUSPENDED") {
        return "/suspended";
      }

      if (account?.provider === "google") {
        const nextName = profile?.name ?? user.name ?? dbUser.name ?? null;
        const nextAvatar =
          (typeof profile?.picture === "string" ? profile.picture : null) ??
          user.image ??
          dbUser.avatarUrl ??
          null;

        await db.user.update({
          where: { id: user.id },
          data: {
            googleId: account.providerAccountId,
            name: nextName,
            image: nextAvatar,
            avatarUrl: nextAvatar,
          },
        });

        await db.activityLog
          .create({
            data: {
              userId: user.id,
              action: "LOGIN",
              metadata: {
                provider: "google",
                browser: "Google OAuth",
              },
              device: "Web browser",
            },
          })
          .catch(() => null);
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { id: true, email: true, role: true, status: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.isAdmin = ADMIN_ROLES.includes(dbUser.role);
        }
      }

      return token;
    },
  },
});
