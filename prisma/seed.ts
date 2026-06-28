import "dotenv/config";
import { createPrismaClient } from "../lib/db";
import { hash } from "bcryptjs";

async function main() {
  const prisma = createPrismaClient();

  try {
    const adminEmail = process.env.AUTH_ADMIN_EMAIL || "admin@jccosmetics.com";
    const adminPassword = process.env.AUTH_ADMIN_PASSWORD || "admin123";

    const existing = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      const hashed = await hash(adminPassword, 12);
      await prisma.adminUser.create({
        data: { email: adminEmail, password: hashed, name: "Admin" },
      });
      console.log(`Admin user created: ${adminEmail}`);
    } else {
      console.log(`Admin user already exists: ${adminEmail}`);
    }

    const categories = [
      { name: "Cosmetics", slug: "cosmetics" },
      { name: "Apparel", slug: "apparel" },
      { name: "Accessories", slug: "accessories" },
    ];

    for (const cat of categories) {
      const existingCat = await prisma.category.findUnique({ where: { slug: cat.slug } });
      if (!existingCat) {
        await prisma.category.create({ data: cat });
        console.log(`Category created: ${cat.name}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
