import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation/schemas";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
    ...authConfig.callbacks,
    jwt: async ({ token, user }) => {
      if (user?.id) token.uid = user.id;
      if (user && "roles" in user && Array.isArray(user.roles)) token.roles = user.roles;
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
  },
});
