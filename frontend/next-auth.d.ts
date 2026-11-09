import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    username: string;
    full_name?: string;
    profile_picture_url?: string | null;
    role: string;
    admin_task?: "field_manager" | "finance" | "hrd" | null;
    salary_day?: number | null;
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
      admin_task?: "field_manager" | "finance" | "hrd" | null;
      salary_day?: number | null;
      access_token?: string;
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
    admin_task?: "field_manager" | "finance" | "hrd" | null;
    salary_day?: number | null;
    access_token?: string;
  }
}
