import React, { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  RefreshCw,
  Trees,
  X,
} from "lucide-react";
import { bonusClient } from "./bonusClient.js";
import { StampReactions, noteTitle } from "./FeedbackComponents.jsx";
import Character from "./Character.jsx";
import useDialogFocus from "./useDialogFocus.js";
const noteKey = (n) => `${n.owner}:${n.id}`;
export default function FriendPlaza({ ready, onFriends, revision }) {
  const [items, setItems] = useState([]),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(false),
    [acting, setActing] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(null),
    [comment, setComment] = useState(""),
    [success, setSuccess] = useState("");
  const active = useRef(true),
    version = useRef(0),
    writing = useRef(false),
    pendingComment = useRef(null);
  const detail = items.find((n) => noteKey(n) === selected);
  useDialogFocus(detail ? "friend-note" : null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      version.current++;
    };
  }, []);
  const refresh = async () => {
    if (!ready) return;
    const request = ++version.current;
    setLoading(true);
    setError("");
    try {
      const { data, error } = await bonusClient.rpc("friend_plaza", {
        page_number: page,
      });
      if (error) throw error;
      if (!Array.isArray(data?.items)) throw Error("Invalid feed");
      if (active.current && version.current === request) {
        setItems(
          data.items.map((n) => ({
            ...n,
            ...n.content,
            name: n.own ? "あなた" : n.name,
            avatar: "/images/fig-avatar.png",
            visibility: "public",
            _key: noteKey(n),
          })),
        );
        setMore(!!data.hasMore);
      }
    } catch {
      if (active.current && version.current === request) {
        setItems([]);
        setSelected(null);
        setError(
          "広場を読み込めませんでした。通信を確認して再読み込みしてください。",
        );
      }
    } finally {
      if (active.current && version.current === request) setLoading(false);
    }
  };
  useEffect(() => {
    setSelected(null);
    setComment("");
    setSuccess("");
    refresh();
    const focus = () => {
      if (!writing.current) refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      version.current++;
      window.removeEventListener("focus", focus);
    };
  }, [page, ready, revision]);
  const act = async (fn) => {
    if (writing.current) return;
    writing.current = true;
    setActing(true);
    setError("");
    setSuccess("");
    try {
      await fn();
      if (active.current) await refresh();
    } catch {
      if (active.current)
        setError(
          "操作を確認できませんでした。再試行するか広場を更新してください。友達関係や公開範囲が変わった場合は利用できません。",
        );
    } finally {
      writing.current = false;
      if (active.current) setActing(false);
    }
  };
  const react = (note, key) =>
    act(async () => {
      const { error } = await bonusClient.rpc("set_friend_stamp", {
        note_owner: note.owner,
        target_note: note.id,
        stamp_key: key,
        active: !note.myStamps?.[key],
      });
      if (error) throw error;
    });
  const open = (n) => {
    setSelected(noteKey(n));
    setComment("");
    setSuccess("");
    pendingComment.current = null;
  };
  const send = (e) => {
    e.preventDefault();
    if (!detail || !comment.trim() || writing.current) return;
    const target = noteKey(detail),
      text = comment.trim();
    if (
      !pendingComment.current ||
      pendingComment.current.target !== target ||
      pendingComment.current.text !== text
    )
      pendingComment.current = { target, text, id: crypto.randomUUID() };
    const request = pendingComment.current;
    act(async () => {
      const { error } = await bonusClient.rpc("add_friend_comment", {
        note_owner: detail.owner,
        target_note: detail.id,
        comment_body: text,
        request_id: request.id,
      });
      if (error) throw error;
      if (active.current) {
        setComment("");
        pendingComment.current = null;
        setSuccess("コメントを送りました。");
      }
    });
  };
  const remove = (note, c) => {
    if (!window.confirm("このコメントを削除しますか？")) return;
    act(async () => {
      const { error } = await bonusClient.rpc("delete_friend_comment", {
        comment_id: c.id,
      });
      if (error) throw error;
    });
  };
  const reactions = (note) => (
    <div className="friend-reactions" inert={acting ? true : undefined}>
      <StampReactions note={note} onReact={react}>
        <button
          type="button"
          aria-label="コメントを読む"
          onClick={() => open(note)}
        >
          <MessageCircle size={20} />
          <span>{note.commentCount}</span>
        </button>
      </StampReactions>
    </div>
  );
  const body = (note) => (
    <>
      <div className="post-top">
        <img className="avatar" src={note.avatar} alt="" />
        <div className="author">
          <b>{note.name}</b>
          <small>
            {note.date?.replaceAll("-", "/")} {note.time}
          </small>
        </div>
        <span className="friend-mood">
          {note.feeling ||
            ["モヤモヤ", "しょんぼり", "ふつう", "すっきり", "うれしい"][
              note.mood - 1
            ]}
        </span>
      </div>
      {note.title && <h2>{note.title}</h2>}
      <p className="detail-body">{note.body}</p>
      {note.image && (
        <img
          className="friend-note-image"
          src={note.image}
          alt="noteの添付画像"
        />
      )}
    </>
  );
  return (
    <section className="friend-plaza" aria-label="友達の広場">
      <div className="plaza-intro">
        <Trees size={25} />
        <div>
          <h2>友達のnote</h2>
          <p>承認した友達と、公開を選んだnoteだけ。</p>
        </div>
      </div>
      <div className="friend-plaza-tools">
        <button disabled={loading || acting} onClick={refresh}>
          <RefreshCw size={17} />
          更新
        </button>
        <button onClick={onFriends}>友達・QRコード</button>
      </div>
      {!ready ? (
        <div className="panel">
          <h3>友達共有の設定待ちです</h3>
          <p>
            運営者がSupabaseの追加SQLを実行してから、ページを開き直してください。自分だけの記録は引き続き保存できます。
          </p>
        </div>
      ) : (
        <>
          {loading && <p role="status">広場を読み込み中…</p>}
          {error && (
            <p className="image-error" role="alert">
              {error}
            </p>
          )}
          {!loading && !items.length && !error && (
            <div className="panel plaza-empty">
              <Character bust />
              <h3>まだnoteがありません</h3>
              <p>
                友達になると、その人が「友達に見せる」を選んだnoteが届きます。自分のnoteを共有する場合は編集画面で選んで保存してください。
              </p>
            </div>
          )}
          <div className="feed">
            {items.map((note) => (
              <article className="post friend-note" key={noteKey(note)}>
                {body(note)}
                {note.own && (
                  <p className="friend-scope">承認済みの友達に公開中</p>
                )}
                {reactions(note)}
                <button className="friend-note-open" onClick={() => open(note)}>
                  noteとコメントを開く
                </button>
              </article>
            ))}
          </div>
          <div className="friend-page">
            <button
              disabled={page === 0 || loading || acting}
              onClick={() => setPage((n) => n - 1)}
            >
              <ChevronLeft size={18} />
              前へ
            </button>
            <span>{page + 1}ページ</span>
            <button
              disabled={!more || loading || acting}
              onClick={() => setPage((n) => n + 1)}
            >
              次へ
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      )}
      {detail && (
        <div
          className="overlay"
          onClick={() => {
            if (!acting) setSelected(null);
          }}
        >
          <section
            className="modal detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label="友達のnoteとコメント"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !acting) setSelected(null);
            }}
          >
            <button
              className="close"
              aria-label="友達のnoteを閉じる"
              disabled={acting}
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            {body(detail)}
            {reactions(detail)}
            <section className="comment-section">
              <h3>やさしい言葉を届ける</h3>
              <p className="muted">
                返事はしなくても大丈夫。
                {detail.commentCount > 50 ? "最新50件を表示しています。" : ""}
              </p>
              <div className="comment-list">
                {detail.comments.map((c) => (
                  <div className="comment" key={c.id}>
                    <div className="comment-author">
                      <b>{c.author}</b>
                      <time dateTime={c.createdAt}>
                        {new Date(c.createdAt).toLocaleString("ja-JP", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <p>{c.text}</p>
                    {c.canDelete && (
                      <button
                        className="text-action"
                        disabled={acting}
                        onClick={() => remove(detail, c)}
                      >
                        コメントを削除
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={send}>
                <label htmlFor="friend-comment">ひとこと届ける</label>
                <div className="comment-form">
                  <input
                    id="friend-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="やさしいコメントを送りましょう"
                    required
                    maxLength={1000}
                    disabled={acting}
                  />
                  <button
                    className="primary"
                    disabled={acting || !comment.trim()}
                  >
                    送信
                  </button>
                </div>
              </form>
              {error && (
                <p role="alert" className="image-error">
                  {error}
                </p>
              )}
              {success && <p role="status">{success}</p>}
            </section>
          </section>
        </div>
      )}
    </section>
  );
}
