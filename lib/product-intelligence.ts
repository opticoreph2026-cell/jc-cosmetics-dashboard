import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth, format, addMonths, startOfDay, endOfDay, subDays, addDays } from "date-fns";

const PH_MARKET = {
  idealMarginPct: 45,
  minMarginPct: 30,
  maxMarginPct: 65,
  competitiveMarkupRange: [1.8, 3.0] as [number, number],
  typicalLeadTimeDays: 14,
  safetyStockDays: 21,
  promoDiscountMaxPct: 20,
  bundleDiscountPct: 10,
  adConversionRate: 0.05,
};

export type ReorderPrediction = {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  dailySalesRate: number;
  dailySalesTrend: number;
  seasonalFactor: number;
  predictedDailyNext30: number;
  suggestedOrderQty: number;
  suggestedOrderDate: string;
  urgency: "immediate" | "this_week" | "next_week" | "not_needed";
  confidence: "high" | "medium" | "low";
  reasoning: string;
};

export type ProductInsight = {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  unitCost: number;
  sellingPrice: number;
  marginPct: number;
  sales30: number;
  sales90: number;
  stock: number;
  daysOfStock: number;
  revenue30: number;
  revenue90: number;
  velocity: "fast" | "medium" | "slow" | "none";
  abcClass: string;
  priceRecommendation: {
    action: "increase" | "decrease" | "maintain" | "critical";
    suggestedPrice: number;
    reason: string;
    expectedMarginAfter: number;
    demandElasticity: "elastic" | "inelastic" | "neutral";
  };
  bundleRecommendation: {
    hasOpportunity: boolean;
    suggestedWith: string[];
    reason: string;
    estimatedBoost: number;
  } | null;
  phaseOutRisk: {
    isAtRisk: boolean;
    riskLevel: "low" | "medium" | "high";
    reason: string;
    daysToDecision: number;
  };
  breakEvenProgress: {
    unitsSoldThisMonth: number;
    targetUnits: number;
    progressPct: number;
    onTrack: boolean;
  };
  supplierInfo: {
    name: string;
    unitCost: number;
    leadTime: number;
    isPreferred: boolean;
  } | null;
};

export type FeasibilityResult = {
  score: number;
  verdict: "highly_recommended" | "recommended" | "caution" | "not_recommended";
  summary: string;
  breakEven: {
    monthlyFixedAllocation: number;
    unitCost: number;
    suggestedPrice: number;
    marginPct: number;
    unitsNeededPerMonth: number;
    unitsNeededPerDay: number;
    monthsToProfit: number;
  };
  marketFit: {
    priceCompetitive: boolean;
    markupRatio: number;
    marketRange: string;
    position: "premium" | "mid" | "budget";
  };
  riskFactors: { factor: string; severity: "low" | "medium" | "high"; detail: string }[];
  comparableProducts: { name: string; sellingPrice: number; marginPct: number }[];
  recommendation: string;
};

export type PromoCopy = {
  productName: string;
  variantName: string;
  headline: string;
  body: string;
  callToAction: string;
  platform: {
    facebook: string;
    messenger: string;
  };
  hashtags: string[];
  suggestedDiscount: number;
  bundleIdea: string | null;
};

const MONTHS = 6;

export async function predictReorder() {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const ninetyDaysAgo = subDays(now, 90);

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
  });

  const sales30 = await prisma.salesOrderItem.groupBy({
    by: ["variantId"],
    where: { salesOrder: { createdAt: { gte: thirtyDaysAgo } } },
    _sum: { qty: true },
  });
  const salesMap30 = new Map(sales30.map((s) => [s.variantId, s._sum.qty ?? 0]));

  const sales90 = await prisma.salesOrderItem.groupBy({
    by: ["variantId"],
    where: { salesOrder: { createdAt: { gte: ninetyDaysAgo } } },
    _sum: { qty: true },
  });
  const salesMap90 = new Map(sales90.map((s) => [s.variantId, s._sum.qty ?? 0]));
  const salesMap60 = new Map();
  for (const [id, qty90] of salesMap90) {
    const qty30 = salesMap30.get(id) ?? 0;
    salesMap60.set(id, qty90 - qty30);
  }

  const predictions: ReorderPrediction[] = [];

  for (const v of variants) {
    const s30 = salesMap30.get(v.id) ?? 0;
    const s60 = salesMap60.get(v.id) ?? 0;
    const s90 = salesMap90.get(v.id) ?? 0;

    const rate30 = s30 / 30;
    const rate60 = s60 / 30;
    const rate90 = s90 / 90;

    const trend = rate60 > 0 ? (rate30 - rate60) / rate60 : 0;
    const seasonalFactor = rate60 > 0 && rate30 > 0 ? rate30 / rate60 : 1;

    const predictedDaily = s30 > 0 ? Math.max(0.1, rate30 * (1 + trend * 0.3) * seasonalFactor) : 0;
    const predictedNext30 = Math.round(predictedDaily * 30);

    const stock = v.currentStockQty;
    const reorderPoint = v.reorderPoint;
    const daysUntilStockout = predictedDaily > 0 ? Math.floor(stock / predictedDaily) : 999;

    const leadTime = v.supplierProducts[0]?.leadTimeDays ?? PH_MARKET.typicalLeadTimeDays;
    const safetyStock = Math.ceil(predictedDaily * PH_MARKET.safetyStockDays);
    const orderUpTo = Math.ceil(predictedDaily * (leadTime + 30));
    const suggestedQty = Math.max(1, orderUpTo - stock + safetyStock);
    const orderBeforeDate = daysUntilStockout <= leadTime
      ? new Date()
      : addDays(now, daysUntilStockout - leadTime);

    let urgency: ReorderPrediction["urgency"];
    let reasoning: string;
    if (daysUntilStockout <= leadTime) {
      urgency = "immediate";
      reasoning = `${daysUntilStockout === 0 ? "Out of stock!" : `Only ${daysUntilStockout} days of stock left (lead time: ${leadTime}d).`} Order immediately to avoid stockout.`;
    } else if (daysUntilStockout <= leadTime + 7) {
      urgency = "this_week";
      reasoning = `${daysUntilStockout}d of stock left. Order within the week to stay ahead of ${leadTime}d lead time.`;
    } else if (daysUntilStockout <= leadTime + 14) {
      urgency = "next_week";
      reasoning = `${daysUntilStockout}d of stock left. Plan order next week.`;
    } else {
      urgency = "not_needed";
      reasoning = `Well-stocked (${daysUntilStockout}d). No urgent reorder needed.`;
    }

    const confidence = s30 >= 20 ? "high" : s30 >= 5 ? "medium" : "low";

    predictions.push({
      variantId: v.id,
      productName: v.product.name,
      variantName: v.name,
      sku: v.sku,
      currentStock: stock,
      reorderPoint,
      dailySalesRate: Math.round(rate30 * 100) / 100,
      dailySalesTrend: Math.round(trend * 100),
      seasonalFactor: Math.round(seasonalFactor * 100) / 100,
      predictedDailyNext30: Math.round(predictedDaily * 100) / 100,
      suggestedOrderQty: suggestedQty,
      suggestedOrderDate: format(orderBeforeDate, "MMM d, yyyy"),
      urgency,
      confidence,
      reasoning,
    });
  }

  predictions.sort((a, b) => {
    const urgencyOrder = { immediate: 0, this_week: 1, next_week: 2, not_needed: 3 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.dailySalesRate - a.dailySalesRate;
  });

  return predictions;
}

export async function analyzeAllProducts() {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const ninetyDaysAgo = subDays(now, 90);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [variants, monthOrders, expenses] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true },
      include: {
        product: { select: { name: true, category: { select: { name: true } } } },
        supplierProducts: {
          where: { isPreferred: true },
          include: { supplier: { select: { name: true } } },
          take: 1,
        },
      },
    }),
    prisma.salesOrder.findMany({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      select: { items: { select: { qty: true, variantId: true, unitPriceAtSale: true, unitCostAtSale: true } } },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
  ]);

  const rawMonthlyFixed = Number(expenses._sum.amount || 0);
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthlyFixed = Math.round(rawMonthlyFixed * (daysInMonth / Math.max(dayOfMonth, 1)));

  const sales30 = await prisma.salesOrderItem.groupBy({
    by: ["variantId"],
    where: { salesOrder: { createdAt: { gte: thirtyDaysAgo } } },
    _sum: { qty: true },
  });
  const salesMap30 = new Map(sales30.map((s) => [s.variantId, s._sum.qty ?? 0]));

  const sales90 = await prisma.salesOrderItem.groupBy({
    by: ["variantId"],
    where: { salesOrder: { createdAt: { gte: ninetyDaysAgo } } },
    _sum: { qty: true },
  });
  const salesMap90 = new Map(sales90.map((s) => [s.variantId, s._sum.qty ?? 0]));

  const monthUnitMap = new Map<string, number>();
  for (const o of monthOrders) {
    for (const i of o.items) {
      monthUnitMap.set(i.variantId, (monthUnitMap.get(i.variantId) ?? 0) + i.qty);
    }
  }

  let totalMonthUnits = 0;
  let totalMonthRevenue = 0;
  let totalMonthCost = 0;
  for (const o of monthOrders) {
    for (const i of o.items) {
      totalMonthUnits += i.qty;
      totalMonthRevenue += Number(i.unitPriceAtSale) * i.qty;
      totalMonthCost += Number(i.unitCostAtSale) * i.qty;
    }
  }
  const avgMarginPerUnit = totalMonthUnits > 0 ? (totalMonthRevenue - totalMonthCost) / totalMonthUnits : 0;

  const insights: ProductInsight[] = [];

  // Pre-compute ABC classification (single pass)
  const sortedByRev90 = [...variants].sort((a, b) => {
    const revA = (salesMap90.get(a.id) ?? 0) * Number(a.sellingPrice);
    const revB = (salesMap90.get(b.id) ?? 0) * Number(b.sellingPrice);
    return revB - revA;
  });
  const total90Rev = sortedByRev90.reduce((sum, p) => sum + (salesMap90.get(p.id) ?? 0) * Number(p.sellingPrice), 0);
  let abcCum = 0;
  const abcLookup = new Map<string, string>();
  for (const p of sortedByRev90) {
    abcCum += (salesMap90.get(p.id) ?? 0) * Number(p.sellingPrice);
    const share = total90Rev > 0 ? abcCum / total90Rev : 0;
    abcLookup.set(p.id, share <= 0.8 ? "A" : share <= 0.95 ? "B" : "C");
  }

  for (const v of variants) {
    const s30 = salesMap30.get(v.id) ?? 0;
    const s90 = salesMap90.get(v.id) ?? 0;
    const unitsThisMonth = monthUnitMap.get(v.id) ?? 0;
    const cost = Number(v.unitCost);
    const price = Number(v.sellingPrice);
    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
    const revenue30 = s30 * price;
    const revenue90 = s90 * price;
    const stock = v.currentStockQty;
    const daysOfStock = s30 > 0 ? Math.round((stock / s30) * 30) : 999;

    const velocity: "fast" | "medium" | "slow" | "none" = s30 >= 20 ? "fast" : s30 >= 5 ? "medium" : s30 > 0 ? "slow" : "none";
    const abcClass = abcLookup.get(v.id) ?? "C";

    const markupRatio = cost > 0 ? price / cost : 0;
    let priceAction: ProductInsight["priceRecommendation"]["action"];
    let priceReason: string;
    let suggestedPrice: number;
    let expectedMarginAfter: number;
    let elasticity: "elastic" | "inelastic" | "neutral";

    if (margin < 15) {
      priceAction = "critical";
      suggestedPrice = Math.round(cost / 0.55 * 100) / 100;
      expectedMarginAfter = 45;
      elasticity = "elastic";
      priceReason = `Margin is only ${margin.toFixed(0)}% — dangerously low. At ₱${suggestedPrice.toFixed(0)} (45% margin), you stay competitive. Current markup: ${markupRatio.toFixed(1)}x.`;
    } else if (margin < PH_MARKET.minMarginPct) {
      priceAction = "increase";
      suggestedPrice = Math.round(cost / 0.55 * 100) / 100;
      expectedMarginAfter = 45;
      elasticity = "inelastic";
      priceReason = `Margin is ${margin.toFixed(0)}% (target: 45%). A ₱${(suggestedPrice - price).toFixed(0)} increase is reasonable for Lapu-Lapu market.`;
    } else if (margin > PH_MARKET.maxMarginPct) {
      priceAction = "decrease";
      suggestedPrice = Math.round(cost * 2.5 * 100) / 100;
      expectedMarginAfter = 60;
      elasticity = "elastic";
      priceReason = `Margin is ${margin.toFixed(0)}% — above typical max of 65%. Lowering to ₱${suggestedPrice.toFixed(0)} could boost volume.`;
    } else {
      priceAction = "maintain";
      suggestedPrice = price;
      expectedMarginAfter = margin;
      elasticity = "neutral";
      priceReason = `Margin ${margin.toFixed(0)}% is healthy (target range: 30-65%). Maintain current price.`;
    }

    const targetUnits = avgMarginPerUnit > 0 ? Math.ceil(monthlyFixed * (revenue30 / Math.max(totalMonthRevenue, 1)) / avgMarginPerUnit) : 0;
    const breakEvenProgress = {
      unitsSoldThisMonth: unitsThisMonth,
      targetUnits,
      progressPct: targetUnits > 0 ? Math.round((unitsThisMonth / targetUnits) * 100) : 100,
      onTrack: targetUnits <= 0 || unitsThisMonth >= targetUnits,
    };

    const supplierInfo = v.supplierProducts[0] ? {
      name: v.supplierProducts[0].supplier.name,
      unitCost: Number(v.supplierProducts[0].unitCost),
      leadTime: v.supplierProducts[0].leadTimeDays ?? 14,
      isPreferred: true,
    } : null;

    let bundleRec: ProductInsight["bundleRecommendation"] | null = null;
    if (s30 > 0 && s30 < 20) {
      const fastMovers = variants
        .filter((o) => o.id !== v.id && (salesMap30.get(o.id) ?? 0) >= 20)
        .slice(0, 2);
      if (fastMovers.length > 0) {
        bundleRec = {
          hasOpportunity: true,
          suggestedWith: fastMovers.map((f) => f.product.name),
          reason: `Low sales (${s30}/mo). Bundle with ${fastMovers.map((f) => f.product.name).join(" & ")} to increase visibility.`,
          estimatedBoost: Math.round(s30 * 1.5),
        };
      }
    }

    const phaseOutRisk: ProductInsight["phaseOutRisk"] = s30 === 0
      ? { isAtRisk: true, riskLevel: "high", reason: "No sales in 30 days. Consider discontinuing or deep-discount bundling.", daysToDecision: 30 }
      : s30 < 5
      ? { isAtRisk: true, riskLevel: "medium", reason: `Only ${s30} units sold in 30 days. If no improvement in 60 days, phase out.`, daysToDecision: 60 }
      : { isAtRisk: false, riskLevel: "low", reason: "Adequate sales velocity.", daysToDecision: 999 };

    insights.push({
      variantId: v.id,
      productName: v.product.name,
      variantName: v.name,
      sku: v.sku,
      unitCost: Math.round(cost * 100) / 100,
      sellingPrice: Math.round(price * 100) / 100,
      marginPct: Math.round(margin * 100) / 100,
      sales30: s30,
      sales90: s90,
      stock,
      daysOfStock,
      revenue30: Math.round(revenue30 * 100) / 100,
      revenue90: Math.round(revenue90 * 100) / 100,
      velocity,
      abcClass,
      priceRecommendation: {
        action: priceAction,
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
        reason: priceReason,
        expectedMarginAfter: Math.round(expectedMarginAfter * 100) / 100,
        demandElasticity: elasticity,
      },
      bundleRecommendation: bundleRec,
      phaseOutRisk,
      breakEvenProgress,
      supplierInfo,
    });
  }

  insights.sort((a, b) => {
    const order = { critical: 0, increase: 1, maintain: 2, decrease: 3 };
    const diff = order[a.priceRecommendation.action] - order[b.priceRecommendation.action];
    if (diff !== 0) return diff;
    if (a.phaseOutRisk.isAtRisk !== b.phaseOutRisk.isAtRisk) return a.phaseOutRisk.isAtRisk ? -1 : 1;
    return b.sales30 - a.sales30;
  });

  return insights;
}

export async function evaluateNewProduct(params: {
  name: string;
  estimatedUnitCost: number;
  estimatedSellingPrice?: number;
  categoryId?: string;
}) {
  const { estimatedUnitCost, estimatedSellingPrice } = params;

  const [monthlyExpenses, comparableVariants] = await Promise.all([
    prisma.expense.aggregate({
      where: { date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) } },
      _sum: { amount: true },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: { select: { name: true, categoryId: true, category: { select: { name: true } } } } },
    }),
  ]);

  const rawMonthlyFixed = Number(monthlyExpenses._sum.amount || 0);
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthlyFixed = Math.round(rawMonthlyFixed * (daysInMonth / Math.max(dayOfMonth, 1)));
  const productCount = comparableVariants.length + 1;
  const fixedAllocation = productCount > 0 ? monthlyFixed / productCount : monthlyFixed;

  const suggestedPrice = estimatedSellingPrice ?? Math.round(estimatedUnitCost * 2.5 * 100) / 100;
  const marginPct = suggestedPrice > 0 ? ((suggestedPrice - estimatedUnitCost) / suggestedPrice) * 100 : 0;
  const markupRatio = estimatedUnitCost > 0 ? suggestedPrice / estimatedUnitCost : 0;

  const avgMarginPerUnit = suggestedPrice - estimatedUnitCost;
  const unitsNeededPerMonth = avgMarginPerUnit > 0 ? Math.ceil(fixedAllocation / avgMarginPerUnit) : 99999;
  const unitsNeededPerDay = Math.ceil(unitsNeededPerMonth / 30);
  const monthsToProfit = avgMarginPerUnit > 0 ? Math.ceil(fixedAllocation / (avgMarginPerUnit * Math.max(unitsNeededPerMonth, 1))) : 999;

  const priceCompetitive = markupRatio >= PH_MARKET.competitiveMarkupRange[0] && markupRatio <= PH_MARKET.competitiveMarkupRange[1];
  const position = markupRatio >= 3 ? "premium" : markupRatio >= 2 ? "mid" : "budget";

  const comparableProducts = comparableVariants
    .filter((v) => params.categoryId ? v.product.categoryId === params.categoryId : true)
    .map((v) => ({
      name: v.product.name,
      sellingPrice: Number(v.sellingPrice),
      marginPct: Number(v.sellingPrice) > 0 ? ((Number(v.sellingPrice) - Number(v.unitCost)) / Number(v.sellingPrice)) * 100 : 0,
    }))
    .sort((a, b) => b.sellingPrice - a.sellingPrice)
    .slice(0, 5);

  const riskFactors: { factor: string; severity: "low" | "medium" | "high"; detail: string }[] = [];

  if (marginPct < PH_MARKET.minMarginPct) {
    riskFactors.push({ factor: "Low margin", severity: "high", detail: `Margin is ${marginPct.toFixed(0)}%. Need at least ${PH_MARKET.minMarginPct}% to be sustainable.` });
  }
  if (marginPct > PH_MARKET.maxMarginPct) {
    riskFactors.push({ factor: "High markup", severity: "medium", detail: `Markup is ${markupRatio.toFixed(1)}x. May limit sales volume; consider competitive pricing.` });
  }
  if (unitsNeededPerMonth > 500) {
    riskFactors.push({ factor: "High volume needed", severity: "medium", detail: `Need ${unitsNeededPerMonth} units/month to cover costs. Ensure sufficient demand.` });
  }
  if (estimatedUnitCost > 500) {
    riskFactors.push({ factor: "High unit cost", severity: "low", detail: `Unit cost of ₱${estimatedUnitCost.toFixed(0)} means higher working capital needed.` });
  }

  let score = 60;
  if (marginPct >= 45) score += 15;
  else if (marginPct >= 30) score += 5;
  else score -= 10;
  if (priceCompetitive) score += 10;
  else score -= 5;
  if (unitsNeededPerDay <= 10) score += 10;
  else if (unitsNeededPerDay <= 30) score += 5;
  else score -= 5;
  if (comparableProducts.length > 0) score += 5;
  score = Math.max(0, Math.min(100, score));

  let verdict: FeasibilityResult["verdict"];
  let summary: string;
  if (score >= 80) {
    verdict = "highly_recommended";
    summary = `Strong feasibility. At ₱${suggestedPrice.toFixed(0)}, the ${marginPct.toFixed(0)}% margin gives healthy profit. Only ${unitsNeededPerDay} units/day needed.`;
  } else if (score >= 60) {
    verdict = "recommended";
    summary = `Feasible with ${marginPct.toFixed(0)}% margin and ${unitsNeededPerDay} units/day target. Monitor initial sales closely.`;
  } else if (score >= 40) {
    verdict = "caution";
    summary = `Marginal viability. Margin is ${marginPct.toFixed(0)}% and needs ${unitsNeededPerDay} units/day. Consider adjusting price or reducing cost.`;
  } else {
    verdict = "not_recommended";
    summary = `Not recommended under current assumptions. Margin too low (${marginPct.toFixed(0)}%) or volume requirement too high (${unitsNeededPerDay}/day).`;
  }

  return {
    score,
    verdict,
    summary,
    breakEven: {
      monthlyFixedAllocation: Math.round(fixedAllocation),
      unitCost: estimatedUnitCost,
      suggestedPrice,
      marginPct: Math.round(marginPct * 100) / 100,
      unitsNeededPerMonth,
      unitsNeededPerDay,
      monthsToProfit,
    },
    marketFit: {
      priceCompetitive,
      markupRatio: Math.round(markupRatio * 100) / 100,
      marketRange: `₱${Math.round(estimatedUnitCost * PH_MARKET.competitiveMarkupRange[0])} - ₱${Math.round(estimatedUnitCost * PH_MARKET.competitiveMarkupRange[1])}`,
      position,
    },
    riskFactors,
    comparableProducts,
    recommendation: summary,
  } satisfies FeasibilityResult;
}

const PROMO_TEMPLATES = {
  slow_mover: [
    { headline: "✨ {product} — Back in the Spotlight!", body: "We noticed you haven't tried our {product} yet! Perfect for daily use — and right now, it's at a special price. Get yours today while stocks last!", cta: "Order Now via Messenger" },
    { headline: "🎉 Flash Sale: {product} at {discount}% Off!", body: "For a limited time, get {product} at {discount}% off! Was ₱{price}, now just ₱{salePrice}! Perfect to stock up or try something new.", cta: "Grab the Deal Now" },
  ],
  overstocked: [
    { headline: "📦 Stock Alert: {product} — Buy More, Save More!", body: "We have plenty of {product} ready for you! Great for resellers — buy in bulk and enjoy special pricing. Message us for wholesale rates!", cta: "Inquire About Bulk Pricing" },
    { headline: "🌸 {product} — Perfect for Everyday Glow", body: "Achieve that fresh, everyday look with {product}. Available now at just ₱{price} — and we have all variants in stock!", cta: "Shop Now on Facebook" },
  ],
  below_target: [
    { headline: "🚀 Help Us Reach Our Goal! {product} on Sale", body: "We're working hard to hit our target today! You can help by grabbing {product} at a special price of ₱{salePrice}. Every purchase supports your local small business!", cta: "Order via Messenger" },
    { headline: "🌟 Today Only: {product} at {discount}% Off!", body: "We want to send more {product} to happy customers like you! For today only, enjoy {discount}% off — just ₱{salePrice}. Share with friends!", cta: "Share & Save" },
  ],
  new_arrival: [
    { headline: "🆕 Just Landed: {product} at JC Cosmetics!", body: "Brand new and ready for you! {product} is now available at our shop. First 10 buyers get a free surprise! Message us to reserve yours.", cta: "Be the First to Order" },
  ],
};

export async function generatePromo(variantId?: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const thirtyDaysAgo = subDays(now, 30);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [todayOrders, monthOrders, variants] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      select: { items: { select: { qty: true } }, total: true },
    }),
    prisma.salesOrder.findMany({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      select: { items: { select: { qty: true } }, total: true },
    }),
    prisma.productVariant.findMany({
      where: variantId ? { id: variantId, isActive: true } : { isActive: true },
      include: { product: { select: { name: true } } },
    }),
  ]);

  const todayUnits = todayOrders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.qty, 0), 0);
  const monthUnits = monthOrders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.qty, 0), 0);
  const dailyTarget = Math.ceil((monthUnits / Math.max(now.getDate(), 1)) * 1.2);

  const sales30 = await prisma.salesOrderItem.groupBy({
    by: ["variantId"],
    where: { salesOrder: { createdAt: { gte: thirtyDaysAgo } } },
    _sum: { qty: true },
  });
  const salesMap = new Map(sales30.map((s) => [s.variantId, s._sum.qty ?? 0]));

  const promos: PromoCopy[] = [];

  for (const v of variants) {
    const s30 = salesMap.get(v.id) ?? 0;
    const price = Number(v.sellingPrice);
    const discount = s30 === 0 ? 20 : s30 < 5 ? 15 : s30 < 15 ? 10 : 0;
    if (discount === 0 && todayUnits >= dailyTarget) continue;

    let templateSet: typeof PROMO_TEMPLATES.slow_mover;
    let reason: string;

    if (s30 === 0) {
      templateSet = PROMO_TEMPLATES.slow_mover;
      reason = "no sales in 30 days";
    } else if (s30 < 5) {
      templateSet = PROMO_TEMPLATES.slow_mover;
      reason = "very slow moving";
    } else if (v.currentStockQty > s30 * 3) {
      templateSet = PROMO_TEMPLATES.overstocked;
      reason = "overstocked relative to sales";
    } else if (todayUnits < dailyTarget) {
      templateSet = PROMO_TEMPLATES.below_target;
      reason = "below daily sales target";
    } else {
      continue;
    }

    const tmpl = templateSet[Math.floor(Math.random() * templateSet.length)];
    const salePrice = price * (1 - discount / 100);

    const filled = {
      headline: tmpl.headline.replace(/{product}/g, v.product.name).replace(/{discount}/g, String(discount)).replace(/{price}/g, price.toFixed(0)).replace(/{salePrice}/g, salePrice.toFixed(0)),
      body: tmpl.body.replace(/{product}/g, v.product.name).replace(/{discount}/g, String(discount)).replace(/{price}/g, price.toFixed(0)).replace(/{salePrice}/g, salePrice.toFixed(0)),
      callToAction: tmpl.cta,
    };

    promos.push({
      productName: v.product.name,
      variantName: v.name,
      ...filled,
      platform: {
        facebook: `${filled.headline}\n\n${filled.body}\n\n${filled.callToAction}\n\n📍 JC Cosmetics | Lapu-Lapu City`,
        messenger: `Hi! 🎉 Great news — ${v.product.name} is available at a special price! Just ₱${salePrice.toFixed(0)} (was ₱${price.toFixed(0)}). Order now!`,
      },
      hashtags: ["#JCCosmetics", "#LapuLapu", "#CebuBeauty", "#SupportLocal", `#${v.product.name.replace(/\s+/g, "")}`],
      suggestedDiscount: discount,
      bundleIdea: s30 === 0 ? `Bundle ${v.product.name} with a bestseller to introduce it to customers` : null,
    });
  }

  return promos;
}
