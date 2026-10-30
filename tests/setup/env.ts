// Runs in every test worker before any module imports the Prisma client,
// so tests can never touch the real database. Path is relative to prisma/.
process.env.DATABASE_URL = "file:./test.db";
