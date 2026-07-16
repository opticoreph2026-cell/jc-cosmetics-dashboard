import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "ORDERED", "RECEIVED", "CANCELLED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { status } = updateStatusSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const po = await tx.procurement.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!po) throw new Error("Procurement not found");

      if (status === "RECEIVED" && po.status !== "RECEIVED") {
        for (const item of po.items) {
          const qtyToReceive = item.qtyOrdered - item.qtyReceived;
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

        await tx.procurement.update({
          where: { id },
          data: { status, receivedDate: new Date() },
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
