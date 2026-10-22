import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;
let client = null;
export let bonusConfigError = "";
if (url && key) {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(parsed.hostname)
    )
      throw new Error("HTTPS required");
    if (key.startsWith("sb_secret_"))
      throw new Error("Secret key is not a browser key");
    // Legacy service-role JWTs must never be included in a browser bundle.
    const payload = key.split(".")[1];
    if (payload) {
      try {
        if (
          JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/")))
            .role === "service_role"
        )
          throw new Error("Service role is not a browser key");
      } catch (error) {
        if (error.message === "Service role is not a browser key") throw error;
      }
    }
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch {
    bonusConfigError =
      "Supabaseの公開URLと公開キーの設定を確認してください。管理者用のキーは使用できません。";
  }
} else if (url || key)
  bonusConfigError = "Supabaseの公開URLと公開キーを両方設定してください。";
export const bonusClient = client;
