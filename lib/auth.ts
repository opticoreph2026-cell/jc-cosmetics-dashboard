import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.adminUser.findUnique({ where: { email } });
        if (!user) return null;

        const isValid = await compare(password, user.password);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
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
        || nextUrl.pathname.startsWith("/expenses")
        || nextUrl.pathname.startsWith("/ar")
        || nextUrl.pathname.startsWith("/ap")
        || nextUrl.pathname.startsWith("/admin")
        || nextUrl.pathname.startsWith("/analysis")
        || nextUrl.pathname.startsWith("/settings");
      if (isOnDashboard) return isLoggedIn;
      if (isLoggedIn && nextUrl.pathname === "/login") return Response.redirect(new URL("/dashboard", nextUrl));
      return true;
    },
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as any).role; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { session.user.id = token.id as string; (session.user as any).role = token.role; }
      return session;
    },
  },
});
