import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { createARSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    const items = await prisma.accountReceivable.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return Response.json(items);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = createARSchema.parse(body);
    const item = await prisma.accountReceivable.create({ data });
    return Response.json(item, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
