import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { noteInput, noteParams } from "@/server/validation/note";

const publicNote = { id: true, title: true, body: true } as const;

const validateNoteId = zValidator("param", noteParams, (result, c) => {
  if (!result.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "メモのIDを確認してください。" } }, 400);
  }
});

const requireJson = createMiddleware(async (c, next) => {
  const mediaType = c.req.header("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    return c.json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON形式で送信してください。" } }, 415);
  }
  await next();
});

function isMissingRecord(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

// These routes are intentionally public at the beginning of the course.
export function createNotesRoutes(prisma: PrismaClient) {
  return new Hono()
    .get("/", async (c) => {
      const notes = await prisma.note.findMany({
        select: publicNote,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return c.json({ notes }, 200);
    })
    .get("/:id", validateNoteId, async (c) => {
      const { id } = c.req.valid("param");
      const note = await prisma.note.findUnique({ where: { id }, select: publicNote });
      if (!note) {
        return c.json({ error: { code: "NOT_FOUND", message: "メモが見つかりません。" } }, 404);
      }
      return c.json({ note }, 200);
    })
    .post("/", requireJson, zValidator("json", noteInput, (result, c) => {
      if (!result.success) {
        return c.json({ error: { code: "VALIDATION_ERROR", message: "入力内容を確認してください。" } }, 400);
      }
    }), async (c) => {
      const input = c.req.valid("json");
      const note = await prisma.note.create({ data: input, select: publicNote });
      return c.json({ note }, 201);
    })
    .patch("/:id", requireJson, validateNoteId, zValidator("json", noteInput, (result, c) => {
      if (!result.success) {
        return c.json({ error: { code: "VALIDATION_ERROR", message: "入力内容を確認してください。" } }, 400);
      }
    }), async (c) => {
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");
      try {
        const note = await prisma.note.update({ where: { id }, data: input, select: publicNote });
        return c.json({ note }, 200);
      } catch (error) {
        if (isMissingRecord(error)) {
          return c.json({ error: { code: "NOT_FOUND", message: "メモが見つかりません。" } }, 404);
        }
        throw error;
      }
    })
    .delete("/:id", validateNoteId, async (c) => {
      const { id } = c.req.valid("param");
      try {
        await prisma.note.delete({ where: { id } });
        return c.body(null, 204);
      } catch (error) {
        if (isMissingRecord(error)) {
          return c.json({ error: { code: "NOT_FOUND", message: "メモが見つかりません。" } }, 404);
        }
        throw error;
      }
    });
}

