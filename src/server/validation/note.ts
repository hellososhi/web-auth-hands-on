import { z } from "zod";

export const noteInput = z.object({
  title: z.string().trim().min(1, "タイトルを入力してください。").max(100, "タイトルは100文字以内です。"),
  body: z.string().max(10_000, "本文は10000文字以内です。"),
}).strict();

export const noteParams = z.object({
  id: z.string().min(1).max(100),
});

