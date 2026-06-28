import { createPrismaClient } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const prisma = createPrismaClient();

  try {
    const { variantId, supplierId, qty, unitCost } = await req.json();

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return Response.json({ error: "Variant not found" }, { status: 404 });

    const previousStockQty = variant.currentStockQty;
    const newStockQty = previousStockQty + qty;

    const result = await prisma.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { currentStockQty: newStockQty },
      });

      await tx.inventoryLedger.create({
        data: {
          variantId,
          changeQty: qty,
          channel: "PHYSICAL",
          referenceType: "PROCUREMENT",
          note: "Restock from supplier",
          previousStockQty,
          newStockQty,
        },
      });

      const now = new Date();
      const poCount = await tx.procurement.count();
      const procurement = await tx.procurement.create({
        data: {
          poNumber: `PO-${String(poCount + 1).padStart(4, "0")}`,
          supplierId,
          status: "RECEIVED",
          orderDate: now,
          receivedDate: now,
          totalCost: unitCost * qty,
          items: {
            create: {
              variantId,
              qtyOrdered: qty,
              qtyReceived: qty,
              unitCost,
              subtotal: unitCost * qty,
            },
          },
        },
      });

      return procurement;
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
