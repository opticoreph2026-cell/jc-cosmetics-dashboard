import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, json } from "@/lib/auth-helpers";
import { subDays, startOfMonth, format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let from: Date;
    const to = toParam ? new Date(toParam) : new Date();

    if (fromParam) {
      from = new Date(fromParam);
    } else {
      switch (period) {
        case "7d": from = subDays(to, 7); break;
        case "30d": from = subDays(to, 30); break;
        case "90d": from = subDays(to, 90); break;
        case "ytd": from = startOfMonth(new Date(to.getFullYear(), 0, 1)); break;
        default: from = subDays(to, 30);
      }
    }

    const [orders, categories] = await Promise.all([
      prisma.salesOrder.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: {
          total: true, channel: true, createdAt: true,
          items: { select: { subtotal: true, unitCostAtSale: true, qty: true, variant: { select: { product: { select: { categoryId: true } } } } } },
        },
        orderBy: { createdAt: "asc" },
        take: 5000,
      }),
      prisma.category.findMany({ select: { id: true, name: true } }),
    ]);

    const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalCost = orders.reduce((s, o) => s + o.items.reduce((s2, i) => s2 + Number(i.unitCostAtSale) * i.qty, 0), 0);
    const totalMargin = totalRevenue - totalCost;

    const byChannel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const daily: Record<string, number> = {};

    for (const order of orders) {
      byChannel[order.channel] = (byChannel[order.channel] || 0) + Number(order.total);
      for (const item of order.items) {
        const catId = item.variant.product.categoryId;
        byCategory[catId] = (byCategory[catId] || 0) + Number(item.subtotal);
      }
      const dayKey = format(order.createdAt, "yyyy-MM-dd");
      daily[dayKey] = (daily[dayKey] || 0) + Number(order.total);
    }

    return json({
      summary: { totalRevenue: totalRevenue.toFixed(2), totalOrders, avgOrderValue: avgOrderValue.toFixed(2), totalMargin: totalMargin.toFixed(2), totalCost: totalCost.toFixed(2) },
      byChannel: Object.entries(byChannel).map(([channel, revenue]) => ({ channel, revenue: revenue.toFixed(2) })),
      byCategory: Object.entries(byCategory).map(([id, revenue]) => ({ category: catMap[id] || id, revenue: revenue.toFixed(2) })),
      daily: Object.entries(daily).map(([date, revenue]) => ({ date, revenue: revenue.toFixed(2) })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
