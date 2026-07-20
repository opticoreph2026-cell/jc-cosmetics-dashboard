import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { createAPSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    const items = await prisma.accountPayable.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
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
    const data = createAPSchema.parse(body);
    const item = await prisma.accountPayable.create({ data });
    return Response.json(item, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
