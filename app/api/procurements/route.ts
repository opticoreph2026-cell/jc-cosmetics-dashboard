import { createPrismaClient } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const prisma = createPrismaClient();

  try {
    const { supplierId, items } = await req.json();

    const totalCost = items.reduce((sum: number, item: any) => sum + parseFloat(item.unitCost) * item.qty, 0);

    const poCount = await prisma.procurement.count();
    const procurement = await prisma.procurement.create({
      data: {
        poNumber: `PO-${String(poCount + 1).padStart(4, "0")}`,
        supplierId,
        status: "PENDING",
        totalCost,
        items: {
          create: items.map((item: any) => ({
            variantId: item.variantId,
            qtyOrdered: item.qty,
            unitCost: parseFloat(item.unitCost),
            subtotal: parseFloat(item.unitCost) * item.qty,
          })),
        },
      },
    });

    return Response.json(procurement, { status: 201 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
