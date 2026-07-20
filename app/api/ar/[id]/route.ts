import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { paidAmount } = body;

    const existing = await prisma.accountReceivable.findUnique({ where: { id } });
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    const total = Number(existing.amount);
    const incrementAmount = Number(paidAmount);

    const updated = await prisma.accountReceivable.update({
      where: { id },
      data: {
        paidAmount: { increment: incrementAmount },
        status: Number(existing.paidAmount) + incrementAmount >= total ? "PAID" : "PARTIAL",
      },
    });

    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
