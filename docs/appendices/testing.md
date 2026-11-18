# 付録A　テストの読み方・書き方

[← 第8章 新しい機能に応用する](../08-extending-the-app.md) · [目次](../README.md) · [付録B 完成時のAPI仕様 →](api-spec.md)

## テストは、仕様を繰り返し確認するコード

テストは「この入力なら、この結果になる」という期待をコードにします。確認を繰り返す負担を減らし、変更で機能が壊れたことに気付けます。認証では、正しい利用者が使えることと、不正な操作を拒否することを確認します。

[Vitest](https://vitest.dev/api/test)の`test`に確認内容と処理を書き、`expect`で期待する結果を指定します。次の3段階で読みます。

1. **準備**：入力や必要なデータを作る。
2. **実行**：調べたい関数やAPIを呼ぶ。
3. **確認**：結果が仕様どおりか確かめる。

## テストを実行する

リポジトリのルートで `pnpm test` を実行します。変更のたびに実行する場合は `pnpm test:watch` を使います。配布時には、[公開メモAPIのテスト](../../tests/notes.test.ts)が5件あります。

第2章でパスワード処理とテストを書いたら、`pnpm test src/server/auth/password.test.ts` で、そのファイルだけを実行できます。認証機能の完成したテストは初期状態に含まれていません。各章の課題に合わせて追加します。

## パスワードのテストを書こう

`password.ts`と同じ場所に`password.test.ts`を置く例です。

```ts
import { expect, test } from 'vitest'
import { hashPassword, verifyPassword } from './password'

test('登録したパスワードを受け入れ、異なるパスワードを拒否する', async () => {
  // 準備
  const password = 'study-password-example'
  const storedHash = await hashPassword(password)

  // 実行
  const accepted = await verifyPassword(password, storedHash)
  const rejected = await verifyPassword('different-password', storedHash)

  // 確認
  expect(accepted).toBe(true)
  expect(rejected).toBe(false)
})
```

`await`は処理の完了を待ちます。`toBe(false)`は「結果が`false`であるはず」という確認です。異なる結果ならテストが失敗します。

**課題：テストの効果を確かめよう。** `verifyPassword`を一時的に常に`true`を返す処理に変更します。正しい入力の確認は通り、誤った入力の確認は失敗します。後者を外すと、この欠陥を見逃します。観察後は実装とテストを元に戻してください。

ソルトを使うため、同じパスワードから違う保存値が生成されます。ハッシュ値を固定文字列と比較するより、パスワードを正しく検証できることを確かめます。

## APIとDBも確認しよう

後半は[Honoの`app.request`](https://hono.dev/docs/guides/testing)でリクエストを送り、ステータス・本文・DBの変化を調べます。更新系では本文や`Origin`など、仕様に合うヘッダーも設定します。

AがBのメモを更新するテストでは、拒否するステータスと、**Bのメモが書き換わっていないこと**を確認します。エラーを返す前に更新してしまう実装を見つけるためです。

[テスト用DBの準備](../../tests/helpers/database.ts)にある `createTestContext()` は、OSの一時フォルダーに専用SQLiteを作り、マイグレーションを適用します。戻り値の `app` と `prisma` は、そのDBを使います。テスト終了時に `dispose()` を呼ぶと、接続を閉じて一時データを削除します。

付属のAPIテストはファイルの開始時にこの準備を行い、各テストの前にNoteを空にしています。テストごとに必要なデータを作り、ほかのテストの結果に依存させません。開発用の `prisma/dev.db` は使いません。UserやSessionを追加した後は、準備するデータと削除順も新しいモデルに合わせます。

## 良いテストの目安

- **仕様が名前から分かる。** 「セッションのテスト」より「期限切れならアクセスを拒否する」と書く。
- **成功・拒否・境界を見る。** 有効期限の直前、ちょうど期限、期限後を調べる。
- **毎回同じ条件で動く。** 期限のテストは、第4章で作る `findValidSession(token, now)` の `now` を指定し、実時間の経過を待たない。
- **結果を確認する。** 処理を呼ぶだけで終わらず、期待する値やDBの状態を確かめる。

`app.request`はブラウザではありません。Cookieの保存・自動送信や`SameSite`の効果は、実ブラウザとDevToolsでも確認します。

> TODO（教材整備）：第4章で生徒が実装した関数に時刻を渡すテスト例と、第5章以降のテストデータ準備の例を追加する。

---

[← 第8章 新しい機能に応用する](../08-extending-the-app.md) · [目次](../README.md) · [付録B 完成時のAPI仕様 →](api-spec.md)
