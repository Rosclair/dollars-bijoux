import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL || "https://zkrhgrkievtgdhedritc.supabase.co";
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_FKfFl_sTpEI8-5hqBbiVLQ_kNYOWtJt";

export const SUPABASE_URL = URL;
export const supabase = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });

/** Chemin "/..." = fichier du dossier public ; sinon bucket "media" (variantes _sm/_md/_lg en .webp). */
export function mediaUrl(path?: string | null, size?: "sm" | "md" | "lg"): string {
  if (!path) return "/images/etoile.jpg";
  if (path.startsWith("/") || path.startsWith("http")) return path;
  const base = `${URL}/storage/v1/object/public/media/${path}`;
  return size ? `${base}_${size}.webp` : `${base}_lg.webp`;
}
export function mediaSrcSet(path?: string | null): string | undefined {
  if (!path || path.startsWith("/") || path.startsWith("http")) return undefined;
  return (["sm", "md", "lg"] as const).map((s, i) => `${mediaUrl(path, s)} ${[400, 800, 1200][i]}w`).join(", ");
}

export const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ") + " FCFA";
export const fmtS = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ") + " F";

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Africa/Douala" });
}

export const waLink = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

export function orderRef(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `DB-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${r}`;
}
