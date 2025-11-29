const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const demoName = "Secret Snowflake Demo";

  let event = await prisma.event.findFirst({
    where: { name: demoName },
    include: { participants: true },
  });

  if (event) {
    console.log(`Demo event already exists (id: ${event.id}).`);
    return;
  }

  event = await prisma.event.create({
    data: {
      name: demoName,
      budget: "$25",
      eventDate: "2025-12-20",
      rules: "Keep it fun, keep it secret. No gift cards.",
      participants: {
        create: [
          { name: "Alex", email: "alex@example.com" },
          { name: "Jordan", email: "jordan@example.com" },
          { name: "Taylor", email: "taylor@example.com" },
        ],
      },
    },
    include: { participants: true },
  });

  console.log(`Created demo event "${event.name}" with ${event.participants.length} participants.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
