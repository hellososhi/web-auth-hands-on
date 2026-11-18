import { handle } from "hono/vercel";
import { createApp } from "@/server/app";
import { getPrisma } from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let handler: ReturnType<typeof handle> | undefined;

function handleRequest(request: Request) {
  handler ??= handle(createApp(getPrisma()));
  return handler(request);
}

export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as PATCH,
  handleRequest as DELETE,
};

