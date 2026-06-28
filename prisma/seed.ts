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
    }

    const categories = [
      { name: "Cosmetics", slug: "cosmetics" },
      { name: "Apparel", slug: "apparel" },
    ];

    for (const cat of categories) {
      const existingCat = await prisma.category.findUnique({ where: { slug: cat.slug } });
      if (!existingCat) {
        await prisma.category.create({ data: cat });
        console.log(`Category created: ${cat.name}`);
      }
    }

    const cosmetics = await prisma.category.findUnique({ where: { slug: "cosmetics" } });
    const apparel = await prisma.category.findUnique({ where: { slug: "apparel" } });

    const products = [
      {
        name: "Liptint",
        categoryId: cosmetics!.id,
        description: "Long-lasting liquid liptint with moisturizing formula",
        variants: [
          { name: "Berry Red", sku: "LT-BERRY-01", unitCost: 45, sellingPrice: 89, currentStockQty: 50, reorderPoint: 10 },
          { name: "Peach Nude", sku: "LT-PEACH-01", unitCost: 45, sellingPrice: 89, currentStockQty: 50, reorderPoint: 10 },
          { name: "Rose Pink", sku: "LT-ROSE-01", unitCost: 45, sellingPrice: 89, currentStockQty: 50, reorderPoint: 10 },
        ],
        attributes: { category: "cosmetics", type: "liptint", shades: ["Berry Red", "Peach Nude", "Rose Pink"] },
      },
      {
        name: "Cluster Lashes",
        categoryId: cosmetics!.id,
        description: "Premium faux mink cluster lashes, reusable up to 5 times",
        variants: [
          { name: "Short 8mm", sku: "CL-SHORT-01", unitCost: 25, sellingPrice: 59, currentStockQty: 30, reorderPoint: 10 },
          { name: "Medium 10mm", sku: "CL-MED-01", unitCost: 25, sellingPrice: 59, currentStockQty: 30, reorderPoint: 10 },
          { name: "Long 12mm", sku: "CL-LONG-01", unitCost: 25, sellingPrice: 59, currentStockQty: 30, reorderPoint: 10 },
          { name: "Mixed Tray", sku: "CL-MIX-01", unitCost: 30, sellingPrice: 79, currentStockQty: 20, reorderPoint: 5 },
        ],
        attributes: { category: "cosmetics", type: "lashes", sizes: ["8mm", "10mm", "12mm", "Mixed"] },
      },
      {
        name: "White Scrub Suit",
        categoryId: apparel!.id,
        description: "Comfortable white scrub suit, breathable cotton-polyester blend",
        variants: [
          { name: "Small", sku: "WS-S-01", unitCost: 180, sellingPrice: 350, currentStockQty: 15, reorderPoint: 5 },
          { name: "Medium", sku: "WS-M-01", unitCost: 180, sellingPrice: 350, currentStockQty: 15, reorderPoint: 5 },
          { name: "Large", sku: "WS-L-01", unitCost: 180, sellingPrice: 350, currentStockQty: 15, reorderPoint: 5 },
          { name: "X-Large", sku: "WS-XL-01", unitCost: 200, sellingPrice: 380, currentStockQty: 10, reorderPoint: 3 },
        ],
        attributes: { category: "apparel", type: "scrub-suit", sizes: ["S", "M", "L", "XL"] },
      },
    ];

    for (const product of products) {
      const existingProduct = await prisma.product.findFirst({ where: { name: product.name } });
      if (!existingProduct) {
        const created = await prisma.product.create({
          data: {
            name: product.name,
            description: product.description,
            categoryId: product.categoryId,
            attributes: product.attributes,
          },
        });

        for (const variant of product.variants) {
          await prisma.productVariant.create({
            data: { ...variant, productId: created.id },
          });
        }
        console.log(`Product created: ${product.name} (${product.variants.length} variants)`);
      } else {
        console.log(`Product already exists: ${product.name}`);
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
