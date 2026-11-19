import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isOnPromo, mainOption, useCatalog, useCategories, useCities, usePromoCodes, usePromotions, useSections, useSettings, useTestimonials, useWeddingPacks } from "../data/api";
import type { Product, Promotion, Section } from "../data/types";
import { fmt, fmtS, mediaUrl, waLink } from "../lib/core";
import NamePreview from "../components/NamePreview";
import ProductCard, { GridSkeleton } from "../components/ProductCard";
import { Countdown, Icon, Img, Segmented, Seo, TimerChip, TrustIcon, addProduct, toast } from "../components/ui";

/** Titre avec retour à la ligne volontaire : "Écrivez un prénom. Voyez votre bijou." → 2 lignes */
const lines = (t?: string | null) => (t || "").split(/(?<=\.)\s+/).flatMap((x, i, a) => (i < a.length - 1 ? [x, <br key={i} />] : [x]));

export function pickPromo(promos: Promotion[] | undefined, slug?: string) {
  if (!promos?.length) return undefined;
  if (slug && slug !== "auto") return promos.find((p) => p.slug === slug);
  return promos.filter((p) => p.isFeatured)[0] ?? promos[0];
}

/* ---------------- HERO ---------------- */
function Hero({ s }: { s: Section }) {
  const { data: st } = useSettings();
  const d = s.data;
  const word: string = d.script_word || "";
  const title = s.title || "";
  let h: ReactNode = title;
  if (word && title.includes(word)) {
    const [a, b] = title.split(word);
    const bParts = b.split(/(?<=,)\s+/);
    h = <>{a}<em className="gold">{word}</em>{bParts[0]}{bParts[1] ? <><br />{bParts.slice(1).join(" ")}</> : null}</>;
  }
  return (
    <section className="hero" style={{ padding: 0 }}>
      <div className="wrap">
        <div>
          {s.eyebrow && <div className="eyebrow">{s.eyebrow}</div>}
          <h1>{h}</h1>
          {s.body && <p className="lead">{s.body}</p>}
          <div className="hero-ctas">
            {s.ctaLabel && <Link className="btn btn-or" to={s.ctaLink || "/creer"}>{s.ctaLabel}</Link>}
            {d.secondary_cta?.label && <Link className="btn btn-ghost" to={d.secondary_cta.link || "/promos"}>{d.secondary_cta.label}</Link>}
          </div>
          {st?.stats?.length ? <div className="hero-stats">{st.stats.map((x, i) => <div key={i}><strong>{x.value}</strong>{x.label}</div>)}</div> : null}
        </div>
        <div className="hero-visual">
          <div className="frame"><Img path={s.imagePath} alt={d.float_card?.title || "Dollars Bijoux"} eager sizes="(max-width:900px) 440px, 560px" /></div>
          {d.round_badge?.big && <div className="badge-18"><span><b>{d.round_badge.big}</b>{d.round_badge.small}</span></div>}
          {d.float_card?.title && <div className="float-card">
            {d.float_card.eyebrow && <div className="eyebrow">{d.float_card.eyebrow}</div>}
            <strong>{d.float_card.title}</strong>
            {d.float_card.text && <span>{d.float_card.text}</span>}
          </div>}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CATÉGORIES ---------------- */
function Categories({ s }: { s: Section }) {
  const { data: cats } = useCategories();
  const slugs: string[] = s.data.category_slugs || [];
  const list = (slugs.length ? slugs.map((sl) => cats?.find((c) => c.slug === sl)).filter(Boolean) : cats) as NonNullable<typeof cats>;
  return (
    <div className="wrap">
      <div className="cats" aria-label="Collections">
        {s.data.show_promos_bubble && <Link className="cat" to="/boutique/promos"><div className="ring"><img src="/images/flash.jpg" alt="" /></div><span>Promos</span></Link>}
        {list?.map((c) => <Link key={c.slug} className="cat" to={`/boutique/${c.slug}`}><div className="ring"><img src={mediaUrl(c.imagePath, "sm")} alt="" /></div><span>{c.name}</span></Link>)}
      </div>
    </div>
  );
}

/* ---------------- STUDIO ---------------- */
export function Studio({ s, full }: { s: Section; full?: boolean }) {
  const { data: cat } = useCatalog();
  const p = cat?.find((x) => x.slug === (s.data.product_slug || "chaine-prenom"));
  const [text, setText] = useState<string>(s.data.default_text || "Clémentine");
  const [style, setStyle] = useState<"script" | "caps">("script");
  const gold = p?.options.find((o) => o.swatch === "gold");
  const silver = p?.options.find((o) => o.swatch === "silver");
  const [optId, setOptId] = useState<string | null>(null);
  const opt = p?.options.find((o) => o.id === optId) ?? gold ?? p?.options[0];
  const finish = opt?.swatch === "silver" ? "silver" : "gold";
  const add = () => {
    if (!p || !opt) return;
    if (!text.trim()) { toast("Écrivez d'abord un prénom"); return; }
    addProduct(p, opt, style === "caps" ? text.toUpperCase() : text);
  };
  return (
    <section className={`studio ${full ? "studio-page" : ""}`} id="studio">
      <div className="wrap">
        {!full && <div className="sec-head">
          <div>{s.eyebrow && <div className="eyebrow">{s.eyebrow}</div>}<h2>{lines(s.title)}</h2></div>
          <div>{s.body && <p>{s.body}</p>}<p style={{ marginTop: 10 }}><Link to="/creer" style={{ color: "var(--or-clair)", fontWeight: 700, fontSize: 13 }}>Ouvrir le studio en grand →</Link></p></div>
        </div>}
        <div className="studio-grid">
          <div className="stage" aria-live="polite">
            <div className="tag eyebrow">Aperçu · {finish === "gold" ? "Doré" : "Argenté"}</div>
            <NamePreview text={text} finish={finish} style={style} />
            <div className="velvet" />
          </div>
          <div className="panel">
            <div className="field">
              <label htmlFor="studio-name">Prénom ou texte à graver</label>
              <input id="studio-name" type="text" maxLength={p?.engraving.maxLength || 14} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
            </div>
            {p && p.options.length > 1 && <div className="field">
              <span className="lbl">Finition</span>
              <Segmented label="Finition" value={opt?.id || ""} onChange={setOptId}
                items={[gold, silver].filter(Boolean).map((o) => ({ value: o!.id, label: o!.label, swatch: o!.swatch }))} />
            </div>}
            <div className="field">
              <span className="lbl">Écriture</span>
              <Segmented label="Écriture" value={style} onChange={setStyle} items={[{ value: "script", label: "Calligraphie" }, { value: "caps", label: "Majuscules" }]} />
            </div>
            {opt && <div className="price-line"><span className="now gold tab-num">{fmt(opt.effectivePrice)}</span>{opt.comparePrice ? <span className="old tab-num">{fmt(opt.comparePrice)}</span> : null}</div>}
            <button className="btn btn-or" style={{ width: "100%" }} onClick={add} disabled={!p}>{s.ctaLabel || "Ajouter au panier"}</button>
            <p className="note">{opt?.promoEndsAt ? `Prix promo valable jusqu'au ${new Date(opt.promoEndsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Africa/Douala" })}. ` : ""}Délai de fabrication confirmé sur WhatsApp selon votre ville.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PROMO ---------------- */
function PromoBlock({ s }: { s: Section }) {
  const { data: promos } = usePromotions();
  const { data: codes } = usePromoCodes();
  const nav = useNavigate();
  const p = pickPromo(promos, s.data.promotion_slug);
  if (!p) return null;
  const pct = p.quota ? Math.min(100, Math.round((p.reserved / p.quota) * 100)) : 0;
  const visibleCodes = codes?.filter((c) => c.showOnSite) ?? [];
  return (
    <section id="promos">
      <div className="wrap">
        <div className="sec-head">
          <div>{s.eyebrow && <div className="eyebrow">{s.eyebrow}</div>}<h2>{s.title || p.title}</h2></div>
          {s.body && <p>{s.body}</p>}
        </div>
        <div className="promo-hero">
          <div className="txt">
            {p.quota ? <span className="pill promo" style={{ position: "static", display: "inline-block" }}>Pour les {p.quota} premières commandes</span> : null}
            <h3>{p.subtitle ? <>{p.subtitle.replace(/\s[\d\s]+FCFA$/, "")}<br /><span className="gold">{p.subtitle.match(/[\d\s]+FCFA$/)?.[0]?.trim()}</span></> : p.title}</h3>
            {p.body && <p style={{ color: "#cfc6b6", margin: 0 }}>{p.body}</p>}
            {p.showCountdown && <Countdown end={p.endsAt} />}
            {p.quota ? <div className="stock"><small><b>{p.reserved}</b> réservés sur {p.quota}</small><div className="bar"><i style={{ width: `${pct}%` }} /></div></div> : null}
            <button className="btn btn-or" onClick={() => nav(p.ctaLink || `/promos/${p.slug}`)}>{p.ctaLabel || "Voir la promo"}</button>
          </div>
          <div className="img"><picture>
            {p.bannerMobile && <source media="(max-width:820px)" srcSet={mediaUrl(p.bannerMobile, "md")} />}
            <img src={mediaUrl(p.bannerDesktop, "lg")} alt={p.title} loading="lazy" />
          </picture></div>
        </div>
        {s.data.show_codes && visibleCodes.length > 0 && <div className="codes">
          {visibleCodes.map((c) => <CodeCard key={c.code} code={c.code} text={c.description} end={c.endsAt} />)}
        </div>}
      </div>
    </section>
  );
}
export function CodeCard({ code, text, end }: { code: string; text: string | null; end?: string | null }) {
  const copy = async () => { try { await navigator.clipboard.writeText(code); toast(`Code ${code} copié`); } catch { toast(`Code : ${code}`); } };
  return <div className="code">
    <div className="code-top"><b>{code}</b>{end && <TimerChip end={end} prefix="Expire dans" />}</div>
    <p>{text}</p><button className="linkbtn" onClick={copy}>Copier le code</button>
  </div>;
}

/* ---------------- BOUTIQUE ---------------- */
function Shop({ s }: { s: Section }) {
  const { data: cat, isLoading } = useCatalog();
  const { data: cats } = useCategories();
  const [f, setF] = useState<string>(s.data.default_filter || "all");
  const list = useMemo(() => {
    let l = cat ?? [];
    if (s.data.featured_only) l = l.filter((p) => p.isFeatured);
    if (f === "promos") l = l.filter(isOnPromo); else if (f !== "all") l = l.filter((p) => p.categorySlug === f);
    return l.slice(0, s.data.limit || 24);
  }, [cat, f, s.data]);
  const filters = [{ k: "all", l: "Tous" }, { k: "promos", l: "Promos" }, ...(cats ?? []).map((c) => ({ k: c.slug, l: c.name }))];
  return (
    <section id="boutique" style={{ paddingTop: 20 }}>
      <div className="wrap">
        <div className="sec-head">
          <div>{s.eyebrow && <div className="eyebrow">{s.eyebrow}</div>}<h2>{s.title}</h2></div>
          {s.body && <p>{s.body}</p>}
        </div>
        <div className="filters" role="group" aria-label="Filtrer les bijoux">
          {filters.map((x) => <button key={x.k} type="button" aria-pressed={f === x.k} onClick={() => setF(x.k)}>{x.l}</button>)}
        </div>
        {isLoading ? <GridSkeleton /> : <div className="grid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
        <div className="center" style={{ marginTop: 34 }}><Link className="btn btn-ghost" to={f === "all" ? "/boutique" : `/boutique/${f}`}>Voir toute la boutique</Link></div>
      </div>
    </section>
  );
}

/* ---------------- MARIAGE ---------------- */
export function Packs() {
  const { data: packs } = useWeddingPacks();
  return (
    <div className="packs">
      {packs?.map((o, i) => (
        <div key={o.id} className={`pack ${o.highlighted ? "feat" : ""}`} id={`pack-${o.slug}`}>
          {o.highlighted && <span className="ribbon">Le plus choisi</span>}
          <div className="eyebrow">{i === (packs.length - 1) && o.price > 200000 ? "Prestige or" : "Pack mariage"}</div>
          <h3>{o.name}</h3>
          <div><span className="amt gold tab-num">{fmtS(o.price)}</span> {o.compareAt ? <span className="old tab-num">{fmtS(o.compareAt)}</span> : null}</div>
          <ul>{o.features.map((t) => <li key={t}>{t}</li>)}</ul>
          <Link className={`btn ${o.highlighted ? "btn-or" : "btn-ghost"}`} to={`/mariage#pack-${o.slug}`}>Réserver ce pack</Link>
        </div>
      ))}
    </div>
  );
}
function Wedding({ s }: { s: Section }) {
  const t = s.title || "";
  const m = t.match(/(.*?)(à moins de\s)?([\d\s]+FCFA)$/);
  return (
    <section className="mariage" id="mariage">
      <div className="wrap">
        <div className="mariage-top">
          <Img path={s.imagePath} alt="Alliances personnalisées Dollars Bijoux" sizes="(max-width:900px) 100vw, 480px" />
          <div>
            {s.eyebrow && <div className="eyebrow">{s.eyebrow}</div>}
            <h2 style={{ fontSize: "clamp(34px,4.4vw,54px)", lineHeight: 1.04, margin: "12px 0 14px" }}>
              {m ? <>{m[1]}<br />{m[2]}<span className="gold">{m[3]}</span></> : t}
            </h2>
            {s.body && <p style={{ color: "#cfc6b6", maxWidth: "52ch" }}>{s.body}</p>}
          </div>
        </div>
        <Packs />
      </div>
    </section>
  );
}

/* ---------------- FAMILLE ---------------- */
export function FamilyTable({ p }: { p?: Product }) {
  if (!p) return null;
  const rows = new Map<string, Record<string, number>>();
  p.options.forEach((o) => {
    const [model, n] = o.label.split("·").map((x) => x.trim());
    const k = (n || "").replace(/\D/g, "") || "1";
    rows.set(model, { ...(rows.get(model) || {}), [k]: o.effectivePrice });
  });
  const cols = Array.from(new Set(p.options.map((o) => (o.label.split("·")[1] || "").replace(/\D/g, "") || "1"))).sort((a, b) => Number(a) - Number(b));
  return (
    <div className="price-tab" style={{ gridTemplateColumns: `auto repeat(${cols.length},1fr)` }}>
      <div className="h">Modèle</div>{cols.map((c) => <div key={c} className="h">{c} chaînes</div>)}
      {[...rows.entries()].map(([model, v], i, a) => <FamilyRow key={model} model={model} v={v} cols={cols} last={i === a.length - 1} />)}
    </div>
  );
}
const FamilyRow = ({ model, v, cols, last }: { model: string; v: Record<string, number>; cols: string[]; last: boolean }) => <>
  <div style={last ? { border: 0 } : undefined}>{model}</div>
  {cols.map((c) => <div key={c} style={last ? { border: 0 } : undefined}><b>{v[c] ? fmtS(v[c]) : "—"}</b></div>)}
</>;
function Family({ s }: { s: Section }) {
  const { data: cat } = useCatalog();
  const p = cat?.find((x) => x.slug === s.data.product_slug);
  const imgs: string[] = s.data.images || [];
  return (
    <section id="famille">
      <div className="wrap split">
        <div className="imgs">{imgs.slice(0, 3).map((im, i) => <Img key={i} path={im} alt="Bijoux de famille Dollars Bijoux" sizes="(max-width:900px) 50vw, 300px" />)}</div>
        <div>
          {s.eyebrow && <div className="eyebrow">{s.eyebrow}</div>}
          <h2>{s.title}</h2>
          {s.body && <p>{s.body}</p>}
          <FamilyTable p={p} />
          <Link className="btn btn-or" to={s.ctaLink || "/famille"}>{s.ctaLabel || "Composer ma famille"}</Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- ENTREPRISES ---------------- */
export function BizPoints({ points }: { points: string[] }) {
  return <ul className="ticks">{points.map((t) => <li key={t}>{Icon.check}<span>{t}</span></li>)}</ul>;
}
function Business({ s }: { s: Section }) {
  const { data: cities } = useCities();
  const wa = cities?.[0]?.whatsapp || "237694577671";
  const imgs: string[] = s.data.images || [];
  return (
    <section id="entreprises" style={{ background: "var(--noir-2)", borderTop: "1px solid var(--ligne)", borderBottom: "1px solid var(--ligne)" }}>
      <div className="wrap split">
        <div>
          {s.eyebrow && <div className="eyebrow">{s.eyebrow}</div>}
          <h2>{lines(s.title)}</h2>
          {s.body && <p>{s.body}</p>}
          <BizPoints points={s.data.points || []} />
          <div className="hero-ctas">
            <a className="btn btn-wa" href={waLink(wa, s.data.whatsapp_message || "Bonjour DOLLARS BIJOUX, je souhaite un devis entreprise.")} target="_blank" rel="noopener">{s.ctaLabel || "Demander un devis"}</a>
            <Link className="btn btn-ghost" to="/entreprises">En savoir plus</Link>
          </div>
        </div>
        <div className="imgs">{imgs.slice(0, 3).map((im, i) => <Img key={i} path={im} alt="Réalisations pour entreprises" sizes="(max-width:900px) 50vw, 300px" />)}</div>
      </div>
    </section>
  );
}

/* ---------------- CONFIANCE ---------------- */
export function Testimonials() {
  const { data } = useTestimonials();
  if (!data?.length) return null;
  return (
    <div className="testis">
      {data.map((t) => <div key={t.id} className="testi"><div className="stars" aria-label={`${t.rating} sur 5`}>{"★".repeat(t.rating)}</div><blockquote>{t.quote}</blockquote><cite>{[t.author, t.context].filter(Boolean).join(", ")}</cite></div>)}
    </div>
  );
}
function Trust({ s, withTesti }: { s: Section; withTesti: boolean }) {
  const items: any[] = s.data.items || [];
  return (
    <section>
      <div className="wrap">
        <div className="trust">{items.map((it, i) => <div key={i}><TrustIcon name={it.icon} /><h3>{it.title}</h3><p>{it.text}</p></div>)}</div>
        {withTesti && <Testimonials />}
      </div>
    </section>
  );
}
function TestiOnly({ s }: { s: Section }) {
  return <section style={{ paddingTop: 0 }}><div className="wrap">{s.eyebrow && <div className="eyebrow">{s.eyebrow}</div>}<Testimonials /></div></section>;
}

/* ---------------- REVENDEURS ---------------- */
function Reseller({ s }: { s: Section }) {
  return (
    <section style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="reseller">
          <div>
            {s.eyebrow && <div className="eyebrow">{s.eyebrow}</div>}
            <h2>{lines(s.title)}</h2>
            {s.body && <p style={{ color: "#cfc6b6", margin: "0 0 24px", maxWidth: "50ch" }}>{s.body}</p>}
            <Link className="btn btn-or" to={s.ctaLink || "/revendeurs"}>{s.ctaLabel || "Devenir revendeur"}</Link>
          </div>
          {s.data.big_figure && <div className="big gold">{s.data.big_figure}<small>{s.data.big_caption}</small></div>}
        </div>
      </div>
    </section>
  );
}

/* ---------------- PAGE ---------------- */
export default function Home() {
  const { data: sections, isLoading, isError } = useSections();
  const { data: st } = useSettings();
  if (isLoading) return <div className="loading-page"><div className="sk" style={{ width: "min(90%,1100px)", height: 420 }} /></div>;
  if (isError || !sections) return <LoadError />;
  const keys = sections.map((s) => s.key);
  const trustThenTesti = keys.indexOf("testimonials") === keys.indexOf("trust") + 1;
  return <>
    <Seo title="Dollars Bijoux" description={st?.seo?.description} />
    {sections.map((s) => {
      switch (s.key) {
        case "hero": return <Hero key={s.key} s={s} />;
        case "categories": return <Categories key={s.key} s={s} />;
        case "studio": return <Studio key={s.key} s={s} />;
        case "promo": return <PromoBlock key={s.key} s={s} />;
        case "shop": return <Shop key={s.key} s={s} />;
        case "wedding": return <Wedding key={s.key} s={s} />;
        case "family": return <Family key={s.key} s={s} />;
        case "business": return <Business key={s.key} s={s} />;
        case "trust": return <Trust key={s.key} s={s} withTesti={trustThenTesti} />;
        case "testimonials": return trustThenTesti ? null : <TestiOnly key={s.key} s={s} />;
        case "reseller": return <Reseller key={s.key} s={s} />;
        default: return null;
      }
    })}
  </>;
}

export function LoadError() {
  return (
    <div className="wrap sent">
      <h1>Connexion difficile</h1>
      <p>Nous n'arrivons pas à charger les bijoux pour le moment. Vérifiez votre connexion ou commandez directement sur WhatsApp.</p>
      <div className="btns" style={{ marginTop: 20 }}>
        <button className="btn btn-or" onClick={() => location.reload()}>Réessayer</button>
        <a className="btn btn-wa" href={waLink("237694577671", "Bonjour DOLLARS BIJOUX, je souhaite commander.")} target="_blank" rel="noopener">Commander sur WhatsApp</a>
      </div>
    </div>
  );
}
export { mainOption };
