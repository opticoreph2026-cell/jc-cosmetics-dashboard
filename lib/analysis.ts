import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from "date-fns";

const MONTHS_OF_HISTORY = 6;
const COMPETITIVE_MARGIN_MIN = 30;

function linreg(values: number[]) {
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
  return { slope, intercept, r2: ssTot > 0 ? 1 - ssRes / ssTot : 0 };
}

export type AnalysisData = {
  summary: {
    monthlyFixedCosts: number;
    avgUnitCost: number;
    avgSellingPrice: number;
    avgMargin: number;
    marginPerUnit: number;
    currentMonthlyUnits: number;
    currentMonthlyRevenue: number;
    grossProfit: number;
    netProfit: number;
    breakEvenUnits: number;
    isProfitable: boolean;
    isBreakEvenUnit: boolean;
  };
  salesTrend: {
    history: { month: string; units: number; revenue: number; label: string }[];
    prediction: { month: string; label: string; units: number; revenue: number }[];
    trendDirection: string;
    growthRate: number;
    confidence: string;
    movingAvg3: number;
    momGrowth: number;
  };
  profitScenarios: { label: string; targetProfit: number; unitsNeeded: number; neededSales: number; isAchievable: boolean }[];
  productAnalysis: {
    id: string; name: string; sku: string; productName: string; category: string;
    unitCost: number; sellingPrice: number; currentMargin: number;
    currentStock: number; sales30: number; daysOfStock: number;
    eoq: number; suggestedPrice: number; breakEvenPrice: number;
    isBelowBreakEven: boolean; isMarginLow: boolean;
    competitiveMin: number; competitiveMax: number;
    isCompetitivelyPriced: boolean; priceLevel: string;
    velocity: "fast" | "medium" | "slow" | "none";
    annualRevenue: number; abcClass: string;
  }[];
  velocitySummary: Record<string, number>;
  abcSummary: { a: number; b: number; c: number };
  priceChangeImpact: { change: string; newAvgPrice: number; newMarginPerUnit: number; newUnitsToBE: number | string; unitsSaved: number | string }[];
  categorySummary: { name: string; products: number; units: number; revenue: number; cost: number; margin: number; share: number }[];
  recommendations: { text: string; type: string }[];
};

export async function computeAnalysis(): Promise<AnalysisData> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const monthExpenses = await prisma.expense.aggregate({
    where: { date: { gte: monthStart, lte: monthEnd } },
    _sum: { amount: true },
  });
  const rawMonthlyFixed = Number(monthExpenses._sum.amount || 0);
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthlyFixedCosts = Math.round(rawMonthlyFixed * (daysInMonth / Math.max(dayOfMonth, 1)));

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
  const marginPerUnit = avgSellingPrice - avgUnitCost;
  const grossProfitThisMonth = totalMonthRevenue - totalMonthCost;
  const netProfitThisMonth = grossProfitThisMonth - monthlyFixedCosts;
  const currentBEUnits = marginPerUnit > 0 ? Math.ceil(monthlyFixedCosts / marginPerUnit) : Infinity;
  const breakEvenUnits = currentBEUnits === Infinity ? 99999 : currentBEUnits;

  // -- Monthly history (single aggregate query) --
  const monthRanges: { label: string; month: string; start: Date; end: Date }[] = [];
  for (let m = MONTHS_OF_HISTORY - 1; m >= 0; m--) {
    const d = subMonths(now, m);
    monthRanges.push({
      label: format(d, "MMM"),
      month: format(d, "yyyy-MM"),
      start: startOfMonth(d),
      end: endOfMonth(d),
    });
  }
  const monthlyOrders = await prisma.salesOrder.findMany({
    where: {
      createdAt: { gte: monthRanges[0].start },
    },
    select: { createdAt: true, items: { select: { qty: true, unitPriceAtSale: true, unitCostAtSale: true } } },
  });
  const monthlyBuckets = monthRanges.map((mr) => {
    let units = 0;
    let revenue = 0;
    let cost = 0;
    for (const o of monthlyOrders) {
      const ot = new Date(o.createdAt).getTime();
      if (ot >= mr.start.getTime() && ot <= mr.end.getTime()) {
        for (const i of o.items) {
          units += i.qty;
          revenue += Number(i.unitPriceAtSale) * i.qty;
          cost += Number(i.unitCostAtSale) * i.qty;
        }
      }
    }
    return { ...mr, units, revenue: Math.round(revenue * 100) / 100, cost };
  });

  const monthlySales = monthlyBuckets.map((b) => ({ month: b.month, units: b.units, revenue: b.revenue, label: b.label }));

  const unitSeries = monthlySales.map((m) => m.units);
  const revenueSeries = monthlySales.map((m) => m.revenue);
  const unitReg = linreg(unitSeries);
  const revenueReg = linreg(revenueSeries);

  // Moving average and MoM
  const recent = unitSeries.filter(u => u > 0);
  const movingAvg3 = recent.length >= 3
    ? Math.round(recent.slice(-3).reduce((a, b) => a + b, 0) / 3)
    : recent.length > 0 ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : 0;
  const momGrowth = monthlySales.length >= 2 && monthlySales[monthlySales.length - 2].units > 0
    ? Math.round(((monthlySales[monthlySales.length - 1].units - monthlySales[monthlySales.length - 2].units) / monthlySales[monthlySales.length - 2].units) * 100)
    : 0;

  const predictedUnits = [];
  for (let i = 1; i <= 2; i++) {
    const nextIdx = MONTHS_OF_HISTORY - 1 + i;
    const nextDate = addMonths(now, i);
    const ml = Math.max(0, Math.round(unitReg.slope * nextIdx + unitReg.intercept));
    predictedUnits.push({
      month: format(nextDate, "yyyy-MM"),
      label: format(nextDate, "MMM"),
      units: ml,
      revenue: Math.max(0, Math.round(revenueReg.slope * nextIdx + revenueReg.intercept)),
    });
  }

  const trendDirection = unitReg.slope > 1 ? "up" : unitReg.slope < -1 ? "down" : "stable";
  const growthRate = unitSeries[unitSeries.length - 1] > 0 && unitSeries[0] > 0
    ? Math.round(((unitSeries[unitSeries.length - 1] - unitSeries[0]) / unitSeries[0]) * 100)
    : 0;

  // -- 30-day sales per variant --
  const salesData = await prisma.salesOrderItem.groupBy({
    by: ["variantId"],
    where: { salesOrder: { createdAt: { gte: thirtyDaysAgo } } },
    _sum: { qty: true },
  });
  const salesMap = new Map(salesData.map((s) => [s.variantId, s._sum.qty ?? 0]));

  // -- Profit targets --
  const profitScenarios = [
    { label: "Break-even (₱0 profit)", targetProfit: 0 },
    { label: "+₱5,000 profit", targetProfit: 5000 },
    { label: "+₱10,000 profit", targetProfit: 10000 },
    { label: "+₱20,000 profit", targetProfit: 20000 },
  ].map((s) => {
    const neededRevenue = monthlyFixedCosts + s.targetProfit;
    const unitsNeeded = marginPerUnit > 0 ? Math.ceil(neededRevenue / marginPerUnit) : Infinity;
    return {
      ...s,
      unitsNeeded: unitsNeeded === Infinity ? 99999 : unitsNeeded,
      neededSales: unitsNeeded === Infinity ? 0 : Math.round(unitsNeeded * avgSellingPrice),
      isAchievable: unitsNeeded !== Infinity && unitsNeeded <= totalMonthUnits * 5,
    };
  });

  // -- Product analysis --
  const total30DayUnits = Array.from(salesMap.values()).reduce((a, b) => a + b, 0);
  const productAnalysis = variants.map((v) => {
    const sales30 = salesMap.get(v.id) ?? 0;
    const annualDemand = Math.max(1, Math.round(sales30 * 12));
    const unitCost = Number(v.unitCost);
    const sellingPrice = Number(v.sellingPrice);
    const currentMargin = sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : 0;
    const daysOfStock = sales30 > 0 ? Math.round((v.currentStockQty / sales30) * 30) : 999;
    const eoq = Math.round(Math.sqrt((2 * annualDemand * 50) / (Math.max(unitCost, 1) * 0.25)));
    const suggestedPrice = Math.round((unitCost / 0.55) * 100) / 100;
    const revenueShare = total30DayUnits > 0 ? sales30 / total30DayUnits : 0;
    const annualRevenue = Math.round(sellingPrice * annualDemand * 100) / 100;
    const breakEvenPrice = sales30 > 0
      ? Math.round((((monthlyFixedCosts * revenueShare) + (unitCost * sales30)) / sales30) * 100) / 100
      : 0;
    const velocity: "fast" | "medium" | "slow" | "none" = sales30 >= 20 ? "fast" : sales30 >= 5 ? "medium" : sales30 > 0 ? "slow" : "none";
    const competitiveMin = Math.round(unitCost * 1.8 * 100) / 100;
    const competitiveMax = Math.round(unitCost * 3.0 * 100) / 100;
    const priceLevel = sellingPrice < competitiveMin ? "low" : sellingPrice > competitiveMax ? "high" : "competitive";
    return {
      id: v.id, name: v.name, sku: v.sku, productName: v.product.name,
      category: v.product.category?.name || "Uncategorized",
      unitCost: Math.round(unitCost * 100) / 100,
      sellingPrice: Math.round(sellingPrice * 100) / 100,
      currentMargin: Math.round(currentMargin * 100) / 100,
      currentStock: v.currentStockQty, sales30, annualDemand, daysOfStock, eoq, suggestedPrice,
      breakEvenPrice, isBelowBreakEven: breakEvenPrice > 0 && sellingPrice < breakEvenPrice,
      isMarginLow: currentMargin < COMPETITIVE_MARGIN_MIN,
      competitiveMin, competitiveMax, isCompetitivelyPriced: priceLevel === "competitive", priceLevel,
      velocity, annualRevenue, abcClass: "",
    };
  }).sort((a, b) => b.sales30 - a.sales30);

  // -- ABC analysis (Pareto: A=top 80% revenue, B=next 15%, C=bottom 5%) --
  const sortedByRevenue = [...productAnalysis].sort((a, b) => b.annualRevenue - a.annualRevenue);
  const totalAnnualRevenue = sortedByRevenue.reduce((s, p) => s + p.annualRevenue, 0);
  let cumulative = 0;
  for (const p of sortedByRevenue) {
    cumulative += p.annualRevenue;
    const share = totalAnnualRevenue > 0 ? cumulative / totalAnnualRevenue : 0;
    if (share <= 0.8) p.abcClass = "A";
    else if (share <= 0.95) p.abcClass = "B";
    else p.abcClass = "C";
  }
  // Re-apply abc class back to main array
  const abcMap = new Map(sortedByRevenue.map((p) => [p.id, p.abcClass]));
  for (const p of productAnalysis) p.abcClass = abcMap.get(p.id) || "C";
  const abcSummary = {
    a: sortedByRevenue.filter((p) => p.abcClass === "A").length,
    b: sortedByRevenue.filter((p) => p.abcClass === "B").length,
    c: sortedByRevenue.filter((p) => p.abcClass === "C").length,
  };

  // -- Price impact --
  const priceChangeImpact = [];
  for (const pct of [-10, -5, 5, 10, 15, 20]) {
    const newAvgPrice = avgSellingPrice * (1 + pct / 100);
    const newMarginPerUnit = newAvgPrice - avgUnitCost;
    const newUnitsToBE = newMarginPerUnit > 0 ? Math.ceil(monthlyFixedCosts / newMarginPerUnit) : Infinity;
    priceChangeImpact.push({
      change: `${pct > 0 ? "+" : ""}${pct}%`,
      newAvgPrice: Math.round(newAvgPrice * 100) / 100,
      newMarginPerUnit: Math.round(newMarginPerUnit * 100) / 100,
      newUnitsToBE: newUnitsToBE === Infinity ? "—" : newUnitsToBE,
      unitsSaved: newUnitsToBE === Infinity ? "—" : breakEvenUnits - newUnitsToBE,
    });
  }

  // -- Category --
  const catMap = new Map<string, { products: number; units: number; revenue: number; cost: number }>();
  for (const p of productAnalysis) {
    const c = catMap.get(p.category) || { products: 0, units: 0, revenue: 0, cost: 0 };
    c.products++; c.units += p.sales30; c.revenue += p.sellingPrice * p.sales30; c.cost += p.unitCost * p.sales30;
    catMap.set(p.category, c);
  }
  const total30DayRevenue = Array.from(catMap.values()).reduce((s, c) => s + c.revenue, 0);
  const categorySummary = Array.from(catMap.entries()).map(([name, c]) => ({
    name, products: c.products, units: c.units,
    revenue: Math.round(c.revenue * 100) / 100,
    cost: Math.round(c.cost * 100) / 100,
    margin: c.revenue > 0 ? Math.round(((c.revenue - c.cost) / c.revenue) * 10000) / 100 : 0,
    share: total30DayRevenue > 0 ? Math.round((c.revenue / total30DayRevenue) * 10000) / 100 : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // -- Velocity summary --
  const velocitySummary: Record<string, number> = { fast: 0, medium: 0, slow: 0, none: 0 };
  for (const p of productAnalysis) velocitySummary[p.velocity]++;

  // -- Recommendations --
  const recs: { text: string; type: string }[] = [];

  if (netProfitThisMonth > 0) {
    recs.push({ type: "info", text: `You earned ₱${netProfitThisMonth.toFixed(0)} this month. You sold ${totalMonthUnits} units — only ${breakEvenUnits} were needed to break even.` });
  } else if (marginPerUnit <= 0) {
    recs.push({ type: "danger", text: `Your average selling price (₱${avgSellingPrice.toFixed(0)}) does not cover your cost (₱${avgUnitCost.toFixed(0)}). You are losing money per unit.` });
  } else {
    const deficit = breakEvenUnits - totalMonthUnits;
    recs.push({ type: "danger", text: `You need ${deficit} more units this month to break even. Monthly expenses: ₱${monthlyFixedCosts.toFixed(0)}. Each unit earns ₱${marginPerUnit.toFixed(2)} gross profit.` });
  }

  if (trendDirection === "up") recs.push({ type: "info", text: `Sales are growing ${growthRate}% over 6 months. MoM growth: ${momGrowth > 0 ? "+" : ""}${momGrowth}%. Keep it up!` });
  else if (trendDirection === "down") recs.push({ type: "warning", text: `Sales declining (${Math.abs(growthRate)}% over 6 months). Consider promotions, bundles, or social media campaigns.` });
  else if (momGrowth > 0) recs.push({ type: "info", text: `Sales are stable overall but up ${momGrowth}% from last month. Last 3-month average: ${movingAvg3} units.` });
  else recs.push({ type: "tip", text: `Sales have been stable. 3-month moving average: ${movingAvg3} units. Consider seasonal promotions to boost growth.` });

  const belowBE = productAnalysis.filter((p) => p.isBelowBreakEven);
  if (belowBE.length > 0) {
    recs.push({ type: "danger", text: `${belowBE.length} product(s) priced below break-even: ${belowBE.slice(0, 4).map((p) => p.productName).join(", ")}. Raise prices or find cheaper suppliers.` });
  }

  const lowMargin = productAnalysis.filter((p) => p.isMarginLow && !p.isBelowBreakEven);
  if (lowMargin.length > 0) {
    recs.push({ type: "warning", text: `${lowMargin.length} product(s) with low margins (<30%): ${lowMargin.slice(0, 3).map((p) => `${p.productName} (cost ₱${p.unitCost.toFixed(0)}, sell ₱${p.sellingPrice.toFixed(0)})`).join(", ")}. A 10-20% increase is still competitive locally.` });
  }

  const achievable = profitScenarios.filter((p) => p.isAchievable && p.targetProfit > 0);
  if (achievable.length > 0) {
    const next = achievable[0];
    const diff = next.unitsNeeded - totalMonthUnits;
    recs.push({ type: "tip", text: `Target: ${next.label}. Need ${next.unitsNeeded} units (₱${next.neededSales.toLocaleString()} sales). ${diff > 0 ? `${diff} more units than now` : "Already achievable!"}` });
  }

  const lowStock = productAnalysis.filter((p) => p.daysOfStock < 15 && p.sales30 > 0);
  if (lowStock.length > 0) {
    recs.push({ type: "warning", text: `${lowStock.length} product(s) running out (<15 days): ${lowStock.slice(0, 4).map((p) => `${p.productName} (${p.daysOfStock}d left)`).join(", ")}. Use EOQ (${lowStock[0]?.eoq || "enough"} pcs) as reorder guide.` });
  }

  if (velocitySummary.slow > 0 || velocitySummary.none > 0) {
    const count = velocitySummary.slow + velocitySummary.none;
    recs.push({ type: "tip", text: `${count} product(s) have low/zero sales. Bundle with fast-movers, run promos, or discontinue to free up ₱${Math.round(productAnalysis.filter(p => p.velocity === "slow" || p.velocity === "none").reduce((s, p) => s + p.unitCost * p.currentStock, 0)).toLocaleString()} in tied-up capital.` });
  }

  if (abcSummary.c > 0) {
    recs.push({ type: "tip", text: `${abcSummary.c} product(s) are "C" items (bottom 5% revenue). These contribute little — consider clearing stock via discounts to free up shelf space and cash.` });
  }

  recs.push({ type: "tip", text: `In Lapu-Lapu & Cebu, price at 2x-3x cost. E.g., cost ₱20 → sell ₱40-₱60. Competitive with local brands with healthy profit.` });

  return {
    summary: {
      monthlyFixedCosts, avgUnitCost: Math.round(avgUnitCost * 100) / 100,
      avgSellingPrice: Math.round(avgSellingPrice * 100) / 100,
      avgMargin: Math.round(avgMargin * 100) / 100,
      marginPerUnit: Math.round(marginPerUnit * 100) / 100,
      currentMonthlyUnits: totalMonthUnits,
      currentMonthlyRevenue: Math.round(totalMonthRevenue * 100) / 100,
      grossProfit: Math.round(grossProfitThisMonth * 100) / 100,
      netProfit: Math.round(netProfitThisMonth * 100) / 100,
      breakEvenUnits,
      isProfitable: netProfitThisMonth > 0,
      isBreakEvenUnit: totalMonthUnits >= currentBEUnits,
    },
    salesTrend: {
      history: monthlySales, prediction: predictedUnits,
      trendDirection, growthRate, confidence: unitReg.r2 > 0.7 ? "high" : unitReg.r2 > 0.4 ? "medium" : "low",
      movingAvg3, momGrowth,
    },
    profitScenarios, productAnalysis, priceChangeImpact, categorySummary,
    velocitySummary, abcSummary,
    recommendations: recs,
  };
}
