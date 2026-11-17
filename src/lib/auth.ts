import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { loginSchema } from "@/lib/validators/auth";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
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
      if (user) {
        token.id = String(user.id);
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = String(token.id ?? token.sub ?? "");
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
