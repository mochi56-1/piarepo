import React, { useEffect, useRef, useState } from "react";
import {
  buildAccountBackup,
  parseAccountBackup,
  mergeAccountDocuments,
  validateAccountDocument,
} from "./accountRecords.js";
import useDialogFocus from "./useDialogFocus.js";
import LoginBonus, { useBonusAccount } from "./LoginBonus.jsx";
import { bonusClient, bonusConfigError } from "./bonusClient.js";

export const emptyRecords = () => ({
  notes: [],
  planner: { tasks: [], events: [] },
});
export function downloadRecords(document) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(buildAccountBackup(document), null, 2)], {
      type: "application/json",
    }),
  );
  const a = window.document.createElement("a");
  a.href = url;
  a.download = "piarepo-account-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function AccountCloud({ children, loadLegacy }) {
  const account = useBonusAccount();
  useEffect(() => {
    const token = new URLSearchParams(location.search).get("friend");
    if (token && /^[0-9a-f-]{36}$/i.test(token)) {
      try {
        sessionStorage.setItem("piarepo-friend-invite", token);
      } catch {}
      const url = new URL(location.href);
      url.searchParams.delete("friend");
      history.replaceState(null, "", url);
    }
  }, []);
  if (!bonusClient && !bonusConfigError) return children(null);
  if (bonusConfigError)
    return (
      <main className="cloud-gate">
        <h1>接続設定を確認してください</h1>
        <p>{bonusConfigError}</p>
      </main>
    );
  if (account.authLoading)
    return <main className="cloud-gate">ログインを確認中…</main>;
  if (!account.session)
    return (
      <main className="cloud-gate">
        <h1>ぴあれぽ</h1>
        <p>
          自分の記録を開くにはログインしてください。招待リンクから来た方も、ログイン後に友達申請できます。
        </p>
        <LoginBonus />
        <a href="/privacy.html">プライバシーポリシー</a>
      </main>
    );
  return (
    <AccountRecords
      key={account.session.user.id}
      userId={account.session.user.id}
      loadLegacy={loadLegacy}
    >
      {children}
    </AccountRecords>
  );
}
function AccountRecords({ userId, children, loadLegacy }) {
  const [initial, setInitial] = useState(null),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [ready, setReady] = useState(false),
    [generation, setGeneration] = useState(0),
    [skipped, setSkipped] = useState(false);
  const state = useRef({ document: null, revision: 0 }),
    active = useRef(true),
    locked = useRef(false);
  useDialogFocus(
    ready && (busy || dirty) ? "cloud-save" : null,
    "[data-cloud-save]",
  );
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const load = async () => {
    setFailure("");
    setBusy(true);
    try {
      const { data, error } = await bonusClient
        .from("account_records")
        .select("document,revision")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!active.current) return;
      const doc = data?.document || emptyRecords();
      validateAccountDocument(doc);
      state.current = { document: doc, revision: data?.revision || 0 };
      setInitial(doc);
      setReady(true);
      setGeneration((n) => n + 1);
      setDirty(false);
    } catch {
      if (active.current)
        setFailure(
          "記録を読み込めませんでした。通信とSupabaseの追加SQLの設定を確認してください。",
        );
    } finally {
      if (active.current) setBusy(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const protect = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  const save = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setFailure("");
    try {
      const { data, error } = await bonusClient.rpc("save_account_records", {
        payload: state.current.document,
        expected_revision: state.current.revision,
      });
      if (error) throw error;
      if (active.current) {
        state.current.revision = data;
        setDirty(false);
      }
    } catch (e) {
      if (active.current)
        setFailure(
          e.code === "40001"
            ? "別の端末で更新されています。未保存の記録をダウンロードしてから、最新の記録を読み直してください。"
            : "クラウドに保存できませんでした。この画面に未保存の変更が残っています。通信を確認して再試行してください。",
        );
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  };
  const persist = (part, value) => {
    if (locked.current || dirty || !ready) return false;
    try {
      const next = { ...state.current.document, [part]: value };
      validateAccountDocument(next);
      state.current.document = next;
      setDirty(true);
      save();
      return true;
    } catch {
      setFailure("記録の形式を確認できないため保存できませんでした。");
      return false;
    }
  };
  if (!ready)
    return (
      <main className="cloud-gate">
        <h1>記録を読み込み中</h1>
        <p role="alert">{failure}</p>
        {!busy && <button onClick={load}>再試行</button>}
        <LoginBonus />
      </main>
    );
  let legacy;
  try {
    legacy = loadLegacy();
  } catch {
    legacy = emptyRecords();
  }
  const hasLegacy =
    legacy.notes.length ||
    legacy.planner.tasks.length ||
    legacy.planner.events.length;
  const importLegacy = () => {
    if (
      !window.confirm(
        "このブラウザの自分の記録を、現在のアカウントへ取り込みます。他の人の記録が含まれていないことを確認しましたか？",
      )
    )
      return;
    try {
      state.current.document = mergeAccountDocuments(
        state.current.document,
        legacy,
      );
    } catch {
      setFailure(
        "以前の記録を読み取れませんでした。先にnoteのバックアップを保存してください。",
      );
      return;
    }
    setDirty(true);
    setInitial(state.current.document);
    setGeneration((n) => n + 1);
    save();
    setSkipped(true);
  };
  return (
    <>
      <div className="cloud-status" role="status">
        {busy
          ? "クラウドに保存中…"
          : dirty
            ? "未保存の変更があります"
            : "アカウントの記録を使用中"}{" "}
        · コイン以外の記録も本人だけが閲覧できます
        <button disabled={busy || dirty} onClick={load}>
          最新を読み込む
        </button>
        <button
          disabled={busy || dirty}
          onClick={() => downloadRecords(state.current.document)}
        >
          全記録バックアップ
        </button>
        <label className="cloud-restore">
          全記録を取り込む
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy || dirty}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                if (file.size > 40000000)
                  throw Error("40MB以下のファイルを選んでください。");
                const incoming = parseAccountBackup(await file.text());
                if (!active.current || locked.current || dirty) return;
                if (
                  !window.confirm(
                    `note ${incoming.notes.length}件・タスク ${incoming.planner.tasks.length}件・予定 ${incoming.planner.events.length}件をこのアカウントへ取り込みますか？同じIDはクラウド側を優先し、既存の記録は削除しません。`,
                  )
                )
                  return;
                state.current.document = mergeAccountDocuments(
                  state.current.document,
                  incoming,
                );
                setInitial(state.current.document);
                setGeneration((n) => n + 1);
                setDirty(true);
                save();
              } catch (e) {
                if (active.current)
                  setFailure(e.message || "取り込めませんでした。");
              }
            }}
          />
        </label>
      </div>
      {failure && !dirty && (
        <p role="alert" className="image-error">
          {failure}
        </p>
      )}
      {!skipped && hasLegacy > 0 && (
        <aside className="cloud-import">
          <b>このブラウザに以前の記録があります</b>
          <p>
            自分のnote {legacy.notes.length}件・タスク{" "}
            {legacy.planner.tasks.length}件・予定 {legacy.planner.events.length}
            件。取り込みは自動では行いません。同じIDはクラウド側を優先します。元のブラウザデータは残ります。
          </p>
          <button onClick={importLegacy} disabled={busy || dirty}>
            このアカウントに取り込む
          </button>
          <button onClick={() => setSkipped(true)}>今はしない</button>
        </aside>
      )}
      <div inert={busy || dirty ? true : undefined} aria-busy={busy}>
        {children({ initial, persist, key: `${userId}:${generation}` })}
      </div>
      {(busy || dirty) && (
        <div className="cloud-save-shield">
          <section
            data-cloud-save
            role="dialog"
            aria-modal="true"
            aria-label="クラウド保存の状態"
            tabIndex={-1}
          >
            <h2>{busy ? "クラウドに保存中…" : "保存が完了していません"}</h2>
            <p role="alert">{failure}</p>
            {!busy && (
              <>
                <button onClick={save}>保存を再試行</button>
                <button onClick={() => downloadRecords(state.current.document)}>
                  未保存の記録をダウンロード
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "未保存の変更は画面から失われます。必要なら先にダウンロードしてください。最新の記録を読み直しますか？",
                      )
                    )
                      load();
                  }}
                >
                  最新の記録を読み直す
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
