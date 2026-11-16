import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        await connectToDatabase();

        const user = await User.findOne({ email: parsed.data.email.toLowerCase() })
          .lean()
          .exec();

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: String(user._id),
          name: user.name ?? "User",
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const jwtToken = token as typeof token & { id?: string };

      if (user) {
        jwtToken.id = String(user.id ?? user.email ?? "");
      }

      return jwtToken;
    },
    async session({ session, token }) {
      const sessionUser = session.user as typeof session.user & { id?: string };
      sessionUser.id = String(token.id ?? token.sub ?? "");
      return session;
    },
  },
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  return session.user;
}
