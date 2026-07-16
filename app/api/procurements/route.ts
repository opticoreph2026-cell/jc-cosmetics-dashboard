import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, json } from "@/lib/auth-helpers";
import { createProcurementSchema } from "@/lib/validations/schemas";

export async function GET() {
  try {
    await requireAuth();
    const procurements = await prisma.procurement.findMany({
      select: { id: true, poNumber: true, status: true, totalCost: true, orderDate: true, supplier: { select: { name: true } }, items: { select: { qtyOrdered: true, qtyReceived: true, variant: { select: { name: true, product: { select: { name: true } } } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return json(procurements);
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
    const lastPO = await prisma.procurement.findFirst({ orderBy: { poNumber: "desc" }, select: { poNumber: true } });
    const nextNum = lastPO ? parseInt(lastPO.poNumber.replace("PO-", ""), 10) + 1 : 1;

    const procurement = await prisma.procurement.create({
      data: {
        poNumber: `PO-${String(nextNum).padStart(4, "0")}`,
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
