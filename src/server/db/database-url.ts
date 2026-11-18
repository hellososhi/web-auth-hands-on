import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_DATABASE_URL = "file:./prisma/dev.db";

// Prisma CLI and the SQLite adapter must refer to the same absolute file.
export function resolveDatabaseLocation(
  value = DEFAULT_DATABASE_URL,
  root = process.cwd(),
): { filePath: string; url: string } {
  if (!value.startsWith("file:") || value === "file::memory:") {
    throw new Error("DATABASE_URL must point to a local SQLite file.");
  }
  if (value.includes("?") || value.includes("#")) {
    throw new Error("SQLite URL query strings and fragments are not used in this template.");
  }

  const rawPath = value.startsWith("file://") ? fileURLToPath(value) : value.slice(5);
  if (!rawPath) throw new Error("DATABASE_URL has no file path.");
  const filePath = path.resolve(root, rawPath);

  return { filePath, url: "file:" + filePath.replaceAll("\\", "/") };
}

