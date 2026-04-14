import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "SUB_ADMIN" | "CUSTOMER" | "TECH_SUPPORT";
      name?: string | null;
      email?: string | null | undefined;
      image?: string | null;
      age?: number | null;
      phone?: string | null;
    };
  }

  interface User {
    role?: "ADMIN" | "SUB_ADMIN" | "CUSTOMER" | "TECH_SUPPORT";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "SUB_ADMIN" | "CUSTOMER" | "TECH_SUPPORT";
  }
}
