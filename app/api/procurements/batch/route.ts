import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { groups } = body;

    if (!Array.isArray(groups) || groups.length === 0) {
      return NextResponse.json({ error: "Groups array is required" }, { status: 400 });
    }

    const results = [];

    for (const group of groups) {
      const { supplierId, items } = group;
      if (!supplierId || !Array.isArray(items) || items.length === 0) continue;

      const lastPO = await prisma.procurement.findFirst({
        where: { supplierId },
        orderBy: { poNumber: "desc" },
        select: { poNumber: true },
      });
      const lastNum = lastPO ? parseInt(lastPO.poNumber.replace(/[^0-9]/g, ""), 10) : 0;
      const poNumber = `PO-${String(lastNum + 1).padStart(4, "0")}`;

      const variants = await prisma.productVariant.findMany({
        where: { id: { in: items.map((i: any) => i.variantId) } },
        select: { id: true, unitCost: true },
      });
      const costMap = new Map(variants.map((v) => [v.id, Number(v.unitCost)]));

      const itemData = items.map((item: any) => {
        const unitCost = costMap.get(item.variantId) ?? 0;
        return { variantId: item.variantId, qtyOrdered: item.qty, unitCost, subtotal: unitCost * item.qty };
      });
      const totalCost = itemData.reduce((s: number, i: any) => s + Number(i.subtotal), 0);

      const procurement = await prisma.procurement.create({
        data: {
          supplierId,
          poNumber,
          status: "PENDING",
          totalCost,
          items: { create: itemData },
        },
        include: { items: true },
      });

      results.push(procurement);
    }

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
