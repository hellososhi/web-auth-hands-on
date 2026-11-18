import { NotesApp } from "@/components/notes-app";

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Web Auth Hands-on</p>
        <h1>みんなのメモ</h1>
        <p className="page-description">思いついたことや、学んだことを残そう。</p>
      </header>

      <aside className="learning-notice" aria-label="このアプリの開始時点">
        <strong>ここから認証を作っていきます。</strong>
        <p>
          今は、すべてのメモを誰でも閲覧・編集・削除できます。
          教材を進めながら、自分のメモを守る仕組みを追加しましょう。
        </p>
      </aside>

      <NotesApp />

      <footer className="page-footer">
        <p>練習用のメモを使って、画面・通信・DBの変化を確かめてください。</p>
      </footer>
    </main>
  );
}

