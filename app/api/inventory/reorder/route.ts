import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAuth();
    const variants = await prisma.productVariant.findMany({
      where: { isActive: true },
      include: {
        product: { select: { name: true } },
        supplierProducts: {
          where: { isPreferred: true },
          include: { supplier: { select: { id: true, name: true } } },
          take: 1,
        },
      },
      orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
    });

    const belowReorder = variants.filter((v) => v.currentStockQty <= v.reorderPoint);

    if (belowReorder.length === 0) {
      return NextResponse.json([]);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesData = await prisma.salesOrderItem.groupBy({
      by: ["variantId"],
      where: {
        variantId: { in: belowReorder.map((v) => v.id) },
        salesOrder: { createdAt: { gte: thirtyDaysAgo } },
      },
      _sum: { qty: true },
    });

    const salesMap = new Map(salesData.map((s) => [s.variantId, s._sum.qty ?? 0]));

    const suggestions = belowReorder
      .map((v) => {
        const sales30 = salesMap.get(v.id) ?? 0;
        const dailyRate = sales30 / 30;
        const daysRemaining = dailyRate > 0 ? Math.floor(v.currentStockQty / dailyRate) : 999;
        const suggestedQty = Math.max(Math.ceil(dailyRate * 45) - v.currentStockQty, 1);
        return {
          id: v.id,
          productName: v.product.name,
          variantName: v.name,
          sku: v.sku,
          currentStock: v.currentStockQty,
          reorderPoint: v.reorderPoint,
          sales30,
          dailyRate: Math.round(dailyRate * 100) / 100,
          daysRemaining,
          suggestedQty,
          preferredSupplier: v.supplierProducts[0] ?? null,
        };
      })
      .sort((a, b) => {
        const aUrgency = a.daysRemaining === 0 ? -1 : a.daysRemaining === 999 ? Infinity : a.daysRemaining;
        const bUrgency = b.daysRemaining === 0 ? -1 : b.daysRemaining === 999 ? Infinity : b.daysRemaining;
        return aUrgency - bUrgency || b.sales30 - a.sales30;
      });

    return NextResponse.json(suggestions);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
