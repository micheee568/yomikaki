import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Rebuilds a fresh test database from the real migrations before the run.
export default function setup() {
  const prismaDir = path.join(process.cwd(), "prisma");
  for (const f of ["test.db", "test.db-journal"]) fs.rmSync(path.join(prismaDir, f), { force: true });

  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
