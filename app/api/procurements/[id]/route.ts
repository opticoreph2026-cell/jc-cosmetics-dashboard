import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]),
  items: z.array(z.object({ id: z.string(), qty: z.number().int().min(0) })).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateStatusSchema.parse(body);
    const { status, items } = parsed;

    const result = await prisma.$transaction(async (tx) => {
      const po = await tx.procurement.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!po) throw new Error("Procurement not found");

      if ((status === "RECEIVED" || status === "PARTIALLY_RECEIVED") && po.status !== "RECEIVED") {
        const itemQtyMap = items ? Object.fromEntries(items.map((i) => [i.id, i.qty])) : {};

        for (const item of po.items) {
          const received = item.qtyReceived ?? 0;
          const qtyToReceive = itemQtyMap[item.id] !== undefined
            ? Math.min(itemQtyMap[item.id], item.qtyOrdered - received)
            : item.qtyOrdered - received;
          if (qtyToReceive <= 0) continue;

          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (!variant) continue;

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              currentStockQty: { increment: qtyToReceive },
              unitCost: item.unitCost,
            },
          });

          await tx.procurementItem.update({
            where: { id: item.id },
            data: { qtyReceived: { increment: qtyToReceive } },
          });

          await tx.inventoryLedger.create({
            data: {
              variantId: item.variantId,
              changeQty: qtyToReceive,
              channel: "PHYSICAL",
              referenceId: po.id,
              referenceType: "PROCUREMENT",
              note: `PO ${po.poNumber} received`,
              previousStockQty: variant.currentStockQty,
              newStockQty: variant.currentStockQty + qtyToReceive,
            },
          });
        }

        const updatedPo = await tx.procurement.findUnique({
          where: { id },
          include: { items: true },
        });
        const allReceived = updatedPo!.items.every((i) => i.qtyReceived >= i.qtyOrdered);
        const anyReceived = updatedPo!.items.some((i) => i.qtyReceived > 0);

        await tx.procurement.update({
          where: { id },
          data: {
            status: allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status,
            receivedDate: allReceived ? new Date() : anyReceived ? new Date() : undefined,
          },
        });
      } else {
        await tx.procurement.update({
          where: { id },
          data: { status },
        });
      }

      return tx.procurement.findUnique({
        where: { id },
        include: { supplier: { select: { name: true } }, items: { include: { variant: { include: { product: { select: { name: true } } } } } } },
      });
    });

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
