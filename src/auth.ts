import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation/schemas";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user || user.deletedAt || user.status !== "ACTIVE") return null;
        if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.emailVerified) return null;
        const matches = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!matches) return null;
        return { id: user.id, email: user.email, name: user.name, roles: user.roles };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) token.uid = user.id;
      if (user && "roles" in user && Array.isArray(user.roles)) token.roles = user.roles;
      if (process.env.NEXT_RUNTIME === "edge") return token;
      const claimed = user?.id ?? token.uid;
      const id = typeof claimed === "string" ? claimed : undefined;
      if (!id) return token;
      const row = await prisma.user.findUnique({
        where: { id },
        select: { id: true, roles: true, status: true, deletedAt: true, email: true, name: true },
      });
      if (!row || row.deletedAt || row.status !== "ACTIVE") {
        token.uid = undefined;
        token.roles = [];
        return token;
      }
      token.uid = row.id;
      token.roles = row.roles;
      token.email = row.email;
      token.name = row.name;
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = typeof token.uid === "string" ? token.uid : "";
      session.user.roles = Array.isArray(token.roles) ? token.roles.filter((role): role is "CUSTOMER" | "SELLER" | "ADMIN" => role === "CUSTOMER" || role === "SELLER" || role === "ADMIN") : [];
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
});
