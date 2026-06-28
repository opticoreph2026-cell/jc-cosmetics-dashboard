import { auth } from "./auth";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new ApiError("Unauthorized", 401);
  return session;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.message === "Insufficient stock")
    return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
  console.error("API Error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export class ApiError extends Error {
  constructor(public message: string, public status: number) {
    super(message);
  }
}
