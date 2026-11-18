import { hc } from "hono/client";
import type { AppType } from "@/server/app";

// 型だけを共有する。サーバーの実装やDBをブラウザへ読み込まない。
export const client = hc<AppType>("/");

export async function getApiErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "object" &&
      data.error !== null &&
      "message" in data.error &&
      typeof data.error.message === "string"
    ) {
      return data.error.message;
    }
  } catch {
    // JSON以外のエラー応答も、画面で扱えるメッセージにする。
  }

  return "処理に失敗しました。再読み込みしてから、もう一度お試しください。";
}

