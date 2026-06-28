import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "@/lib/prisma/client/client";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

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
