import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { isOnPromo, useCatalog, useCities, usePromoCodes, usePromotions, usePromotionItems, useSections, useSettings, useWeddingPacks } from "../data/api";
import { fmt, fmtS, mediaUrl, waLink } from "../lib/core";
import { useCart } from "../store/cart";
import ProductCard, { GridSkeleton } from "../components/ProductCard";
import { Countdown, Img, PageHead, Segmented, Seo, toast } from "../components/ui";
import { BizPoints, CodeCard, FamilyTable, Packs, Studio, Testimonials } from "./Home";
import type { Promotion } from "../data/types";

/* ---------- Bannière promo ---------- */
function PromoBanner({ p, big }: { p: Promotion; big?: boolean }) {
  const pct = p.quota ? Math.min(100, Math.round((p.reserved / p.quota) * 100)) : 0;
  return (
    <div className="promo-hero">
      <div className="txt">
        <div className="eyebrow">{p.kind === "flash" ? "Promo flash" : p.quota ? `Pour les ${p.quota} premières commandes` : "Promotion"}</div>
        {big ? <h2 style={{ fontSize: "clamp(30px,3.6vw,46px)", margin: "12px 0 14px" }}>{p.title}</h2> : <h3>{p.title}</h3>}
        {p.subtitle && <p className="gold" style={{ fontFamily: "var(--f-display)", fontSize: 26, fontWeight: 700, margin: "0 0 8px" }}>{p.subtitle}</p>}
        {p.body && <p style={{ color: "#cfc6b6", margin: 0 }}>{p.body}</p>}
        <p style={{ color: "var(--gris)", fontSize: 13, margin: "12px 0 0" }}>Jusqu'au {new Date(p.endsAt).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" })}</p>
        {p.showCountdown && <Countdown end={p.endsAt} />}
        {p.quota ? <div className="stock"><small><b>{p.reserved}</b> réservés sur {p.quota}</small><div className="bar"><i style={{ width: `${pct}%` }} /></div></div> : null}
        {!big && <Link className="btn btn-or" to={`/promos/${p.slug}`}>Voir les produits</Link>}
      </div>
      <div className="img"><picture>
        {p.bannerMobile && <source media="(max-width:820px)" srcSet={mediaUrl(p.bannerMobile, "md")} />}
        <img src={mediaUrl(p.bannerDesktop, "lg")} alt={p.title} />
      </picture></div>
    </div>
  );
}

/* ---------- /promos ---------- */
export function PromosPage() {
  const { data: promos, isLoading } = usePromotions();
  const { data: cat } = useCatalog();
  const { data: codes } = usePromoCodes();
  const promoProducts = (cat ?? []).filter(isOnPromo);
  const visibleCodes = codes?.filter((c) => c.showOnSite) ?? [];
  return <>
    <Seo title="Promotions" description="Les promotions en cours chez Dollars Bijoux : ensembles, chaînes prénom, packs mariage." />
    <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Promos" }]} eyebrow="Offres limitées" title="Les promos en cours" intro="Chaque offre est limitée dans le temps ou aux premières commandes. Votre prix est bloqué au moment où vous envoyez la commande." />
    <section className="sec-tight"><div className="wrap promo-list">
      {isLoading ? <div className="sk" style={{ height: 360 }} /> : promos?.length ? promos.map((p) => <PromoBanner key={p.id} p={p} />) :
        <div className="empty-state"><h2>Pas de promotion en ce moment</h2><p>Rejoignez notre groupe WhatsApp pour être prévenu de la prochaine.</p></div>}
      {visibleCodes.length > 0 && <div><div className="eyebrow" style={{ marginBottom: 6 }}>Codes promo</div><div className="codes">{visibleCodes.map((c) => <CodeCard key={c.code} code={c.code} text={c.description} />)}</div></div>}
    </div></section>
    {promoProducts.length > 0 && <section style={{ paddingTop: 0 }}><div className="wrap">
      <div className="sec-head"><div><div className="eyebrow">Prix promo</div><h2>Tous les bijoux en promotion</h2></div></div>
      <div className="grid wide">{promoProducts.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </div></section>}
  </>;
}

/* ---------- /promos/:slug ---------- */
export function PromoDetailPage() {
  const { slug } = useParams();
  const { data: promos, isLoading } = usePromotions();
  const { data: items } = usePromotionItems();
  const { data: cat } = useCatalog();
  const p = promos?.find((x) => x.slug === slug);
  const products = useMemo(() => {
    if (!p) return [];
    const ids = new Set(items?.filter((i) => i.promotion_id === p.id).map((i) => i.product_option_id));
    return (cat ?? []).filter((x) => x.options.some((o) => ids.has(o.id)));
  }, [p, items, cat]);
  if (isLoading) return <div className="loading-page" />;
  if (!p) return <>
    <Seo title="Promotion terminée" />
    <div className="wrap sent"><h1>Cette promotion est terminée</h1><p>D'autres offres vous attendent.</p><div className="btns" style={{ marginTop: 20 }}><Link className="btn btn-or" to="/promos">Voir les promos en cours</Link></div></div>
  </>;
  return <>
    <Seo title={p.title} description={p.body || undefined} />
    <div className="wrap" style={{ paddingTop: 22 }}>
      <nav className="crumbs" aria-label="Fil d'Ariane"><Link to="/">Accueil</Link><span aria-hidden="true">/</span><Link to="/promos">Promos</Link><span aria-hidden="true">/</span><span>{p.title}</span></nav>
    </div>
    <section className="sec-tight"><div className="wrap"><PromoBanner p={p} big /></div></section>
    <section style={{ paddingTop: 0 }}><div className="wrap">
      <div className="sec-head"><div><div className="eyebrow">Concernés par l'offre</div><h2>Choisissez votre bijou</h2></div></div>
      {cat ? <div className="grid wide">{products.map((x) => <ProductCard key={x.id} p={x} />)}</div> : <GridSkeleton />}
    </div></section>
  </>;
}

/* ---------- /mariage ---------- */
export function WeddingPage() {
  const { data: packs } = useWeddingPacks();
  const { data: cat } = useCatalog();
  const { data: sections } = useSections();
  const s = sections?.find((x) => x.key === "wedding");
  const loc = useLocation();
  const initial = packs?.find((p) => loc.hash === `#pack-${p.slug}`)?.slug || packs?.find((p) => p.highlighted)?.slug || packs?.[0]?.slug;
  const [sel, setSel] = useState<string | undefined>();
  useEffect(() => {
    const m = loc.hash.match(/^#pack-(.+)$/);
    if (!m || !packs) return;
    setSel(m[1]);
    const t = setTimeout(() => document.getElementById("reserver")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    return () => clearTimeout(t);
  }, [loc.hash, packs]);
  const chosen = packs?.find((p) => p.slug === (sel ?? initial));
  const [names, setNames] = useState("");
  const [err, setErr] = useState(false);
  const rings = (cat ?? []).filter((p) => p.categorySlug === "bagues");
  const reserve = () => {
    if (!chosen) return;
    if (!names.trim()) { setErr(true); toast("Indiquez les prénoms des mariés et la date"); return; }
    useCart.getState().add({
      productId: `pack:${chosen.slug}`, slug: chosen.slug, name: `Pack mariage ${chosen.name}`, image: s?.imagePath || "/images/or18.jpg",
      optionId: null, optionLabel: chosen.features.slice(0, 2).join(", "), unitPrice: chosen.price, compareAtPrice: chosen.compareAt, promotionId: null,
      engravingText: names.trim(), engravingMode: "required", engravingLabel: "Prénoms des mariés et date", engravingMax: 40,
    });
  };
  return <>
    <Seo title="Mariage" description="Bagues de fiançailles, alliances gravées et ensembles personnalisés pour votre mariage." />
    <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Mariage" }]} eyebrow={s?.eyebrow || "Mariage"} title={s?.title || "Votre mariage complet"} intro={s?.body} />
    <section className="sec-tight"><div className="wrap"><Packs /></div></section>
    {chosen && <section style={{ paddingTop: 0 }} id="reserver"><div className="wrap split">
      <Img path={s?.imagePath} alt="Alliances gravées" sizes="(max-width:900px) 100vw, 560px" />
      <div className="form-card">
        <div className="eyebrow">Réserver un pack</div>
        <h2>Pack {chosen.name}</h2>
        <p>{fmt(chosen.price)}{chosen.compareAt ? <> · <span className="old">{fmt(chosen.compareAt)}</span></> : null}</p>
        <div className="field"><span className="lbl">Pack</span>
          <Segmented label="Pack" value={chosen.slug} onChange={setSel} items={(packs ?? []).map((p) => ({ value: p.slug, label: p.name }))} /></div>
        <div className="field"><label htmlFor="wed-names">Prénoms des mariés et date <span className="req">Obligatoire</span></label>
          <input id="wed-names" type="text" maxLength={40} value={names} onChange={(e) => { setNames(e.target.value); setErr(false); }} placeholder="Ex. Paul & Marie · 21.11.2026" className={err ? "invalid" : ""} /></div>
        <button className="btn btn-or" onClick={reserve}>Ajouter le pack au panier</button>
      </div>
    </div></section>}
    {rings.length > 0 && <section style={{ paddingTop: 0 }}><div className="wrap">
      <div className="sec-head"><div><div className="eyebrow">À la pièce</div><h2>Alliances et bagues</h2></div></div>
      <div className="grid">{rings.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </div></section>}
    <section style={{ paddingTop: 0 }}><div className="wrap faq">
      <div className="eyebrow">Questions fréquentes</div>
      <details className="acc"><summary>Quel est le délai de fabrication ?</summary><p>Le délai dépend du pack et de votre ville. Il vous est confirmé sur WhatsApp au moment de la commande. Pensez à commander au moins 2 à 3 semaines avant la date.</p></details>
      <details className="acc"><summary>La gravure intérieure est-elle incluse ?</summary><p>Oui : vos prénoms et votre date sont gravés à l'intérieur des alliances sans supplément.</p></details>
      <details className="acc"><summary>Comment connaître la taille des bagues ?</summary><p>Passez au showroom de Yaoundé ou de Douala pour un essayage, ou demandez-nous sur WhatsApp comment mesurer votre tour de doigt chez vous.</p></details>
    </div></section>
  </>;
}

/* ---------- /famille ---------- */
export function FamilyPage() {
  const { data: sections } = useSections();
  const { data: cat } = useCatalog();
  const s = sections?.find((x) => x.key === "family");
  const p = cat?.find((x) => x.slug === (s?.data.product_slug || "chaines-atcha-famille"));
  return <>
    <Seo title="Famille" description="Chaînes Atcha : une silhouette par membre de la famille, gravée à son prénom." />
    <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Famille" }]} eyebrow={s?.eyebrow || "Famille"} title={s?.title || "Les chaînes de la famille"} intro={s?.body} />
    <section className="sec-tight"><div className="wrap split">
      <div className="imgs">{(s?.data.images || []).slice(0, 3).map((im: string, i: number) => <Img key={i} path={im} alt="Bijoux de famille" sizes="(max-width:900px) 50vw, 300px" />)}</div>
      <div>
        <h2 style={{ fontSize: "clamp(28px,3vw,38px)", marginBottom: 6 }}>Les tarifs</h2>
        <p>Plus vous êtes nombreux, moins vous payez par personne.</p>
        <FamilyTable p={p} />
        {p && <Link className="btn btn-or" to={`/produit/${p.slug}`}>Composer ma famille</Link>}
      </div>
    </div></section>
  </>;
}

/* ---------- /entreprises ---------- */
export function BusinessPage() {
  const { data: sections } = useSections();
  const { data: cities } = useCities();
  const s = sections?.find((x) => x.key === "business");
  const wa = cities?.[0]?.whatsapp || "237694577671";
  const [f, setF] = useState({ company: "", contact: "", type: "Pin's à notre logo", qty: "", date: "", logo: "Oui", msg: "" });
  const [tried, setTried] = useState(false);
  const ok = f.company.trim() && f.contact.trim();
  const msg = `Bonjour DOLLARS BIJOUX, je souhaite un devis entreprise.\n\nEntreprise : ${f.company}\nContact : ${f.contact}\nProduit : ${f.type}\nQuantité : ${f.qty || "à définir"}\nDate souhaitée : ${f.date || "à définir"}\nLogo disponible : ${f.logo}${f.msg ? `\n${f.msg}` : ""}`;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return <>
    <Seo title="Entreprises" description="Pin's, porte-clés, badges et accessoires d'hôtel à votre logo, fabriqués au Cameroun." />
    <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Entreprises" }]} eyebrow={s?.eyebrow || "Entreprises"} title={s?.title || "Votre marque, portée par vos équipes."} intro={s?.body} />
    <section className="sec-tight"><div className="wrap split">
      <div>
        <BizPoints points={s?.data.points || []} />
        <div className="imgs">{(s?.data.images || []).slice(0, 3).map((im: string, i: number) => <Img key={i} path={im} alt="Réalisations entreprises" sizes="(max-width:900px) 50vw, 300px" />)}</div>
      </div>
      <form className="form-card" onSubmit={(e) => e.preventDefault()}>
        <div className="eyebrow">Devis gratuit</div>
        <h2>Décrivez votre besoin</h2>
        <p>Nous vous répondons sur WhatsApp avec un devis.</p>
        <div className="form-grid">
          <div className="field full"><label htmlFor="b-co">Entreprise *</label><input id="b-co" type="text" value={f.company} onChange={set("company")} className={tried && !f.company.trim() ? "invalid" : ""} /></div>
          <div className="field full"><label htmlFor="b-ct">Nom du contact *</label><input id="b-ct" type="text" value={f.contact} onChange={set("contact")} className={tried && !f.contact.trim() ? "invalid" : ""} /></div>
          <div className="field full"><label htmlFor="b-ty">Produit</label><select id="b-ty" value={f.type} onChange={set("type")}>
            {["Pin's à notre logo", "Porte-clés gravés", "Badges du personnel", "Médailles / trophées", "Accessoires d'hôtel", "Cadeaux clients", "Autre"].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label htmlFor="b-q">Quantité</label><input id="b-q" type="text" inputMode="numeric" value={f.qty} onChange={set("qty")} placeholder="Ex. 500" /></div>
          <div className="field"><label htmlFor="b-d">Date souhaitée</label><input id="b-d" type="text" value={f.date} onChange={set("date")} placeholder="Ex. 15 décembre" /></div>
          <div className="field full"><span className="lbl">Logo disponible ?</span><Segmented label="Logo disponible" value={f.logo} onChange={(v) => setF({ ...f, logo: v })} items={[{ value: "Oui", label: "Oui" }, { value: "Non", label: "Non" }]} /></div>
          <div className="field full"><label htmlFor="b-m">Message</label><textarea id="b-m" value={f.msg} onChange={set("msg")} /></div>
        </div>
        <a className="btn btn-wa" href={waLink(wa, msg)} target="_blank" rel="noopener" onClick={(e) => { setTried(true); if (!ok) e.preventDefault(); }}>Envoyer la demande sur WhatsApp</a>
      </form>
    </div></section>
  </>;
}

/* ---------- /revendeurs ---------- */
export function ResellersPage() {
  const { data: sections } = useSections();
  const { data: cities } = useCities();
  const s = sections?.find((x) => x.key === "reseller");
  const wa = cities?.[0]?.whatsapp || "237694577671";
  const [f, setF] = useState({ name: "", city: "", activity: "", social: "" });
  const [tried, setTried] = useState(false);
  const ok = f.name.trim() && f.city.trim();
  const msg = `${s?.data.whatsapp_message || "Bonjour DOLLARS BIJOUX, je souhaite devenir revendeur."}\n\nNom : ${f.name}\nVille : ${f.city}\nActivité actuelle : ${f.activity || "—"}\nRéseaux : ${f.social || "—"}`;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return <>
    <Seo title="Revendeurs" description="Devenez revendeur ou grossiste Dollars Bijoux." />
    <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Revendeurs" }]} eyebrow={s?.eyebrow || "Revendeurs"} title={s?.title || "Lancez votre business de bijoux"} intro={s?.body} />
    <section className="sec-tight"><div className="wrap">
      <div className="steps">
        <div><h3>Contactez-nous</h3><p>Envoyez le formulaire : nous vous transmettons nos conditions et prix de gros.</p></div>
        <div><h3>Choisissez vos modèles</h3><p>Constituez votre stock avec nos best-sellers et nos nouveautés en avant-première.</p></div>
        <div><h3>Vendez sur vos réseaux</h3><p>Utilisez nos visuels prêts à publier et vendez à vos prix.</p></div>
      </div>
    </div></section>
    <section style={{ paddingTop: 0 }}><div className="wrap split">
      <div className="reseller" style={{ gridTemplateColumns: "1fr" }}>
        <div className="big gold" style={{ textAlign: "left" }}>{s?.data.big_figure || "75 %"}<small>{s?.data.big_caption}</small></div>
      </div>
      <form className="form-card" onSubmit={(e) => e.preventDefault()}>
        <h2>Devenir revendeur</h2>
        <p>Réponse sur WhatsApp.</p>
        <div className="form-grid">
          <div className="field full"><label htmlFor="r-n">Nom *</label><input id="r-n" type="text" value={f.name} onChange={set("name")} className={tried && !f.name.trim() ? "invalid" : ""} /></div>
          <div className="field full"><label htmlFor="r-c">Ville *</label><input id="r-c" type="text" value={f.city} onChange={set("city")} className={tried && !f.city.trim() ? "invalid" : ""} /></div>
          <div className="field full"><label htmlFor="r-a">Activité actuelle</label><input id="r-a" type="text" value={f.activity} onChange={set("activity")} placeholder="Ex. boutique, vente en ligne…" /></div>
          <div className="field full"><label htmlFor="r-s">Vos réseaux (Facebook, TikTok…)</label><input id="r-s" type="text" value={f.social} onChange={set("social")} /></div>
        </div>
        <a className="btn btn-or" href={waLink(wa, msg)} target="_blank" rel="noopener" onClick={(e) => { setTried(true); if (!ok) e.preventDefault(); }}>{s?.ctaLabel || "Devenir revendeur"}</a>
      </form>
    </div></section>
  </>;
}

/* ---------- /creer ---------- */
export function CreatePage() {
  const { data: sections } = useSections();
  const s = sections?.find((x) => x.key === "studio");
  return <>
    <Seo title="Studio de gravure" description="Écrivez un prénom et voyez votre chaîne personnalisée en direct." />
    <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Créer le vôtre" }]} eyebrow={s?.eyebrow || "Le studio de gravure"} title={s?.title || "Créez votre bijou"} intro={s?.body} />
    {s ? <Studio s={s} full /> : <div className="loading-page" />}
    <section><div className="wrap"><Testimonials /></div></section>
  </>;
}

/* ---------- Pages d'informations ---------- */
export function InfoPage({ kind }: { kind: "a_propos" | "livraison" | "mentions" }) {
  const { data: st } = useSettings();
  const T = { a_propos: "À propos", livraison: "Livraison & délais", mentions: "Mentions légales" }[kind];
  const text = st?.pages?.[kind];
  return <>
    <Seo title={T} />
    <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: T }]} title={T} />
    <section className="sec-tight"><div className="wrap"><div className="prose">{text || "Contenu à venir."}</div></div></section>
  </>;
}

export function ContactPage() {
  const { data: st } = useSettings();
  const { data: cities } = useCities();
  return <>
    <Seo title="Contact" />
    <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Contact" }]} eyebrow="Nous écrire" title="Contact" intro="Le plus rapide : WhatsApp. Choisissez le showroom le plus proche de chez vous." />
    <section className="sec-tight"><div className="wrap contact-grid">
      {cities?.filter((c) => c.name !== "Autre ville").map((c) => (
        <div className="contact-card" key={c.id}>
          <div className="eyebrow">Showroom</div><h2>{c.name}</h2>
          {/yaound/i.test(c.name) && st?.address_yaounde && <p style={{ margin: 0, color: "#cfc6b6" }}>{st.address_yaounde}</p>}
          <a href={waLink(c.whatsapp, "Bonjour DOLLARS BIJOUX")} target="_blank" rel="noopener">WhatsApp +{c.whatsapp}</a>
        </div>
      ))}
      <div className="contact-card">
        <div className="eyebrow">Après-vente</div><h2>Service client</h2>
        <p style={{ margin: 0, color: "#cfc6b6" }}>Un souci avec une commande ? Écrivez-nous.</p>
        {st?.support_whatsapp && <a href={waLink(st.support_whatsapp, "Bonjour, j'ai une réclamation concernant ma commande.")} target="_blank" rel="noopener">WhatsApp +{st.support_whatsapp}</a>}
        {st?.email && <a href={`mailto:${st.email}`}>{st.email}</a>}
      </div>
    </div></section>
  </>;
}

export { fmtS };
