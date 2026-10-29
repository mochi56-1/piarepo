import { createPortal } from "react-dom";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Gift, Coins, Check, LogIn, LogOut, X } from "lucide-react";
import { bonusClient, bonusConfigError } from "./bonusClient.js";
import { readDemoBonus, claimDemoBonus, demoBonusKey } from "./bonus.js";
import useDialogFocus from "./useDialogFocus.js";
const BonusContext = createContext(null);
export const useBonusAccount = () => useContext(BonusContext);
export function BonusProvider({ children }) {
  const [session, setSession] = useState(null),
    [authLoading, setAuthLoading] = useState(!!bonusClient),
    [status, setStatus] = useState(null),
    [loading, setLoading] = useState(false),
    [claiming, setClaiming] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const userRef = useRef(null),
    inFlight = useRef(false),
    requestVersion = useRef(0);
  useEffect(() => {
    if (!bonusClient) return;
    let active = true,
      version = 0;
    const apply = (next) => {
      const nextId = next?.user?.id || null;
      if (userRef.current !== nextId) {
        requestVersion.current++;
        setStatus(null);
        setMessage("");
        setError("");
      }
      userRef.current = nextId;
      setSession(next);
      setAuthLoading(false);
    };
    const {
      data: { subscription },
    } = bonusClient.auth.onAuthStateChange((_event, next) => {
      version++;
      if (active) apply(next);
    });
    bonusClient.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && version === 0) {
          if (error) {
            setAuthLoading(false);
            setError(
              "ログイン状態を確認できませんでした。ページを開き直してください。",
            );
          } else apply(data.session);
        }
      })
      .catch(() => {
        if (active) {
          setAuthLoading(false);
          setError("ログイン状態を確認できませんでした。");
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  const refresh = async () => {
    const request = ++requestVersion.current,
      id = userRef.current;
    setLoading(true);
    setError("");
    try {
      if (bonusConfigError) throw new Error(bonusConfigError);
      if (bonusClient) {
        if (!id) {
          setStatus(null);
          return;
        }
        const { data, error } = await bonusClient.rpc("get_login_bonus");
        if (error) throw error;
        if (request !== requestVersion.current || userRef.current !== id)
          return;
        if (
          !data ||
          !Number.isInteger(data.total) ||
          typeof data.claimed_today !== "boolean"
        )
          throw new Error("Invalid reward status");
        setStatus(data);
      } else setStatus(readDemoBonus(localStorage));
    } catch {
      if (request === requestVersion.current) {
        setStatus(null);
        setError(
          bonusConfigError ||
            (bonusClient
              ? "ボーナスを確認できませんでした。通信とSupabaseの初期設定を確認してください。"
              : "お試しコインを確認できませんでした。ブラウザの保存設定を確認してください。"),
        );
      }
    } finally {
      if (request === requestVersion.current) setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000);
    const focus = () => refresh();
    const storage = (event) => {
      if (event.key === demoBonusKey && !bonusClient) refresh();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("storage", storage);
    return () => {
      requestVersion.current++;
      clearInterval(tick);
      window.removeEventListener("focus", focus);
      window.removeEventListener("storage", storage);
    };
  }, [session?.user?.id]);
  const claim = async () => {
    if (
      inFlight.current ||
      !status ||
      status.claimed_today ||
      authLoading ||
      bonusConfigError
    )
      return;
    const id = userRef.current;
    inFlight.current = true;
    setClaiming(true);
    setError("");
    setMessage("");
    try {
      let next;
      if (bonusClient) {
        if (!id) return;
        const { data, error } = await bonusClient.rpc("claim_login_bonus");
        if (error) throw error;
        if (userRef.current !== id) return;
        next = data;
        if (
          !next ||
          !Number.isInteger(next.total) ||
          typeof next.claimed_today !== "boolean"
        )
          throw new Error("Invalid reward result");
      } else next = claimDemoBonus(localStorage);
      requestVersion.current++;
      setLoading(false);
      setStatus(next);
      setMessage(
        next.awarded
          ? "10コイン受け取りました！来られた日に、またどうぞ。"
          : "今日は受け取り済みです。また明日どうぞ。",
      );
    } catch {
      if (userRef.current === id)
        setError(
          bonusClient
            ? "受け取りを確認できませんでした。再読み込みして残高を確認してください。通信が途切れても二重には付与されません。"
            : "お試しコインを保存できませんでした。ブラウザの保存領域を確認してください。",
        );
    } finally {
      inFlight.current = false;
      setClaiming(false);
    }
  };
  const sendLink = async (email) => {
    setError("");
    setMessage("");
    try {
      const { error } = await bonusClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMessage(
        "メールを送りました。ログインリンクをこのブラウザで開いてください。",
      );
      return true;
    } catch {
      setError(
        "ログインメールを送れませんでした。メールアドレス、通信、Supabaseの認証設定を確認してください。",
      );
      return false;
    }
  };
  const signInWithGoogle = async () => {
    setError("");
    setMessage("");
    try {
      const { error } = await bonusClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      return true;
    } catch {
      setError(
        "Googleログインを開始できませんでした。通信とSupabaseのGoogle認証設定を確認してください。",
      );
      return false;
    }
  };
  const signOut = async () => {
    try {
      const { error } = await bonusClient.auth.signOut({ scope: "local" });
      if (error) throw error;
      userRef.current = null;
      setSession(null);
      setStatus(null);
      setMessage("ログアウトしました。コインはアカウントに保存されています。");
    } catch {
      setError("ログアウトできませんでした。通信を確認してください。");
    }
  };
  return (
    <BonusContext.Provider
      value={{
        session,
        authLoading,
        status,
        loading,
        claiming,
        error,
        message,
        claim,
        refresh,
        sendLink,
        signInWithGoogle,
        signOut,
        configured: !!bonusClient,
        configError: bonusConfigError,
      }}
    >
      {children}
    </BonusContext.Provider>
  );
}
function LoginForm() {
  const bonus = useContext(BonusContext);
  const [email, setEmail] = useState(""),
    [sending, setSending] = useState(false),
    [googleLoading, setGoogleLoading] = useState(false);
  return (
    <form
      className="bonus-login-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (sending || googleLoading) return;
        setSending(true);
        try {
          await bonus.sendLink(email.trim());
        } finally {
          setSending(false);
        }
      }}
    >
      <button
        className="bonus-google"
        type="button"
        disabled={sending || googleLoading || bonus.authLoading}
        onClick={async () => {
          if (sending || googleLoading) return;
          setGoogleLoading(true);
          try {
            await bonus.signInWithGoogle();
          } finally {
            setGoogleLoading(false);
          }
        }}
      >
        <LogIn size={18} aria-hidden="true" />
        {googleLoading ? "Googleへ移動中…" : "Googleでログイン"}
      </button>
      <div className="bonus-login-divider">またはメールでログイン</div>
      <label>
        メールアドレス
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          maxLength={254}
        />
      </label>
      <button
        className="primary"
        disabled={sending || googleLoading || bonus.authLoading}
        type="submit"
      >
        <LogIn size={16} />
        {sending ? "送信中…" : "ログインメールを送る"}
      </button>
      <p>
        初めての場合はアカウントを作成します。note・タスク・予定・コインを自分のアカウントで利用できます。
      </p>
    </form>
  );
}
export default function LoginBonus({ compact = false }) {
  const bonus = useContext(BonusContext);
  const [loginOpen, setLoginOpen] = useState(false);
  useDialogFocus(loginOpen ? "bonus-login" : null);
  useEffect(() => {
    if (bonus.session) setLoginOpen(false);
  }, [bonus.session]);
  const needsLogin = bonus.configured && !bonus.session;
  const disabled =
    bonus.authLoading ||
    bonus.loading ||
    bonus.claiming ||
    !!bonus.configError ||
    !bonus.status ||
    bonus.status.claimed_today;
  const button = (
    <button
      className={`bonus-claim ${bonus.status?.claimed_today ? "claimed" : ""}`}
      disabled={disabled}
      onClick={bonus.claim}
    >
      {bonus.status?.claimed_today ? <Check size={17} /> : <Gift size={17} />}{" "}
      {bonus.claiming
        ? "受け取り中…"
        : bonus.authLoading || bonus.loading
          ? "確認中…"
          : bonus.status?.claimed_today
            ? "今日は受け取り済み"
            : "10コインを受け取る"}
    </button>
  );
  return (
    <section
      className={`login-bonus ${compact ? "compact-bonus" : ""}`}
      aria-label="ログインボーナス"
    >
      <div className="bonus-heading">
        <Gift size={19} />
        <h3>今日のログインボーナス</h3>
        {!bonus.configured && !bonus.configError && (
          <span className="bonus-demo">お試し</span>
        )}
      </div>
      <div className="bonus-main">
        <div className="bonus-balance">
          <Coins size={23} />
          <b>
            {bonus.status ? bonus.status.total.toLocaleString("ja-JP") : "—"}
          </b>
          <span>累計コイン</span>
        </div>
        {needsLogin ? (
          compact ? (
            <button
              className="bonus-claim"
              onClick={() => setLoginOpen(true)}
              disabled={bonus.authLoading}
            >
              <LogIn size={16} />
              ログインして受け取る
            </button>
          ) : null
        ) : (
          button
        )}
      </div>
      {needsLogin && !compact && <LoginForm />}
      {bonus.error && (
        <p className="bonus-error" role="alert">
          {bonus.error}
          <button onClick={bonus.refresh}>再読み込み</button>
        </p>
      )}
      {bonus.message && (
        <p className="bonus-message" role="status">
          {bonus.message}
        </p>
      )}
      {!bonus.configured && !bonus.configError && (
        <p className="bonus-hint">
          このブラウザだけのお試しです。本番のコインには引き継ぎません。
        </p>
      )}
      {!compact && (
        <>
          {bonus.session && (
            <p className="bonus-account">
              {bonus.session.user.email || "ログイン中"}
            </p>
          )}
          {bonus.configured && (
            <p className="bonus-hint">
              note・タスク・予定・コインは、自分のアカウントに保存します。友達になっても記録は自動では公開されません。
            </p>
          )}
          <details className="bonus-rules">
            <summary>受け取りのルール</summary>
            <ul>
              <li>日本時間で1日1回、10コイン。</li>
              <li>noteやリアクションは受け取り条件ではありません。</li>
              <li>
                休んでもコインは減りません。連続ログインのリセットもありません。
              </li>
              <li>コインの交換・着せ替えは今後追加します。</li>
            </ul>
          </details>
          {bonus.session && (
            <button className="bonus-signout" onClick={bonus.signOut}>
              <LogOut size={15} />
              ログアウト
            </button>
          )}
        </>
      )}
      {loginOpen &&
        createPortal(
          <div className="overlay" onClick={() => setLoginOpen(false)}>
            <section
              className="modal bonus-auth-modal"
              role="dialog"
              aria-modal="true"
              aria-label="ぴあれぽのログイン"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Escape") setLoginOpen(false);
              }}
            >
              <button
                className="close"
                aria-label="ログインを閉じる"
                onClick={() => setLoginOpen(false)}
              >
                <X />
              </button>
              <h2>自分の記録を、アカウントに。</h2>
              <p className="muted">iPhoneとPCで同じ累計を使えます。</p>
              <LoginForm />
              {bonus.message && (
                <p className="bonus-message" role="status">
                  {bonus.message}
                </p>
              )}
              {bonus.error && (
                <p className="bonus-error" role="alert">
                  {bonus.error}
                </p>
              )}
            </section>
          </div>,
          document.body,
        )}
    </section>
  );
}
