# 第7章 ブラウザの仕組みを使った攻撃と防御

[← 第6章 ログイン状態を終了させる](06-logout-and-expiration.md) · [目次](README.md) · [第8章 新しい機能に応用する →](08-extending-the-app.md)

## この章の目標

ブラウザは、条件に合う Cookie を自動送信します。この仕組みを悪用し、別のページからログイン済みのユーザーに操作を実行させる攻撃が **CSRF** です。送信元の検査を実装し、本人確認・権限確認との違いを説明しましょう。

## 実装する仕様と、その理由

画面と Hono API は `http://localhost:3000` の同じオリジンです。オリジンは「スキーム・ホスト・ポート」の組です。

| 仕様 | 理由 |
| --- | --- |
| Cookie は `HttpOnly` | ページ内のJavaScriptから秘密のトークンを読ませない |
| Cookie は `SameSite=Lax` | サイトをまたぐリクエストへのCookie送信を制限する |
| Cookie は `Path=/`、`Domain` 省略 | アプリ全体で利用し、発行元ホストに送信範囲を限定する |
| 公開環境では HTTPS と `Secure` を使う | 暗号化された通信で Cookie を送る |
| GET・HEAD・OPTIONS でデータを変更しない | 読み取りのつもりのアクセスで操作が起きるのを防ぐ |
| その他のメソッドでは `Origin` と固定設定 `APP_ORIGIN` を完全一致比較 | 許可した画面からの操作だけを受け付ける |
| 上記の状態変更メソッドでは、`Origin` の欠落・文字列 `null`・不一致は 403 | 送信元を確認できない更新操作を拒否する |

登録・ログイン・ログアウト・メモの変更にも検査を適用します。許可値はサーバーの設定に置き、リクエストの Host から作りません。

テンプレートではルートの `.env` に `APP_ORIGIN="http://localhost:3000"` を用意しています。この値を使う検査処理は、この章で実装します。

**Origin の一致は本人確認ではありません。** ブラウザ以外のクライアントは Origin を自由に設定できます。セッションとメモの所有者の確認は引き続き必要です。

32 バイトの乱数トークン、DB へのハッシュ保存、期限確認、ログアウト時の DB 削除は維持します。

## 実装課題

Origin 検査ミドルウェアを作成してください。GET・HEAD・OPTIONSはそのまま後続処理へ進め、それ以外のメソッドでOriginを検査してください。認証や個別ルートの処理より前に検査し、不一致なら 403 を返して後続処理を止めます。前方一致・部分一致は使いません。正規の Hono RPC の動作と Cookie の設定も確認してください。

登録・ログイン・メモの入力は JSON、ログアウトは本文なしの `POST` という仕様を維持します。Origin 検査は Content-Type によって省略しません。

[Hono の `csrf()`](https://hono.dev/docs/middleware/builtin/csrf) はフォーム互換の Content-Type が対象で、JSON は対象外です。Origin または Fetch Metadata が通ると許可します。本教材の仕様に合わせ、専用ミドルウェアを使います。

## 手動確認：別のページからログアウトさせられるか

実験には、ローカルの教材用コピーと架空のアカウントを使います。

1. アプリにログインし、DevTools で Cookie を確認します。
2. `http://localhost:3001` の実験ページから、ログアウト API にフォームで POST します。
3. 検査が有効なら 403 となり、ログイン状態が維持されることを確認します。
4. 教材用コピーで一時的に検査を外すとログアウトされることを確認し、検査を戻します。

> TODO（教材整備）：localhost:3001 の実験ページ、起動手順、本文なし POST のログアウトフォームを用意する。

二つの URL は別オリジンですが、SameSite の判定では同じ site です。この実験は `SameSite=Lax` だけでは防げません。**Cookie の送信条件と Origin の検査条件は異なります。**

別オリジンのレスポンスをJavaScriptから読むことが制限されていても、HTMLフォームで送信できるリクエストがあります。レスポンスを読めるかと、サーバーで操作が実行されるかを分けて考えます。JSONが必要なログインAPIは入力形式の違いで失敗するため、実験には本文不要のログアウトを使います。

参考：[MDNのSite][ref-site]、[MDNのCookie属性][ref-cookie]

## テスト課題

正常な Origin のテストを書き、次のケースを追加してください。

- 完全一致：処理が成功する。
- 別ポート・別ホスト・許可 URL の末尾に文字を足した値：403。
- Origin なし・`null`：403。
- 拒否されたログアウト：Session が DB に残る。
- 拒否されたメモ作成：メモの件数が増えない。

API テストでは Origin を明示します。ブラウザの Cookie と SameSite の動作は手動確認で確かめます。

## 読解と講師デモ：XSS と連続ログイン試行

**XSS** は、攻撃者の用意した JavaScript がアプリのページ上で動く問題です。`HttpOnly` は Cookie の読み取りを防ぎますが、そのスクリプトからログイン済みの操作を送ることはできます。メモ本文は React の通常のテキスト表示を使い、入力文字列を HTML として挿入しません。

アカウントの有無を推測されにくくするため、失敗の表示は「ログイン情報を確認してください」に統一します。大量の推測を抑えるため連続試行を制限し、429 を返します。制限には対象アカウントと送信元などの観点があります。基本編では講師が用意した部品の設定と効果を確認します。

同じエラー本文でも、存在しないユーザーはすぐ失敗し、存在するユーザーだけ時間のかかる照合を行うと、応答時間が手掛かりになります。講師のデモで差を観察し、照合処理を揃える方針を確認します。

参考：[ReactのHTML表示][ref-react-common]、[OWASPの認証ガイド][ref-authentication]

> TODO（教材整備）：HTML の表示方法による違いと、ログイン試行制限の講師デモを用意する。

## 説明課題

- Cookie が自動送信されることが、なぜ CSRF につながるのでしょうか。
- Origin が一致しても、なぜセッションと所有者の確認が必要でしょうか。
- 403 だけでなく「DB が変化しないこと」も調べる理由は何でしょうか。
- HttpOnly があっても、XSS による操作を防げない理由を説明してください。

参考：[OWASP の CSRF 対策](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

---

[← 第6章 ログイン状態を終了させる](06-logout-and-expiration.md) · [目次](README.md) · [第8章 新しい機能に応用する →](08-extending-the-app.md)

[ref-site]: https://developer.mozilla.org/en-US/docs/Glossary/Site
[ref-cookie]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
[ref-react-common]: https://react.dev/reference/react-dom/components/common
[ref-authentication]: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
