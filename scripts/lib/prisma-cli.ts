import { execFile, spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const prismaCli = path.join(path.dirname(require.resolve("prisma/package.json")), "build/index.js");

export async function runPrisma(
  args: string[],
  options: { env?: Partial<NodeJS.ProcessEnv>; quiet?: boolean; interactive?: boolean } = {},
) {
  // migrate dev can ask for a migration name or confirmation in a terminal.
  if (options.interactive) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [prismaCli, ...args], {
        cwd: process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: "inherit",
      });
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (code === 0) resolve();
        else reject(new Error("Prisma command failed: " + (signal ?? code)));
      });
    });
    return;
  }

  try {
    const result = await run(process.execPath, [prismaCli, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...options.env },
      maxBuffer: 4 * 1024 * 1024,
    });
    if (!options.quiet) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    if (failure.stdout) process.stderr.write(failure.stdout);
    if (failure.stderr) process.stderr.write(failure.stderr);
    throw error;
  }
}

