import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { createCategorySchema, updateCategorySchema } from "@/lib/validations/schemas";

export async function GET() {
  try {
    await requireAuth();
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return Response.json(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = createCategorySchema.parse(body);
    const category = await prisma.category.create({ data });
    return Response.json(category, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { id, ...data } = updateCategorySchema.parse(body);
    if (!id) throw new Error("id is required");
    const category = await prisma.category.update({ where: { id }, data });
    return Response.json(category);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("id is required");

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return Response.json({ error: `Cannot delete category: ${productCount} product(s) are using it. Remove or reassign them first.` }, { status: 400 });
    }

    await prisma.category.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
