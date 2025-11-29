/**
 * Lightweight connectivity check for the configured database.
 * Requires DATABASE_URL (or Vercel's POSTGRES_* equivalents) to be set.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Simple no-op query; using raw keeps it driver-agnostic
  await prisma.$queryRaw`SELECT 1 as ok`;
  console.log("✅ Database connection succeeded.");
}

main()
  .catch((err) => {
    console.error("❌ Database connection failed:", err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
