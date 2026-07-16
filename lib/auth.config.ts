import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const publicPaths = ["/login", "/api"];
      const isPublic = publicPaths.some((p) => nextUrl.pathname === p || nextUrl.pathname.startsWith(p + "/"));
      if (isPublic) {
        if (isLoggedIn && nextUrl.pathname === "/login") return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
