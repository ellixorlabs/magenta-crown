import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import type { RoleEnum } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function roleToSession(r: RoleEnum): "ADMIN" | "SUB_ADMIN" | "CUSTOMER" | "TECH_SUPPORT" {
  if (r === "ADMIN") return "ADMIN";
  if (r === "SUB_ADMIN") return "SUB_ADMIN";
  if (r === "TECH_SUPPORT") return "TECH_SUPPORT";
  return "CUSTOMER";
}

const googleConfigured =
  Boolean(process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/auth/signin"
  },
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: (process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID) as string,
            clientSecret: (process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET) as string,
            allowDangerousEmailAccountLinking: true
          })
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() }
        });
        if (!user?.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: roleToSession(user.role)
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production"
      }
    }
  },
  events: {
    async signIn({ user }) {
      const id = user?.id;
      if (!id) return;
      try {
        await prisma.user.update({
          where: { id },
          data: { lastLoginAt: new Date() }
        });
      } catch {
        /* ignore audit failures */
      }
    }
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const next = new URL(url);
        if (next.origin === new URL(baseUrl).origin) return url;
      } catch {
        /* invalid */
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        const r = (user as { role?: string }).role;
        if (r) token.role = r;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

        const db = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            age: true,
            image: true,
            role: true,
            name: true,
            email: true,
            phone: true
          }
        });
        if (db) {
          session.user.role = roleToSession(db.role);
          session.user.image = db.image;
          session.user.name = db.name;
          session.user.email = db.email ?? "";
          session.user.age = db.age ?? null;
          session.user.phone = db.phone ?? null;
        } else {
          session.user.role =
            (token.role as "ADMIN" | "SUB_ADMIN" | "CUSTOMER" | "TECH_SUPPORT") ?? "CUSTOMER";
        }
      }
      return session;
    }
  },
  trustHost: true
});
