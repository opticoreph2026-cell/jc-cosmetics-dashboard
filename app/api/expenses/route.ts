import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/validations/schemas";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const category = searchParams.get("category");

    const where: any = {};
    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      where.date = { gte: startOfMonth(new Date(y, m - 1)), lte: endOfMonth(new Date(y, m - 1)) };
    }
    if (category) where.category = category;

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      take: 200,
    });
    return Response.json(expenses.map((e) => ({ ...e, amount: Number(e.amount) })));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = createExpenseSchema.parse(body);
    const expense = await prisma.expense.create({ data: { ...data, date: new Date(data.date) } });
    return Response.json({ ...expense, amount: Number(expense.amount) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { id, ...data } = updateExpenseSchema.parse(body);
    if (!id) throw new Error("id is required");
    const updateData: any = { ...data };
    if (data.date) updateData.date = new Date(data.date);
    const expense = await prisma.expense.update({ where: { id }, data: updateData });
    return Response.json({ ...expense, amount: Number(expense.amount) });
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
    await prisma.expense.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
