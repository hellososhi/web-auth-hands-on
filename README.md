# web-auth-hands-on

Next.js・Hono・Hono RPC・Prismaを使って、認証と認可を学ぶ教材です。認証のない共有メモアプリから始め、ユーザー登録・パスワードの確認・セッション・アクセス制御を追加します。

**[教材の目次](docs/README.md)** · [環境構築](docs/setup.md) · [講師用TODO](docs/appendices/instructor-todos.md)

## 起動する

Node.js 24系とpnpm 10.34.9を使います。pnpmの準備がまだの場合は、Node.jsの導入後に `npm install --global pnpm@10.34.9` でインストールできます。

```bash
git clone https://github.com/hellososhi/web-auth-hands-on.git
cd web-auth-hands-on
pnpm install
pnpm db:setup
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開きます。

`pnpm db:setup` は次の準備を行います。

1. `.env` がなければ `.env.example` から作成する。
2. Prisma Clientを生成する。
3. 初期のマイグレーションを適用し、`prisma/dev.db` を作成する。
4. メモが0件の場合だけ、練習用のメモを追加する。

既存のメモは削除しません。開発中のDBはGitの管理対象から除外しています。

## 配布時のアプリ

- メモの一覧・詳細取得・作成・編集・削除。
- Next.jsの画面からHono RPCで呼び出す `/api/notes` API。
- Hono側の入力検証。空のタイトル、文字数の超過、余分な入力項目を拒否する。
- Prisma・SQLiteの接続、`Note` モデル、マイグレーション、初期データ。
- Vitestと、一時DBを使うメモAPIのテスト例。

初期状態では、アプリにアクセスできる人が同じメモを操作できます。この状態を観察するところから教材を始めます。

## 演習で実装するもの

`User`・`Session` モデル、パスワードのハッシュ処理、登録・ログインAPI、セッションCookie、認証必須の処理、メモの所有者による制限、ログアウト、期限切れ、Origin検証を生徒が実装します。

パスワード処理用の `argon2` は依存関係に含めています。認証の関数・API・解答コードは用意していません。教材の「課題」が生徒の作業、「TODO（教材整備）」が講師向けの追記予定です。

## コマンド

リポジトリのルートで実行します。

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 開発サーバーを起動する |
| `pnpm db:setup` | 環境変数・Prisma Client・DB・初期データを準備する |
| `pnpm db:migrate --name add-users` | スキーマ変更からマイグレーションを作成・適用し、Clientを生成する |
| `pnpm db:generate` | Prisma Clientを生成する |
| `pnpm db:seed` | メモが0件の場合に初期データを追加する |
| `pnpm db:studio` | Prisma StudioでDBを確認する |
| `pnpm db:reset` | 確認入力後、既定の開発DBを作り直す |
| `pnpm test` | テストを一度実行する |
| `pnpm test:watch` | ファイルの変更に合わせてテストを再実行する |
| `pnpm typecheck` | Prisma・Next.jsの型を生成し、TypeScriptを確認する |
| `pnpm build` | 本番用ビルドを作成する |
| `pnpm start` | ビルド済みアプリを起動する |
| `pnpm docs:check` | Markdownの相対リンク先を確認する |

`db:reset` は `prisma/dev.db` だけを対象にします。開発サーバーを停止し、表示された接続先を確認して `RESET` と入力すると、DBのデータが削除されます。`db:setup` と `db:seed` は削除を行いません。

## 主なファイル

| パス | 役割 |
| --- | --- |
| `docs/README.md` | 教材の目次 |
| `src/app/page.tsx` | 共有メモ画面 |
| `src/components/notes-app.tsx` | フォーム、一覧、Hono RPCの呼び出し |
| `src/lib/api-client.ts` | Hono RPCクライアント |
| `src/app/api/[[...route]]/route.ts` | Next.jsからHonoへの入り口 |
| `src/server/app.ts` | Honoアプリを組み立てる関数と公開型 |
| `src/server/routes/notes.ts` | メモAPI |
| `src/server/db/` | Prisma接続とSQLiteのパス解決 |
| `prisma/schema.prisma` | 最初は `Note` だけを定義するDBスキーマ |
| `prisma/migrations/` | DB構造の変更履歴 |
| `tests/notes.test.ts` | メモAPIのテスト例 |
| `tests/helpers/database.ts` | 開発DBと分離したテスト用DBの準備 |

Prisma Clientは `src/generated/prisma/` に生成します。生成ファイルはGitに含めません。

## DBと環境変数

`.env.example` を雛形として、`.env` を使います。

```dotenv
DATABASE_URL="file:./prisma/dev.db"
APP_ORIGIN="http://localhost:3000"
```

SQLiteの相対パスはリポジトリのルートを基準に解決します。Prisma CLI・アプリ・seedは同じ接続先を使います。`APP_ORIGIN` は第7章でOrigin検証を実装するときに使う値です。

テストはOSの一時ディレクトリに専用のDBを作り、実際のマイグレーションを適用して実行します。開発用のメモを削除せずに確認できます。[テストの準備と読み方](tests/README.md)も参照してください。

## 技術構成

Next.js App RouterのRoute Handler内でHonoを動かし、画面とAPIを同じオリジンにそろえています。APIはNode.jsランタイムで動作します。授業ではCookie・セッション・認可の実装に集中します。

依存関係は `package.json` と `pnpm-lock.yaml` で固定します。主要なバージョンはNext.js 16.4.6、Hono 4.13.19、Prisma 7.10.1です。設計の背景と公式資料へのリンクは[教材の参考資料](docs/references.md)にあります。

