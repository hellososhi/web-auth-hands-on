import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runPrisma } from "../../scripts/lib/prisma-cli";
import { createApp } from "@/server/app";
import { createPrismaClient } from "@/server/db/client";
import { resolveDatabaseLocation } from "@/server/db/database-url";

export async function createTestContext() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "web-auth-hands-on-test-"));
  const location = resolveDatabaseLocation("file:" + path.join(directory, "test.db"));
  try {
    await runPrisma(["migrate", "deploy"], {
      env: { DATABASE_URL: location.url },
      quiet: true,
    });
    const prisma = createPrismaClient(location.url);
    return {
      prisma,
      app: createApp(prisma),
      async dispose() {
        await prisma.$disconnect();
        await rm(directory, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

