import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding admin user...");

  const password = "Admin2026!";
  const passwordHash = await bcrypt.hash(password, 12);

  console.log("Generated hash:", passwordHash);

  const user = await prisma.authUser.upsert({
    where: { username: "tomek" },
    update: { passwordHash, role: "admin" },
    create: {
      username: "tomek",
      email: "tomek@mission-control.app",
      passwordHash,
      role: "admin",
      projectAccess: [],
    },
  });

  console.log("✅ Admin user created/updated:", user.id, user.username);
  console.log("Login: username=tomek, password=Admin2026!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
