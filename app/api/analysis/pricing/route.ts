import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from "date-fns";

const MONTHS_OF_HISTORY = 6;
const COMPETITIVE_MARGIN_MIN = 30;
const COMPETITIVE_MARGIN_TARGET = 45;

function linreg(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };
  const x = values.map((_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * values[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssTot = values.reduce((a, v) => a + (v - yMean) ** 2, 0);
  const ssRes = values.reduce((a, v, i) => a + (v - (slope * i + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

export async function GET() {
  try {
    await requireAuth();

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthExpenses = await prisma.expense.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    });
    const monthlyFixedCosts = Number(monthExpenses._sum.amount || 0);

    const [currentOrders, variants] = await Promise.all([
      prisma.salesOrder.findMany({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
        include: { items: true },
      }),
      prisma.productVariant.findMany({
        where: { isActive: true },
        include: { product: { select: { name: true, category: { select: { name: true } } } } },
      }),
    ]);

    let totalMonthUnits = 0;
    let totalMonthRevenue = 0;
    let totalMonthCost = 0;
    for (const o of currentOrders) {
      for (const i of o.items) {
        totalMonthUnits += i.qty;
        totalMonthRevenue += Number(i.unitPriceAtSale) * i.qty;
        totalMonthCost += Number(i.unitCostAtSale) * i.qty;
      }
    }

    const avgUnitCost = totalMonthUnits > 0 ? totalMonthCost / totalMonthUnits : 0;
    const avgSellingPrice = totalMonthUnits > 0 ? totalMonthRevenue / totalMonthUnits : 0;
    const avgMargin = avgSellingPrice > 0 ? ((avgSellingPrice - avgUnitCost) / avgSellingPrice) * 100 : 0;
    const grossProfitThisMonth = totalMonthRevenue - totalMonthCost;
    const netProfitThisMonth = grossProfitThisMonth - monthlyFixedCosts;

    // Monthly sales history
    const monthlySales: { month: string; units: number; revenue: number; label: string }[] = [];
    for (let m = MONTHS_OF_HISTORY - 1; m >= 0; m--) {
      const d = subMonths(now, m);
      const sm = startOfMonth(d);
      const em = endOfMonth(d);
      const orders = await prisma.salesOrder.findMany({
        where: { createdAt: { gte: sm, lte: em } },
        include: { items: true },
      });
      let u = 0;
      let r = 0;
      for (const o of orders) {
        for (const i of o.items) {
          u += i.qty;
          r += Number(i.unitPriceAtSale) * i.qty;
        }
      }
      monthlySales.push({
        month: format(d, "yyyy-MM"),
        units: u,
        revenue: Math.round(r * 100) / 100,
        label: format(d, "MMM"),
      });
    }

    const unitSeries = monthlySales.map((m) => m.units);
    const revenueSeries = monthlySales.map((m) => m.revenue);
    const unitReg = linreg(unitSeries);
    const revenueReg = linreg(revenueSeries);

    const predictedUnits = [];
    for (let i = 1; i <= 2; i++) {
      const nextIdx = MONTHS_OF_HISTORY - 1 + i;
      const pu = Math.max(0, Math.round(unitReg.slope * nextIdx + unitReg.intercept));
      const pr = Math.max(0, Math.round(revenueReg.slope * nextIdx + revenueReg.intercept));
      const nextDate = addMonths(now, i);
      predictedUnits.push({
        month: format(nextDate, "yyyy-MM"),
        label: format(nextDate, "MMM"),
        units: pu,
        revenue: pr,
      });
    }

    const trendDirection = unitReg.slope > 1 ? "up" : unitReg.slope < -1 ? "down" : "stable";
    const growthRate = unitSeries[unitSeries.length - 1] > 0 && unitSeries[0] > 0
      ? Math.round(((unitSeries[unitSeries.length - 1] - unitSeries[0]) / unitSeries[0]) * 100)
      : 0;

    // 30-day per-variant sales
    const salesData = await prisma.salesOrderItem.groupBy({
      by: ["variantId"],
      where: { salesOrder: { createdAt: { gte: thirtyDaysAgo } } },
      _sum: { qty: true },
    });
    const salesMap = new Map(salesData.map((s) => [s.variantId, s._sum.qty ?? 0]));

    const marginPerUnit = avgSellingPrice - avgUnitCost;
    const currentBEUnits = marginPerUnit > 0 ? Math.ceil(monthlyFixedCosts / marginPerUnit) : Infinity;

    // Profit target scenarios
    const profitScenarios = [
      { label: "Break-even (₱0 profit)", targetProfit: 0 },
      { label: "+₱5,000 profit", targetProfit: 5000 },
      { label: "+₱10,000 profit", targetProfit: 10000 },
      { label: "+₱20,000 profit", targetProfit: 20000 },
    ].map((s) => {
      const neededRevenue = monthlyFixedCosts + s.targetProfit;
      const unitsNeeded = marginPerUnit > 0 ? Math.ceil(neededRevenue / marginPerUnit) : Infinity;
      const neededSales = Math.round(unitsNeeded * avgSellingPrice);
      return {
        ...s,
        unitsNeeded: unitsNeeded === Infinity ? 99999 : unitsNeeded,
        neededSales: unitsNeeded === Infinity ? 0 : neededSales,
        isAchievable: unitsNeeded !== Infinity && unitsNeeded <= totalMonthUnits * 5,
      };
    });

    // Product-level analysis
    const productAnalysis = variants.map((v) => {
      const sales30 = salesMap.get(v.id) ?? 0;
      const annualDemand = Math.max(1, Math.round(sales30 * 12));
      const unitCost = Number(v.unitCost);
      const sellingPrice = Number(v.sellingPrice);
      const currentMargin = sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : 0;
      const daysOfStock = sales30 > 0 ? Math.round((v.currentStockQty / sales30) * 30) : 999;

      const orderCost = 50;
      const holdingRate = 0.25;
      const eoq = Math.round(Math.sqrt((2 * annualDemand * orderCost) / (Math.max(unitCost, 1) * holdingRate)));

      const suggestedPrice45 = Math.round((unitCost / (1 - 0.45)) * 100) / 100;

      const revenueShare = totalMonthUnits > 0 ? sales30 / totalMonthUnits : 0;
      const productFixedCostShare = monthlyFixedCosts * revenueShare;
      const breakEvenPrice = sales30 > 0
        ? Math.round(((productFixedCostShare + (unitCost * sales30)) / sales30) * 100) / 100
        : 0;

      const competitiveMin = Math.round(unitCost * 1.8 * 100) / 100;
      const competitiveMax = Math.round(unitCost * 3.0 * 100) / 100;
      const isCompetitivelyPriced = sellingPrice >= competitiveMin && sellingPrice <= competitiveMax;
      const priceLevel = sellingPrice < competitiveMin ? "low" : sellingPrice > competitiveMax ? "high" : "competitive";

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
        suggestedPrice: suggestedPrice45,
        breakEvenPrice,
        isBelowBreakEven: breakEvenPrice > 0 && sellingPrice < breakEvenPrice,
        isMarginLow: currentMargin < COMPETITIVE_MARGIN_MIN,
        competitiveMin,
        competitiveMax,
        isCompetitivelyPriced,
        priceLevel,
      };
    }).sort((a, b) => a.currentMargin - b.currentMargin);

    // Price change simulator
    const priceChangeImpact = [];
    for (const pct of [-10, -5, 5, 10, 15, 20]) {
      const newAvgPrice = avgSellingPrice * (1 + pct / 100);
      const newMarginPerUnit = newAvgPrice - avgUnitCost;
      const newUnitsToBE = newMarginPerUnit > 0 ? Math.ceil(monthlyFixedCosts / newMarginPerUnit) : Infinity;
      priceChangeImpact.push({
        change: `${pct > 0 ? "+" : ""}${pct}%`,
        changeLabel: pct > 0 ? "Increase" : "Decrease",
        newAvgPrice: Math.round(newAvgPrice * 100) / 100,
        newMarginPerUnit: Math.round(newMarginPerUnit * 100) / 100,
        newUnitsToBE: newUnitsToBE === Infinity ? "—" : newUnitsToBE,
        unitsSaved: newUnitsToBE === Infinity ? "—" : currentBEUnits - newUnitsToBE,
      });
    }

    // Category-level summary
    const catMap = new Map<string, { products: number; units: number; revenue: number; cost: number }>();
    for (const p of productAnalysis) {
      const c = catMap.get(p.category) || { products: 0, units: 0, revenue: 0, cost: 0 };
      c.products++;
      c.units += p.sales30;
      c.revenue += p.sellingPrice * p.sales30;
      c.cost += p.unitCost * p.sales30;
      catMap.set(p.category, c);
    }
    const categorySummary = Array.from(catMap.entries()).map(([name, c]) => ({
      name,
      products: c.products,
      units: c.units,
      revenue: Math.round(c.revenue * 100) / 100,
      cost: Math.round(c.cost * 100) / 100,
      margin: c.revenue > 0 ? Math.round(((c.revenue - c.cost) / c.revenue) * 100 * 100) / 100 : 0,
      share: totalMonthRevenue > 0 ? Math.round((c.revenue / totalMonthRevenue) * 100 * 100) / 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      summary: {
        monthlyFixedCosts,
        avgUnitCost: Math.round(avgUnitCost * 100) / 100,
        avgSellingPrice: Math.round(avgSellingPrice * 100) / 100,
        avgMargin: Math.round(avgMargin * 100) / 100,
        marginPerUnit: Math.round(marginPerUnit * 100) / 100,
        currentMonthlyUnits: totalMonthUnits,
        currentMonthlyRevenue: Math.round(totalMonthRevenue * 100) / 100,
        grossProfit: Math.round(grossProfitThisMonth * 100) / 100,
        netProfit: Math.round(netProfitThisMonth * 100) / 100,
        breakEvenUnits: currentBEUnits === Infinity ? 99999 : currentBEUnits,
        isProfitable: netProfitThisMonth > 0,
        isBreakEvenUnit: totalMonthUnits >= currentBEUnits,
      },
      salesTrend: {
        history: monthlySales,
        prediction: predictedUnits,
        trendDirection,
        growthRate,
        confidence: unitReg.r2 > 0.7 ? "high" : unitReg.r2 > 0.4 ? "medium" : "low",
        r2: Math.round(unitReg.r2 * 100) / 100,
      },
      profitScenarios,
      productAnalysis,
      productCount: productAnalysis.length,
      lowMarginCount: productAnalysis.filter((p) => p.isMarginLow).length,
      belowBreakEvenCount: productAnalysis.filter((p) => p.isBelowBreakEven).length,
      priceChangeImpact,
      categorySummary,
      recommendations: generateRecommendations({
        monthlyFixedCosts, avgUnitCost, avgSellingPrice, avgMargin, marginPerUnit,
        currentMonthlyUnits: totalMonthUnits, isProfitable: netProfitThisMonth > 0,
        breakEvenUnits: currentBEUnits === Infinity ? 99999 : currentBEUnits,
        netProfit: netProfitThisMonth, trendDirection, growthRate,
      }, productAnalysis, profitScenarios),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function generateRecommendations(
  s: {
    monthlyFixedCosts: number; avgUnitCost: number; avgSellingPrice: number;
    avgMargin: number; marginPerUnit: number;
    currentMonthlyUnits: number; isProfitable: boolean; breakEvenUnits: number;
    netProfit: number; trendDirection: string; growthRate: number;
  },
  products: {
    currentMargin: number; isBelowBreakEven: boolean; isMarginLow: boolean;
    productName: string; daysOfStock: number; sales30: number; eoq: number;
    unitCost: number; sellingPrice: number;
  }[],
  profitScenarios: { label: string; targetProfit: number; unitsNeeded: number; neededSales: number; isAchievable: boolean }[],
) {
  const r: { icon: string; text: string; type: "tip" | "warning" | "danger" | "info" }[] = [];

  if (s.isProfitable) {
    r.push({
      icon: "good", type: "info",
      text: `You earned ₱${s.netProfit.toFixed(0)} this month. You sold ${s.currentMonthlyUnits} units — only ${s.breakEvenUnits} were needed to break even. Keep it up!`,
    });
  } else {
    const deficit = s.breakEvenUnits - s.currentMonthlyUnits;
    r.push({
      icon: "bad", type: "danger",
      text: `You need ${deficit} more units this month to break even. Your monthly expenses are ₱${s.monthlyFixedCosts.toFixed(0)}. Each unit sold earns ₱${s.marginPerUnit.toFixed(2)} of gross profit.`,
    });
  }

  if (s.trendDirection === "up") {
    r.push({
      icon: "trending_up", type: "info",
      text: `Sales are growing ${s.growthRate}% compared to earlier months. Keep up the momentum!`,
    });
  } else if (s.trendDirection === "down") {
    r.push({
      icon: "trending_down", type: "warning",
      text: `Sales are declining. Consider running a promotion, bundling products, or posting on social media to attract customers.`,
    });
  }

  const belowBE = products.filter((p) => p.isBelowBreakEven);
  if (belowBE.length > 0) {
    r.push({
      icon: "warning", type: "danger",
      text: `${belowBE.length} product(s) are priced below their break-even point: ${belowBE.slice(0, 4).map((p) => p.productName).join(", ")}. Consider raising prices or finding a cheaper supplier.`,
    });
  }

  const lowMargin = products.filter((p) => p.isMarginLow && !p.isBelowBreakEven);
  if (lowMargin.length > 0) {
    r.push({
      icon: "low_margin", type: "warning",
      text: `${lowMargin.length} product(s) have low margins (below 30%): ${lowMargin.slice(0, 4).map((p) => `${p.productName} (₱${p.unitCost.toFixed(0)} cost → ₱${p.sellingPrice.toFixed(0)} price)`).join(", ")}. A small price increase of 10-20% is still competitive in the local market.`,
    });
  }

  const achievable = profitScenarios.filter((p) => p.isAchievable && p.targetProfit > 0);
  if (achievable.length > 0) {
    const next = achievable[0];
    const diff = next.unitsNeeded - s.currentMonthlyUnits;
    r.push({
      icon: "target", type: "tip",
      text: `Target: ${next.label}. You need ${next.unitsNeeded} units (₱${next.neededSales.toLocaleString()} in sales). That is ${diff > 0 ? `${diff} more units than you sell now` : "achievable with your current volume"}!`,
    });
  }

  const lowStock = products.filter((p) => p.daysOfStock < 15 && p.sales30 > 0);
  if (lowStock.length > 0) {
    r.push({
      icon: "stock", type: "warning",
      text: `${lowStock.length} product(s) will run out in less than 15 days: ${lowStock.slice(0, 5).map((p) => `${p.productName} (${p.daysOfStock}d left)`).join(", ")}. Order ${lowStock[0]?.eoq || "enough"} pieces to avoid running out.`,
    });
  }

  r.push({
    icon: "tip", type: "tip",
    text: `In the Lapu-Lapu and Cebu market, a good selling price is 2x-3x of your cost. For example, if a product costs ₱${products.length > 0 ? products[0].unitCost.toFixed(0) : "X"}, sell it for ₱${products.length > 0 ? Math.round(products[0].unitCost * 2.5).toFixed(0) : "Y"} - ₱${products.length > 0 ? Math.round(products[0].unitCost * 3).toFixed(0) : "Z"}. This is competitive with local brands while giving you good profit.`,
  });

  return r;
}
