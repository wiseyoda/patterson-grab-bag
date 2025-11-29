/**
 * Lightweight connectivity check for the configured database.
 * Requires PRISMA_DATABASE_URL (or Vercel's POSTGRES_* equivalents) to be set.
 */
const { PrismaClient } = require("@prisma/client");

const datasourceUrl =
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL_NON_POOLING ||
  process.env.PRISMA_DATABASE_URL ||
  process.env.PRISMA_ACCELERATE_URL ||
  process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
});

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
