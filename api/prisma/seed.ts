import "dotenv/config";
import { PrismaClient, AuthProvider } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "test" || process.env.SEED_DISABLE === "1") {
    console.log("Seeding disabled for test/CI.");
    return;
  }

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" }
  });

  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: { name: "user" }
  });

  console.log("Seeded roles:", adminRole.name, userRole.name);

  // Create admin user with admin role
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: null,
      profile: { create: { fullName: "Admin One" } },
      accounts: { create: { provider: AuthProvider.GOOGLE, providerAccountId: "sample" } },
      roles: { create: { roleId: adminRole.id } }
    }
  });

  console.log("Seeded admin user:", admin.email);
}

main().finally(() => prisma.$disconnect());
