import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Helper to sanitize avatar strings and reject raw Base64 data URIs
function sanitizeAvatarUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  // If it's a Base64 data URI or unreasonably long, do not put it into JWT
  if (url.startsWith("data:image") || url.length > 2048) {
    console.warn("Base64 string or oversized URL rejected from JWT session cookie.");
    return null;
  }
  return url;
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          // 1. Login request
          const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: credentials.username,
            password: credentials.password,
          });

          const token = loginRes.data?.access_token;
          if (!token) return null;

          // 2. Fetch profile details
          const meRes = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const user = meRes.data;

          // 3. Return sanitized object to NextAuth JWT
          return {
            id: String(user.id),
            username: user.username,
            full_name: user.full_name,
            profile_picture_url: sanitizeAvatarUrl(user.profile_picture_url),
            role: user.role,
            access_token: token,
          };
        } catch (error: any) {
          console.error("NextAuth Authorize Error:", error?.response?.data || error.message);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial Sign-in
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.full_name = user.full_name;
        token.profile_picture_url = sanitizeAvatarUrl(user.profile_picture_url);
        token.role = user.role;
        token.access_token = user.access_token;
      }

      // Handle updateSession(...) calls
      if (trigger === "update") {
        // Option A: Client passed explicit data in updateSession({ ... })
        if (session?.full_name !== undefined) {
          token.full_name = session.full_name;
        }
        if (session?.profile_picture_url !== undefined) {
          token.profile_picture_url = sanitizeAvatarUrl(session.profile_picture_url);
        }

        // Option B: Empty updateSession() call -> Re-fetch fresh profile from /auth/me
        if (!session?.full_name && !session?.profile_picture_url && token.access_token) {
          try {
            const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${token.access_token}` },
            });

            token.full_name = meResponse.data.full_name;
            token.profile_picture_url = sanitizeAvatarUrl(meResponse.data.profile_picture_url);
          } catch (error) {
            console.error("Error refreshing user token data from /auth/me:", error);
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.full_name = token.full_name as string;
        session.user.profile_picture_url = token.profile_picture_url as string | null;
        session.user.role = token.role as string;
        session.access_token = token.access_token as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };