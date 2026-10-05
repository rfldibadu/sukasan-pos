import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    username: string;
    full_name?: string;
    profile_picture_url?: string | null;
    role: string;
    access_token: string;
  }

  interface Session {
    access_token?: string;
    user: {
      id: string;
      username: string;
      full_name?: string;
      profile_picture_url?: string | null;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    username?: string;
    full_name?: string;
    profile_picture_url?: string | null;
    role?: string;
    access_token?: string;
  }
}