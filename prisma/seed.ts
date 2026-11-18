import { createPrismaClient } from "../src/server/db/client";

export async function seed(databaseUrl: string) {
  const prisma = createPrismaClient(databaseUrl);
  try {
    if (await prisma.note.count() > 0) {
      console.log("メモが存在するため、サンプルの追加をスキップしました。");
      return;
    }

    await prisma.note.createMany({
      data: [
        {
          title: "最初のメモ",
          body: "このアプリは、誰でも同じメモを読んだり編集したりできます。メモを追加して、動きを確かめてみましょう。",
        },
        {
          title: "通信を見てみよう",
          body: "開発者ツールのNetworkタブを開いてから、このメモを編集してみてください。送信した内容とレスポンスを確認しましょう。",
        },
      ],
    });
    console.log("サンプルメモを2件追加しました。");
  } finally {
    await prisma.$disconnect();
  }
}

