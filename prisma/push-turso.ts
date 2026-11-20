import { createClient } from "@libsql/client";
import { execSync } from "child_process";

async function pushToTurso() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables");
  }

  console.log(`Connecting to Turso: ${url}...`);
  const client = createClient({ url, authToken });

  console.log("Generating SQLite DDL schema from Prisma...");
  const ddl = execSync(
    "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
    { encoding: "utf-8" }
  );

  console.log("Applying schema to Turso cloud database...");
  await client.executeMultiple(ddl);

  console.log("Testing query on Turso cloud database...");
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
  );

  console.log("Tables created successfully on Turso:", tables.rows.map((r) => r[0]));
  console.log("All tables are live and ready on Turso Cloud!");
}

pushToTurso().catch((err) => {
  console.error("Failed to push to Turso:", err);
  process.exit(1);
});
