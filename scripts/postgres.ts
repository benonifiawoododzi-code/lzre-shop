import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";

const port = 5432;
const postgres = new EmbeddedPostgres({
  databaseDir: ".data/postgres",
  user: "lzre",
  password: "lzre",
  port,
  persistent: true,
});

async function main() {
  mkdirSync(".data", { recursive: true });
  if (!existsSync(".data/postgres/PG_VERSION")) {
    await postgres.initialise();
  }
  await postgres.start();
  try {
    await postgres.createDatabase("lzre");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) throw error;
  }
  console.log(`Postgres listening on localhost:${port}, database lzre.`);
  await new Promise(() => undefined);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Postgres failed to start.");
  process.exit(1);
});
