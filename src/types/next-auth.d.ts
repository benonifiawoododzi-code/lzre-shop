import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: Array<"CUSTOMER" | "SELLER" | "ADMIN">;
    } & DefaultSession["user"];
  }

  interface User {
    roles: Array<"CUSTOMER" | "SELLER" | "ADMIN">;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    roles?: Array<"CUSTOMER" | "SELLER" | "ADMIN">;
  }
}

export {};
