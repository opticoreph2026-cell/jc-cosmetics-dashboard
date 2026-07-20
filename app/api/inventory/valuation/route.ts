import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAuth();
    const variants = await prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: { select: { name: true, category: { select: { name: true } } } } },
    });

    let totalCost = 0;
    let totalRetail = 0;
    const byCategory: Record<string, { cost: number; retail: number; units: number }> = {};

    for (const v of variants) {
      const qty = v.currentStockQty;
      const cost = Number(v.unitCost) * qty;
      const retail = Number(v.sellingPrice) * qty;
      totalCost += cost;
      totalRetail += retail;

      const category = v.product.category?.name || "Uncategorized";
      if (!byCategory[category]) byCategory[category] = { cost: 0, retail: 0, units: 0 };
      byCategory[category].cost += cost;
      byCategory[category].retail += retail;
      byCategory[category].units += qty;
    }

    return Response.json({
      totalCost: Math.round(totalCost * 100) / 100,
      totalRetail: Math.round(totalRetail * 100) / 100,
      potentialProfit: Math.round((totalRetail - totalCost) * 100) / 100,
      itemCount: variants.length,
      totalUnits: variants.reduce((s, v) => s + v.currentStockQty, 0),
      byCategory: Object.entries(byCategory).map(([name, data]) => ({
        name,
        cost: Math.round(data.cost * 100) / 100,
        retail: Math.round(data.retail * 100) / 100,
        units: data.units,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
