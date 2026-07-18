import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get("variantId");

    const where: any = {};
    if (variantId) where.variantId = variantId;

    const audits = await prisma.stockAudit.findMany({
      where,
      include: {
        variant: {
          select: { id: true, name: true, sku: true, currentStockQty: true, product: { select: { name: true } } },
        },
      },
      orderBy: { conductedAt: "desc" },
      take: 50,
    });

    return NextResponse.json(audits);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body; // { variantId: string; actualQty: number; notes?: string }[]

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 });
    }

    const variantIds = items.map((i: any) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, currentStockQty: true },
    });
    const variantMap = new Map(variants.map((v) => [v.id, v.currentStockQty]));

    const audits = [];
    for (const item of items) {
      const expectedQty = variantMap.get(item.variantId) ?? 0;
      const variance = item.actualQty - expectedQty;
      audits.push({
        variantId: item.variantId,
        expectedQty,
        actualQty: item.actualQty,
        variance,
        notes: item.notes ?? null,
      });
    }

    await prisma.stockAudit.createMany({ data: audits });

    const updateOps = items
      .filter((i: any) => variantMap.has(i.variantId))
      .map((i: any) =>
        prisma.productVariant.update({
          where: { id: i.variantId },
          data: {
            currentStockQty: i.actualQty,
            ...(i.notes && i.notes.trim()
              ? {}
              : {}),
          },
        })
      );

    if (updateOps.length > 0) {
      await prisma.$transaction(updateOps);
    }

    return NextResponse.json({ count: audits.length }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
