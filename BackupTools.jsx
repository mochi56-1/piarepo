import React, { useRef, useState } from "react";
import { Download, Upload, X } from "lucide-react";
import useDialogFocus from "./useDialogFocus.js";
import { buildBackup, parseBackup, mergeBackup } from "./backup.js";

export default function BackupTools({ notes, onRestore }) {
  const input = useRef(null);
  const [preview, setPreview] = useState(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useDialogFocus(preview ? "backup" : null);
  const exportFile = () => {
    try {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(buildBackup(notes), null, 2)], {
          type: "application/json",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `piarepo-backup-${new Date().toLocaleDateString("sv-SE")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "バックアップのダウンロードを開始しました。保存先でファイルを確認してください。",
      );
      setError("");
    } catch {
      setError(
        "バックアップを作成できませんでした。ブラウザの設定を確認してください。",
      );
    }
  };
  const readFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");
    if (file.size > 20 * 1024 * 1024) {
      setError(
        "ファイルが大きすぎます。20MB以下のバックアップを選んでください。",
      );
      return;
    }
    try {
      setPreview(parseBackup(await file.text()));
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "JSON形式のバックアップファイルを選んでください。"
          : err.message,
      );
    }
  };
  return (
    <section className="backup-tools">
      <h3>noteを手元に残す</h3>
      <p>
        note・添付画像・気づき・コメントをまとめて保存できます。タスク・スケジュール・つながり設定は対象外です。バックアップには個人的な内容が含まれます。自分で管理できる場所に保管してください。
      </p>
      <div className="backup-buttons">
        <button onClick={exportFile}>
          <Download size={17} />
          バックアップを書き出す
        </button>
        <button onClick={() => input.current.click()}>
          <Upload size={17} />
          バックアップを読み込む
        </button>
        <input
          type="file"
          accept=".json,application/json"
          hidden
          ref={input}
          aria-label="バックアップファイル"
          onChange={readFile}
        />
      </div>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="image-error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <div className="overlay" onClick={() => setPreview(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="バックアップを復元"
            onKeyDown={(event) => {
              if (event.key === "Escape") setPreview(null);
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close"
              aria-label="復元をキャンセル"
              onClick={() => setPreview(null)}
            >
              <X />
            </button>
            <h2>バックアップを復元しますか？</h2>
            <p>{preview.length}件の記録を読み込みます。</p>
            <p className="muted">
              同じIDの記録
              {
                preview.filter((note) =>
                  notes.some((current) => current.id === note.id),
                ).length
              }
              件は、バックアップの内容で置き換えます。それ以外の現在の記録は残ります。
            </p>
            <button
              className="primary"
              onClick={() => {
                if (onRestore(mergeBackup(notes, preview))) {
                  setPreview(null);
                  setMessage("バックアップを復元しました。");
                } else {
                  setPreview(null);
                  setError(
                    "復元できませんでした。現在の記録は変更していません。ブラウザの空き容量を確認してください。",
                  );
                }
              }}
            >
              内容を確認して復元
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
