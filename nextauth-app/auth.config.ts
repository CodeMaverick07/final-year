import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

/**
 * Edge-compatible auth config.
 * Does NOT import Prisma or bcryptjs (Node.js only modules).
 * The Credentials provider `authorize` is defined in auth.ts instead.
 */
export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: () => null, // Overridden in auth.ts
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Protect these routes
      const protectedPaths = ["/dashboard", "/upload", "/feed", "/profile"];
      const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
      if (isProtected && !isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(loginUrl);
      }

      // Redirect authenticated users away from auth pages
      const authPaths = ["/login", "/register"];
      const isAuthPage = authPaths.some((p) => pathname.startsWith(p));
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/feed", nextUrl.origin));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
