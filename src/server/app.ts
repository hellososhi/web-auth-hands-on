import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { PrismaClient } from "@/generated/prisma/client";
import { createNotesRoutes } from "./routes/notes";

// Passing the DB explicitly keeps tests separate from the development database.
export function createApp(prisma: PrismaClient) {
  return new Hono()
    .basePath("/api")
    .use("*", async (c, next) => {
      c.header("Cache-Control", "no-store");
      await next();
    })
    .get("/health", (c) => c.json({ status: "ok" }, 200))
    .route("/notes", createNotesRoutes(prisma))
    .notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "APIが見つかりません。" } }, 404))
    .onError((error, c) => {
      if (error instanceof HTTPException && error.status === 400) {
        return c.json({ error: { code: "INVALID_JSON", message: "JSONの形式を確認してください。" } }, 400);
      }
      console.error("Unexpected API error:", error.name);
      return c.json({ error: { code: "INTERNAL_ERROR", message: "処理に失敗しました。もう一度お試しください。" } }, 500);
    });
}

export type AppType = ReturnType<typeof createApp>;

