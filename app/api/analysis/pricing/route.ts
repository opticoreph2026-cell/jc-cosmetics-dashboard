import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

const MONTHS_OF_HISTORY = 6;
const COMPETITIVE_MARGIN_MIN = 30;
const COMPETITIVE_MARGIN_TARGET = 45;

function linreg(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  const x = values.map((_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * values[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
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

    // --- Monthly expenses ---
    const monthExpenses = await prisma.expense.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    });
    const monthlyFixedCosts = Number(monthExpenses._sum.amount || 0);

    // --- Current month sales ---
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

    // --- Sales trends (monthly history) ---
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
    for (let i = 1; i <= 3; i++) {
      const nextIdx = MONTHS_OF_HISTORY - 1 + i;
      const pu = Math.max(0, Math.round(unitReg.slope * nextIdx + unitReg.intercept));
      const pr = Math.max(0, Math.round(revenueReg.slope * nextIdx + revenueReg.intercept));
      predictedUnits.push({
        month: format(subMonths(now, -i), "yyyy-MM"),
        label: format(subMonths(now, -i), "MMM"),
        units: pu,
        revenue: pr,
      });
    }

    const trendDirection = unitReg.slope > 1 ? "up" : unitReg.slope < -1 ? "down" : "stable";
    const growthRate = unitSeries[unitSeries.length - 1] > 0 && unitSeries[0] > 0
      ? Math.round(((unitSeries[unitSeries.length - 1] - unitSeries[0]) / unitSeries[0]) * 100)
      : 0;

    // --- 30-day per-variant sales ---
    const salesData = await prisma.salesOrderItem.groupBy({
      by: ["variantId"],
      where: { salesOrder: { createdAt: { gte: thirtyDaysAgo } } },
      _sum: { qty: true },
    });
    const salesMap = new Map(salesData.map((s) => [s.variantId, s._sum.qty ?? 0]));

    // --- Break-even at current avg ---
    const marginPerUnit = avgSellingPrice - avgUnitCost;
    const currentBEUnits = marginPerUnit > 0 ? Math.ceil(monthlyFixedCosts / marginPerUnit) : Infinity;

    // --- Profit target scenarios (plain-language) ---
    const profitScenarios = [
      { label: "Break-even (₱0 profit)", targetProfit: 0 },
      { label: "Small profit (+₱5,000)", targetProfit: 5000 },
      { label: "Moderate profit (+₱10,000)", targetProfit: 10000 },
      { label: "Good profit (+₱20,000)", targetProfit: 20000 },
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

    // --- Product-level analysis ---
    const productAnalysis = variants.map((v) => {
      const sales30 = salesMap.get(v.id) ?? 0;
      const annualDemand = Math.max(1, Math.round(sales30 * 12));
      const unitCost = Number(v.unitCost);
      const sellingPrice = Number(v.sellingPrice);
      const currentMargin = sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : 0;
      const daysOfStock = sales30 > 0 ? Math.round((v.currentStockQty / sales30) * 30) : 999;

      const orderCost = 50;
      const holdingRate = 0.25;
      const eoq = Math.round(Math.sqrt((2 * annualDemand * orderCost) / (unitCost * holdingRate)));

      const suggestedPrice40 = Math.round((unitCost / (1 - 0.40)) * 100) / 100;
      const suggestedPrice45 = Math.round((unitCost / (1 - 0.45)) * 100) / 100;

      const revenueShare = totalMonthUnits > 0 ? sales30 / totalMonthUnits : 0;
      const productFixedCostShare = monthlyFixedCosts * revenueShare;
      const breakEvenPrice = sales30 > 0
        ? Math.round(((productFixedCostShare + (unitCost * sales30)) / sales30) * 100) / 100
        : 0;

      // Competitive price range for Cebu / Lapu-Lapu market
      // Cosmetics typical markup: 2x-3x of cost (50-67% margin)
      // Budget-friendly: 1.5x-2x cost (33-50% margin)
      const competitiveMin = Math.round(unitCost * 1.8 * 100) / 100;   // 44% margin
      const competitiveMax = Math.round(unitCost * 3.0 * 100) / 100;   // 67% margin
      const isCompetitivelyPriced = sellingPrice >= competitiveMin && sellingPrice <= competitiveMax;
      const priceLevel = sellingPrice < competitiveMin ? "low" : sellingPrice > competitiveMax ? "high" : "competitive";
      const priceAdvice = sellingPrice < breakEvenPrice
        ? "Mataas ang cost vs price — lugi ka dito. Itaas ang presyo o bawasan ang cost."
        : currentMargin < 20
          ? "Maliit ang tubo. Subukan taasan ng ₱5-10 o humanap ng mas murang supplier."
          : currentMargin < 45
            ? "Okay ang margin pero pwedeng taasan pa konti para mas kumita."
            : "Maganda ang margin! Competitive pa rin sa Cebu market.";

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
        priceAdvice,
      };
    }).sort((a, b) => a.currentMargin - b.currentMargin);

    // --- Price change simulator ---
    const priceChangeImpact = [];
    for (const pct of [-10, -5, 5, 10, 15, 20]) {
      const newAvgPrice = avgSellingPrice * (1 + pct / 100);
      const newMarginPerUnit = newAvgPrice - avgUnitCost;
      const newUnitsToBE = newMarginPerUnit > 0 ? Math.ceil(monthlyFixedCosts / newMarginPerUnit) : Infinity;
      priceChangeImpact.push({
        change: `${pct > 0 ? "+" : ""}${pct}%`,
        changeLabel: pct > 0 ? "Taasan" : "Bawasan",
        newAvgPrice: Math.round(newAvgPrice * 100) / 100,
        newMarginPerUnit: Math.round(newMarginPerUnit * 100) / 100,
        newUnitsToBE: newUnitsToBE === Infinity ? "—" : newUnitsToBE,
        unitsSaved: newUnitsToBE === Infinity ? "—" : currentBEUnits - newUnitsToBE,
      });
    }

    // --- Category-level summary ---
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

      // Sales Trend Prediction
      salesTrend: {
        history: monthlySales,
        prediction: predictedUnits,
        trendDirection,
        growthRate,
        confidence: unitReg.r2 > 0.7 ? "high" : unitReg.r2 > 0.4 ? "medium" : "low",
        r2: Math.round(unitReg.r2 * 100) / 100,
      },

      // Profit target scenarios
      profitScenarios,

      // Product-level analysis
      productAnalysis,
      productCount: productAnalysis.length,
      lowMarginCount: productAnalysis.filter((p) => p.isMarginLow).length,
      belowBreakEvenCount: productAnalysis.filter((p) => p.isBelowBreakEven).length,

      // Price change simulation
      priceChangeImpact,

      // Category overview
      categorySummary,

      // Top-level recommendations (plain Tagalog/English mix)
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
    priceAdvice: string; unitCost: number; sellingPrice: number;
  }[],
  profitScenarios: { label: string; targetProfit: number; unitsNeeded: number; neededSales: number; isAchievable: boolean }[],
) {
  const r: { icon: string; text: string; type: "tip" | "warning" | "danger" | "info" }[] = [];

  // 1. Overall health
  if (s.isProfitable) {
    r.push({
      icon: "🟢", type: "info",
      text: `Maganda! Kumikita ka ng ₱${s.netProfit.toFixed(0)} ngayong buwan. Benta mo: ${s.currentMonthlyUnits} units vs kailangan lang na ${s.breakEvenUnits} units.`,
    });
  } else {
    const deficit = s.breakEvenUnits - s.currentMonthlyUnits;
    r.push({
      icon: "🔴", type: "danger",
      text: `Kailangan mo pa ng ${deficit} units para hindi lugi ngayong buwan. Ang gastos mo ay ₱${s.monthlyFixedCosts.toFixed(0)}/buwan — bawat unit na ibenta mo ay kumikita ng ₱${s.marginPerUnit.toFixed(2)}.`,
    });
  }

  // 2. Trend
  if (s.trendDirection === "up") {
    r.push({
      icon: "📈", type: "info",
      text: `Ang benta mo ay lumalaki ng ${s.growthRate}% compared sa nakaraang buwan. Tuloy-tuloy lang!`,
    });
  } else if (s.trendDirection === "down") {
    r.push({
      icon: "📉", type: "warning",
      text: `Bumababa ang benta mo. Subukan mag-promo, mag-bundle, o mag-post sa social media para maakit ang customers.`,
    });
  }

  // 3. Below break-even products
  const belowBE = products.filter((p) => p.isBelowBreakEven);
  if (belowBE.length > 0) {
    r.push({
      icon: "⚠️", type: "danger",
      text: `${belowBE.length} produkto ang lugi ang presyo: ${belowBE.slice(0, 4).map((p) => p.productName).join(", ")}. Kung pwedeng taasan ang presyo o kaya humanap ng mas murang supplier.`,
    });
  }

  // 4. Low margin
  const lowMargin = products.filter((p) => p.isMarginLow && !p.isBelowBreakEven);
  if (lowMargin.length > 0) {
    r.push({
      icon: "🟡", type: "warning",
      text: `${lowMargin.length} produkto ang maliit ang tubo (below 30%): ${lowMargin.slice(0, 4).map((p) => `${p.productName} (₱${p.unitCost.toFixed(0)} cost → ₱${p.sellingPrice.toFixed(0)} price)`).join(", ")}. Sa Cebu, pwede magtaas ng 10-20% dahil competitive pa rin sa mga brand sa mall.`,
    });
  }

  // 5. Profit scenarios
  const achievable = profitScenarios.filter((p) => p.isAchievable && p.targetProfit > 0);
  if (achievable.length > 0) {
    const next = achievable[0];
    r.push({
      icon: "💰", type: "tip",
      text: `Target: ${next.label.replace(" (+", " = +")}. Kailangan mo lang ng ${next.unitsNeeded} units (₱${next.neededSales.toLocaleString()} na benta). Iyon ay ${next.unitsNeeded > s.currentMonthlyUnits ? `${next.unitsNeeded - s.currentMonthlyUnits} units pa kumpara ngayon` : "kaya mo na ngayon"}!`,
    });
  }

  // 6. Stock alerts
  const lowStock = products.filter((p) => p.daysOfStock < 15 && p.sales30 > 0);
  if (lowStock.length > 0) {
    r.push({
      icon: "📦", type: "warning",
      text: `Maubos na ang stock sa ${lowStock.length} produkto: ${lowStock.slice(0, 5).map((p) => `${p.productName} (${p.daysOfStock} araw na lang)`).join(", ")}. Mag-order nang ${lowStock[0]?.eoq || "sapat"} piraso para hindi maubusan.`,
    });
  }

  // 7. Pricing tip
  r.push({
    icon: "💡", type: "tip",
    text: `Sa Lapu-Lapu at Cebu, ang magandang presyo ay 2x-3x ng cost mo. Halimbawa: kung ang product cost ay ₱${products.length > 0 ? products[0].unitCost.toFixed(0) : "X"}, ibenta mo ng ₱${products.length > 0 ? Math.round(products[0].unitCost * 2.5).toFixed(0) : "Y"} - ₱${products.length > 0 ? Math.round(products[0].unitCost * 3).toFixed(0) : "Z"}. Competitive ito sa local brands at may magandang tubo ka pa.`,
  });

  return r;
}
