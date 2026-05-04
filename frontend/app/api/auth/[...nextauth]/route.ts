import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";

// Simple in-memory user store (replace with database in production)
const users: Record<string, { email: string; password: string; name: string }> = {};

const handler = NextAuth({
  providers: [
    // Email/Password login
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = users[credentials.email];
        if (!user) {
          throw new Error("Invalid email or password");
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          throw new Error("Invalid email or password");
        }

        return {
          id: credentials.email,
          email: credentials.email,
          name: user.name,
        };
      },
    }),

    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "your-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "your-google-client-secret",
      allowDangerousEmailAccountLinking: true,
    }),

    // Facebook OAuth
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "your-facebook-app-id",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "your-facebook-app-secret",
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      // Handle OAuth login
      if (account?.provider === "google" || account?.provider === "facebook") {
        if (!users[user?.email || ""]) {
          users[user?.email || ""] = {
            email: user?.email || "",
            name: user?.name || "",
            password: "", // OAuth users don't have password
          };
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production",
});

export { handler as GET, handler as POST };

// Export user store for signup endpoint
export { users };
