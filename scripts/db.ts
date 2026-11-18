import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { config } from "dotenv";
import { resolveDatabaseLocation } from "../src/server/db/database-url";
import { runPrisma } from "./lib/prisma-cli";

async function prepareEnvironment() {
  try {
    await access(".env");
  } catch {
    await copyFile(".env.example", ".env");
    console.log(".env.example から .env を作成しました。");
  }
  config({ quiet: true });
  const location = resolveDatabaseLocation(process.env.DATABASE_URL);
  await mkdir(path.dirname(location.filePath), { recursive: true });
  console.log("DB: " + location.filePath);
  return location;
}

async function main() {
  const action = process.argv[2];
  const args = process.argv.slice(3).filter((arg) => arg !== "--");
  if (!["setup", "migrate", "seed", "reset"].includes(action)) {
    throw new Error("Unknown DB command.");
  }
  const location = await prepareEnvironment();
  const env = { DATABASE_URL: location.url };

  if (action === "migrate") {
    await runPrisma(["migrate", "dev", ...args], { env, interactive: true });
    await runPrisma(["generate"], { env });
    return;
  }

  if (action === "reset") {
    const defaultFile = resolveDatabaseLocation().filePath;
    if (location.filePath !== defaultFile) {
      throw new Error("db:reset は教材の既定DB prisma/dev.db だけを初期化できます。");
    }
    if (!process.stdin.isTTY) {
      throw new Error("db:reset はターミナルで実行し、確認してください。");
    }
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = await terminal.question("開発サーバーを停止してください。上記DBのデータを削除するには RESET と入力: ");
      if (answer !== "RESET") {
        console.log("初期化を中止しました。");
        return;
      }
    } finally {
      terminal.close();
    }
    await runPrisma(["migrate", "reset", "--force"], { env });
  }

  await runPrisma(["generate"], { env });
  if (action === "setup") await runPrisma(["migrate", "deploy"], { env });
  // Import only after generation, including on the first setup.
  const { seed } = await import("../prisma/seed");
  await seed(location.url);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "DB操作に失敗しました。");
  process.exitCode = 1;
});

