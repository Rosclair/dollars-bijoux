import { useEffect, useState, type ReactNode } from "react";
import { create } from "zustand";
import { Link } from "react-router-dom";
import { fmt, fmtS, mediaSrcSet, mediaUrl } from "../lib/core";
import type { Option, Product } from "../data/types";
import { useCart } from "../store/cart";

/* ---------- Icônes ---------- */
export const Icon = {
  bag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  check: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 10l4 4 8-8" /></svg>,
  pen: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z" /></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  wa: <svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6Zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.7 14.7 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.4Z" /></svg>,
  shield: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>,
  factory: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 21V9l6 4V9l6 4V5h6v16H3Z" /></svg>,
  truck: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></svg>,
  phone: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2" /><path d="M10 18h4" /></svg>,
};
export const TrustIcon = ({ name }: { name: string }) => (Icon as any)[name] ?? Icon.shield;

/* ---------- Logo ---------- */
export function Logo({ big }: { big?: boolean }) {
  return (
    <span className="logo">
      <svg width={big ? 40 : 34} height={big ? 40 : 34} viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8f6c2c" /><stop offset=".45" stopColor="#f3dc9c" /><stop offset="1" stopColor="#a7813a" /></linearGradient></defs><path d="M8 14 L14 6 H26 L32 14 L20 34 Z" fill="none" stroke="url(#lg)" strokeWidth="1.8" /><path d="M8 14 H32 M14 6 L18 14 L20 34 L22 14 L26 6 M18 14 H22" fill="none" stroke="url(#lg)" strokeWidth="1.2" /></svg>
      <span className="logo-txt" style={big ? { fontSize: 26 } : undefined}>DOLLARS<br />BIJOUX<small>The beginning of progress</small></span>
    </span>
  );
}

/* ---------- Image ---------- */
export function Img({ path, alt, sizes, className, eager }: { path?: string | null; alt: string; sizes?: string; className?: string; eager?: boolean }) {
  return <img src={mediaUrl(path, "lg")} srcSet={mediaSrcSet(path)} sizes={sizes} alt={alt} className={className} loading={eager ? "eager" : "lazy"} decoding="async" {...(eager ? { fetchPriority: "high" as const } : {})} />;
}

/* ---------- Compte à rebours ---------- */
export function useCountdown(end?: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!end) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [end]);
  const s = end ? Math.max(0, Math.floor((new Date(end).getTime() - now) / 1000)) : 0;
  return { s, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), sec: s % 60 };
}
const pad = (n: number) => String(n).padStart(2, "0");
export function Countdown({ end }: { end: string }) {
  const c = useCountdown(end);
  return (
    <div className="countdown" aria-label="Temps restant">
      <div><b>{pad(c.d)}</b><span>jours</span></div>
      <div><b>{pad(c.h)}</b><span>heures</span></div>
      <div><b>{pad(c.m)}</b><span>min</span></div>
      <div><b>{pad(c.sec)}</b><span>sec</span></div>
    </div>
  );
}
export function CountdownText({ end }: { end: string }) {
  const c = useCountdown(end);
  return <>{c.s ? `Fin dans ${c.d} j ${pad(c.h)} h ${pad(c.m)} min` : "Promo terminée"}</>;
}

/* ---------- Prix ---------- */
export function PriceLine({ option }: { option: Option }) {
  if (option.isQuote) return <div className="price-line"><span className="now gold">Sur devis</span></div>;
  return (
    <div className="price-line">
      <span className="now gold tab-num">{fmt(option.effectivePrice)}</span>
      {option.comparePrice ? <span className="old tab-num">{fmt(option.comparePrice)}</span> : null}
    </div>
  );
}

/* ---------- Segmented ---------- */
export function Segmented<T extends string | number>({ items, value, onChange, label }: { items: { value: T; label: string; swatch?: "gold" | "silver" | null }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map((it) => (
        <button key={String(it.value)} type="button" aria-pressed={it.value === value} onClick={() => onChange(it.value)}>
          {it.swatch ? <i className={`swatch ${it.swatch === "gold" ? "sw-or" : "sw-arg"}`} /> : null}{it.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Toast ---------- */
const useToastStore = create<{ msg: string | null; show: (m: string) => void }>((set) => {
  let t: any;
  return { msg: null, show: (m) => { clearTimeout(t); set({ msg: m }); t = setTimeout(() => set({ msg: null }), 2400); } };
});
export const toast = (m: string) => useToastStore.getState().show(m);
export function Toast() {
  const msg = useToastStore((s) => s.msg);
  return <div className={`toast ${msg ? "on" : ""}`} role="status">{msg ? <>{Icon.check}{msg}</> : null}</div>;
}

/* ---------- Titre, description, partage ---------- */
const SITE = (import.meta.env.VITE_SITE_URL as string) || "";
export function Seo({ title, description, image, jsonLd }: { title: string; description?: string; image?: string | null; jsonLd?: object }) {
  const full = title === "Dollars Bijoux" ? "Dollars Bijoux — Bijoux personnalisés au Cameroun" : `${title} — Dollars Bijoux`;
  const img = image ? (image.startsWith("http") ? image : SITE + mediaUrl(image, "lg")) : `${SITE}/og.jpg`;
  return <>
    <title>{full}</title>
    {description ? <meta name="description" content={description} /> : null}
    <meta property="og:title" content={full} />
    {description ? <meta property="og:description" content={description} /> : null}
    <meta property="og:image" content={img} />
    <link rel="canonical" href={SITE + (typeof location !== "undefined" ? location.pathname : "")} />
    {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}
  </>;
}

/* ---------- En-tête de page ---------- */
export function PageHead({ crumbs, eyebrow, title, intro, children }: { crumbs: { to?: string; label: string }[]; eyebrow?: string; title: ReactNode; intro?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head"><div className="wrap">
      <nav className="crumbs" aria-label="Fil d'Ariane">
        {crumbs.map((c, i) => <span key={i} style={{ display: "contents" }}>{i > 0 && <span aria-hidden="true">/</span>}{c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}</span>)}
      </nav>
      {eyebrow && <div className="eyebrow" style={{ marginTop: 18 }}>{eyebrow}</div>}
      <h1>{title}</h1>
      {intro && <p>{intro}</p>}
      {children}
    </div></div>
  );
}

/* ---------- Ajout au panier ---------- */
export function addProduct(p: Product, o: Option, text: string | null, qty = 1) {
  useCart.getState().add({
    productId: p.id, slug: p.slug, name: p.name, image: p.images[0]?.path ?? null,
    optionId: o.id, optionLabel: o.label, unitPrice: o.effectivePrice, compareAtPrice: o.comparePrice,
    promotionId: o.promotionId, engravingText: text && text.trim() ? text.trim() : null,
    engravingMode: p.engraving.mode, engravingLabel: p.engraving.label, engravingMax: p.engraving.maxLength, quantity: qty,
  });
}
export const priceFrom = (n: number, multi: boolean) => (multi ? `dès ${fmtS(n)}` : fmtS(n));
