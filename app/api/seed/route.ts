import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST() {
  try {
    const adminEmail = process.env.AUTH_ADMIN_EMAIL || "admin@jccosmetics.com";
    const adminPassword = process.env.AUTH_ADMIN_PASSWORD || "admin123";

    const existing = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      const hashed = await hash(adminPassword, 12);
      await prisma.adminUser.create({
        data: { email: adminEmail, password: hashed, name: "Admin" },
      });
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
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
