// src/types/next-auth.d.ts
// Аугментация next-auth: organizationId нужен во всей админке.
// Без этого файла TypeScript не знал про поле, и его читали через @ts-ignore —
// а заодно не замечали, что undefined доезжает до Prisma и снимает фильтр.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      organizationId: string;
    } & DefaultSession["user"];
  }

  interface User {
    organizationId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId: string;
  }
}
