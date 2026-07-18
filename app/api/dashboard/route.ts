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

export async function GET() {
  try {
    await requireAuth();
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    const todayEndDate = endOfDay(now);

    const monthStartDate = startOfMonth(now);
    const monthEndDate = endOfDay(now);

    const [todayOrders, weekOrders, monthOrders, lowStock, recentOrders, todayExpenses, weekExpenses, monthExpenses, arData, apData, targetData, targetActuals] = await Promise.all([
      prisma.salesOrder.findMany({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
        select: orderWithItemsSelect,
      }),
      prisma.salesOrder.findMany({
        where: { createdAt: { gte: weekStart, lte: now } },
        select: orderWithItemsSelect,
      }),
      prisma.salesOrder.findMany({
        where: { createdAt: { gte: monthStart, lte: now } },
        select: orderWithItemsSelect,
      }),
      prisma.productVariant.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sku: true, currentStockQty: true, reorderPoint: true, product: { select: { name: true } } },
        take: 200,
      }),
      prisma.salesOrder.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: orderSelect,
      }),
      prisma.expense.aggregate({ where: { date: { gte: todayStart, lte: todayEnd } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { date: { gte: weekStart, lte: now } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { date: { gte: monthStart, lte: now } }, _sum: { amount: true } }),
      prisma.accountReceivable.aggregate({ where: { status: { in: ["UNPAID", "PARTIAL"] } }, _sum: { amount: true, paidAmount: true } }),
      prisma.accountPayable.aggregate({ where: { status: { in: ["UNPAID", "PARTIAL"] } }, _sum: { amount: true, paidAmount: true } }),
      prisma.salesTarget.findMany({ where: { year: now.getFullYear(), month: now.getMonth() + 1 } }),
      prisma.salesOrder.groupBy({
        by: ["channel"],
        where: { createdAt: { gte: monthStartDate, lte: monthEndDate } },
        _sum: { total: true },
      }),
    ]);

    const lowStockItems = lowStock.filter((v) => v.currentStockQty <= v.reorderPoint);

    const byChannel: Record<string, number> = {};
    for (const o of todayOrders) {
      byChannel[o.channel] = (byChannel[o.channel] || 0) + Number(o.total);
    }

    function mapItems(orders: typeof todayOrders) {
      return orders.flatMap((o) => o.items.map((i) => ({ qty: i.qty, unitPriceAtSale: Number(i.unitPriceAtSale), unitCostAtSale: Number(i.unitCostAtSale) })));
    }
    const today = { ...calcUnitsAndProfit(mapItems(todayOrders)), revenue: Number(todayOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)), orders: todayOrders.length };
    const week = { ...calcUnitsAndProfit(mapItems(weekOrders)), revenue: Number(weekOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)) };
    const month = { ...calcUnitsAndProfit(mapItems(monthOrders)), revenue: Number(monthOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)) };

    const dailyMap: Record<string, { revenue: number; profit: number; units: number }> = {};
    for (const o of monthOrders) {
      const day = format(o.createdAt, "MMM d");
      if (!dailyMap[day]) dailyMap[day] = { revenue: 0, profit: 0, units: 0 };
      dailyMap[day].revenue += Number(o.total);
      for (const i of o.items) {
        dailyMap[day].units += i.qty;
        dailyMap[day].profit += (Number(i.unitPriceAtSale) - Number(i.unitCostAtSale)) * i.qty;
      }
    }
    // round daily profit
    for (const k of Object.keys(dailyMap)) {
      dailyMap[k].profit = Number(dailyMap[k].profit.toFixed(2));
    }
    const daily = Object.entries(dailyMap).map(([date, d]) => ({
      date,
      revenue: Number(d.revenue.toFixed(2)),
      profit: Number(d.profit.toFixed(2)),
      units: d.units,
    }));

    const todayExpenseTotal = Number(todayExpenses._sum.amount || 0);
    const weekExpenseTotal = Number(weekExpenses._sum.amount || 0);
    const monthExpenseTotal = Number(monthExpenses._sum.amount || 0);

    const arOutstanding = Number(arData._sum.amount || 0) - Number(arData._sum.paidAmount || 0);
    const apOutstanding = Number(apData._sum.amount || 0) - Number(apData._sum.paidAmount || 0);

    const targetActualMap = new Map(targetActuals.map((a) => [a.channel, Number(a._sum.total || 0)]));
    const targetProgress = targetData.map((t) => ({
      channel: t.channel,
      target: Number(t.target),
      actual: targetActualMap.get(t.channel) ?? 0,
    }));
    const totalTarget = targetProgress.reduce((s, t) => s + t.target, 0);
    const totalActual = targetProgress.reduce((s, t) => s + t.actual, 0);

    function addTrueProfit(p: { profit: number }, expenseTotal: number) {
      return { ...p, expenseTotal, trueProfit: Number((p.profit - expenseTotal).toFixed(2)) };
    }

    return json({
      today: addTrueProfit(today, todayExpenseTotal),
      week: addTrueProfit(week, weekExpenseTotal),
      month: addTrueProfit(month, monthExpenseTotal),
      lowStock: lowStockItems.map((v) => ({
        id: v.id, product: v.product.name, variant: v.name, sku: v.sku, stock: v.currentStockQty, reorderAt: v.reorderPoint,
      })),
      byChannel: Object.entries(byChannel).map(([channel, revenue]) => ({ channel, revenue: Number(revenue.toFixed(2)) })),
      daily,
      recentOrders,
      arOutstanding: Math.max(0, arOutstanding),
      apOutstanding: Math.max(0, apOutstanding),
      targetProgress,
      totalTarget,
      totalActual,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
