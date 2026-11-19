import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { mainOption, useCatalog, useCities, useSettings } from "../data/api";
import { fmt, mediaUrl, shortDate, waLink } from "../lib/core";
import NamePreview from "../components/NamePreview";
import ProductCard from "../components/ProductCard";
import { Icon, Img, PriceLine, Segmented, Seo, addProduct, toast } from "../components/ui";
import NotFound from "./NotFound";
import { useCart } from "../store/cart";
import { LoadError } from "./Home";

export default function ProductPage() {
  const { slug } = useParams();
  const { data: cat, isLoading, isError } = useCatalog();
  const p = cat?.find((x) => x.slug === slug);
  if (isLoading) return <div className="wrap pdp"><div className="sk" style={{ aspectRatio: "1" }} /><div className="sk" style={{ height: 420 }} /></div>;
  if (isError) return <LoadError />;
  if (!p) return <NotFound />;
  return <ProductView key={p.id} />;
}

function ProductView() {
  const { slug } = useParams();
  const { data: cat } = useCatalog();
  const { data: cities } = useCities();
  const { data: st } = useSettings();
  const nav = useNavigate();
  const p = cat!.find((x) => x.slug === slug)!;
  const [optId, setOptId] = useState(mainOption(p).id);
  const o = p.options.find((x) => x.id === optId) ?? p.options[0];
  const [img, setImg] = useState(0);
  const [wants, setWants] = useState(p.engraving.mode === "required");
  const [text, setText] = useState("");
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wa = cities?.[0]?.whatsapp || "237694577671";
  const related = useMemo(() => (cat ?? []).filter((x) => x.categorySlug === p.categorySlug && x.id !== p.id).slice(0, 4), [cat, p]);
  useEffect(() => { setErr(false); }, [text]);

  const showField = p.engraving.mode === "required" || (p.engraving.mode === "optional" && wants);
  const finish = o.swatch === "silver" ? "silver" : "gold";

  const valid = () => {
    if (p.engraving.mode === "required" && !text.trim()) {
      setErr(true); inputRef.current?.focus(); toast("Indiquez le texte à graver"); return false;
    }
    return true;
  };
  const add = (go?: boolean) => {
    if (!valid()) return;
    addProduct(p, o, showField ? text : null, qty);
    if (go) { useCart.getState().setMini(false); nav("/commande"); }
  };
  const quoteMsg = `Bonjour DOLLARS BIJOUX, je souhaite un devis pour : ${p.name} (${o.label})${text.trim() ? `\nGravure : « ${text.trim()} »` : ""}`;

  return <>
    <Seo title={p.name} description={p.shortDescription || undefined} image={p.images[0]?.path} jsonLd={{
      "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description || p.shortDescription,
      image: p.images.map((i) => mediaUrl(i.path, "lg")), brand: { "@type": "Brand", name: "Dollars Bijoux" }, category: p.categoryName,
      offers: p.options.filter((x) => !x.isQuote).map((x) => ({ "@type": "Offer", name: x.label, price: x.effectivePrice, priceCurrency: "XAF", availability: "https://schema.org/InStock", ...(x.promoEndsAt ? { priceValidUntil: x.promoEndsAt.slice(0, 10) } : {}) })),
    }} />
    <div className="wrap">
      <nav className="crumbs" aria-label="Fil d'Ariane" style={{ paddingTop: 22 }}>
        <Link to="/">Accueil</Link><span aria-hidden="true">/</span><Link to="/boutique">Boutique</Link>
        {p.categorySlug && <><span aria-hidden="true">/</span><Link to={`/boutique/${p.categorySlug}`}>{p.categoryName}</Link></>}
      </nav>
      <div className="pdp">
        <div className="gallery">
          <div className="g-main">
            {p.badge && <span className={`pill ${p.badge.type === "creation" ? "new" : p.badge.type}`}>{p.badge.label}</span>}
            <Img path={p.images[img]?.path} alt={p.images[img]?.alt || p.name} eager sizes="(max-width:900px) 100vw, 640px" />
          </div>
          {p.images.length > 1 && <div className="g-thumbs">
            {p.images.map((im, i) => <button key={i} aria-pressed={i === img} onClick={() => setImg(i)} aria-label={`Photo ${i + 1}`}><Img path={im.path} alt="" sizes="80px" /></button>)}
          </div>}
        </div>

        <div className="pdp-info">
          <div className="eyebrow">{p.categoryName}</div>
          <h1>{p.name}</h1>
          {p.shortDescription && <p className="lead">{p.shortDescription}</p>}
          <PriceLine option={o} />
          {o.promoEndsAt && <div className="promo-until" style={{ marginTop: -12, marginBottom: 18 }}>Prix promo jusqu'au {shortDate(o.promoEndsAt)}</div>}

          {p.options.length > 1 && <div className="field">
            <span className="lbl">{p.optionLabel}</span>
            <Segmented label={p.optionLabel} value={o.id} onChange={setOptId} items={p.options.map((x) => ({ value: x.id, label: x.label, swatch: x.swatch }))} />
          </div>}

          {p.engraving.mode !== "none" && <div className="engrave">
            {p.engraving.mode === "optional" && <label className="check" style={{ marginBottom: wants ? 14 : 0 }}>
              <input type="checkbox" checked={wants} onChange={(e) => setWants(e.target.checked)} /> Ajouter une gravure (offerte)
            </label>}
            {showField && <>
              {p.engraving.livePreview && <div className="preview"><NamePreview text={text || p.engraving.placeholder.replace(/^Ex\.\s*/, "")} finish={finish} /></div>}
              <div className="field" style={{ marginBottom: 6 }}>
                <label htmlFor="engr">{p.engraving.label}{p.engraving.mode === "required" && <span className="req">Obligatoire</span>}</label>
                <input ref={inputRef} id="engr" type="text" className={err ? "invalid" : ""} maxLength={p.engraving.maxLength} placeholder={p.engraving.placeholder} value={text} onChange={(e) => setText(e.target.value)} aria-invalid={err} aria-describedby="engr-help" autoComplete="off" />
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <p className="hint" id="engr-help">{err ? <span className="err">Indiquez le texte à graver</span> : p.engraving.hint || "Écrivez exactement le texte voulu : il est transmis tel quel à l'atelier."}</p>
                  <span className="counter">{text.length} / {p.engraving.maxLength}</span>
                </div>
              </div>
            </>}
          </div>}

          {o.isQuote ? (
            <div className="pdp-actions">
              <a className="btn btn-wa" href={waLink(wa, quoteMsg)} target="_blank" rel="noopener">Demander un devis sur WhatsApp</a>
            </div>
          ) : <>
            <div className="qty-row">
              <span className="lbl" style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", fontWeight: 700, color: "var(--gris)" }}>Quantité</span>
              <div className="qty big"><button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Moins">−</button><span>{qty}</span><button type="button" onClick={() => setQty(qty + 1)} aria-label="Plus">+</button></div>
              {qty > 1 && <span className="tab-num" style={{ color: "var(--gris)", fontSize: 13 }}>= {fmt(o.effectivePrice * qty)}</span>}
            </div>
            <div className="pdp-actions">
              <button className="btn btn-or" onClick={() => add()}>Ajouter au panier</button>
              <button className="btn btn-wa" onClick={() => add(true)}>Commander maintenant</button>
            </div>
          </>}

          <div className="reassure">
            <div>{Icon.shield}Acier inoxydable 316L, durable et brillant</div>
            <div>{Icon.factory}Gravé et fini dans notre atelier au Cameroun</div>
            <div>{Icon.truck}Livraison Yaoundé, Douala et partout au Cameroun</div>
          </div>
          <details className="acc" open><summary>Description</summary><p>{p.description || p.shortDescription}</p></details>
          <details className="acc"><summary>Entretien du bijou</summary><p>Évitez le contact prolongé avec les parfums et produits chimiques. Essuyez votre bijou avec un chiffon doux et rangez-le dans son écrin.</p></details>
          <details className="acc"><summary>Livraison & délais</summary><p>{st?.pages?.livraison || "Délai confirmé sur WhatsApp selon votre ville."}</p></details>
        </div>
      </div>

      {related.length > 0 && <section style={{ paddingTop: 10 }}>
        <div className="sec-head"><div><div className="eyebrow">Dans la même collection</div><h2>Vous aimerez aussi</h2></div></div>
        <div className="grid">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
      </section>}
    </div>
  </>;
}
