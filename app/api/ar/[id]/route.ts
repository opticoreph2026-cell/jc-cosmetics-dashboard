import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { paidAmount } = body;

    const existing = await prisma.accountReceivable.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const newPaid = Number(existing.paidAmount) + Number(paidAmount);
    const total = Number(existing.amount);
    const newStatus = newPaid >= total ? "PAID" : "PARTIAL";

    const updated = await prisma.accountReceivable.update({
      where: { id },
      data: { paidAmount: newPaid, status: newStatus },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
