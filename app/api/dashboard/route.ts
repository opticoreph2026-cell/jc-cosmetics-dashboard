import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from "date-fns";

export async function GET() {
  try {
    await requireAuth();
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    const todayOrders = await prisma.salesOrder.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      include: { items: true },
    });

    const weekOrders = await prisma.salesOrder.findMany({
      where: { createdAt: { gte: weekStart, lte: now } },
    });

    const monthOrders = await prisma.salesOrder.findMany({
      where: { createdAt: { gte: monthStart, lte: now } },
    });

    const lowStock = await prisma.productVariant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true, currentStockQty: true, reorderPoint: true, product: { select: { name: true } } },
    });
    const lowStockItems = lowStock.filter((v) => v.currentStockQty <= v.reorderPoint);

    const byChannel: Record<string, number> = {};
    for (const o of todayOrders) {
      byChannel[o.channel] = (byChannel[o.channel] || 0) + Number(o.total);
    }

    const recentOrders = await prisma.salesOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true, total: true, channel: true, createdAt: true, customer: { select: { name: true } } },
    });

    return Response.json({
      today: { revenue: Number(todayOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)), orders: todayOrders.length },
      week: { revenue: Number(weekOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)) },
      month: { revenue: Number(monthOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)) },
      lowStock: lowStockItems.map((v) => ({
        id: v.id, product: v.product.name, variant: v.name, sku: v.sku, stock: v.currentStockQty, reorderAt: v.reorderPoint,
      })),
      byChannel: Object.entries(byChannel).map(([channel, revenue]) => ({ channel, revenue: Number(revenue.toFixed(2)) })),
      recentOrders,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
