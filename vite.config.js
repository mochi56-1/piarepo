import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_SUPABASE_");
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    "";
  let secret = key.startsWith("sb_secret_");
  try {
    const part = key.split(".")[1];
    if (
      part &&
      JSON.parse(Buffer.from(part, "base64url").toString()).role ===
        "service_role"
    )
      secret = true;
  } catch {}
  if (secret)
    throw new Error(
      "Supabase管理者キーはブラウザに公開できません。公開用のpublishable keyを設定してください。",
    );
  return {};
});
