import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Sprout, X, Plus } from "lucide-react";

export const stampOptions = [
  { key: "seen", emoji: "👀", label: "見たよ" },
  { key: "hug", emoji: "🤗", label: "ハグ" },
  { key: "tea", emoji: "🍵", label: "お茶どうぞ" },
  { key: "heart", emoji: "💛", label: "いいね" },
  { key: "empathy", emoji: "🥺", label: "わかるよ" },
];
export const extraStampOptions = [
  { key: "thanks", emoji: "🙏", label: "ありがとう" },
  { key: "cheer", emoji: "📣", label: "応援してる" },
  { key: "rest", emoji: "🌙", label: "ゆっくり休んでね" },
  { key: "flower", emoji: "💐", label: "おつかれさま" },
  { key: "clap", emoji: "👏", label: "拍手" },
  { key: "warm", emoji: "☀️", label: "あたたかい気持ち" },
  { key: "celebrate", emoji: "🎉", label: "おめでとう" },
  { key: "listen", emoji: "👂", label: "聞いているよ" },
];

export function StampReactions({ note, onReact, children }) {
  const [expanded, setExpanded] = useState(false);
  const counts = getStamps(note), mine = getMyStamps(note);
  const button = (stamp, picker = false) => (
    <button
      type="button"
      key={stamp.key}
      aria-label={stamp.label}
      title={stamp.label}
      aria-pressed={!!mine[stamp.key]}
      className={`stamp ${mine[stamp.key] ? "selected-stamp" : ""} ${picker ? "picker-stamp" : ""}`}
      onClick={() => onReact(note, stamp.key)}
    >
      <span className="stamp-emoji" aria-hidden="true">{stamp.emoji}</span>
      <span>{counts[stamp.key] || 0}</span>
      <span className="stamp-label">{stamp.label}</span>
    </button>
  );
  return (
    <div className="reactions stamp-reactions" onClick={e => e.stopPropagation()} onKeyDown={e => {
      if (e.key === "Escape" && expanded) {
        e.stopPropagation();
        setExpanded(false);
        e.currentTarget.querySelector('.stamp-more')?.focus();
      }
    }}>
      {stampOptions.map(stamp => button(stamp))}
      {!expanded && extraStampOptions.filter(stamp => counts[stamp.key] > 0 || mine[stamp.key]).map(stamp => button(stamp))}
      <button type="button" className="stamp-more" aria-label={expanded ? "追加スタンプを閉じる" : "もっとスタンプを選ぶ"} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? <X size={19} /> : <Plus size={19} />}
      </button>
      {children}
      {expanded && (
        <div className="extra-stamp-picker" role="group" aria-label="追加スタンプ">
          <p>気持ちに合うスタンプを選んでね。もう一度押すと取り消せます。</p>
          <div>{extraStampOptions.map(stamp => button(stamp, true))}</div>
        </div>
      )}
    </div>
  );
}

export const getStamps = (note) =>
  note.stamps || {
    hug: 0,
    tea: 0,
    heart: note.likes || 0,
    empathy: note.reaction || 0,
  };
export const getMyStamps = (note) =>
  note.myStamps || { heart: !!note.liked, empathy: !!note.reacted };
export const noteTitle = (note) =>
  note.title?.trim() ||
  note.body?.trim().split("\n")[0].slice(0, 32) ||
  "写真のnote";
export function WeekReview({
  week,
  offset,
  onOffset,
  onSelect,
  shortDate,
  Face,
  colors,
}) {
  return (
    <section className="panel mood-panel week-review">
      <div className="small-title">
        <h3>{offset === 0 ? "今週の気持ち" : "この週の気持ち"}</h3>
        <div className="week-controls">
          <button aria-label="前の週" onClick={() => onOffset(offset - 1)}>
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label="次の週"
            disabled={offset >= 0}
            onClick={() => onOffset(offset + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <p className="week-range">
        {shortDate(week[0].key)} — {shortDate(week[6].key)}
      </p>
      <div className="week-moods">
        {week.map(({ key, note, count }, i) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            aria-label={`${shortDate(key)}のnoteを見る`}
          >
            <div className={`week-icon ${note ? colors[note.mood - 1] : ""}`}>
              {note ? <Face level={note.mood} size={25} /> : <span>·</span>}
            </div>
            <small>{"月火水木金土日"[i]}</small>
            {count > 1 && <small>{count}件</small>}
          </button>
        ))}
      </div>
      <p>
        どんな気持ちも、あなたの一部。
        <Sprout size={15} />
      </p>
    </section>
  );
}
export function Comments({ comments, value, onValue, onSubmit }) {
  return (
    <section className="comment-section">
      <h3>みんなからの言葉</h3>
      <p className="muted">お返事はしなくても大丈夫。</p>
      <div className="comment-list">
        {comments.length ? (
          comments.map((c, i) => (
            <div className="comment" key={i}>
              <small>
                {typeof c === "string" ? "広場から" : c.author || "広場から"}
              </small>
              <p>{typeof c === "string" ? c : c.text}</p>
            </div>
          ))
        ) : (
          <p className="muted">まだ言葉は届いていません。</p>
        )}
      </div>
      <form onSubmit={onSubmit}>
        <label htmlFor="comment-input">ひとこと届ける</label>
        <div className="comment-form">
          <input
            id="comment-input"
            placeholder="やさしい言葉を届けよう"
            value={value}
            onChange={(e) => onValue(e.target.value)}
            required
            maxLength={1000}
          />
          <button className="primary" type="submit">
            送る
          </button>
        </div>
        <div className="comment-suggestions">
          <small>言葉に迷ったら</small>
          {[
            "おつかれさま。",
            "話してくれてありがとう。",
            "あたたかくして休んでね。",
          ].map((text) => (
            <button type="button" key={text} onClick={() => onValue(text)}>
              {text}
            </button>
          ))}
        </div>
      </form>
    </section>
  );
}
export function Reflections({ note, value, onValue, onSubmit }) {
  return (
    <section className="reflection-section">
      <h3>あとからの気づき</h3>
      <p className="muted">
        あの日の自分へ。ここに書いたことは広場に出ません。
      </p>
      {(note.reflections || []).map((r, i) => (
        <div className="reflection" key={i}>
          <small>{new Date(r.createdAt).toLocaleString("ja-JP")}</small>
          <p>{r.text}</p>
        </div>
      ))}
      <form onSubmit={onSubmit}>
        <label htmlFor="reflection-input">自分へのひとこと</label>
        <textarea
          id="reflection-input"
          value={value}
          onChange={(e) => onValue(e.target.value)}
          placeholder="今だから気づいたこと、未来の自分に残したいこと。"
          rows={3}
          required
          maxLength={2000}
        />
        <button className="primary" type="submit">
          気づきを残す
        </button>
      </form>
    </section>
  );
}
export function Friends({ friends, onRemove, onAdd, onClose }) {
  const [name, setName] = React.useState("");
  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="つながり一覧"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close"
          aria-label="つながり一覧を閉じる"
          onClick={onClose}
        >
          <X />
        </button>
        <h2>つながり</h2>
        <p className="muted">
          この端末内のお試し一覧です。招待や実際のユーザー同士の接続はまだ行われません。
        </p>
        {friends.map((f) => (
          <div className="friend-row" key={f.id}>
            <img className="avatar" src={f.avatar} alt="" />
            <b>{f.name}</b>
            <button onClick={() => onRemove(f.id)}>一覧から外す</button>
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && onAdd(name.trim())) setName("");
          }}
        >
          <label htmlFor="friend-name">お試しの名前を追加</label>
          <input
            id="friend-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={30}
          />
          <button className="primary" type="submit">
            追加する
          </button>
        </form>
      </section>
    </div>
  );
}
