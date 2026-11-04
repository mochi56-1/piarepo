import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  LockKeyhole,
  Mic,
  Square,
  Trees,
  X,
} from "lucide-react";
import Character from "./Character.jsx";
import { feelings } from "./feelings.js";
export default function NoteWizard({
  editingId,
  wasShared = false,
  level,
  feeling,
  onFeeling,
  Face,
  title,
  setTitle,
  body,
  setBody,
  noteDate,
  setNoteDate,
  image,
  imageLoading,
  imageError,
  onAttach,
  onRemove,
  fileInput,
  visibility,
  setVisibility,
  cloud,
  speech,
  error,
  onSave,
}) {
  const [step, setStep] = useState(1),
    [validation, setValidation] = useState("");
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const next = () => {
    if (speech.busy || imageLoading) return;
    if (step === 2 && !body.trim() && !image) {
      setValidation("ひとこと書くか、写真を1枚添えてください。");
      return;
    }
    if (
      step === 2 &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(noteDate) ||
        !Number.isFinite(Date.parse(noteDate + "T12:00:00Z")) ||
        new Date(noteDate + "T12:00:00Z").toISOString().slice(0, 10) !==
          noteDate ||
        noteDate < "1900-01-01")
    ) {
      setValidation("記録する日を選んでください。");
      return;
    }
    setValidation("");
    setStep(Math.min(3, step + 1));
  };
  return (
    <form
      className="panel note-editor note-wizard"
      onSubmit={(e) => {
        if (step < 3) {
          e.preventDefault();
          next();
        } else onSave(e);
      }}
    >
      <div className="wizard-progress" aria-label={`3ステップ中の${step}番目`}>
        <span>step {step} / 3</span>
        <div>
          {[1, 2, 3].map((i) => (
            <i key={i} className={i <= step ? "active" : ""} />
          ))}
        </div>
      </div>
      <h2 ref={heading} tabIndex={-1}>
        {
          [
            "どんな気持ち？",
            "どんなことがあった？",
            cloud?.sharingReady ? "友達に見せる？" : "このnoteを確認しよう",
          ][step - 1]
        }
      </h2>
      {step === 1 && (
        <div className="wizard-feelings" role="group" aria-label="いまの気持ち">
          {feelings.map((f) => (
            <button
              type="button"
              key={f.label}
              className={`wizard-feeling ${feeling === f.label ? "chosen" : ""}`}
              aria-pressed={feeling === f.label}
              onClick={() => onFeeling(f)}
            >
              <span
                className="feeling-orb"
                style={{ "--feeling-color": f.color }}
              >
                <Face level={f.mood} size={48} />
                {feeling === f.label && (
                  <i>
                    <Check size={13} />
                  </i>
                )}
              </span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      )}
      {step === 2 && (
        <div className="wizard-writing">
          <label htmlFor="body" className="sr-only">
            note本文
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="今の気持ちを書き出してみましょう。ひとことでも、写真だけでも。"
            rows={7}
          />
          <div className="wizard-tools">
            <input
              ref={fileInput}
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onAttach}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={imageLoading}
            >
              <ImagePlus size={21} />
              {imageLoading
                ? "読み込み中…"
                : image
                  ? "写真を変更"
                  : "写真を添付"}
            </button>
            <button
              type="button"
              className={`voice-button ${speech.busy ? "recording" : ""}`}
              disabled={!speech.supported || speech.status === "stopping"}
              aria-pressed={speech.busy}
              onClick={speech.busy ? speech.stop : speech.start}
            >
              {speech.busy ? <Square size={17} /> : <Mic size={20} />}{" "}
              {speech.busy ? "音声入力を停止" : "音声入力"}
            </button>
          </div>
          <p className="wizard-hint">
            写真は1枚・2MBまで。
            {speech.supported
              ? "音声入力は許可後に利用できます。"
              : "音声入力は対応ブラウザかキーボードのマイクから利用できます。"}
          </p>
          <div aria-live="polite">
            {speech.busy && (
              <p role="status">
                {speech.status === "stopping"
                  ? "最後の言葉を確定しています…"
                  : "聞き取り中…"}{" "}
                {speech.interim}
              </p>
            )}
            {speech.error && (
              <p role="alert" className="image-error">
                {speech.error}
              </p>
            )}
          </div>
          <p className="wizard-hint">
            音声はブラウザの認識サービスで処理される場合があります。録音ファイルは保存しません。
          </p>
          {imageError && (
            <p role="alert" className="image-error">
              {imageError}
            </p>
          )}
          {image && (
            <div className="attachment-preview">
              <img src={image} alt="添付画像のプレビュー" />
              <button type="button" aria-label="画像を削除" onClick={onRemove}>
                <X size={18} />
              </button>
            </div>
          )}
          <details className="wizard-options">
            <summary>日付・タイトル・書くヒント</summary>
            <label htmlFor="note-date">記録する日</label>
            <input
              id="note-date"
              type="date"
              min="1900-01-01"
              max="9999-12-31"
              required
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
            />
            <label htmlFor="title">タイトル（任意）</label>
            <input
              id="title"
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p>今日、目に留まったものは？ 自分にかけたい言葉は？</p>
          </details>
        </div>
      )}
      {step === 3 && (
        <div className="wizard-confirm">
          <p className="wizard-date">{noteDate.replaceAll("-", "/")}</p>
          <article className="wizard-preview">
            <div>
              <img src="/images/fig-avatar.png" alt="" />
              <b>あなた</b>
              <span className="wizard-preview-feeling">
                <Face level={level} size={29} />
                {feeling}
              </span>
            </div>
            {title && <h3>{title}</h3>}
            <p>{body}</p>
            {image && (
              <img
                className="wizard-preview-image"
                src={image}
                alt="添付画像"
              />
            )}
          </article>
          <fieldset className="visibility-field">
            <legend>noteの置き場所</legend>
            <label>
              <input
                type="radio"
                name="visibility"
                checked={visibility === "private"}
                onChange={() => setVisibility("private")}
              />
              <LockKeyhole size={19} />
              <span>
                <b>自分だけ</b>
                <small>自分の記録として残す</small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="visibility"
                checked={visibility === "public"}
                disabled={!!cloud && !cloud.sharingReady}
                onChange={() => setVisibility("public")}
              />
              <Trees size={19} />
              <span>
                <b>{cloud ? "友達に見せる" : "広場のお試し表示にも置く"}</b>
                <small>
                  {cloud
                    ? cloud.sharingReady
                      ? "承認済みの友達だけに公開"
                      : "共有の設定が完了していません"
                    : "友達には配信されません"}
                </small>
              </span>
            </label>
          </fieldset>
          <p className="wizard-hint">
            {cloud
              ? "記録と写真は自分のアカウントに保存します。"
              : "記録と写真はこのブラウザに保存します。"}
            {cloud?.sharingReady
              ? visibility === "public"
                ? "本文・気分・写真だけを友達に公開します。編集履歴と自分への振り返りは公開しません。自分だけに戻すと公開側のスタンプ・コメントは削除されます。"
                : wasShared
                  ? "自分だけに戻すと、公開側のスタンプとコメントは削除されます。再公開しても戻りません。"
                  : "このnoteは友達には公開されません。"
              : "自動では友達に公開されません。"}
          </p>
        </div>
      )}
      {(validation || error) && (
        <p className="image-error" role="alert">
          {validation || error}
        </p>
      )}
      <div className="wizard-navigation">
        {step > 1 && (
          <button
            className="wizard-back"
            type="button"
            disabled={speech.busy || imageLoading}
            onClick={() => {
              setValidation("");
              setStep(step - 1);
            }}
          >
            <ArrowLeft size={17} />
            戻る
          </button>
        )}
        {step < 3 ? (
          <button
            key="next-step"
            type="button"
            className="primary wizard-next"
            disabled={speech.busy || imageLoading}
            onClick={next}
          >
            次へ
            <ArrowRight size={18} />
          </button>
        ) : (
          <button
            key="save-note"
            className="primary wizard-next"
            type="submit"
            aria-label="noteを保存"
            disabled={speech.busy || imageLoading}
          >
            <Check size={18} />
            {editingId ? "更新する" : "記録する"}
          </button>
        )}
      </div>
      <div className="wizard-companion" aria-hidden="true">
        <Character bust />
      </div>
    </form>
  );
}
