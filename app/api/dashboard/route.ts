import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, json } from "@/lib/auth-helpers";
import { startOfDay, startOfWeek, startOfMonth, endOfDay, format } from "date-fns";

function calcUnitsAndProfit(items: { qty: number; unitPriceAtSale: number; unitCostAtSale: number }[]) {
  let units = 0;
  let profit = 0;
  for (const i of items) {
    units += i.qty;
    profit += (Number(i.unitPriceAtSale) - Number(i.unitCostAtSale)) * i.qty;
  }
  return { units, profit: Number(profit.toFixed(2)) };
}

const orderSelect = {
  id: true,
  orderNumber: true,
  total: true,
  channel: true,
  createdAt: true,
  customer: { select: { name: true } },
} as const;

const orderWithItemsSelect = {
  total: true,
  channel: true,
  createdAt: true,
  items: { select: { qty: true, unitPriceAtSale: true, unitCostAtSale: true } },
} as const;

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export async function GET() {
  try {
    await requireAuth();
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEndDate = endOfDay(now);

    const todayOrders = await safeQuery(() => prisma.salesOrder.findMany({ where: { createdAt: { gte: todayStart, lte: todayEnd } }, select: orderWithItemsSelect }), []);
    const weekOrders = await safeQuery(() => prisma.salesOrder.findMany({ where: { createdAt: { gte: weekStart, lte: now } }, select: orderWithItemsSelect }), []);
    const monthOrders = await safeQuery(() => prisma.salesOrder.findMany({ where: { createdAt: { gte: monthStart, lte: now } }, select: orderWithItemsSelect, orderBy: { createdAt: "asc" } }), []);
    const lowStock = await safeQuery(() => prisma.productVariant.findMany({ where: { isActive: true }, select: { id: true, name: true, sku: true, currentStockQty: true, reorderPoint: true, product: { select: { name: true } } }, take: 200 }), []);
    const recentOrders = await safeQuery(() => prisma.salesOrder.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: orderSelect }), []);
    const todayExpenses = await safeQuery(() => prisma.expense.aggregate({ where: { date: { gte: todayStart, lte: todayEnd } }, _sum: { amount: true } }), { _sum: { amount: null } });
    const weekExpenses = await safeQuery(() => prisma.expense.aggregate({ where: { date: { gte: weekStart, lte: now } }, _sum: { amount: true } }), { _sum: { amount: null } });
    const monthExpenses = await safeQuery(() => prisma.expense.aggregate({ where: { date: { gte: monthStart, lte: now } }, _sum: { amount: true } }), { _sum: { amount: null } });
    const arData = await safeQuery(() => prisma.accountReceivable.aggregate({ where: { status: { in: ["UNPAID", "PARTIAL"] } }, _sum: { amount: true, paidAmount: true } }), { _sum: { amount: null, paidAmount: null } });
    const apData = await safeQuery(() => prisma.accountPayable.aggregate({ where: { status: { in: ["UNPAID", "PARTIAL"] } }, _sum: { amount: true, paidAmount: true } }), { _sum: { amount: null, paidAmount: null } });
    const targetData = await safeQuery(() => prisma.salesTarget.findMany({ where: { year: now.getFullYear(), month: now.getMonth() + 1 } }), []);
    const targetActuals = await safeQuery(() => prisma.salesOrder.groupBy({ by: ["channel"], where: { createdAt: { gte: monthStart, lte: monthEndDate } }, _sum: { total: true } }), []);

    const lowStockItems = lowStock.filter((v: any) => v.currentStockQty <= v.reorderPoint);

    const byChannel: Record<string, number> = {};
    for (const o of todayOrders) {
      byChannel[o.channel] = (byChannel[o.channel] || 0) + Number(o.total);
    }

    function mapItems(orders: typeof todayOrders) {
      return orders.flatMap((o: any) => o.items.map((i: any) => ({ qty: i.qty, unitPriceAtSale: Number(i.unitPriceAtSale), unitCostAtSale: Number(i.unitCostAtSale) })));
    }
    const today = { ...calcUnitsAndProfit(mapItems(todayOrders)), revenue: Number(todayOrders.reduce((s: number, o: any) => s + Number(o.total), 0).toFixed(2)), orders: todayOrders.length };
    const week = { ...calcUnitsAndProfit(mapItems(weekOrders)), revenue: Number(weekOrders.reduce((s: number, o: any) => s + Number(o.total), 0).toFixed(2)), orders: weekOrders.length };
    const month = { ...calcUnitsAndProfit(mapItems(monthOrders)), revenue: Number(monthOrders.reduce((s: number, o: any) => s + Number(o.total), 0).toFixed(2)), orders: monthOrders.length };

    const dailyMap: Record<string, { revenue: number; profit: number; units: number }> = {};
    const dayOrder: string[] = [];
    for (const o of monthOrders) {
      const day = format(new Date(o.createdAt), "MMM d");
      if (!dailyMap[day]) {
        dailyMap[day] = { revenue: 0, profit: 0, units: 0 };
        dayOrder.push(day);
      }
      dailyMap[day].revenue += Number(o.total);
      for (const i of o.items) {
        dailyMap[day].units += i.qty;
        dailyMap[day].profit += (Number(i.unitPriceAtSale) - Number(i.unitCostAtSale)) * i.qty;
      }
    }
    const daily = dayOrder.map((date) => {
      const d = dailyMap[date];
      return { date, revenue: Number(d.revenue.toFixed(2)), profit: Number(d.profit.toFixed(2)), units: d.units };
    });

    const todayExpenseTotal = Number(todayExpenses._sum.amount || 0);
    const weekExpenseTotal = Number(weekExpenses._sum.amount || 0);
    const monthExpenseTotal = Number(monthExpenses._sum.amount || 0);

    const arOutstanding = Math.max(0, Number(arData._sum.amount || 0) - Number(arData._sum.paidAmount || 0));
    const apOutstanding = Math.max(0, Number(apData._sum.amount || 0) - Number(apData._sum.paidAmount || 0));

    const targetActualMap = new Map(targetActuals.map((a: any) => [a.channel, Number(a._sum.total || 0)]));
    const targetProgress = targetData.map((t: any) => ({ channel: t.channel, target: Number(t.target), actual: targetActualMap.get(t.channel) ?? 0 }));
    const totalTarget = targetProgress.reduce((s: number, t: any) => s + t.target, 0);
    const totalActual = targetProgress.reduce((s: number, t: any) => s + t.actual, 0);

    // Break-even using actual monthly expenses from Expenses tab
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expenseProjectionFactor = daysInMonth / Math.max(dayOfMonth, 1);
    const monthlyFixedCosts = Math.round(monthExpenseTotal * expenseProjectionFactor);
    const totalMonthUnits = monthOrders.reduce((s: number, o: any) => s + o.items.reduce((si: number, i: any) => si + i.qty, 0), 0);
    const totalMonthRevenue = monthOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
    const avgUnitPrice = totalMonthUnits > 0 ? totalMonthRevenue / totalMonthUnits : 0;
    const totalMonthCost = monthOrders.reduce((s: number, o: any) => s + o.items.reduce((si: number, i: any) => si + Number(i.unitCostAtSale) * i.qty, 0), 0);
    const avgUnitCost = totalMonthUnits > 0 ? totalMonthCost / totalMonthUnits : 0;
    const avgMarginPerUnit = avgUnitPrice - avgUnitCost;
    const breakEvenUnits = avgMarginPerUnit > 0 ? Math.ceil(monthlyFixedCosts / avgMarginPerUnit) : 0;

    function addTrueProfit(p: any, expenseTotal: number) {
      return { ...p, expenseTotal, trueProfit: Number((p.profit - expenseTotal).toFixed(2)) };
    }

    const monthProfit = month.profit;
    const monthExp = monthExpenseTotal;
    const monthRevenue = month.revenue;
    const monthUnits = month.units;
    const isProfitable = monthProfit > monthExp;
    const marginPct = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

    const prevMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const prevMonthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    const prevMonthOrders = await safeQuery(() => prisma.salesOrder.findMany({ where: { createdAt: { gte: prevMonthStart, lte: prevMonthEnd } }, select: orderWithItemsSelect }), []);
    const prevMonthUnits = prevMonthOrders.reduce((s: number, o: any) => s + o.items.reduce((si: number, i: any) => si + i.qty, 0), 0);
    const momGrowth = prevMonthUnits > 0 ? ((monthUnits - prevMonthUnits) / prevMonthUnits) * 100 : 0;

    // Health score: 0-100, higher = healthier
    const profitScore = isProfitable ? 40 : monthProfit > 0 ? 20 : 0;
    const marginScore = Math.min(20, Math.max(0, (marginPct / 60) * 20));
    const growthScore = Math.min(20, Math.max(0, (1 + momGrowth / 100) / 2 * 20));
    const coverageScore = breakEvenUnits > 0 ? Math.min(20, (totalMonthUnits / breakEvenUnits) * 20) : 0;
    const healthScore = Math.round(profitScore + marginScore + growthScore + coverageScore);

    return json({
      today: addTrueProfit(today, todayExpenseTotal),
      week: addTrueProfit(week, weekExpenseTotal),
      month: addTrueProfit(month, monthExpenseTotal),
      lowStock: lowStockItems.map((v: any) => ({ id: v.id, product: v.product.name, variant: v.name, sku: v.sku, stock: v.currentStockQty, reorderAt: v.reorderPoint })),
      byChannel: Object.entries(byChannel).map(([channel, revenue]) => ({ channel, revenue: Number((revenue as number).toFixed(2)) })),
      daily,
      recentOrders,
      arOutstanding,
      apOutstanding,
      targetProgress,
      totalTarget,
      totalActual,
      healthScore,
      healthBreakdown: { profitScore, marginScore: Math.round(marginScore), growthScore: Math.round(growthScore), coverageScore: Math.round(coverageScore) },
      breakeven: {
        monthlyFixedCosts,
        avgUnitPrice: Math.round(avgUnitPrice * 100) / 100,
        avgUnitCost: Math.round(avgUnitCost * 100) / 100,
        avgMarginPerUnit: Math.round(avgMarginPerUnit * 100) / 100,
        breakEvenUnitsPerMonth: breakEvenUnits,
        breakEvenUnitsPerWeek: Math.round(breakEvenUnits / 4.33),
        breakEvenUnitsPerDay: Math.round(breakEvenUnits / 30),
        breakEvenRevenuePerMonth: Math.round(breakEvenUnits * avgUnitPrice * 100) / 100,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
