import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const PLACEHOLDER_PREFIX = "replace-with-";

function readCredential(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value && !value.startsWith(PLACEHOLDER_PREFIX)) {
      return value;
    }
  }

  return "";
}

export function getGoogleOAuthCredentials() {
  return {
    clientId: readCredential("GOOGLE_CLIENT_ID", "AUTH_GOOGLE_ID"),
    clientSecret: readCredential("GOOGLE_CLIENT_SECRET", "AUTH_GOOGLE_SECRET"),
  };
}

export function hasGoogleOAuthCredentials() {
  const credentials = getGoogleOAuthCredentials();
  return Boolean(credentials.clientId && credentials.clientSecret);
}

const googleCredentials = getGoogleOAuthCredentials();

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: hasGoogleOAuthCredentials()
    ? [
        Google({
          clientId: googleCredentials.clientId,
          clientSecret: googleCredentials.clientSecret,
        }),
      ]
    : [],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.email =
          typeof token.email === "string"
            ? token.email
            : (session.user.email ?? "");
        session.user.role =
          token.role === "ADMIN" ||
          token.role === "SUPER_ADMIN" ||
          token.role === "GUEST" ||
          token.role === "CUSTOMER"
            ? token.role
            : "CUSTOMER";
        session.user.status =
          token.status === "ACTIVE" || token.status === "SUSPENDED"
            ? token.status
            : "ACTIVE";
      }

      return session;
    },
  },
};
