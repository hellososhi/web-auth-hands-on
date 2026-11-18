import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { resolveDatabaseLocation } from "./database-url";

// No connection is created when this module is imported.
export function createPrismaClient(databaseUrl: string) {
  const { url } = resolveDatabaseLocation(databaseUrl);
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

const globalDatabase = globalThis as typeof globalThis & {
  webAuthPrisma?: PrismaClient;
};

export function getPrisma() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  globalDatabase.webAuthPrisma ??= createPrismaClient(databaseUrl);
  return globalDatabase.webAuthPrisma;
}

