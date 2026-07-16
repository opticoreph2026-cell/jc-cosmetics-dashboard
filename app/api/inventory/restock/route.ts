import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { restockSchema } from "@/lib/validations/schemas";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = restockSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({ where: { id: data.variantId } });
      if (!variant) throw new Error("Variant not found");

      const previousStockQty = variant.currentStockQty;
      const newStockQty = previousStockQty + data.qty;

      await tx.productVariant.update({
        where: { id: data.variantId },
        data: { currentStockQty: newStockQty, unitCost: data.unitCost },
      });

      const poCount = await tx.procurement.count();
      const procurement = await tx.procurement.create({
        data: {
          poNumber: `PO-${String(poCount + 1).padStart(4, "0")}`,
          supplierId: data.supplierId,
          status: "RECEIVED",
          orderDate: new Date(),
          receivedDate: new Date(),
          totalCost: data.unitCost * data.qty,
          items: {
            create: {
              variantId: data.variantId,
              qtyOrdered: data.qty,
              qtyReceived: data.qty,
              unitCost: data.unitCost,
              subtotal: data.unitCost * data.qty,
            },
          },
        },
      });

      await tx.inventoryLedger.create({
        data: {
          variantId: data.variantId,
          changeQty: data.qty,
          channel: "PHYSICAL",
          referenceType: "PROCUREMENT",
          referenceId: procurement.id,
          note: "Restock from supplier",
          previousStockQty,
          newStockQty,
        },
      });

      return procurement;
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
