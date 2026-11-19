import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Cropper from "react-easy-crop";
import { useQueryClient } from "@tanstack/react-query";
import { mediaUrl, supabase } from "../lib/core";
import { toast } from "../components/ui";

/* ---------- Session & droits ---------- */
export function useAdminSession() {
  const [state, setState] = useState<{ loading: boolean; email: string | null; isAdmin: boolean }>({ loading: true, email: null, isAdmin: false });
  const check = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user.email ?? null;
    if (!email) { setState({ loading: false, email: null, isAdmin: false }); return; }
    const { data: ok } = await supabase.rpc("is_admin");
    setState({ loading: false, email, isAdmin: !!ok });
  }, []);
  useEffect(() => {
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { check(); });
    return () => sub.subscription.unsubscribe();
  }, [check]);
  return state;
}

/* ---------- Invalidation après enregistrement ---------- */
export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export async function run<T>(p: PromiseLike<{ data: T; error: any }>, okMsg?: string): Promise<T | null> {
  const { data, error } = await p;
  if (error) { toast(`Erreur : ${error.message}`); console.error(error); return null; }
  if (okMsg) toast(okMsg);
  return data;
}

/* ---------- Dates (Africa/Douala = UTC+1, sans heure d'été) ---------- */
export const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 3600_000);
  return d.toISOString().slice(0, 16);
};
export const fromLocalInput = (v: string) => (v ? new Date(v + ":00+01:00").toISOString() : null);
export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" }) : "—");

export const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "et").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------- Champs ---------- */
export function F({ label, hint, children, full }: { label: string; hint?: ReactNode; children: ReactNode; full?: boolean }) {
  return <label className={`f ${full ? "full" : ""}`}><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <label className="tg"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}
export function Num({ value, onChange, placeholder }: { value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string }) {
  return <input type="number" inputMode="numeric" min={0} step={1} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value === "" ? null : Math.round(Number(e.target.value)))} />;
}

/* ---------- Confirmation ---------- */
export function Confirm({ text, onYes, onNo, yes = "Supprimer" }: { text: string; onYes: () => void; onNo: () => void; yes?: string }) {
  return (
    <div className="ovl" onClick={onNo}><div className="ovl-box" style={{ width: "min(420px,100%)" }} onClick={(e) => e.stopPropagation()}>
      <h2>Confirmer</h2><p className="muted">{text}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
        <button className="ab" onClick={onNo}>Annuler</button><button className="ab danger" onClick={onYes}>{yes}</button>
      </div>
    </div></div>
  );
}

/* ---------- Liste réordonnable (glisser-déposer + flèches) ---------- */
export function useReorder<T>(items: T[], set: (v: T[]) => void) {
  const drag = useRef<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const c = [...items]; const [x] = c.splice(from, 1); c.splice(to, 0, x); set(c);
  };
  const bind = (i: number) => ({
    draggable: true,
    onDragStart: () => { drag.current = i; },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: () => { if (drag.current !== null) move(drag.current, i); drag.current = null; },
  });
  return { bind, move };
}

/* ---------- Formats d'images ---------- */
export const SPECS = {
  product: { folder: "products", ratio: 1, ideal: [1200, 1200], min: [800, 800], sizes: [400, 800, 1200], label: "carré 1:1" },
  category: { folder: "categories", ratio: 1, ideal: [400, 400], min: [300, 300], sizes: [200, 400, 400], label: "carré 1:1 (affiché en rond)" },
  hero: { folder: "sections", ratio: 4 / 5, ideal: [1200, 1500], min: [900, 1125], sizes: [600, 900, 1200], label: "portrait 4:5" },
  promo_desktop: { folder: "promotions", ratio: 16 / 10, ideal: [1600, 1000], min: [1200, 750], sizes: [800, 1200, 1600], label: "paysage 16:10" },
  promo_mobile: { folder: "promotions", ratio: 4 / 5, ideal: [1080, 1350], min: [810, 1013], sizes: [540, 810, 1080], label: "portrait 4:5" },
  section: { folder: "sections", ratio: 1, ideal: [1200, 1200], min: [800, 800], sizes: [400, 800, 1200], label: "carré 1:1" },
  testimonial: { folder: "testimonials", ratio: 1, ideal: [300, 300], min: [200, 200], sizes: [150, 300, 300], label: "carré 1:1" },
} as const;
export type SpecKey = keyof typeof SPECS;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
}
async function toWebp(img: HTMLImageElement, area: { x: number; y: number; width: number; height: number }, w: number, h: number): Promise<Blob> {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, w, h);
  return new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("conversion impossible"))), "image/webp", 0.82));
}

/** Envoie une image recadrée en 3 tailles WebP, renvoie le chemin de base "<dossier>/<uuid>". */
async function uploadVariants(img: HTMLImageElement, area: { x: number; y: number; width: number; height: number }, spec: SpecKey) {
  const s = SPECS[spec];
  const id = crypto.randomUUID();
  const base = `${s.folder}/${id}`;
  const names = ["sm", "md", "lg"] as const;
  for (let i = 0; i < 3; i++) {
    const w = Math.min(s.sizes[i], Math.round(area.width));
    const h = Math.round(w / s.ratio);
    const blob = await toWebp(img, area, w, h);
    const { error } = await supabase.storage.from("media").upload(`${base}_${names[i]}.webp`, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (error) throw error;
  }
  return base;
}

/** Zone d'envoi + recadrage au bon format. */
export function ImageUploader({ spec, onUploaded, compact }: { spec: SpecKey; onUploaded: (path: string) => void; compact?: boolean }) {
  const s = SPECS[spec];
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (f?: File | null) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast("Format accepté : JPG, PNG ou WebP"); return; }
    if (f.size > 15 * 1024 * 1024) { toast("Image trop lourde (15 Mo maximum)"); return; }
    const url = URL.createObjectURL(f);
    const img = await loadImage(url);
    setNat({ w: img.naturalWidth, h: img.naturalHeight });
    setCrop({ x: 0, y: 0 }); setZoom(1); setSrc(url);
  };
  const small = nat && (nat.w < s.min[0] || nat.h < s.min[1]);
  const confirm = async () => {
    if (!src || !area) return;
    setBusy(true);
    try { const img = await loadImage(src); const path = await uploadVariants(img, area, spec); onUploaded(path); toast("Image envoyée"); setSrc(null); }
    catch (e: any) { toast(`Envoi impossible : ${e.message || e}`); }
    finally { setBusy(false); }
  };
  return <>
    <div className="spec">Format recommandé : <b>{s.ideal[0]} × {s.ideal[1]} px</b> ({s.label}), minimum {s.min[0]} × {s.min[1]} px. JPG, PNG ou WebP. Converti automatiquement en WebP optimisé.</div>
    <div className="drop" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }} style={compact ? { padding: 12 } : undefined}>
      <b>Choisir une image</b><span style={{ fontSize: 12 }}>ou la glisser ici</span>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
    {src && <div className="ovl"><div className="ovl-box">
      <h2>Recadrer l'image</h2>
      <p className="muted" style={{ marginTop: -6 }}>Déplacez et zoomez : le cadre correspond exactement à l'affichage sur le site ({s.label}).</p>
      {small && <p className="warn-a">Image trop petite ({nat!.w} × {nat!.h} px) : elle risque d'être floue sur grand écran. Idéal : {s.ideal[0]} × {s.ideal[1]} px.</p>}
      <div className="crop-area"><Cropper image={src} crop={crop} zoom={zoom} aspect={s.ratio} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} /></div>
      <label className="f" style={{ marginTop: 12 }}><span>Zoom</span><input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
        <button className="ab" onClick={() => setSrc(null)} disabled={busy}>Annuler</button>
        <button className="ab pri" onClick={confirm} disabled={busy || !area}>{busy ? "Envoi…" : "Valider et envoyer"}</button>
      </div>
    </div></div>}
  </>;
}

/** Champ image unique : aperçu + remplacer + retirer. */
export function ImageField({ value, onChange, spec, label }: { value: string | null; onChange: (v: string | null) => void; spec: SpecKey; label: string }) {
  const ratio = SPECS[spec].ratio;
  return (
    <div className="f full"><span>{label}</span>
      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 14, alignItems: "start" }}>
        <div style={{ aspectRatio: String(ratio), background: "#000", border: "1px solid #2a251b", borderRadius: spec === "category" ? "50%" : 8, overflow: "hidden" }}>
          {value ? <img src={mediaUrl(value, "md")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <ImageUploader spec={spec} onUploaded={onChange} compact />
          {value && <button type="button" className="ab sm danger" style={{ justifySelf: "start" }} onClick={() => onChange(null)}>Retirer l'image</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Liste de textes éditable ---------- */
export function ListEditor({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const { bind, move } = useReorder(value, onChange);
  return (
    <div className="list-edit">
      {value.map((v, i) => (
        <div className="li" key={i} {...bind(i)}>
          <span className="handle" title="Glisser pour déplacer">⋮⋮</span>
          <input type="text" value={v} onChange={(e) => { const c = [...value]; c[i] = e.target.value; onChange(c); }} placeholder={placeholder} />
          <button type="button" className="ab sm" onClick={() => move(i, i - 1)} aria-label="Monter">↑</button>
          <button type="button" className="ab sm danger" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Supprimer">✕</button>
        </div>
      ))}
      <button type="button" className="ab sm" style={{ justifySelf: "start" }} onClick={() => onChange([...value, ""])}>+ Ajouter une ligne</button>
    </div>
  );
}

/* ---------- Statuts ---------- */
export const ORDER_STATUS: Record<string, { l: string; c: string }> = {
  new: { l: "Nouvelle", c: "gold" }, confirmed: { l: "Confirmée", c: "blue" }, paid: { l: "Acompte payé", c: "violet" },
  in_production: { l: "En fabrication", c: "gold" }, delivered: { l: "Livrée", c: "green" }, cancelled: { l: "Annulée", c: "red" },
};
export function promoStatus(p: { starts_at: string; ends_at: string; is_active: boolean }) {
  const now = Date.now();
  if (!p.is_active) return { l: "Désactivée", c: "grey" };
  if (new Date(p.starts_at).getTime() > now) return { l: "Programmée", c: "blue" };
  if (new Date(p.ends_at).getTime() < now) return { l: "Terminée", c: "grey" };
  return { l: "En cours", c: "green" };
}
