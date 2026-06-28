import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const proxy = NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png|cover.png|icon-192.svg|icon-512.svg|manifest.json).*)"],
};
