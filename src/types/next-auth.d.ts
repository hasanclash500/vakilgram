import type { DefaultSession } from "next-auth";

type AppRole = "USER" | "LAWYER" | "ADMIN";

declare module "next-auth" {
  interface User {
    role: AppRole;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }
}
