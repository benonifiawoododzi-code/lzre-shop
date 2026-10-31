import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) token.uid = user.id;
      if (user && "roles" in user && Array.isArray(user.roles)) token.roles = user.roles;
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = typeof token.uid === "string" ? token.uid : "";
      session.user.roles = Array.isArray(token.roles)
        ? token.roles.filter((role): role is "CUSTOMER" | "SELLER" | "ADMIN" => role === "CUSTOMER" || role === "SELLER" || role === "ADMIN")
        : [];
      return session;
    },
    authorized: ({ auth: session, request }) => {
      const path = request.nextUrl.pathname;
      const roles = session?.user?.roles ?? [];
      const loggedIn = Boolean(session?.user?.id);
      if (path.startsWith("/admin")) return roles.includes("ADMIN");
      if (path.startsWith("/account")) return loggedIn;
      if (path.startsWith("/seller/register") || path.startsWith("/seller/login")) return true;
      if (path.startsWith("/seller")) return roles.includes("SELLER") || roles.includes("ADMIN");
      return true;
    },
  },
} satisfies NextAuthConfig;
