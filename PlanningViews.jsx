import React, { useEffect, useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  CalendarDays,
  ListTodo,
  X,
  Clock3,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { googleCalendarUrl } from "./googleCalendar.js";
import LoginBonus from "./LoginBonus.jsx";
import Character from "./Character.jsx";
import useDialogFocus from "./useDialogFocus.js";
import { dayKey, timeMinutes, validateEvent, layoutEvents } from "./planner.js";
export default function PlanningViews({ page, go, data, onChange, onNote }) {
  const [clock, setClock] = useState(() => new Date());
  const [view, setView] = useState("list"),
    [date, setDate] = useState(() => {
      try {
        const saved = sessionStorage.getItem("piarepo-schedule-date");
        if (
          saved &&
          /^\d{4}-\d{2}-\d{2}$/.test(saved) &&
          Number.isFinite(new Date(saved + "T12:00:00").getTime())
        )
          return saved;
      } catch {}
      return dayKey(new Date());
    }),
    [modal, setModal] = useState(null),
    [title, setTitle] = useState(""),
    [x, setX] = useState(50),
    [y, setY] = useState(50),
    [start, setStart] = useState("09:00"),
    [end, setEnd] = useState("10:00"),
    [taskId, setTaskId] = useState(null),
    [error, setError] = useState(""),
    [chooser, setChooser] = useState(false);
  useDialogFocus(modal ? "planner-editor" : chooser ? "task-chooser" : null);
  useEffect(() => {
    setModal(null);
    setChooser(false);
    setError("");
  }, [page]);
  useEffect(() => {
    if (page !== "ホーム") return;
    setClock(new Date());
    const interval = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(interval);
  }, [page]);
  useEffect(() => {
    try {
      sessionStorage.setItem("piarepo-schedule-date", date);
    } catch {}
  }, [date]);
  useEffect(() => {
    if (!modal && !chooser) return;
    const close = (e) => {
      if (e.key === "Escape") {
        setModal(null);
        setChooser(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [modal, chooser]);
  const openTask = (task = null) => {
    setTitle(task?.title || "");
    setX(task?.x ?? 25 + (data.tasks.length % 3) * 25);
    setY(task?.y ?? 25 + (Math.floor(data.tasks.length / 3) % 3) * 25);
    setModal({ type: "task", id: task?.id });
    setError("");
  };
  const openEvent = (event = null, task = null) => {
    setTitle(event?.title || task?.title || "");
    setStart(event?.start || "09:00");
    setEnd(event?.end || "10:00");
    setTaskId(event?.taskId || task?.id || null);
    setDate(event?.date || date);
    setModal({ type: "event", id: event?.id });
    setChooser(false);
    setError("");
  };
  const persist = (next) => {
    if (onChange(next)) {
      setError("");
      return true;
    }
    setError("保存できませんでした。ブラウザの空き容量を確認してください。");
    return false;
  };
  const save = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (modal.type === "task") {
      const existing = data.tasks.find((t) => t.id === modal.id);
      const task = {
        ...existing,
        id: existing?.id || Date.now(),
        title: title.trim(),
        x,
        y,
        done: existing?.done || false,
      };
      if (
        persist({
          ...data,
          tasks: existing
            ? data.tasks.map((t) => (t.id === task.id ? task : t))
            : [...data.tasks, task],
        })
      )
        setModal(null);
    } else {
      const event = {
        id: modal.id || Date.now(),
        title: title.trim(),
        date,
        start,
        end,
        taskId,
      };
      if (!validateEvent(event)) {
        setError("終了時刻を開始時刻より後にしてください。");
        return;
      }
      if (
        persist({
          ...data,
          events: modal.id
            ? data.events.map((s) => (s.id === modal.id ? event : s))
            : [...data.events, event],
        })
      ) {
        setModal(null);
        go("スケジュール");
      }
    }
  };
  const dayEvents = data.events
    .filter((e) => e.date === date)
    .sort((a, b) => timeMinutes(a.start) - timeMinutes(b.start));
  const actualDate = dayKey(clock);
  const minutes = clock.getHours() * 60 + clock.getMinutes();
  const todayEvents = data.events
    .filter((e) => e.date === actualDate)
    .sort((a, b) => timeMinutes(a.start) - timeMinutes(b.start));
  const current = todayEvents.find(
      (e) => timeMinutes(e.start) <= minutes && timeMinutes(e.end) > minutes,
    ),
    next = todayEvents.find((e) => timeMinutes(e.start) > minutes);
  const changeDay = (amount) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + amount);
    setDate(dayKey(d));
  };
  const shortDate = (value) =>
    new Date(value + "T12:00:00").toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  const map = (mini = false, choosing = false) => (
    <div
      className={`task-map ${mini ? "pin-picker" : ""}`}
      role={mini ? "button" : undefined}
      tabIndex={mini ? 0 : undefined}
      aria-label={
        mini ? "タップしてピンを追加（矢印キーでも移動）" : "タスクマップ"
      }
      onClick={
        mini
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setX(
                Math.round(
                  Math.max(
                    5,
                    Math.min(95, ((e.clientX - r.left) / r.width) * 100),
                  ),
                ),
              );
              setY(
                Math.round(
                  Math.max(
                    5,
                    Math.min(95, ((e.clientY - r.top) / r.height) * 100),
                  ),
                ),
              );
            }
          : undefined
      }
      onKeyDown={
        mini
          ? (e) => {
              if (
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                setX((v) =>
                  Math.min(
                    95,
                    Math.max(
                      5,
                      v +
                        (e.key === "ArrowLeft"
                          ? -5
                          : e.key === "ArrowRight"
                            ? 5
                            : 0),
                    ),
                  ),
                );
                setY((v) =>
                  Math.min(
                    95,
                    Math.max(
                      5,
                      v +
                        (e.key === "ArrowUp"
                          ? -5
                          : e.key === "ArrowDown"
                            ? 5
                            : 0),
                    ),
                  ),
                );
              }
            }
          : undefined
      }
    >
      <div className="map-axis horizontal" />
      <div className="map-axis vertical" />
      <span className="axis-label top">大切さ 高</span>
      <span className="axis-label bottom">大切さ 低</span>
      <span className="axis-label left">負担 小</span>
      <span className="axis-label right">負担 大</span>
      {mini ? (
        <span
          className="task-pin selected-pin"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <MapPin size={18} />
        </span>
      ) : (
        data.tasks
          .filter((t) => !t.done)
          .map((t) => (
            <button
              key={t.id}
              className="task-pin"
              style={{ left: `${t.x}%`, top: `${t.y}%` }}
              onClick={() => (choosing ? openEvent(null, t) : openTask(t))}
              title={t.title}
            >
              {t.title}
            </button>
          ))
      )}
    </div>
  );
  const firstHour = Math.min(
      9,
      ...dayEvents.map((e) => Math.floor(timeMinutes(e.start) / 60)),
    ),
    lastHour = Math.max(
      17,
      ...dayEvents.map((e) => Math.ceil(timeMinutes(e.end) / 60)),
    );
  const positioned = layoutEvents(dayEvents);
  return (
    <>
      {page === "ホーム" && (
        <section className="home-scene">
          <button
            className="home-profile"
            aria-label="マイページを開く"
            onClick={() => go("マイページ")}
          >
            <img src="/images/avatar-1.jpg" alt="あなた" />
          </button>
          <div className="home-schedule">
            <LoginBonus compact />
            <div className="home-date">
              {shortDate(actualDate)}
              <button
                className="round-add"
                aria-label="予定を追加"
                onClick={() => openEvent({ date: actualDate })}
              >
                <Plus size={26} />
              </button>
            </div>
            <div className="now-card">
              <small>
                {current ? `${current.start}〜${current.end}` : "いまの予定"}
              </small>
              <h2>{current?.title || "ひと息ついて、いこう。"}</h2>
              {current?.taskId &&
                data.tasks.some((t) => t.id === current.taskId) && (
                  <button
                    className="task-done"
                    aria-label="今のタスクを完了"
                    aria-pressed={
                      !!data.tasks.find((t) => t.id === current.taskId)?.done
                    }
                    onClick={() =>
                      persist({
                        ...data,
                        tasks: data.tasks.map((t) =>
                          t.id === current.taskId ? { ...t, done: !t.done } : t,
                        ),
                      })
                    }
                  >
                    <Check size={20} />
                    {data.tasks.find((t) => t.id === current.taskId)?.done
                      ? "完了済み"
                      : "完了にする"}
                  </button>
                )}
            </div>
            <div className="next-card">
              <span>next</span>
              {next ? (
                <>
                  <span>
                    {next.start}〜{next.end}
                  </span>
                  <b>{next.title}</b>
                </>
              ) : (
                <span>このあとの予定はありません</span>
              )}
            </div>
            <button
              className="schedule-link"
              onClick={() => go("スケジュール")}
            >
              スケジュールを確認 <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="home-ground" />
          <div className="home-companion">
            <button
              className="thought-note"
              onClick={() => onNote()}
              aria-label="今の気持ちをnoteに残す"
            >
              <span>いま、どんな気持ち？</span>
              <span className="thought-face">··</span>
            </button>
            <Character />
            <button
              className="primary home-note-button"
              onClick={() => onNote()}
            >
              気持ちを記録する
            </button>
          </div>
        </section>
      )}
      {page === "タスク" && (
        <section className="tasks-view">
          <div className="planner-tabs">
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
            >
              リスト
            </button>
            <button
              className={view === "map" ? "active" : ""}
              onClick={() => setView("map")}
            >
              マップ
            </button>
          </div>
          <div className="paper-panel">
            {view === "list" ? (
              <>
                <h2>自分のペースで、ひとつずつ。</h2>
                <p className="planner-hint">
                  {data.tasks.filter((t) => !t.done).length}件のタスク ·
                  完了しても記録は残ります
                </p>
                {data.tasks.length ? (
                  data.tasks.map((t) => (
                    <div
                      className={`task-list-row ${t.done ? "done" : ""}`}
                      key={t.id}
                    >
                      <input
                        type="checkbox"
                        aria-label={`${t.title}を完了`}
                        checked={t.done}
                        onChange={() =>
                          persist({
                            ...data,
                            tasks: data.tasks.map((n) =>
                              n.id === t.id ? { ...n, done: !n.done } : n,
                            ),
                          })
                        }
                      />
                      <button onClick={() => openTask(t)}>{t.title}</button>
                      <button
                        className="task-to-schedule"
                        aria-label={`${t.title}を予定に入れる`}
                        onClick={() => openEvent(null, t)}
                      >
                        <CalendarDays size={19} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="planner-empty">
                    <ListTodo size={32} />
                    <p>やりたいことを、ひとつ置いてみよう。</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="planner-hint">
                  タスクを押すと、完了・予定への追加・編集ができます。完了したタスクはリストから戻せます。
                </p>
                {map()}
                {!data.tasks.some((t) => !t.done) && (
                  <p className="planner-hint">
                    まだタスクがありません。＋から追加できます。
                  </p>
                )}
              </>
            )}
            <button
              className="planner-add"
              aria-label="タスクを追加"
              onClick={() => openTask()}
            >
              <Plus size={26} />
              <span>タスクを追加</span>
            </button>
          </div>
        </section>
      )}
      {page === "スケジュール" && (
        <section className="schedule-view">
          <div className="schedule-date">
            <button aria-label="前の日" onClick={() => changeDay(-1)}>
              <ChevronLeft />
            </button>
            <label>
              <span>表示する日</span>
              <input
                aria-label="スケジュールの日付"
                type="date"
                value={date}
                required
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
              />
            </label>
            <button aria-label="次の日" onClick={() => changeDay(1)}>
              <ChevronRight />
            </button>
          </div>
          <div className="paper-panel">
            <div
              className="timeline"
              style={{ height: (lastHour - firstHour) * 68 }}
            >
              {Array.from({ length: lastHour - firstHour + 1 }, (_, i) => (
                <div className="hour-line" key={i} style={{ top: i * 68 }}>
                  <span>{firstHour + i}:00</span>
                </div>
              ))}
              {positioned.map((event) => (
                <button
                  key={event.id}
                  className="schedule-event"
                  aria-label={`${event.title} ${event.start}から${event.end}`}
                  style={{
                    top:
                      ((timeMinutes(event.start) - firstHour * 60) / 60) * 68,
                    height: Math.max(
                      36,
                      ((timeMinutes(event.end) - timeMinutes(event.start)) /
                        60) *
                        68 -
                        5,
                    ),
                    left: `calc(62px + (100% - 70px) * ${event.column / event.columns})`,
                    width: `calc((100% - 78px) / ${event.columns})`,
                  }}
                  onClick={() => openEvent(event)}
                >
                  <b>{event.title}</b>
                  <small>
                    {event.start}〜{event.end}
                  </small>
                </button>
              ))}
            </div>
            <div className="schedule-tools">
              <button onClick={() => setChooser(!chooser)}>
                <ListTodo size={17} />
                タスクから追加
              </button>
              <button
                className="planner-add"
                aria-label="スケジュールを追加"
                onClick={() => openEvent()}
              >
                <Plus size={24} />
              </button>
            </div>
            {chooser && (
              <div
                className="overlay planner-drawer"
                onClick={() => setChooser(false)}
              >
                <div
                  className="task-chooser"
                  role="dialog"
                  aria-modal="true"
                  aria-label="タスクから予定に追加"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="close"
                    aria-label="タスク選択を閉じる"
                    onClick={() => setChooser(false)}
                  >
                    <X />
                  </button>
                  <h3>タスクから予定に追加</h3>
                  <p className="planner-hint">
                    マップのタスクを押してください。
                  </p>
                  {data.tasks.some((t) => !t.done) ? (
                    map(false, true)
                  ) : (
                    <p>
                      タスクはまだありません。
                      <button onClick={() => go("タスク")}>タスクを作る</button>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      {error && !modal && (
        <p className="image-error" role="alert">
          {error}
        </p>
      )}
      {modal && (
        <div className="overlay planner-overlay" onClick={() => setModal(null)}>
          <section
            className="modal planner-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal.type === "task" ? "タスク作成" : "スケジュール作成"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              aria-label="作成を閉じる"
              onClick={() => setModal(null)}
            >
              <X />
            </button>
            <h2>
              {modal.type === "task" ? "タスク" : "スケジュール"}
              {modal.id ? "を編集" : "を作成"}
            </h2>
            <form onSubmit={save}>
              <label htmlFor="planner-title">タイトル</label>
              <input
                id="planner-title"
                placeholder={
                  modal.type === "task" ? "新しいタスク" : "予定のタイトル"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                required
              />
              {modal.type === "task" ? (
                <>
                  <p className="planner-hint">
                    タップしてピンを追加。あとから動かせます。
                  </p>
                  {map(true)}
                  <span className="pin-coordinate">
                    負担 {x} / 大切さ {100 - y}
                  </span>
                  {modal.id && (
                    <div className="planner-task-actions">
                      <button type="button" onClick={() => {
                        if (persist({ ...data, tasks: data.tasks.map(t => t.id === modal.id ? { ...t, done: !t.done } : t) })) setModal(null);
                      }}>
                        <Check size={17} />
                        {data.tasks.find(t => t.id === modal.id)?.done ? "未完了に戻す" : "完了にする"}
                      </button>
                      {!data.tasks.find(t => t.id === modal.id)?.done && (
                        <button type="button" onClick={() => openEvent(null, data.tasks.find(t => t.id === modal.id))}>
                          <CalendarDays size={17} />予定に入れる
                        </button>
                      )}
                      <p className="planner-hint">完了しても、すでに作成した予定は残ります。これらの操作では編集中の変更は保存されません。</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label htmlFor="schedule-day">日付</label>
                  <input
                    id="schedule-day"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                  <div className="time-inputs">
                    <label>
                      開始
                      <input
                        aria-label="開始時刻"
                        type="time"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        required
                      />
                    </label>
                    <span>〜</span>
                    <label>
                      終了
                      <input
                        aria-label="終了時刻"
                        type="time"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        required
                      />
                    </label>
                  </div>
                </>
              )}
              {error && (
                <p className="image-error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary submit" type="submit">
                保存
              </button>
            </form>
            {modal.type === "event" && modal.id && (() => {
              const saved = data.events.find(event => event.id === modal.id);
              const url = saved && googleCalendarUrl(saved);
              return url ? (
                <div className="google-calendar-export">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <CalendarDays size={18} />Googleカレンダーに追加
                  </a>
                  <p className="planner-hint">保存済みの予定を日本時間で開きます。変更した場合は先に保存してください。Googleの画面で「保存」すると追加されます。自動同期はせず、繰り返し追加すると重複する場合があります。</p>
                </div>
              ) : null;
            })()}
          </section>
        </div>
      )}
    </>
  );
}
