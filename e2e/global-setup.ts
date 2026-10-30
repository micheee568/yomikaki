import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Builds a fresh, isolated database for the browser test: real migrations plus the real dictionary.
export default function globalSetup() {
  const prismaDir = path.join(process.cwd(), "prisma");
  for (const f of ["e2e.db", "e2e.db-journal"]) fs.rmSync(path.join(prismaDir, f), { force: true });

  const env = { ...process.env, DATABASE_URL: "file:./e2e.db" };
  execSync("npx prisma migrate deploy", { stdio: "pipe", env });
  execSync("npx tsx scripts/import-jmdict.ts", { stdio: "inherit", env });
}
