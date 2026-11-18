# テストの入口

`pnpm test` で実行します。最初の状態では、公開メモAPIのテストが5件あります。

- `notes.test.ts`：入力、レスポンス、DBの変化を確かめる例。
- `helpers/database.ts`：テストファイルごとに専用の一時SQLiteを作り、実際のマイグレーションを適用する準備。終了時に接続を閉じて削除する。

開発用の `prisma/dev.db` はテストに使用しません。各テストでNoteを消去し、必要なデータを作ります。

第2章でパスワード処理を作った後、`src/server/auth/password.test.ts` を追加してください。その後、各章の課題でセッションや認可のテストを追加します。UserやSessionを追加したら、関連するテストデータの準備と削除順も調整してください。

[テスト入門](../docs/appendices/testing.md) / [教材の目次](../docs/README.md)

