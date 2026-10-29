import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X } from "lucide-react";
import { bonusClient } from "./bonusClient.js";
function pendingInvite() {
  try {
    return sessionStorage.getItem("piarepo-friend-invite") || "";
  } catch {
    return "";
  }
}
export default function CloudFriends({ onClose }) {
  const [home, setHome] = useState(null),
    [name, setName] = useState(""),
    [qr, setQr] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [token, setToken] = useState(pendingInvite),
    [inviteName, setInviteName] = useState(""),
    [message, setMessage] = useState("");
  const link = home
    ? `${location.origin}/?friend=${home.profile.invite_token}`
    : "";
  const load = async () => {
    const { data, error } = await bonusClient.rpc("friend_home");
    if (error) throw error;
    setHome(data);
    setName(data.profile.display_name);
  };
  const act = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await load();
    } catch {
      setError(
        "操作できませんでした。通信とSupabaseの友達用SQLの設定を確認してください。",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    act(async () => {});
  }, []);
  useEffect(() => {
    let active = true;
    setQr("");
    if (link)
      QRCode.toDataURL(link, {
        width: 280,
        margin: 4,
        errorCorrectionLevel: "M",
      })
        .then((url) => {
          if (active) setQr(url);
        })
        .catch(() => {
          if (active)
            setError(
              "QRコードを作成できませんでした。リンクの共有をご利用ください。",
            );
        });
    return () => {
      active = false;
    };
  }, [link]);
  const preview = async () => {
    setInviteName("");
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        token,
      )
    ) {
      setError("有効な招待リンクを入力してください。");
      return;
    }
    await act(async () => {
      const { data, error } = await bonusClient.rpc("preview_friend_invite", {
        token,
      });
      if (error) throw error;
      if (!data) {
        setError(
          "この招待は使えません。自分のQRコード、または更新前のリンクではないか確認してください。",
        );
        return;
      }
      setInviteName(data);
    });
  };
  const clearInvite = () => {
    setInviteName("");
    setToken("");
    try {
      sessionStorage.removeItem("piarepo-friend-invite");
    } catch {}
  };
  useEffect(() => {
    if (token) preview();
  }, []);
  const respond = (id, accept) =>
    act(async () => {
      const { error } = await bonusClient.rpc("respond_friend", {
        connection_id: id,
        accept,
      });
      if (error) throw error;
    });
  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="modal cloud-friends"
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
        <h2>友達・QRコード</h2>
        <p>
          QRをスマホのカメラで読み取り、申請してください。相手が承認すると友達になります。noteは自動公開されません。
        </p>
        {error && (
          <p role="alert" className="image-error">
            {error}
            <button disabled={busy} onClick={() => act(async () => {})}>
              再読み込み
            </button>
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {home && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  const { error } = await bonusClient.rpc(
                    "update_friend_profile",
                    { new_name: name, rotate: false },
                  );
                  if (error) throw error;
                  setMessage("表示名を保存しました。");
                });
              }}
            >
              <label>
                友達に表示する名前
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  required
                />
              </label>
              <button disabled={busy || !name.trim()}>名前を保存</button>
            </form>
            <h3>自分の招待QR</h3>
            {qr && (
              <img className="friend-qr" src={qr} alt="友達申請用のQRコード" />
            )}
            <p className="friend-invite-url">{link}</p>
            <button
              disabled={busy}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setMessage("招待リンクをコピーしました。");
                } catch {
                  setError(
                    "コピーできませんでした。表示されているリンクを選択してコピーしてください。",
                  );
                }
              }}
            >
              リンクをコピー
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "今までのQRと招待リンクが使えなくなります。更新しますか？",
                  )
                )
                  act(async () => {
                    const { error } = await bonusClient.rpc(
                      "update_friend_profile",
                      { new_name: home.profile.display_name, rotate: true },
                    );
                    if (error) throw error;
                  });
              }}
            >
              招待リンクを更新
            </button>
            <p className="muted">
              リンクを知っているログイン利用者が表示名を確認し、申請できます。知らない人に渡った場合は更新してください。メールアドレスは表示しません。
            </p>
            <h3>招待リンクから申請</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                preview();
              }}
            >
              <label>
                招待リンク
                <input
                  value={
                    token.includes("-") && !token.includes("/")
                      ? `${location.origin}/?friend=${token}`
                      : token
                  }
                  onChange={(e) => {
                    setInviteName("");
                    try {
                      setToken(
                        new URL(e.target.value).searchParams.get("friend") ||
                          e.target.value,
                      );
                    } catch {
                      setToken(e.target.value);
                    }
                  }}
                  placeholder="https://…/?friend=…"
                />
              </label>
              <button disabled={busy || !token}>相手を確認</button>
            </form>
            {inviteName && (
              <div className="friend-confirm">
                <b>{inviteName}</b>
                <p>
                  この人に友達申請しますか？あなたの表示名が相手に伝わります。
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      const { error } = await bonusClient.rpc(
                        "request_friend",
                        { token },
                      );
                      if (error) throw error;
                      clearInvite();
                      setMessage(
                        "申請を送信しました。すでにつながりがある場合は下の一覧を確認してください。",
                      );
                    })
                  }
                >
                  友達申請を送る
                </button>
                <button onClick={clearInvite}>やめる</button>
              </div>
            )}
            <h3>友達・申請一覧</h3>
            {!home.connections.length && <p>まだ友達や申請はありません。</p>}
            {home.connections.map((c) => (
              <div className="friend-row" key={c.id}>
                <b>{c.name}</b>
                <span>
                  {c.status === "accepted"
                    ? "友達"
                    : c.incoming
                      ? "申請が届いています"
                      : "申請中"}
                </span>
                {c.status === "pending" && c.incoming && (
                  <button disabled={busy} onClick={() => respond(c.id, true)}>
                    承認
                  </button>
                )}
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      c.status !== "accepted" ||
                      window.confirm("友達から外しますか？")
                    )
                      respond(c.id, false);
                  }}
                >
                  {c.status === "accepted"
                    ? "友達から外す"
                    : c.incoming
                      ? "見送る"
                      : "申請を取り消す"}
                </button>
              </div>
            ))}
            <button disabled={busy} onClick={() => act(async () => {})}>
              一覧を更新
            </button>
          </>
        )}
      </section>
    </div>
  );
}
