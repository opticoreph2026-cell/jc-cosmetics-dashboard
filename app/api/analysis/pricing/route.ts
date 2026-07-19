import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  try {
    await requireAuth();

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [monthExpenses, variants] = await Promise.all([
      prisma.expense.aggregate({ where: { date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
      prisma.productVariant.findMany({
        where: { isActive: true },
        include: { product: { select: { name: true, category: { select: { name: true } } } } },
      }),
    ]);

    const monthlyFixedCosts = Number(monthExpenses._sum.amount || 0);

    const salesData = await prisma.salesOrderItem.groupBy({
      by: ["variantId"],
      where: { salesOrder: { createdAt: { gte: thirtyDaysAgo } } },
      _sum: { qty: true },
    });
    const salesMap = new Map(salesData.map((s) => [s.variantId, s._sum.qty ?? 0]));

    const totalMonthOrders = await prisma.salesOrder.findMany({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      include: { items: true },
    });

    let totalMonthUnits = 0;
    let totalMonthRevenue = 0;
    let totalMonthCost = 0;
    for (const o of totalMonthOrders) {
      for (const i of o.items) {
        totalMonthUnits += i.qty;
        totalMonthRevenue += Number(i.unitPriceAtSale) * i.qty;
        totalMonthCost += Number(i.unitCostAtSale) * i.qty;
      }
    }

    const avgUnitCost = totalMonthUnits > 0 ? totalMonthCost / totalMonthUnits : 0;
    const avgSellingPrice = totalMonthUnits > 0 ? totalMonthRevenue / totalMonthUnits : 0;
    const avgMargin = avgSellingPrice > 0 ? ((avgSellingPrice - avgUnitCost) / avgSellingPrice) * 100 : 0;
    const currentMonthlyUnits = totalMonthUnits;

    // Break-even scenarios at different volumes
    const breakEvenScenarios = [];
    const volumes = [
      { label: "Current volume", multiplier: 1 },
      { label: "10% fewer units", multiplier: 0.9 },
      { label: "20% more units", multiplier: 1.2 },
      { label: "50% more units", multiplier: 1.5 },
    ];
    for (const v of volumes) {
      const targetUnits = Math.round(currentMonthlyUnits * v.multiplier);
      if (targetUnits === 0) continue;
      const requiredRevenue = monthlyFixedCosts + (avgUnitCost * targetUnits);
      const requiredPrice = requiredRevenue / targetUnits;
      breakEvenScenarios.push({
        label: v.label,
        units: targetUnits,
        requiredAvgPrice: Math.round(requiredPrice * 100) / 100,
        requiredRevenue: Math.round(requiredRevenue * 100) / 100,
        requiredMargin: Math.round(((requiredPrice - avgUnitCost) / requiredPrice) * 100 * 100) / 100,
      });
    }

    // Product-level analysis
    const productAnalysis = variants.map((v) => {
      const sales30 = salesMap.get(v.id) ?? 0;
      const annualDemand = Math.max(1, Math.round(sales30 * 12));
      const unitCost = Number(v.unitCost);
      const sellingPrice = Number(v.sellingPrice);
      const currentMargin = sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : 0;
      const daysOfStock = sales30 > 0 ? Math.round((v.currentStockQty / sales30) * 30) : 999;

      // EOQ: √(2 * annualDemand * orderCost / (unitCost * holdingRate))
      const orderCost = 50; // assumed ₱50 per order
      const holdingRate = 0.25; // 25% holding cost
      const eoq = Math.round(Math.sqrt((2 * annualDemand * orderCost) / (unitCost * holdingRate)));

      // Suggested price for 40% margin
      const suggestedPrice = Math.round((unitCost / (1 - 0.40)) * 100) / 100;

      // What price would this product need for the business to break even
      // (its share of fixed costs based on its revenue proportion)
      const revenueShare = currentMonthlyUnits > 0 ? sales30 / currentMonthlyUnits : 0;
      const productFixedCostShare = monthlyFixedCosts * revenueShare;
      const suggestedPriceForBE = sales30 > 0
        ? Math.round(((productFixedCostShare + (unitCost * sales30)) / sales30) * 100) / 100
        : 0;

      return {
        id: v.id,
        name: v.name,
        sku: v.sku,
        productName: v.product.name,
        category: v.product.category?.name || "Uncategorized",
        unitCost,
        sellingPrice,
        currentMargin: Math.round(currentMargin * 100) / 100,
        currentStock: v.currentStockQty,
        sales30,
        annualDemand,
        daysOfStock,
        eoq,
        suggestedPrice,
        suggestedPriceForBE,
        isBelowSuggested: suggestedPrice > 0 && sellingPrice < suggestedPrice,
        isBelowBreakEven: suggestedPriceForBE > 0 && sellingPrice < suggestedPriceForBE,
      };
    }).sort((a, b) => a.currentMargin - b.currentMargin);

    // Price change impact on break-even
    const priceChangeImpact = [];
    for (const pct of [-10, -5, 5, 10, 15, 20]) {
      const newAvgPrice = avgSellingPrice * (1 + pct / 100);
      const newMarginPerUnit = newAvgPrice - avgUnitCost;
      const newUnitsToBE = newMarginPerUnit > 0 ? Math.ceil(monthlyFixedCosts / newMarginPerUnit) : 99999;
      const extraRevenuePerUnit = newAvgPrice - avgSellingPrice;
      priceChangeImpact.push({
        change: `${pct > 0 ? "+" : ""}${pct}%`,
        newAvgPrice: Math.round(newAvgPrice * 100) / 100,
        newMarginPerUnit: Math.round(newMarginPerUnit * 100) / 100,
        newUnitsToBE: newUnitsToBE > 99999 ? "—" : newUnitsToBE,
        unitsChange: newUnitsToBE > 99999 ? "—" : newUnitsToBE - breakEvenScenarios[0].units,
        extraRevenuePerUnit: Math.round(extraRevenuePerUnit * 100) / 100,
      });
    }

    // Overall break-even at current avg
    const currentBEUnits = avgMargin > 0 ? Math.ceil(monthlyFixedCosts / (avgSellingPrice - avgUnitCost)) : 0;

    return NextResponse.json({
      summary: {
        monthlyFixedCosts,
        avgUnitCost: Math.round(avgUnitCost * 100) / 100,
        avgSellingPrice: Math.round(avgSellingPrice * 100) / 100,
        avgMargin: Math.round(avgMargin * 100) / 100,
        currentMonthlyUnits,
        currentMonthlyRevenue: Math.round(totalMonthRevenue * 100) / 100,
        currentMonthlyProfit: Math.round((totalMonthRevenue - totalMonthCost - monthlyFixedCosts) * 100) / 100,
        breakEvenUnits: currentBEUnits,
        currentStatus: currentMonthlyUnits >= currentBEUnits ? "profitable" : "not profitable",
      },
      breakEvenScenarios,
      productAnalysis,
      priceChangeImpact,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
