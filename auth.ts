import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const devLoginEnabled = process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN === "true";

/** Reads the birthday from the Google account, if the user shared one with a year. */
async function fetchGoogleBirthday(accessToken: string): Promise<Date | null> {
  try {
    const res = await fetch("https://people.googleapis.com/v1/people/me?personFields=birthdays", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { birthdays?: { date?: { year?: number; month?: number; day?: number } }[] };
    const d = data.birthdays?.find((b) => b.date?.year && b.date?.month && b.date?.day)?.date;
    return d ? new Date(Date.UTC(d.year!, d.month! - 1, d.day!)) : null;
  } catch {
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Google({
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/user.birthday.read",
          prompt: "select_account",
        },
      },
    }),
    ...(devLoginEnabled
      ? [
          Credentials({
            id: "dev",
            name: "Developer login",
            credentials: { email: {}, name: {} },
            async authorize(creds) {
              const email = String(creds?.email ?? "").trim().toLowerCase();
              if (!email) return null;
              const name = String(creds?.name ?? "").trim() || email.split("@")[0];
              return db.user.upsert({ where: { email }, update: {}, create: { email, name } });
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !account.access_token || !user.id) return;
      const existing = await db.user.findUnique({ where: { id: user.id }, select: { dob: true } });
      if (existing?.dob) return;
      const dob = await fetchGoogleBirthday(account.access_token);
      if (dob) await db.user.update({ where: { id: user.id }, data: { dob, dobSource: "GOOGLE" } });
    },
  },
});
