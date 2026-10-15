import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Plus, User, Bell, Heart, MessageCircle, Smile, Sun, Sprout, ArrowUpRight, X, ChevronLeft, ChevronRight, MoreHorizontal, BookOpen, ImagePlus, LockKeyhole, Trees, Check, Mic, Square } from 'lucide-react';
import './style.css';
import useSpeechInput from './useSpeechInput.jsx';

const STORAGE_KEY = 'moobin-posts';
const avatars = Array.from({ length: 5 }, (_, i) => `/images/avatar-${i + 1}.jpg`);
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = () => dateKey(new Date());
const parseDate = (key) => new Date(`${key}T12:00:00`);
const shortDate = (key) => parseDate(key).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
const moodLabels = ['つらい', 'しょんぼり', 'ふつう', 'いい感じ', 'とてもいい'];
const moodColors = ['blue', 'purple', 'neutral', 'mint', 'coral'];
const oldMoods = { happy: 5, tired: 2, fun: 4, calm: 3 };
function Face({ level, size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.7"/><circle cx="11" cy="12" r="1.3" fill="currentColor"/><circle cx="21" cy="12" r="1.3" fill="currentColor"/><path d={['M10 23 Q16 15 22 23', 'M11 22 Q16 18 21 22', 'M11 21 H21', 'M10 19 Q16 25 22 19', 'M9 18 Q16 29 23 18 Z'][level - 1]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function Mood({ level }) { return <span className={`mood ${moodColors[level - 1]}`}><Face level={level} size={19}/>{moodLabels[level - 1]}</span>; }
const samples = [
  { id: 1, name: 'hana', avatar: avatars[1], time: '21:14', mood: 5, title: '放課後カフェよかった', body: '授業終わりに友だちと寄り道。\nプリンおいしかったし、たくさん話せて元気出た！', image: '/images/coffee.png', likes: 12, comments: ['そのカフェ気になる ☕', 'いい時間だね！', '今度一緒に行こう〜'], reaction: 1 },
  { id: 2, name: 'sora', avatar: avatars[2], time: '19:42', mood: 2, title: '今日はちょっとへとへと', body: '課題でバタバタ。でも夜に音楽聴いたら少し落ち着いた。\n明日はゆっくりしたい。', image: '/images/city.jpg', likes: 8, comments: ['おつかれさま 🌙', 'ゆっくり休んでね', '音楽っていいよね', '明日はいい日になるよ'], reaction: 1 },
  { id: 3, name: 'yui', avatar: avatars[3], time: '17:08', mood: 4, title: '新しいノート買った！', body: '色がかわいくてテンション上がる。\n明日から日記つけるのちょっと楽しみ。', image: '/images/notebook.svg', likes: 15, comments: ['かわいい！', '書くのが楽しみだね'], reaction: 2 },
].map(p => ({ ...p, date: '2026-10-13', visibility: 'public' }));
function loadNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return samples;
    return saved.filter(p => p && typeof p.title === 'string').map(p => ({
      ...p,
      mood: Number.isInteger(p.mood) && p.mood >= 1 && p.mood <= 5 ? p.mood : (oldMoods[p.mood] || 3),
      date: /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') ? p.date : (typeof p.id === 'number' && p.id > 1e12 ? dateKey(new Date(p.id)) : '2026-10-13'),
      visibility: p.visibility || (p.name === 'あなた' ? 'private' : 'public'),
      comments: Array.isArray(p.comments) ? p.comments : [],
      likes: p.likes || 0, reaction: p.reaction || 0,
    }));
  } catch { return samples; }
}
const navigation = [[CalendarDays, 'カレンダー'], [BookOpen, 'note'], [Trees, '広場'], [User, 'マイページ']];
function Calendar({ month, selected, notes, onSelect, onMonth, compact = false }) {
  const year = month.getFullYear(), m = month.getMonth();
  const days = new Date(year, m + 1, 0).getDate(), offset = new Date(year, m, 1).getDay();
  const marked = new Set(notes.map(n => n.date));
  return <section className={`panel ${compact ? 'mini-calendar' : 'full-calendar'}`}>
    <div className="calendar-title"><button aria-label="前の月" onClick={() => onMonth(new Date(year, m - 1, 1))}><ChevronLeft size={compact ? 16 : 22}/></button><h2>{year}年 {m + 1}月</h2><button aria-label="次の月" onClick={() => onMonth(new Date(year, m + 1, 1))}><ChevronRight size={compact ? 16 : 22}/></button></div>
    <div className="calendar-grid">{'日月火水木金土'.split('').map(d => <span key={d}>{d}</span>)}
      {Array.from({ length: offset }, (_, i) => <span key={`blank${i}`}/>)}
      {Array.from({ length: days }, (_, i) => { const key = dateKey(new Date(year, m, i + 1)); return <button key={key} aria-label={`${year}年${m + 1}月${i + 1}日`} aria-pressed={key === selected} className={`${key === selected ? 'today' : ''} ${key === today() ? 'current-day' : ''}`} onClick={() => onSelect(key)}>{i + 1}{marked.has(key) && <i/>}</button>; })}
    </div><div className="calendar-foot"><span className="tiny-dot"/> noteを残した日 <span>今月 <b>{new Set(notes.filter(n => n.date.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`)).map(n => n.date)).size}日</b></span></div>
  </section>;
}
function App() {
  const [notes, setNotes] = useState(loadNotes), [page, setPage] = useState('カレンダー');
  const [selected, setSelected] = useState(today), [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [modal, setModal] = useState(null), [notice, setNotice] = useState(false), [comment, setComment] = useState('');
  const [level, setLevel] = useState(3), [title, setTitle] = useState(''), [body, setBody] = useState(''), [noteDate, setNoteDate] = useState(today);
  const [image, setImage] = useState(''), [visibility, setVisibility] = useState('private'), [error, setError] = useState(''), [imageError, setImageError] = useState(''), [imageLoading, setImageLoading] = useState(false), [success, setSuccess] = useState('');
  const speech = useSpeechInput(page === 'note', setBody);
  const fileInput = useRef(null), imageRequest = useRef(0);
  const own = notes.filter(n => n.name === 'あなた');
  const dayNotes = own.filter(n => n.date === selected);
  const publicNotes = notes.filter(n => n.visibility === 'public');
  const change = (next) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setNotes(next); setError(''); return true; }
    catch { setError('保存できませんでした。ブラウザの空き容量を確認するか、添付画像を小さくして再度お試しください。'); return false; }
  };
  const moveMonth = (next) => {
    setMonth(next);
    const day = Math.min(parseDate(selected).getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate());
    setSelected(dateKey(new Date(next.getFullYear(), next.getMonth(), day)));
  };
  const go = (target) => { setPage(target); setNotice(false); setSuccess(''); };
  const openNote = (date = today()) => { setNoteDate(date); go('note'); };
  const save = (event) => {
    event.preventDefault(); if (!title.trim() || !body.trim() || imageLoading || speech.busy) return;
    const now = new Date();
    const note = { id: Date.now(), name: 'あなた', avatar: avatars[0], date: noteDate, time: now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), mood: level, title: title.trim(), body: body.trim(), image, visibility, likes: 0, comments: [], reaction: 0 };
    if (!change([note, ...notes])) return;
    setSelected(noteDate); const d = parseDate(noteDate); setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setTitle(''); setBody(''); setLevel(3); setImage(''); setVisibility('private'); setImageError(''); setPage('カレンダー'); setSuccess('noteを保存しました。');
  };
  const attach = (event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setImageError('JPEG・PNG・WebP・GIFの画像を選んでください。'); return; }
    if (file.size > 2 * 1024 * 1024) { setImageError('画像は2MB以下のものを選んでください。'); return; }
    const request = ++imageRequest.current; const reader = new FileReader(); setImageLoading(true); setImageError('');
    reader.onload = () => { const testImage = new Image(); testImage.onload = () => { if (request === imageRequest.current) { setImage(reader.result); setImageLoading(false); } }; testImage.onerror = () => { if (request === imageRequest.current) { setImageError('この画像は読み込めません。別の画像をお試しください。'); setImageLoading(false); } }; testImage.src = reader.result; };
    reader.onerror = () => { if (request === imageRequest.current) { setImageError('画像を読み込めませんでした。'); setImageLoading(false); } }; reader.readAsDataURL(file);
  };
  const reactTo = (p, type) => change(notes.map(n => n.id !== p.id ? n : type === 'like' ? { ...n, liked: !n.liked, likes: n.likes + (n.liked ? -1 : 1) } : { ...n, reacted: !n.reacted, reaction: n.reaction + (n.reacted ? -1 : 1) }));
  const openDetail = (p) => { setComment(''); setModal(p.id); };
  const detail = notes.find(n => n.id === modal);
  const card = (p) => <article className="post" key={p.id}>
    <div className="post-top"><img className="avatar" src={p.avatar} alt=""/><div className="author"><b>{p.name}</b><small>{shortDate(p.date)} {p.time}</small></div><Mood level={p.mood}/><button className="more" aria-label={`${p.title}を開く`} onClick={() => openDetail(p)}><MoreHorizontal size={21}/></button></div>
    <div className={`post-layout ${!p.image ? 'no-image' : ''}`}><div className="post-text"><button className="note-title" onClick={() => openDetail(p)}><h2>{p.title}</h2></button><p>{p.body}</p>
      {p.visibility === 'public' ? <div className="reactions"><button aria-label="いいね" aria-pressed={!!p.liked} className={p.liked ? 'liked' : ''} onClick={() => reactTo(p, 'like')}><Heart size={22} fill={p.liked ? 'currentColor' : 'none'}/><span>{p.likes}</span></button><button aria-label="コメントを見る" onClick={() => openDetail(p)}><MessageCircle size={21}/><span>{p.comments.length}</span></button><button aria-label="共感" aria-pressed={!!p.reacted} className={p.reacted ? 'reacted' : ''} onClick={() => reactTo(p, 'reaction')}><Smile size={21}/><span>{p.reaction}</span></button></div> : <span className="private-label"><LockKeyhole size={13}/>自分だけのnote</span>}
    </div>{p.image && <button className="image-button" aria-label={`${p.title}の画像を見る`} onClick={() => openDetail(p)}><img className="post-image" src={p.image} alt={`${p.title}の添付画像`}/></button>}</div>
  </article>;
  const startOfWeek = new Date(); startOfWeek.setHours(12, 0, 0, 0); startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() + 6) % 7);
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(d.getDate() + i); const key = dateKey(d); return { key, note: own.find(n => n.date === key) }; });
  return <div className="app"><aside className="sidebar"><button className="logo" onClick={() => go('カレンダー')}>ぴあれぽ</button><p className="tagline">小さな気持ちを、大切に。</p><nav>{navigation.map(([Icon, label]) => <button key={label} className={`nav-item ${page === label ? 'active' : ''}`} onClick={() => label === 'note' ? openNote() : go(label)}><Icon size={21}/>{label}</button>)}</nav><div className="sidebar-note"><Sprout size={25}/><p>誰かのためじゃなく、<br/>いまの自分のために。</p><span>ひとことから、はじめよう。</span></div><button className="account" onClick={() => go('マイページ')}><img src={avatars[0]} alt=""/><div><b>あなた</b><small>マイジャーナル</small></div><MoreHorizontal size={20}/></button></aside>
    <main><header><div className="breadcrumb">MY LITTLE JOURNAL <span>／</span> {page}</div><div className="header-actions"><span className="date">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span><button className="icon-btn" aria-label="お知らせ" onClick={() => setNotice(!notice)}><Bell size={21}/></button><img className="header-avatar" src={avatars[0]} alt="あなた"/></div>{notice && <div className="notifications"><b>お知らせ</b><p>今日の気持ちを、自分のために残してみませんか？</p><button onClick={() => setNotice(false)}>確認しました <Check size={14}/></button></div>}</header>
      <div className="content"><section className="heading"><div><div className="eyebrow">EVERY DAY, A LITTLE CLOSER</div><h1>{{ 'カレンダー': '日々を、振り返ろう。', 'note': 'わたしに向けて、書こう。', '広場': 'ふと、誰かの気持ちに出会う。', 'マイページ': 'わたしの、小さな記録。' }[page]}</h1><p>{page === '広場' ? '公園のベンチで隣り合うように。気の向くまま、ひとやすみ。' : '何気ない毎日も、言葉にするとちょっと特別。'}</p></div>{page !== 'note' && <button className="primary desktop-post" onClick={() => openNote()}><Plus size={19}/>noteを書く</button>}</section>
        {error && <div className="feedback error" role="alert">{error}<button aria-label="エラーを閉じる" onClick={() => setError('')}><X size={16}/></button></div>}{success && <div className="feedback success" role="status"><Check size={17}/>{success}</div>}
        <div className="columns"><div className="main-column">
          {page === 'カレンダー' && <><Calendar month={month} selected={selected} notes={own} onSelect={setSelected} onMonth={moveMonth}/><section className="day-summary"><div className="day-heading"><div><span className="eyebrow">MY NOTES</span><h2>{shortDate(selected)}のnote <small>{dayNotes.length}件</small></h2></div><button className="text-action" onClick={() => openNote(selected)}><Plus size={16}/>この日に書く</button></div><div className="feed">{dayNotes.length ? dayNotes.map(card) : <div className="empty"><BookOpen size={28}/><h3>この日は、まだ白紙。</h3><p>残しておきたいことを、ひとつだけでも。</p><button className="primary" onClick={() => openNote(selected)}>noteを書く</button></div>}</div></section></>}
          {page === 'note' && <form className="panel note-editor" onSubmit={save}><div className="editor-intro"><BookOpen size={23}/><div><h2>自分のための、note。</h2><p>きれいにまとめなくても大丈夫。そのままの気持ちで。</p></div></div><label htmlFor="note-date">記録する日</label><input id="note-date" type="date" value={noteDate} required min="1900-01-01" max="9999-12-31" onChange={e => setNoteDate(e.target.value)}/><fieldset className="feeling-field"><legend>いまの気分</legend><div className="feeling-scale">{moodLabels.map((text, i) => <button type="button" key={text} aria-label={`気分${i + 1}：${text}`} aria-pressed={level === i + 1} className={`feeling-option ${moodColors[i]} ${level === i + 1 ? 'chosen' : ''}`} onClick={() => setLevel(i + 1)}><Face level={i + 1} size={37}/><span>{i + 1}</span><small>{text}</small></button>)}</div></fieldset><label htmlFor="title">タイトル</label><input id="title" maxLength={60} placeholder="今日の小さなできごとは？" value={title} onChange={e => setTitle(e.target.value)} required/><div className="body-label"><label htmlFor="body">note</label><button type="button" className={`voice-button ${speech.busy ? 'recording' : ''}`} disabled={!speech.supported || speech.status === 'stopping'} aria-pressed={speech.busy} onClick={speech.busy ? speech.stop : speech.start}>{speech.busy ? <Square size={15}/> : <Mic size={17}/>}{{idle:'音声入力',starting:'開始中・停止する',listening:'音声入力を停止',stopping:'文字を確定中…'}[speech.status]}</button></div><textarea id="body" placeholder="思ったこと、感じたこと。自分に向けて、自由につづろう。" value={body} onChange={e => setBody(e.target.value)} rows={7} required/>
            <div className="voice-feedback" aria-live="polite">{speech.busy && <p className="voice-status" role="status">{speech.status === 'stopping' ? '最後の言葉を確定しています…' : '日本語で話してください。確定した言葉を本文に追記します。'}{speech.interim && <span className="voice-interim">聞き取り中：{speech.interim}</span>}</p>}{speech.error && <p className="image-error" role="alert">{speech.error}</p>}</div><p className="voice-help">{speech.supported ? '音声入力にはマイクの許可が必要です。音声はブラウザの認識サービスで処理される場合があります。録音ファイルは保存しません。' : 'この環境では音声入力を利用できません。対応するChromeやSafariなどでHTTPSのページを開くか、キーボードで入力してください。'}</p>
            <div className="attachment"><input ref={fileInput} id="note-image" aria-label="画像を添付" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={attach} hidden/><button type="button" className="attach-button" onClick={() => fileInput.current.click()} disabled={imageLoading}><ImagePlus size={19}/>{imageLoading ? '読み込み中…' : image ? '画像を変更' : '画像を添付'}</button><span>1枚・2MBまで</span></div>{imageError && <p className="image-error" role="alert">{imageError}</p>}{image && <div className="attachment-preview"><img src={image} alt="添付画像のプレビュー"/><button type="button" aria-label="画像を削除" onClick={() => { imageRequest.current++; setImage(''); setImageLoading(false); setImageError(''); }}><X size={18}/></button></div>}
            <fieldset className="visibility-field"><legend>このnoteの置き場所</legend><label><input type="radio" name="visibility" value="private" checked={visibility === 'private'} onChange={() => setVisibility('private')}/><LockKeyhole size={17}/><span><b>自分だけ</b><small>自分のカレンダーに、そっと残す。</small></span></label><label><input type="radio" name="visibility" value="public" checked={visibility === 'public'} onChange={() => setVisibility('public')}/><Trees size={17}/><span><b>広場にも置く</b><small>誰かの気持ちに、そっと寄り添う。</small></span></label></fieldset><p className="muted">今はこのブラウザ内だけに保存されます。広場への反映も、この端末内のお試し表示です。</p><button className="primary submit" disabled={imageLoading || speech.busy} type="submit"><Check size={18}/>noteを保存</button></form>}
          {page === '広場' && <><div className="plaza-intro"><Trees size={24}/><div><h2>みんなのnote</h2><p>話しかけても、眺めるだけでも。</p></div><span className="sample-label">お試しの広場</span></div><div className="feed">{publicNotes.length ? publicNotes.map(card) : <div className="empty"><Sprout/><h3>静かな広場で、ひとやすみ。</h3></div>}</div><p className="feed-end">小さな日々が、ここにつながる。<Sprout size={15}/></p></>}
          {page === 'マイページ' && <section className="panel profile"><img src={avatars[0]} alt="あなた"/><h2>あなた</h2><p>わたしのペースで、日々をつづる。</p><div className="profile-stats"><div><b>{own.length}</b>note</div><div><b>5</b>友だち</div><div><b>{own.reduce((sum, n) => sum + n.likes, 0)}</b>いいね</div></div><button className="primary" onClick={() => openNote()}>今日のnoteを書く</button><h3>わたしの記録</h3>{own.length ? own.map(p => <button className="profile-entry" key={p.id} onClick={() => openDetail(p)}><small>{shortDate(p.date)}</small><b>{p.title}</b><p>{p.body}</p></button>) : <p className="muted">あなたのnoteは、ここに並びます。</p>}</section>}
        </div><aside className="right-column"><section className="daily-prompt"><div className="prompt-top"><span>今日のひとこと</span><Sun size={20}/></div><h2>今日は、どんな<br/>気持ちだった？</h2><p>誰かに見せるためじゃなく、<br/>自分の心に、耳をすませて。</p><button onClick={() => openNote()}>noteを書く <ArrowUpRight size={16}/></button><div className="prompt-flower"><Sprout size={110} strokeWidth={1}/></div></section>{page !== 'カレンダー' && <Calendar compact month={month} selected={selected} notes={own} onMonth={moveMonth} onSelect={key => { setSelected(key); go('カレンダー'); }}/>}<section className="panel mood-panel"><div className="small-title"><h3>今週の気持ち</h3><span>{shortDate(week[0].key)} — {shortDate(week[6].key)}</span></div><div className="week-moods">{week.map(({ key, note }, i) => <button key={key} onClick={() => { setSelected(key); const d = parseDate(key); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); go('カレンダー'); }} aria-label={`${shortDate(key)}のnoteを見る`}><div className={`week-icon ${note ? moodColors[note.mood - 1] : ''}`}>{note ? <Face level={note.mood} size={20}/> : <span>·</span>}</div><small>{'月火水木金土日'[i]}</small></button>)}</div><p>どんな気持ちも、あなたの一部。<span>🌱</span></p></section><div className="aside-footer"><span>ぴあれぽ</span><p>© {new Date().getFullYear()} ぴあれぽ <span>Made for your everyday.</span></p></div></aside></div>
      </div></main>{page !== 'note' && <button className="mobile-compose primary" onClick={() => openNote()}><Plus/>note</button>}<nav className="mobile-nav">{navigation.map(([Icon, label]) => <button className={page === label ? 'active' : ''} key={label} onClick={() => label === 'note' ? openNote() : go(label)}><Icon size={23}/><span>{label}</span></button>)}</nav>
    {detail && <div className="overlay" onClick={() => setModal(null)}><section className="modal" role="dialog" aria-modal="true" aria-label="noteの詳細" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setModal(null); }}><button autoFocus className="close" aria-label="詳細を閉じる" onClick={() => setModal(null)}><X/></button><div className="post-top"><img className="avatar" src={detail.avatar} alt=""/><div className="author"><b>{detail.name}</b><small>{shortDate(detail.date)} {detail.time}</small></div><Mood level={detail.mood}/></div><h2>{detail.title}</h2><p className="detail-body">{detail.body}</p>{detail.image && <img className="detail-image" src={detail.image} alt="noteの添付画像"/>}{detail.visibility === 'private' ? <span className="private-label"><LockKeyhole size={14}/>自分だけのnote</span> : <><h3>コメント</h3>{detail.comments.length ? detail.comments.map((c, i) => <p className="comment" key={i}>{c}</p>) : <p className="muted">まだコメントはありません。</p>}<form className="comment-form" onSubmit={e => { e.preventDefault(); if (comment.trim() && change(notes.map(n => n.id === detail.id ? { ...n, comments: [...n.comments, comment.trim()] } : n))) setComment(''); }}><input aria-label="コメント" placeholder="やさしい言葉を届けよう" value={comment} onChange={e => setComment(e.target.value)} required/><button className="primary" aria-label="コメントを送る"><ArrowUpRight size={18}/></button></form></>}</section></div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
