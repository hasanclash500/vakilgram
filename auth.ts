import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { getPrisma } from "@/lib/db/prisma";

const prisma = getPrisma();

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && adminEmails().has(email.toLowerCase()));
}

const providers = [
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [Google]
    : []),
  ...(process.env.AUTH_RESEND_KEY && process.env.EMAIL_FROM
    ? [
        Resend({
          apiKey: process.env.AUTH_RESEND_KEY,
          from: process.env.EMAIL_FROM
        })
      ]
    : [])
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database"
  },
  providers,
  trustHost:
    process.env.AUTH_TRUST_HOST === "true" ||
    Boolean(process.env.VERCEL),
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
    async signIn({ user }) {
      if (isAdminEmail(user.email)) {
        await prisma.user.updateMany({
          where: { email: user.email },
          data: { role: "ADMIN" }
        });
      }
      return true;
    }
  },
  events: {
    async createUser({ user }) {
      if (isAdminEmail(user.email)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" }
        });
      }
    }
  }
});
