import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, json } from "@/lib/auth-helpers";
import { createCustomerSchema } from "@/lib/validations/schemas";

export async function GET() {
  try {
    await requireAuth();
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return json(customers);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = createCustomerSchema.parse(body);
    const customer = await prisma.customer.create({ data });
    return Response.json(customer, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
