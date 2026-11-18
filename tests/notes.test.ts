import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { createTestContext } from "./helpers/database";

let context: Awaited<ReturnType<typeof createTestContext>>;

beforeAll(async () => {
  context = await createTestContext();
});

beforeEach(async () => {
  await context.prisma.note.deleteMany();
});

afterAll(async () => {
  await context?.dispose();
});

const jsonHeaders = {
  "Content-Type": "application/json",
  // Later chapters add an Origin check. The initial API is public.
  Origin: "http://localhost:3000",
};

test("メモを作成し、一覧と詳細で同じ内容を取得できる", async () => {
  // 準備
  const input = { title: "通信の復習", body: "HTTPの流れを確認する" };

  // 実行
  const created = await context.app.request("/api/notes", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });

  // 確認
  expect(created.status).toBe(201);
  const { note } = await created.json();
  expect(note).toEqual({ id: expect.any(String), ...input });

  const list = await context.app.request("/api/notes");
  expect(list.status).toBe(200);
  expect(await list.json()).toEqual({ notes: [note] });
  const detail = await context.app.request("/api/notes/" + note.id);
  expect(detail.status).toBe(200);
  expect(await detail.json()).toEqual({ note });
});

test("空のタイトルを拒否し、DBにメモを追加しない", async () => {
  const response = await context.app.request("/api/notes", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ title: "   ", body: "" }),
  });
  expect(response.status).toBe(400);
  expect(await context.prisma.note.count()).toBe(0);
});

test("余分な項目を拒否し、DBに保存しない", async () => {
  const response = await context.app.request("/api/notes", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ title: "入力検証", body: "", unexpected: true }),
  });
  expect(response.status).toBe(400);
  expect(await context.prisma.note.count()).toBe(0);
});

test("JSON以外の本文を415で拒否する", async () => {
  const response = await context.app.request("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "text/plain", Origin: jsonHeaders.Origin },
    body: JSON.stringify({ title: "形式", body: "" }),
  });
  expect(response.status).toBe(415);
  expect(await context.prisma.note.count()).toBe(0);
});

test("メモを更新し、削除すると本文なし204と詳細404になる", async () => {
  const note = await context.prisma.note.create({ data: { title: "変更前", body: "" } });
  const updated = await context.app.request("/api/notes/" + note.id, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ title: "変更後", body: "更新した内容" }),
  });
  expect(updated.status).toBe(200);
  expect((await updated.json()).note.title).toBe("変更後");

  const deleted = await context.app.request("/api/notes/" + note.id, {
    method: "DELETE",
    headers: { Origin: jsonHeaders.Origin },
  });
  expect(deleted.status).toBe(204);
  expect(await deleted.text()).toBe("");
  expect(await context.prisma.note.findUnique({ where: { id: note.id } })).toBeNull();
  expect((await context.app.request("/api/notes/" + note.id)).status).toBe(404);
});

