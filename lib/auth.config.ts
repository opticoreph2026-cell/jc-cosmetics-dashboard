import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
        || nextUrl.pathname.startsWith("/inventory")
        || nextUrl.pathname.startsWith("/quick-log")
        || nextUrl.pathname.startsWith("/sales")
        || nextUrl.pathname.startsWith("/customers")
        || nextUrl.pathname.startsWith("/suppliers")
        || nextUrl.pathname.startsWith("/procurement")
        || nextUrl.pathname.startsWith("/ledger")
        || nextUrl.pathname.startsWith("/categories")
        || nextUrl.pathname.startsWith("/admin");
      if (isOnDashboard) return isLoggedIn;
      if (isLoggedIn && nextUrl.pathname === "/login") return Response.redirect(new URL("/dashboard", nextUrl));
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
