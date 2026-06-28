import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { createProcurementSchema } from "@/lib/validations/schemas";

export async function GET() {
  try {
    await requireAuth();
    const procurements = await prisma.procurement.findMany({
      include: { supplier: { select: { name: true } }, items: { include: { variant: { include: { product: { select: { name: true } } } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json(procurements);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = createProcurementSchema.parse(body);

    const totalCost = data.items.reduce((sum, item) => sum + item.unitCost * item.qty, 0);
    const poCount = await prisma.procurement.count();

    const procurement = await prisma.procurement.create({
      data: {
        poNumber: `PO-${String(poCount + 1).padStart(4, "0")}`,
        supplierId: data.supplierId,
        status: "PENDING",
        totalCost,
        items: {
          create: data.items.map((item) => ({
            variantId: item.variantId,
            qtyOrdered: item.qty,
            unitCost: item.unitCost,
            subtotal: item.unitCost * item.qty,
          })),
        },
      },
    });

    return Response.json(procurement, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
