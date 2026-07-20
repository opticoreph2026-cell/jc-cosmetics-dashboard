import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";

export async function POST() {
  try {
    await requireAuth();
    const adminEmail = process.env.AUTH_ADMIN_EMAIL || "admin@jccosmetics.com";
    const adminPassword = process.env.AUTH_ADMIN_PASSWORD;

    if (!adminPassword) {
      return Response.json({ error: "AUTH_ADMIN_PASSWORD environment variable is not set" }, { status: 500 });
    }

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
    return handleApiError(error);
  }
}
