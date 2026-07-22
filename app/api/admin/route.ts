import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, ApiError } from "@/lib/auth-helpers";
import { changePasswordSchema, createAdminUserSchema } from "@/lib/validations/schemas";
import { hash, compare } from "bcryptjs";

export async function GET() {
  try {
    await requireAuth();
    const users = await prisma.adminUser.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return Response.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    if (body.action === "change-password") {
      const data = changePasswordSchema.parse(body);
      if (!session.user?.id) throw new Error("Unauthorized");
      const user = await prisma.adminUser.findUnique({ where: { id: session.user.id } });
      if (!user) throw new Error("User not found");
      const valid = await compare(data.currentPassword, user.password);
      if (!valid) throw new Error("Current password is incorrect");
      const hashed = await hash(data.newPassword, 12);
      await prisma.adminUser.update({ where: { id: user.id }, data: { password: hashed } });
      return Response.json({ success: true });
    }

    if (body.action === "create-user") {
      if ((session.user as any)?.role !== "SUPER_ADMIN") throw new ApiError("Only super admins can create users", 403);
      const data = createAdminUserSchema.parse(body);
      const hashed = await hash(data.password, 12);
      const user = await prisma.adminUser.create({
        data: { email: data.email, name: data.name, password: hashed, role: "STAFF" },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });
      return Response.json(user, { status: 201 });
    }

    throw new Error("Invalid action");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("id is required");

    if ((session.user as any)?.id === id) throw new ApiError("Cannot delete your own account", 400);
    if ((session.user as any)?.role !== "SUPER_ADMIN") throw new ApiError("Only super admins can delete users", 403);

    const target = await prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new Error("User not found");

    const adminCount = await prisma.adminUser.count();
    if (adminCount <= 1) throw new ApiError("Cannot delete the last admin", 400);

    await prisma.adminUser.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
