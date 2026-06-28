import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id },
        include: { items: true, customer: true },
      });
      if (!order) throw new Error("Order not found");

      for (const item of order.items) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        if (variant) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { currentStockQty: { increment: item.qty } },
          });
        }

        await tx.inventoryLedger.create({
          data: {
            variantId: item.variantId,
            changeQty: item.qty,
            channel: order.channel,
            referenceId: order.id,
            referenceType: "VOID",
            note: `Order ${order.orderNumber} voided`,
            previousStockQty: variant?.currentStockQty ?? 0,
            newStockQty: (variant?.currentStockQty ?? 0) + item.qty,
          },
        });
      }

      if (order.customer) {
        await tx.customer.update({
          where: { id: order.customer.id },
          data: { totalLifetimeSpend: { decrement: Number(order.total) } },
        });
      }

      await tx.salesOrderItem.deleteMany({ where: { salesOrderId: order.id } });
      await tx.salesOrder.delete({ where: { id } });
    });

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
