"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { InferResponseType } from "hono/client";
import { client, getApiErrorMessage } from "@/lib/api-client";

type Note = InferResponseType<typeof client.api.notes.$get, 200>["notes"][number];

export function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const titleInput = useRef<HTMLInputElement>(null);
  const isBusy = pendingAction !== null || isLoading;

  // アプリの初回表示と「再読み込み」で、サーバーの現在の一覧を取得する。
  useEffect(() => {
    let active = true;

    async function loadNotes() {
      setIsLoading(true);
      setListError(null);

      try {
        const response = await client.api.notes.$get();
        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response));
        }

        const data = await response.json();
        if (!("notes" in data)) {
          throw new Error("一覧を確認できませんでした。もう一度読み込んでください。");
        }
        if (active) {
          setNotes(data.notes);
        }
      } catch (error) {
        if (active) {
          setListError(
            error instanceof Error ? error.message : "メモを読み込めませんでした。",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadNotes();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setFormError(null);
  }

  function startEditing(note: Note) {
    setEditingId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setFormError(null);
    setActionError(null);
    setConfirmDeleteId(null);
    setNotice("");
    titleInput.current?.focus();
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0 || trimmedTitle.length > 100) {
      setFormError("タイトルは1〜100文字で入力してください。");
      titleInput.current?.focus();
      return;
    }
    if (body.length > 10_000) {
      setFormError("本文は10,000文字以内で入力してください。");
      return;
    }

    setPendingAction("save");
    setFormError(null);
    setActionError(null);
    setNotice("");

    try {
      const values = { title: trimmedTitle, body };
      const response =
        editingId === null
          ? await client.api.notes.$post({ json: values })
          : await client.api.notes[":id"].$patch({
              param: { id: editingId },
              json: values,
            });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response));
      }

      const data = await response.json();
      if (!("note" in data)) {
        throw new Error("保存結果を確認できませんでした。再読み込みしてください。");
      }

      // 保存後は、サーバーが返したメモで画面を更新する。
      setNotes((current) =>
        editingId === null
          ? [data.note, ...current]
          : current.map((note) => (note.id === editingId ? data.note : note)),
      );
      setNotice(editingId === null ? "メモを追加しました。" : "メモを更新しました。");
      resetForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "メモを保存できませんでした。",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteNote(id: string) {
    if (isBusy) return;
    setPendingAction("delete");
    setActionError(null);
    setNotice("");

    try {
      const response = await client.api.notes[":id"].$delete({ param: { id } });
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response));
      }

      // DELETEの成功応答は204で本文がないため、json()は呼ばない。
      setNotes((current) => current.filter((note) => note.id !== id));
      if (editingId === id) resetForm();
      setConfirmDeleteId(null);
      setNotice("メモを削除しました。");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "メモを削除できませんでした。",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <p className="status-message" role="status" aria-live="polite">
        {notice}
      </p>

      <div className="workspace">
        <section className="editor-panel" aria-labelledby="editor-heading">
          <div className="section-heading">
            <h2 id="editor-heading">
              {editingId === null ? "メモを書く" : "メモを編集"}
            </h2>
            {editingId !== null && <span className="editing-label">編集中</span>}
          </div>

          <form onSubmit={saveNote}>
            <fieldset disabled={isBusy}>
              <label htmlFor="note-title">タイトル</label>
              <input
                ref={titleInput}
                id="note-title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={100}
                required
                placeholder="今日学んだこと"
                aria-describedby="title-help"
              />
              <p className="field-help" id="title-help">1〜100文字</p>

              <label htmlFor="note-body">本文 <span className="optional">任意</span></label>
              <textarea
                id="note-body"
                name="body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={10_000}
                rows={8}
                placeholder="メモの内容を書いてみましょう。"
                aria-describedby="body-help"
              />
              <p className="field-help character-count" id="body-help">
                {body.length.toLocaleString("ja-JP")} / 10,000文字
              </p>

              <div className="form-actions">
                <button className="button button-primary" type="submit">
                  {pendingAction === "save"
                    ? "保存中…"
                    : editingId === null
                      ? "メモを追加"
                      : "変更を保存"}
                </button>
                {editingId !== null && (
                  <button className="button button-secondary" type="button" onClick={resetForm}>
                    キャンセル
                  </button>
                )}
              </div>
            </fieldset>
            {formError && <p className="error-message" role="alert">{formError}</p>}
          </form>
        </section>

        <section className="notes-panel" aria-labelledby="notes-heading" aria-busy={isLoading}>
          <div className="section-heading notes-heading">
            <h2 id="notes-heading">
              メモ一覧 <span className="note-count">{notes.length}</span>
            </h2>
            <button
              className="button button-secondary"
              type="button"
              disabled={isBusy}
              onClick={() => {
                setActionError(null);
                setNotice("");
                setReloadKey((current) => current + 1);
              }}
            >
              再読み込み
            </button>
          </div>

          {listError && (
            <div className="error-panel" role="alert">
              <p>{listError}</p>
              <button
                className="button button-secondary"
                type="button"
                disabled={isBusy}
                onClick={() => setReloadKey((current) => current + 1)}
              >
                もう一度読み込む
              </button>
            </div>
          )}
          {actionError && <p className="error-message" role="alert">{actionError}</p>}
          {isLoading && <p className="loading-message" role="status">メモを読み込んでいます…</p>}

          {!isLoading && !listError && notes.length === 0 && (
            <div className="empty-state">
              <h3>まだメモがありません</h3>
              <p>「メモを書く」から最初の1件を追加してみましょう。</p>
            </div>
          )}

          <ul className="notes-list">
            {notes.map((note) => (
              <li key={note.id}>
                <article className={"note" + (editingId === note.id ? " note-editing" : "")}>
                  <h3>{note.title}</h3>
                  {note.body ? (
                    <p className="note-body">{note.body}</p>
                  ) : (
                    <p className="note-body note-body-empty">本文なし</p>
                  )}

                  {confirmDeleteId === note.id ? (
                    <div className="delete-confirmation">
                      <p id={"delete-confirmation-" + note.id}>このメモを削除しますか？</p>
                      <div className="note-actions">
                        <button
                          className="button button-danger"
                          type="button"
                          disabled={isBusy}
                          onClick={() => void deleteNote(note.id)}
                        >
                          {pendingAction === "delete" ? "削除中…" : "削除する"}
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          autoFocus
                          aria-describedby={"delete-confirmation-" + note.id}
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="note-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={isBusy}
                        onClick={() => startEditing(note)}
                        aria-label={note.title + "を編集"}
                      >
                        編集
                      </button>
                      <button
                        className="button button-text"
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setConfirmDeleteId(note.id);
                          setActionError(null);
                        }}
                        aria-label={note.title + "を削除"}
                      >
                        削除
                      </button>
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

