import { createPrismaClient } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const prisma = createPrismaClient();

  try {
    const { name, description, categoryId } = await req.json();

    const product = await prisma.product.create({
      data: { name, description, categoryId },
    });

    return Response.json(product, { status: 201 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
