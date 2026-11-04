import FriendPlaza from "./FriendPlaza.jsx";
import NoteWizard from "./NoteWizard.jsx";
import { selectedFeeling } from "./feelings.js";
import AccountCloud from "./AccountCloud.jsx";
import CloudFriends from "./CloudFriends.jsx";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays,
  Plus,
  User,
  Bell,
  MessageCircle,
  Sun,
  Sprout,
  ArrowUpRight,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  BookOpen,
  LockKeyhole,
  Trees,
  Check,
  Home,
  ListTodo,
  Clock3,
  Smile,
  QrCode,
} from "lucide-react";
import "./style.css";
import LoginBonus, { BonusProvider } from "./LoginBonus.jsx";
import Character from "./Character.jsx";
import PlanningViews from "./PlanningViews.jsx";
import { loadPlanner, plannerKey } from "./planner.js";
import "./figma.css";
import "./figma-update.css";
import useDialogFocus from "./useDialogFocus.js";
import BackupTools from "./BackupTools.jsx";
import useSpeechInput from "./useSpeechInput.jsx";
import {
  WeekReview,
  Comments,
  Reflections,
  Friends,
  StampReactions,
  getStamps,
  getMyStamps,
  noteTitle,
} from "./FeedbackComponents.jsx";

const STORAGE_KEY = "moobin-posts";
const avatars = Array.from(
  { length: 5 },
  (_, i) => `/images/avatar-${i + 1}.jpg`,
);
const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = () => dateKey(new Date());
const parseDate = (key) => new Date(`${key}T12:00:00`);
const shortDate = (key) =>
  parseDate(key).toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
const moodLabels = ["モヤモヤ", "しょんぼり", "ふつう", "すっきり", "うれしい"];
const moodColors = ["blue", "purple", "neutral", "mint", "coral"];
const readSetting = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};
const initialPage = () => {
  try {
    const page = sessionStorage.getItem("piarepo-page");
    return [
      "ホーム",
      "タスク",
      "スケジュール",
      "カレンダー",
      "広場",
      "マイページ",
    ].includes(page)
      ? page
      : "ホーム";
  } catch {
    return "ホーム";
  }
};
const oldMoods = { happy: 5, tired: 2, fun: 4, calm: 3 };
function Face({ level, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="11" cy="12" r="1.3" fill="currentColor" />
      <circle cx="21" cy="12" r="1.3" fill="currentColor" />
      <path
        d={
          [
            "M10 23 Q16 15 22 23",
            "M11 22 Q16 18 21 22",
            "M11 21 H21",
            "M10 19 Q16 25 22 19",
            "M9 18 Q16 29 23 18 Z",
          ][level - 1]
        }
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Mood({ level, feeling }) {
  return (
    <span className={`mood ${moodColors[level - 1]}`}>
      <Face level={level} size={19} />
      {typeof feeling === "string" ? feeling : moodLabels[level - 1]}
    </span>
  );
}
const samples = [
  {
    id: 1,
    name: "hana",
    avatar: avatars[1],
    time: "21:14",
    mood: 5,
    title: "放課後カフェよかった",
    body: "授業終わりに友だちと寄り道。\nプリンおいしかったし、たくさん話せて元気出た！",
    image: "/images/coffee.png",
    likes: 12,
    comments: ["そのカフェ気になる ☕", "いい時間だね！", "今度一緒に行こう〜"],
    reaction: 1,
  },
  {
    id: 2,
    name: "sora",
    avatar: avatars[2],
    time: "19:42",
    mood: 2,
    title: "今日はちょっとへとへと",
    body: "課題でバタバタ。でも夜に音楽聴いたら少し落ち着いた。\n明日はゆっくりしたい。",
    image: "/images/city.jpg",
    likes: 8,
    comments: [
      "おつかれさま 🌙",
      "ゆっくり休んでね",
      "音楽っていいよね",
      "明日はいい日になるよ",
    ],
    reaction: 1,
  },
  {
    id: 3,
    name: "yui",
    avatar: avatars[3],
    time: "17:08",
    mood: 4,
    title: "新しいノート買った！",
    body: "色がかわいくてテンション上がる。\n明日から日記つけるのちょっと楽しみ。",
    image: "/images/notebook.svg",
    likes: 15,
    comments: ["かわいい！", "書くのが楽しみだね"],
    reaction: 2,
  },
].map((p) => ({ ...p, date: "2026-10-13", visibility: "public" }));
function loadNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return samples;
    return saved
      .filter((p) => p && typeof p.title === "string")
      .map((p) => ({
        ...p,
        mood:
          Number.isInteger(p.mood) && p.mood >= 1 && p.mood <= 5
            ? p.mood
            : oldMoods[p.mood] || 3,
        date: /^\d{4}-\d{2}-\d{2}$/.test(p.date || "")
          ? p.date
          : typeof p.id === "number" && p.id > 1e12
            ? dateKey(new Date(p.id))
            : "2026-10-13",
        visibility:
          p.visibility || (p.name === "あなた" ? "private" : "public"),
        comments: Array.isArray(p.comments) ? p.comments : [],
        likes: p.likes || 0,
        reaction: p.reaction || 0,
      }));
  } catch {
    return samples;
  }
}
const navigation = [
  [Home, "ホーム"],
  [ListTodo, "タスク"],
  [Clock3, "スケジュール"],
  [Smile, "note"],
  [Trees, "広場"],
  [CalendarDays, "カレンダー"],
  [User, "マイページ"],
];
const mobileNavigation = [
  [ListTodo, "タスク"],
  [Smile, "note"],
  [Home, "ホーム"],
  [Trees, "広場"],
  [CalendarDays, "カレンダー"],
];
function Calendar({
  month,
  selected,
  notes,
  onSelect,
  onMonth,
  compact = false,
}) {
  const year = month.getFullYear(),
    m = month.getMonth();
  const days = new Date(year, m + 1, 0).getDate(),
    offset = (new Date(year, m, 1).getDay() + 6) % 7;
  const dailyMoods = new Map();
  notes.forEach((n) => {
    if (!dailyMoods.has(n.date)) dailyMoods.set(n.date, n.mood);
  });
  return (
    <section className={`panel ${compact ? "mini-calendar" : "full-calendar"}`}>
      <div className="calendar-title">
        <button
          aria-label="前の月"
          onClick={() => onMonth(new Date(year, m - 1, 1))}
        >
          <ChevronLeft size={compact ? 16 : 22} />
        </button>
        <h2>
          <span className="calendar-month-number">{m + 1}</span>
          <span className="calendar-year">{year}</span>
        </h2>
        <button
          aria-label="次の月"
          onClick={() => onMonth(new Date(year, m + 1, 1))}
        >
          <ChevronRight size={compact ? 16 : 22} />
        </button>
      </div>
      <div className="calendar-grid">
        {"月火水木金土日".split("").map((d) => (
          <span key={d}>{d}</span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const key = dateKey(new Date(year, m, i + 1));
          return (
            <button
              key={key}
              aria-label={`${year}年${m + 1}月${i + 1}日`}
              aria-pressed={key === selected}
              className={`${key === selected ? "today" : ""} ${key === today() ? "current-day" : ""} ${dailyMoods.has(key) ? "mood-day " + moodColors[dailyMoods.get(key) - 1] : ""}`}
              onClick={() => onSelect(key)}
            >
              <span className="calendar-day-number">{i + 1}</span>
              <span
                className={`calendar-mood-face ${dailyMoods.has(key) ? moodColors[dailyMoods.get(key) - 1] : "unrecorded"}`}
              >
                {dailyMoods.has(key) ? (
                  <Face level={dailyMoods.get(key)} size={25} />
                ) : (
                  <span>·</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="calendar-foot">
        <span className="tiny-dot" /> noteを残した日{" "}
        <span className="record-days">
          今月{" "}
          <b>
            {
              new Set(
                notes
                  .filter((n) =>
                    n.date.startsWith(
                      `${year}-${String(m + 1).padStart(2, "0")}`,
                    ),
                  )
                  .map((n) => n.date),
              ).size
            }
            日
          </b>{" "}
          気持ちを残せました
        </span>
      </div>
    </section>
  );
}
function App({ cloud = null, guest = false }) {
  const [notes, setNotes] = useState(() =>
      cloud
        ? cloud.initial.notes
        : guest
          ? loadNotes().filter((n) => n.name === "あなた")
          : loadNotes(),
    ),
    [page, setPage] = useState(initialPage);
  const [selected, setSelected] = useState(today),
    [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    );
  const [modal, setModal] = useState(null),
    [notice, setNotice] = useState(false),
    [comment, setComment] = useState("");
  const [level, setLevel] = useState(3),
    [feeling, setFeeling] = useState("まあまあ"),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [noteDate, setNoteDate] = useState(today);
  const [image, setImage] = useState(""),
    [visibility, setVisibility] = useState("private"),
    [error, setError] = useState(""),
    [imageError, setImageError] = useState(""),
    [imageLoading, setImageLoading] = useState(false),
    [success, setSuccess] = useState("");
  const [editorOpen, setEditorOpen] = useState(false),
    [editingId, setEditingId] = useState(null),
    [menuId, setMenuId] = useState(null),
    [reflection, setReflection] = useState(""),
    [weekOffset, setWeekOffset] = useState(0),
    [friendsOpen, setFriendsOpen] = useState(() => {
      try {
        return !!cloud && !!sessionStorage.getItem("piarepo-friend-invite");
      } catch {
        return false;
      }
    });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    readSetting("piarepo-notifications", true),
  );
  const [friends, setFriends] = useState(() => {
    const stored = readSetting("piarepo-friends", null);
    return Array.isArray(stored)
      ? stored
      : ["miu", "hana", "sora", "yui", "rin"].map((name, i) => ({
          id: i + 1,
          name,
          avatar: avatars[i],
        }));
  });
  useDialogFocus(
    editorOpen
      ? "editor"
      : modal
        ? `detail-${modal}`
        : friendsOpen
          ? "friends"
          : null,
  );
  const [friendsRevision, setFriendsRevision] = useState(0);
  const [calendarDayOpen, setCalendarDayOpen] = useState(false);
  const [plazaMode, setPlazaMode] = useState(() =>
      window.matchMedia("(max-width:650px)").matches ? "reader" : "list",
    ),
    [readingIndex, setReadingIndex] = useState(0);
  const [plannerData, setPlannerData] = useState(() => {
    if (cloud) return cloud.initial.planner;
    try {
      return loadPlanner(localStorage);
    } catch {
      return { tasks: [], events: [] };
    }
  });
  const savePlanner = (next) => {
    if (cloud) {
      if (!cloud.persist("planner", next)) return false;
      setPlannerData(next);
      return true;
    }
    try {
      localStorage.setItem(plannerKey, JSON.stringify(next));
      setPlannerData(next);
      return true;
    } catch {
      return false;
    }
  };
  const speech = useSpeechInput(editorOpen, setBody);
  useEffect(() => {
    try {
      sessionStorage.setItem("piarepo-page", page);
    } catch {}
  }, [page]);
  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuId]);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") {
        setEditorOpen(false);
        setModal(null);
        setMenuId(null);
        setFriendsOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const fileInput = useRef(null),
    imageRequest = useRef(0);
  const own = notes
    .filter((n) => n.name === "あなた")
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const dayNotes = own.filter((n) => n.date === selected);
  const publicNotes = notes.filter((n) => n.visibility === "public");
  useEffect(() => {
    if (readingIndex > publicNotes.length) setReadingIndex(publicNotes.length);
  }, [readingIndex, publicNotes.length]);
  const change = (next) => {
    if (cloud) {
      if (!cloud.persist("notes", next)) return false;
      setNotes(next);
      setError("");
      return true;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setNotes(next);
      setError("");
      return true;
    } catch {
      setError(
        "保存できませんでした。ブラウザの空き容量を確認するか、添付画像を小さくして再度お試しください。",
      );
      return false;
    }
  };
  const moveMonth = (next) => {
    setMonth(next);
    const day = Math.min(
      parseDate(selected).getDate(),
      new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
    );
    setSelected(dateKey(new Date(next.getFullYear(), next.getMonth(), day)));
  };
  const go = (target) => {
    setPage(target);
    setEditorOpen(false);
    setNotice(false);
    setMenuId(null);
    setSuccess("");
  };
  const openNote = (date = page === "カレンダー" ? selected : today()) => {
    if (editingId !== null) {
      setEditingId(null);
      setTitle("");
      setBody("");
      setImage("");
      setLevel(3);
      setFeeling("まあまあ");
      setVisibility("private");
    }
    setNoteDate(date);
    setEditorOpen(true);
    setMenuId(null);
    setSuccess("");
    setError("");
  };
  const editNote = (note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setLevel(note.mood);
    setFeeling(selectedFeeling(note.feeling, note.mood));
    setImage(note.image || "");
    setVisibility(
      cloud
        ? note.shareToFriends === true
          ? "public"
          : "private"
        : note.visibility,
    );
    setNoteDate(note.date);
    setMenuId(null);
    setEditorOpen(true);
    setModal(null);
    setError("");
  };
  const closeEditor = () => {
    setEditorOpen(false);
  };
  const toggleVisibility = (note) => {
    if (cloud && !cloud.sharingReady) {
      setError(
        "友達共有の設定が完了していません。今は自分だけの記録として保存できます。",
      );
      return;
    }
    if (
      cloud &&
      note.shareToFriends &&
      !window.confirm(
        "自分だけの記録に戻しますか？公開側のスタンプとコメントは削除され、再公開しても戻りません。",
      )
    )
      return;
    if (
      cloud &&
      !note.shareToFriends &&
      !window.confirm(
        "このnoteの本文・気分・写真を承認済みの友達に公開しますか？編集履歴と自分への振り返りは公開しません。",
      )
    )
      return;
    change(
      notes.map((n) =>
        n.id === note.id
          ? {
              ...n,
              visibility: cloud
                ? n.shareToFriends
                  ? "private"
                  : "public"
                : n.visibility === "public"
                  ? "private"
                  : "public",
              shareToFriends: cloud ? !n.shareToFriends : false,
            }
          : n,
      ),
    );
    setMenuId(null);
  };
  const saveFriends = (next) => {
    try {
      localStorage.setItem("piarepo-friends", JSON.stringify(next));
      setFriends(next);
      return true;
    } catch {
      setError("つながり一覧を保存できませんでした。");
      return false;
    }
  };
  const save = (event) => {
    event.preventDefault();
    if (imageLoading || speech.busy) return;
    if (cloud && !cloud.sharingReady && visibility === "public") {
      setError(
        "共有状態を確認できません。「自分だけ」を選ぶか、再読み込みしてから保存してください。",
      );
      return;
    }
    if (!body.trim() && !image) {
      setError("ひとこと書くか、写真を1枚添えてください。");
      return;
    }
    const now = new Date();
    const previous = notes.find((n) => n.id === editingId);
    const note = {
      ...(previous || {}),
      id: previous?.id || Date.now(),
      name: "あなた",
      avatar: "/images/fig-avatar.png",
      date: noteDate,
      time: now.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      mood: level,
      feeling,
      title: title.trim(),
      body: body.trim(),
      image,
      visibility,
      shareToFriends: !!cloud?.sharingReady && visibility === "public",
      likes: previous?.likes || 0,
      comments: previous?.comments || [],
      reaction: previous?.reaction || 0,
    };
    if (previous)
      note.history = [
        ...(previous.history || []),
        {
          title: previous.title,
          body: previous.body,
          image: previous.image || "",
          date: previous.date,
          mood: previous.mood,
          feeling: previous.feeling,
          editedAt: now.toISOString(),
        },
      ];
    if (
      !change(
        previous
          ? notes.map((n) => (n.id === note.id ? note : n))
          : [note, ...notes],
      )
    )
      return;
    setCalendarDayOpen(true);
    setSelected(noteDate);
    const d = parseDate(noteDate);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setTitle("");
    setBody("");
    setLevel(3);
    setFeeling("まあまあ");
    setImage("");
    setVisibility("private");
    setImageError("");
    setEditingId(null);
    setEditorOpen(false);
    if (page !== "広場" || visibility !== "public") setPage("カレンダー");
    setSuccess(
      previous
        ? "noteを更新しました。元の文章は編集履歴に残っています。"
        : "noteを保存しました。",
    );
  };
  const attach = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type,
      )
    ) {
      setImageError("JPEG・PNG・WebP・GIFの画像を選んでください。");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError("画像は2MB以下のものを選んでください。");
      return;
    }
    const request = ++imageRequest.current;
    const reader = new FileReader();
    setImageLoading(true);
    setImageError("");
    reader.onload = () => {
      const testImage = new Image();
      testImage.onload = () => {
        if (request === imageRequest.current) {
          setImage(reader.result);
          setImageLoading(false);
        }
      };
      testImage.onerror = () => {
        if (request === imageRequest.current) {
          setImageError("この画像は読み込めません。別の画像をお試しください。");
          setImageLoading(false);
        }
      };
      testImage.src = reader.result;
    };
    reader.onerror = () => {
      if (request === imageRequest.current) {
        setImageError("画像を読み込めませんでした。");
        setImageLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };
  const reactTo = (note, key) =>
    change(
      notes.map((n) => {
        if (n.id !== note.id) return n;
        const stamps = getStamps(n),
          mine = getMyStamps(n),
          active = !mine[key];
        const next = {
          ...n,
          stamps: {
            ...stamps,
            [key]: Math.max(0, (stamps[key] || 0) + (active ? 1 : -1)),
          },
          myStamps: { ...mine, [key]: active },
        };
        if (key === "heart") {
          next.likes = next.stamps.heart;
          next.liked = active;
        }
        return next;
      }),
    );
  const openDetail = (note) => {
    setComment("");
    setReflection("");
    setMenuId(null);
    setError("");
    setModal(note.id);
  };
  const detail = notes.find((n) => n.id === modal);
  const card = (note) => (
    <article className="post feedback-card" key={note.id}>
      <button
        className="card-open"
        aria-label={`${noteTitle(note)}のnoteを読む`}
        onClick={() => openDetail(note)}
      />
      <div className="post-top">
        <img className="avatar" src={note.avatar} alt="" />
        <div className="author">
          <b>{note.name}</b>
          <small>
            {shortDate(note.date)} {note.time}
          </small>
        </div>
        <Mood level={note.mood} feeling={note.feeling} />
        {note.name === "あなた" && (
          <div className="note-actions">
            <button
              className="more"
              aria-label={`${noteTitle(note)}の操作メニュー`}
              aria-expanded={menuId === note.id}
              onClick={(e) => {
                e.stopPropagation();
                setMenuId(menuId === note.id ? null : note.id);
              }}
            >
              <MoreHorizontal size={23} />
            </button>
            {menuId === note.id && (
              <div className="note-menu">
                <button onClick={() => editNote(note)}>noteを編集</button>
                <button onClick={() => toggleVisibility(note)}>
                  {cloud
                    ? note.shareToFriends
                      ? "自分だけに戻す"
                      : "友達に見せる"
                    : note.visibility === "public"
                      ? "自分だけに戻す"
                      : "広場にも置く"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className={`post-layout ${!note.image ? "no-image" : ""}`}>
        <div className="post-text">
          {(note.title || !note.body) && <h2>{noteTitle(note)}</h2>}
          <p>{note.body}</p>
          {cloud && note.shareToFriends ? (
            <button className="text-action" onClick={() => go("広場")}>
              広場でスタンプとコメントを見る
            </button>
          ) : !cloud && note.visibility === "public" ? (
            <StampReactions key={note.id} note={note} onReact={reactTo}>
              <button
                aria-label="コメントを見る"
                onClick={() => openDetail(note)}
              >
                <MessageCircle size={20} />
                <span>{note.comments.length}</span>
              </button>
            </StampReactions>
          ) : (
            <span className="private-label">
              <LockKeyhole size={13} />
              自分だけのnote
            </span>
          )}
        </div>
        {note.image && (
          <img
            className="post-image"
            src={note.image}
            alt={`${noteTitle(note)}の添付画像`}
          />
        )}
      </div>
      <time className="card-date" dateTime={note.date}>
        {note.date.replaceAll("-", "/")} {note.time}
      </time>
    </article>
  );
  const startOfWeek = new Date();
  startOfWeek.setHours(12, 0, 0, 0);
  startOfWeek.setDate(
    startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7) + weekOffset * 7,
  );
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    return {
      key,
      note: own.find((n) => n.date === key),
      count: own.filter((n) => n.date === key).length,
    };
  });
  return (
    <div
      className="app"
      data-page={page}
      data-day-open={calendarDayOpen}
      data-editor-open={editorOpen}
      data-reader={plazaMode === "reader"}
    >
      <aside className="sidebar">
        <button className="logo" onClick={() => go("カレンダー")}>
          ぴあれぽ
        </button>
        <p className="tagline">小さな気持ちを、大切に。</p>
        <nav>
          {navigation.map(([Icon, label]) => (
            <button
              key={label}
              className={`nav-item ${(label === "note" ? editorOpen : page === label && !editorOpen) ? "active" : ""}`}
              onClick={() => (label === "note" ? openNote() : go(label))}
            >
              <Icon size={21} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Sprout size={25} />
          <p>
            誰かのためじゃなく、
            <br />
            いまの自分のために。
          </p>
          <span>ひとことから、はじめよう。</span>
        </div>
        <button className="account" onClick={() => go("マイページ")}>
          <img src="/images/fig-avatar.png" alt="" />
          <div>
            <b>あなた</b>
            <small>マイジャーナル</small>
          </div>
          <MoreHorizontal size={20} />
        </button>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            MY LITTLE JOURNAL <span>／</span> {page}
          </div>
          <div className="header-actions">
            <span className="date">
              {new Date().toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </span>
            <button
              className="icon-btn"
              aria-label={
                notificationsEnabled ? "お知らせ" : "お知らせ（通知オフ）"
              }
              onClick={() => setNotice(!notice)}
            >
              <Bell size={21} />
            </button>
            <button
              className="header-profile"
              aria-label="マイページを開く"
              onClick={() => go("マイページ")}
            >
              <img
                className="header-avatar"
                src="/images/fig-avatar.png"
                alt="あなた"
              />
            </button>
          </div>
          {notice && (
            <div className="notifications">
              <b>お知らせ</b>
              <p>
                {notificationsEnabled
                  ? "新しいお知らせはありません。"
                  : "通知の表示はオフです。"}
              </p>
              <p className="muted">
                今は端末内のお試し版です。ほかの人からの通知はまだ届きません。
              </p>
              <button onClick={() => setNotice(false)}>
                確認しました <Check size={14} />
              </button>
            </div>
          )}
        </header>
        <div className="content">
          <section className="heading">
            <div>
              <div className="eyebrow">EVERY DAY, A LITTLE CLOSER</div>
              <h1>
                {
                  {
                    ホーム: "今日のことを、ゆっくりと。",
                    タスク: "タスク",
                    スケジュール: "スケジュール",
                    カレンダー: "日々を、振り返ろう。",
                    note: "わたしに向けて、書こう。",
                    広場: "ふと、誰かの気持ちに出会う。",
                    マイページ: "わたしの、小さな記録。",
                  }[page]
                }
              </h1>
              <p>
                {page === "広場"
                  ? "公園のベンチで隣り合うように。気の向くまま、ひとやすみ。"
                  : "何気ない毎日も、言葉にするとちょっと特別。"}
              </p>
            </div>
            {!editorOpen && (
              <button
                className="primary desktop-post"
                onClick={() => openNote()}
              >
                <Plus size={19} />
                noteを書く
              </button>
            )}
          </section>
          {error && !editorOpen && !detail && (
            <div className="feedback error" role="alert">
              {error}
              <button aria-label="エラーを閉じる" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {success && (
            <div className="feedback success" role="status">
              <Check size={17} />
              {success}
            </div>
          )}
          <div className="columns">
            <div className="main-column">
              <PlanningViews
                page={page}
                go={go}
                data={plannerData}
                onChange={savePlanner}
                onNote={() => openNote(today())}
              />
              <div className="mobile-week">
                <WeekReview
                  week={week}
                  offset={weekOffset}
                  onOffset={setWeekOffset}
                  onSelect={(key) => {
                    setCalendarDayOpen(true);
                    setSelected(key);
                    const d = parseDate(key);
                    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                    go("カレンダー");
                  }}
                  shortDate={shortDate}
                  Face={Face}
                  colors={moodColors}
                />
              </div>
              {page === "カレンダー" && (
                <>
                  <Calendar
                    month={month}
                    selected={selected}
                    notes={own}
                    onSelect={(key) => {
                      setSelected(key);
                      setCalendarDayOpen(true);
                    }}
                    onMonth={moveMonth}
                  />
                  <section className="day-summary">
                    <button
                      className="back-to-month"
                      onClick={() => setCalendarDayOpen(false)}
                    >
                      <ChevronLeft size={18} />
                      カレンダーへ
                    </button>
                    <div className="day-heading">
                      <div>
                        <span className="eyebrow">MY NOTES</span>
                        <h2>
                          {shortDate(selected)}のnote{" "}
                          <small>{dayNotes.length}件</small>
                        </h2>
                      </div>
                      <button
                        className="primary selected-date-write"
                        onClick={() => openNote(selected)}
                      >
                        <Plus size={18} />
                        {shortDate(selected)}のnoteを書く
                      </button>
                    </div>
                    <div className="feed">
                      {dayNotes.length ? (
                        dayNotes.map(card)
                      ) : (
                        <div className="empty">
                          <BookOpen size={28} />
                          <h3>この日は、まだ白紙。</h3>
                          <p>残しておきたいことを、ひとつだけでも。</p>
                          <button
                            className="primary"
                            onClick={() => openNote(selected)}
                          >
                            noteを書く
                          </button>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}
              {editorOpen && (
                <div className="overlay note-sheet" onClick={closeEditor}>
                  <section
                    className="modal composer-sheet"
                    role="dialog"
                    aria-modal="true"
                    aria-label="noteを書く"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="close"
                      aria-label="noteを閉じる"
                      onClick={closeEditor}
                    >
                      <X />
                    </button>
                    <NoteWizard
                      editingId={editingId}
                      wasShared={
                        !!notes.find((n) => n.id === editingId)?.shareToFriends
                      }
                      level={level}
                      feeling={feeling}
                      onFeeling={(f) => {
                        setLevel(f.mood);
                        setFeeling(f.label);
                      }}
                      Face={Face}
                      title={title}
                      setTitle={setTitle}
                      body={body}
                      setBody={setBody}
                      noteDate={noteDate}
                      setNoteDate={setNoteDate}
                      image={image}
                      imageLoading={imageLoading}
                      imageError={imageError}
                      onAttach={attach}
                      fileInput={fileInput}
                      onRemove={() => {
                        imageRequest.current++;
                        setImage("");
                        setImageLoading(false);
                        setImageError("");
                      }}
                      visibility={visibility}
                      setVisibility={setVisibility}
                      cloud={cloud}
                      speech={speech}
                      error={error}
                      onSave={save}
                    />
                  </section>
                </div>
              )}
              {page === "広場" && cloud && (
                <FriendPlaza
                  ready={cloud.sharingReady}
                  revision={`${cloud.revision}:${friendsRevision}`}
                  onFriends={() => setFriendsOpen(true)}
                />
              )}
              {page === "広場" && !cloud && (
                <>
                  <div className="plaza-intro">
                    <Trees size={24} />
                    <div>
                      <h2>みんなのnote</h2>
                      <p>話しかけても、眺めるだけでも。</p>
                    </div>
                    <span className="sample-label">お試しの広場</span>
                  </div>
                  <div className="reading-mode">
                    <button
                      className={plazaMode === "reader" ? "active" : ""}
                      onClick={() => {
                        setPlazaMode("reader");
                        setReadingIndex(0);
                      }}
                    >
                      ひとつずつ
                    </button>
                    <button
                      className={plazaMode === "list" ? "active" : ""}
                      onClick={() => setPlazaMode("list")}
                    >
                      一覧
                    </button>
                  </div>
                  {plazaMode === "reader" && (
                    <>
                      <div
                        className="plaza-reading-progress"
                        aria-label="noteを読む進み具合"
                      >
                        {publicNotes.map((note, i) => (
                          <button
                            key={note.id}
                            aria-label={`${i + 1}件目のnoteを読む`}
                            className={i <= readingIndex ? "current" : ""}
                            onClick={() => setReadingIndex(i)}
                          />
                        ))}
                      </div>
                      <p className="reader-count">
                        {Math.min(readingIndex + 1, publicNotes.length)} /{" "}
                        {publicNotes.length}
                      </p>
                    </>
                  )}
                  <div className="feed">
                    {publicNotes.length ? (
                      (plazaMode === "reader"
                        ? publicNotes.slice(readingIndex, readingIndex + 1)
                        : publicNotes
                      ).map(card)
                    ) : (
                      <div className="empty">
                        <Sprout />
                        <h3>静かな広場で、ひとやすみ。</h3>
                      </div>
                    )}
                  </div>
                  {plazaMode === "reader" && publicNotes.length > 0 && (
                    <div className="reader-controls">
                      <button
                        onClick={() =>
                          setReadingIndex((i) => Math.max(0, i - 1))
                        }
                        disabled={readingIndex === 0}
                      >
                        <ChevronLeft size={18} />
                        前のnote
                      </button>
                      <button
                        onClick={() =>
                          setReadingIndex((i) =>
                            Math.min(publicNotes.length, i + 1),
                          )
                        }
                        disabled={readingIndex >= publicNotes.length}
                      >
                        次のnote
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                  <div className="plaza-end">
                    <p>
                      {plazaMode === "reader" &&
                      readingIndex < publicNotes.length
                        ? "隣にいるような気持ちで、ひとやすみ。"
                        : "広場のnoteをすべて読みました"}
                    </p>
                    <div className="plaza-companions">
                      <Character />
                      <Character />
                    </div>
                    <button
                      className="text-action"
                      onClick={() => go("ホーム")}
                    >
                      ホームに戻る
                    </button>
                  </div>
                </>
              )}
              {page === "マイページ" && (
                <section className="panel profile">
                  <img src="/images/fig-avatar.png" alt="あなた" />
                  <h2>あなた</h2>
                  <p>わたしのペースで、日々をつづる。</p>
                  <LoginBonus />
                  <div className="profile-stats">
                    <div>
                      <b>{own.length}</b>note
                    </div>
                    <button
                      className="friend-stat"
                      onClick={() => setFriendsOpen(true)}
                    >
                      <QrCode size={22} aria-hidden="true" />
                      {cloud || guest ? (
                        "友達・QRコード"
                      ) : (
                        <>
                          <b>{friends.length}</b>つながりを見る
                        </>
                      )}
                    </button>
                    <div>
                      <b>
                        {cloud
                          ? own.filter((n) => n.shareToFriends).length
                          : own.reduce((sum, n) => sum + n.likes, 0)}
                      </b>
                      {cloud ? "友達へ公開" : "いいね"}
                    </div>
                  </div>
                  <button className="primary" onClick={() => openNote()}>
                    今日のnoteを書く
                  </button>
                  <section className="iphone-help">
                    <h3>iPhoneのホーム画面で使う</h3>
                    <ol>
                      <li>
                        このページを<strong>Safari</strong>で開く
                      </li>
                      <li>
                        共有メニューの<strong>「ホーム画面に追加」</strong>
                        を選ぶ
                      </li>
                      <li>「追加」を押して、ぴあれぽのアイコンから起動</li>
                    </ol>
                    <p>
                      音声入力ボタンが使えない場合は、本文をタップしてiPhoneのキーボードにあるマイクを使えます。通信が必要です。Safariや別端末の記録は自動同期されません。今ある記録を消さず、追加先でも表示されるか確認してください。
                    </p>
                  </section>
                  <section className="profile-settings">
                    <label>
                      <input
                        type="checkbox"
                        checked={notificationsEnabled}
                        onChange={(e) => {
                          try {
                            localStorage.setItem(
                              "piarepo-notifications",
                              JSON.stringify(e.target.checked),
                            );
                            setNotificationsEnabled(e.target.checked);
                          } catch {
                            setError("設定を保存できませんでした。");
                          }
                        }}
                      />
                      お知らせを表示する
                    </label>
                    <p>
                      {cloud
                        ? "記録は自分のアカウントに保存されています。「友達に見せる」を選んだnoteだけ、承認済みの友達へ公開します。"
                        : "記録はこのブラウザに保存されています。"}
                    </p>
                  </section>
                  <BackupTools notes={notes} onRestore={change} />
                  <p>
                    <a href="/privacy.html">プライバシーポリシー</a>
                  </p>
                  <h3>
                    わたしの記録 <small>日付の新しい順</small>
                  </h3>
                  {own.length ? (
                    own.map((p) => (
                      <button
                        className="profile-entry"
                        key={p.id}
                        onClick={() => openDetail(p)}
                      >
                        <small>{shortDate(p.date)}</small>
                        {p.title ? (
                          <b>{p.title}</b>
                        ) : !p.body ? (
                          <b>写真のnote</b>
                        ) : null}
                        <p>{p.body}</p>
                      </button>
                    ))
                  ) : (
                    <p className="muted">あなたのnoteは、ここに並びます。</p>
                  )}
                </section>
              )}
            </div>
            <aside className="right-column">
              <WeekReview
                week={week}
                offset={weekOffset}
                onOffset={setWeekOffset}
                onSelect={(key) => {
                  setSelected(key);
                  const d = parseDate(key);
                  setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  go("カレンダー");
                }}
                shortDate={shortDate}
                Face={Face}
                colors={moodColors}
              />
              <section className="daily-prompt">
                <div className="prompt-top">
                  <span>今日のひとこと</span>
                  <Sun size={20} />
                </div>
                <h2>
                  今日は、どんな
                  <br />
                  気持ちだった？
                </h2>
                <p>
                  誰かに見せるためじゃなく、
                  <br />
                  自分の心に、耳をすませて。
                </p>
                <button onClick={() => openNote()}>
                  noteを書く <ArrowUpRight size={16} />
                </button>
                <div className="prompt-flower">
                  <Sprout size={110} strokeWidth={1} />
                </div>
              </section>
              {page !== "カレンダー" && (
                <Calendar
                  compact
                  month={month}
                  selected={selected}
                  notes={own}
                  onMonth={moveMonth}
                  onSelect={(key) => {
                    setCalendarDayOpen(true);
                    setSelected(key);
                    go("カレンダー");
                  }}
                />
              )}
              <div className="aside-footer">
                <span>ぴあれぽ</span>
                <p>
                  © {new Date().getFullYear()} ぴあれぽ{" "}
                  <span>Made for your everyday.</span>
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      {!editorOpen && (
        <button className="mobile-compose primary" onClick={() => openNote()}>
          <Plus />
          note
        </button>
      )}
      <nav className="mobile-nav">
        {mobileNavigation.map(([Icon, label]) => (
          <button
            className={
              (label === "note" ? editorOpen : page === label && !editorOpen)
                ? `active ${label === "ホーム" ? "home-nav" : ""}`
                : label === "ホーム"
                  ? "home-nav"
                  : ""
            }
            key={label}
            onClick={() => (label === "note" ? openNote() : go(label))}
          >
            <Icon size={23} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {friendsOpen && cloud && (
        <CloudFriends
          onClose={() => {
            setFriendsOpen(false);
            setFriendsRevision((n) => n + 1);
          }}
        />
      )}
      {friendsOpen && guest && (
        <div className="overlay" onClick={() => setFriendsOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="友達機能のログイン"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              aria-label="友達画面を閉じる"
              onClick={() => setFriendsOpen(false)}
            >
              <X />
            </button>
            <h2>友達・QRコード</h2>
            <p>
              友達申請やQRコードの表示にはログインが必要です。ゲストの記録は、ログイン後に確認して取り込めます。
            </p>
            <LoginBonus />
          </section>
        </div>
      )}
      {friendsOpen && !cloud && !guest && (
        <Friends
          friends={friends}
          onClose={() => setFriendsOpen(false)}
          onRemove={(id) => saveFriends(friends.filter((f) => f.id !== id))}
          onAdd={(name) =>
            saveFriends([
              ...friends,
              { id: Date.now(), name, avatar: avatars[0] },
            ])
          }
        />
      )}
      {detail && (
        <div className="overlay" onClick={() => setModal(null)}>
          <section
            className="modal detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label="noteの詳細"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="close"
              aria-label="詳細を閉じる"
              onClick={() => setModal(null)}
            >
              <X />
            </button>
            <div className="post-top">
              <img className="avatar" src={detail.avatar} alt="" />
              <div className="author">
                <b>{detail.name}</b>
                <small>
                  {shortDate(detail.date)} {detail.time}
                </small>
              </div>
              <Mood level={detail.mood} feeling={detail.feeling} />
            </div>
            {detail.title && <h2>{detail.title}</h2>}
            <p className="detail-body">{detail.body}</p>
            {cloud && detail.shareToFriends && (
              <button
                className="text-action"
                onClick={() => {
                  setModal(null);
                  go("広場");
                }}
              >
                広場でスタンプとコメントを見る
              </button>
            )}
            {detail.image && (
              <img
                className="detail-image"
                src={detail.image}
                alt="noteの添付画像"
              />
            )}
            {detail.visibility === "private" && (
              <span className="private-label">
                <LockKeyhole size={14} />
                自分だけのnote
              </span>
            )}
            {detail.name === "あなた" && (
              <>
                <div className="detail-actions">
                  <button onClick={() => editNote(detail)}>noteを編集</button>
                  <button onClick={() => toggleVisibility(detail)}>
                    {cloud
                      ? detail.shareToFriends
                        ? "自分だけに戻す"
                        : "友達に見せる"
                      : detail.visibility === "public"
                        ? "自分だけに戻す"
                        : "広場にも置く"}
                  </button>
                </div>
                <Reflections
                  note={detail}
                  value={reflection}
                  onValue={setReflection}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (
                      reflection.trim() &&
                      change(
                        notes.map((n) =>
                          n.id === detail.id
                            ? {
                                ...n,
                                reflections: [
                                  ...(n.reflections || []),
                                  {
                                    text: reflection.trim(),
                                    createdAt: new Date().toISOString(),
                                  },
                                ],
                              }
                            : n,
                        ),
                      )
                    )
                      setReflection("");
                  }}
                />
                {detail.history?.length > 0 && (
                  <details className="edit-history">
                    <summary>編集前の記録（{detail.history.length}件）</summary>
                    {detail.history.map((entry, i) => (
                      <div key={i}>
                        <small>
                          {new Date(entry.editedAt).toLocaleString("ja-JP")}
                        </small>
                        {entry.title && <h4>{entry.title}</h4>}
                        <p>{entry.body}</p>
                        {entry.image && (
                          <img src={entry.image} alt="編集前の添付画像" />
                        )}
                      </div>
                    ))}
                  </details>
                )}
              </>
            )}
            {!cloud && detail.visibility === "public" && (
              <Comments
                comments={detail.comments}
                value={comment}
                onValue={setComment}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (
                    comment.trim() &&
                    change(
                      notes.map((n) =>
                        n.id === detail.id
                          ? {
                              ...n,
                              comments: [
                                ...n.comments,
                                {
                                  text: comment.trim(),
                                  author: "あなた",
                                  createdAt: new Date().toISOString(),
                                },
                              ],
                            }
                          : n,
                      ),
                    )
                  )
                    setComment("");
                }}
              />
            )}{" "}
            {error && (
              <p className="image-error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <BonusProvider>
    <AccountCloud
      loadLegacy={() => ({
        notes: loadNotes()
          .filter((n) => n.name === "あなた")
          .map((n) => ({ ...n, visibility: "private" })),
        planner: loadPlanner(localStorage),
      })}
    >
      {(cloud, guest = false) => (
        <App
          key={cloud?.key || (guest ? "guest" : "local")}
          cloud={cloud}
          guest={guest}
        />
      )}
    </AccountCloud>
  </BonusProvider>,
);
