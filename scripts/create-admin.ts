import { loadEnv } from "./load-env";

loadEnv();

const name = process.env.ADMIN_NAME?.trim() ?? "";
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const password = process.env.ADMIN_PASSWORD ?? "";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!name || !email || !email.includes("@")) fail("Set ADMIN_NAME and ADMIN_EMAIL.");
if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  fail("ADMIN_PASSWORD must be at least 12 characters and include a letter and a number. There is no default password.");
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const { hashPassword } = await import("../src/lib/password");
  const prisma = new PrismaClient();
  try {
    const passwordHash = await hashPassword(password);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const roles = existing.roles.includes("ADMIN") ? existing.roles : [...existing.roles, "ADMIN" as const];
      await prisma.user.update({
        where: { id: existing.id },
        data: { name, passwordHash, roles, status: "ACTIVE", emailVerified: existing.emailVerified ?? new Date() },
      });
      console.log(`Updated administrator ${email}.`);
    } else {
      await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          roles: ["ADMIN", "CUSTOMER"],
          emailVerified: new Date(),
          customerProfile: { create: {} },
          notificationPreference: { create: { marketingEmail: false } },
        },
      });
      console.log(`Created administrator ${email}.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Administrator setup failed.");
  process.exit(1);
});
