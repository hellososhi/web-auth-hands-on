# 付録B 完成時のAPI仕様

[← 付録A テストの読み方・書き方](testing.md) · [目次](../README.md) · [付録C 用語集 →](glossary.md)

これは第7章までを終えた時点の仕様です。第8章で `PATCH /api/profile` を追加します。

配布時にあるのは、公開メモAPIと稼働確認用の `GET /api/health` です。認証API・認証必須処理・所有者の確認・Origin検証は、各章で追加します。

## 共通の約束

- 画面はHono RPCでリクエストする。
- データを受け取るAPIの本文はJSON。`Content-Type: application/json` を使う。
- ログアウトは本文なしのPOST。
- JSONが必要なAPIへの不正なContent-Typeは `415`、壊れたJSONや検証不合格は `400`。
- 状態変更では、固定の `APP_ORIGIN` と一致する `Origin` が必要。
- Originの検証は、データ変更やセッション作成・削除より前に行う。
- メモAPIは毎リクエストで認証を確認する。
- 入力で受け付ける項目を列挙し、余分な `ownerId` や `userId` は拒否する。
- 認証・メモなどの利用者に依存する応答には `Cache-Control: no-store` を付ける。画面に保持した表示用データはログアウト時に消す。

参考：[Honoの入力検証][ref-hono-validation]、[OWASPのCSRF対策][ref-csrf]、[MDNのCache-Control][ref-cache-control]

## 公開するデータ

- 公開用ユーザー：`id`、`username`。
- 公開用メモ：`id`、`title`、`body`。必要な表示項目は教材のUIに合わせる。
- パスワードハッシュ・セッションの元トークン・トークンハッシュは、JSONに含めない。
- セッションの元トークンは、ログイン成功時のCookie設定に使う。

## エラーの形

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "ログイン情報を確認してください。"
  }
}
```

`code` はエラーの種類を判別するための値、`message` は利用者に表示する文章です。画面では、`src/lib/api-client.ts` の `getApiErrorMessage()` が `message` を読み取ります。認証APIもこの形に揃え、ログイン失敗のメッセージは原因によらず統一します。サーバーのスタックトレースや内部のDBエラーを、そのまま返さないようにします。

> TODO（教材整備）：エラーコード一覧、画面表示、入力エラーの項目別情報、Hono RPCの戻り値の型を確定する。

## エンドポイント

| API | 成功時 | 主な拒否・失敗 |
| --- | --- | --- |
| `GET /api/health` | `200`、`{ "status": "ok" }`。認証不要 | 稼働確認用 |
| `POST /api/auth/register` | `201`、`{ user }`。自動ログインしない | 入力不備 `400`、ユーザー名重複 `409` |
| `POST /api/auth/login` | `200`、`{ user }` とセッションCookie | 入力不備 `400`、認証情報不一致 `401` |
| `GET /api/auth/me` | `200`、`{ user }` | 未認証 `401` |
| `POST /api/auth/logout` | `204`、Cookieと対象セッションを削除 | 不正Origin `403`。未認証でも正規Originなら `204` |
| `GET /api/notes` | `200`、`{ notes }`。自分のメモだけ | 未認証 `401` |
| `POST /api/notes` | `201`、`{ note }` | 未認証 `401`、入力不備 `400` |
| `GET /api/notes/:id` | `200`、`{ note }` | 未認証 `401`、見つからない・他人のメモ `404` |
| `PATCH /api/notes/:id` | `200`、`{ note }` | 未認証 `401`、入力不備 `400`、他人のメモ `404` |
| `DELETE /api/notes/:id` | `204`、本文なし | 未認証 `401`、他人のメモ `404` |

表のPOST・PATCH・DELETEには、共通のOrigin検証も適用します。試行制限に達したログインなどは `429` とします。

複数の拒否条件が同時に成り立つ場合は、共通処理でOriginを確認し、保護APIでは認証を確認してから入力・所有者を検証する順序にします。拒否条件のテストでは、確認したい条件以外を正しい状態に揃えます。

配布時のメモAPIには、JSON形式の検証と `415` の応答があります。また、`src/server/app.ts` の共通処理で `Cache-Control: no-store` を設定しています。

> TODO（教材整備）：本文サイズ上限、認証APIも含めた検証の適用順、`415`・`429` の共通処理を解答例に反映する。

---

[← 付録A テストの読み方・書き方](testing.md) · [目次](../README.md) · [付録C 用語集 →](glossary.md)

[ref-hono-validation]: https://hono.dev/docs/guides/validation
[ref-csrf]: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
[ref-cache-control]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
