import { execFileSync } from "node:child_process";
import { loadEnv } from "./load-env";

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL in .env before running database setup.");
  process.exit(1);
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

execFileSync(npx, ["prisma", "migrate", "deploy"], { stdio: "inherit" });
execFileSync(npx, ["tsx", "prisma/seed.ts"], { stdio: "inherit" });
