import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cartTotals, missingEngraving, useCart, type CartLine } from "../store/cart";
import { useCities, usePromoCodes, useSettings } from "../data/api";
import { fmt, fmtS, mediaUrl, orderRef, supabase, waLink } from "../lib/core";
import { buildOrderMessage } from "../lib/whatsapp";
import { CountdownText, PageHead, Seo } from "../components/ui";

/* ---------- Édition de gravure en place ---------- */
function EngravingEditor({ l }: { l: CartLine }) {
  const setEngraving = useCart((s) => s.setEngraving);
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(l.engravingText || "");
  if (l.engravingMode === "none") return null;
  const missing = l.engravingMode === "required" && !l.engravingText;
  if (!open) return (
    <div>
      {l.engravingText ? <div className="engr-txt">{l.engravingText}</div> : missing ? <div className="err">Gravure obligatoire manquante</div> : null}
      <button className="linkbtn" type="button" onClick={() => { setV(l.engravingText || ""); setOpen(true); }}>{l.engravingText ? "Modifier la gravure" : "Ajouter une gravure"}</button>
    </div>
  );
  const save = () => { setEngraving(l.lineId, v); setOpen(false); };
  return (
    <div className="engr-edit">
      <label className="lbl" htmlFor={`e-${l.lineId}`} style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 700, color: "var(--gris)" }}>{l.engravingLabel}</label>
      <div className="row">
        <input id={`e-${l.lineId}`} type="text" value={v} maxLength={l.engravingMax} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} autoFocus />
        <button className="btn btn-or" type="button" onClick={save} style={{ padding: "10px 16px" }}>OK</button>
      </div>
      <span className="counter" style={{ textAlign: "left" }}>{v.length} / {l.engravingMax}{l.engravingMode === "optional" ? " · laissez vide pour ne rien graver" : ""}</span>
    </div>
  );
}

function Qty({ l }: { l: CartLine }) {
  const setQty = useCart((s) => s.setQty);
  return <div className="qty"><button type="button" onClick={() => setQty(l.lineId, l.quantity - 1)} aria-label="Retirer un">−</button><span>{l.quantity}</span><button type="button" onClick={() => setQty(l.lineId, l.quantity + 1)} aria-label="Ajouter un">+</button></div>;
}

const lineHref = (l: CartLine) => (l.productId.startsWith("pack:") ? `/mariage#pack-${l.slug}` : `/produit/${l.slug}`);

/* ---------- /panier ---------- */
export function CartPage() {
  const { lines, remove } = useCart();
  const t = cartTotals(lines);
  const nav = useNavigate();
  return <>
    <Seo title="Mon panier" />
    <PageHead crumbs={[{ to: "/", label: "Accueil" }, { label: "Panier" }]} eyebrow="Votre écrin" title="Mon panier" />
    <div className="wrap">
      {!lines.length ? (
        <div className="empty-state" style={{ margin: "40px 0 80px" }}>
          <h2>Votre écrin est vide</h2><p>Ajoutez un bijou : il restera ici même si vous fermez la page.</p>
          <div className="hero-ctas" style={{ justifyContent: "center" }}><Link className="btn btn-or" to="/promos">Voir les promos</Link><Link className="btn btn-ghost" to="/boutique">La boutique</Link></div>
        </div>
      ) : (
        <div className="cart-page">
          <div>
            {lines.map((l) => (
              <div className="cline" key={l.lineId}>
                <Link to={lineHref(l)}><img src={mediaUrl(l.image, "sm")} alt="" /></Link>
                <div>
                  <h3><Link to={lineHref(l)}>{l.name}</Link></h3>
                  <div className="meta">{l.optionLabel}</div>
                  <EngravingEditor l={l} />
                  <div style={{ marginTop: 10 }}><Qty l={l} /></div>
                </div>
                <div className="r">
                  <div><b className="tab-num">{fmtS(l.unitPrice * l.quantity)}</b>{l.compareAtPrice && l.compareAtPrice > l.unitPrice ? <div className="old tab-num">{fmtS(l.compareAtPrice * l.quantity)}</div> : null}</div>
                  <button className="rm" type="button" onClick={() => remove(l.lineId)}>Retirer</button>
                </div>
              </div>
            ))}
            <p style={{ marginTop: 20 }}><Link to="/boutique" style={{ color: "var(--or-clair)", fontWeight: 700, fontSize: 13 }}>← Continuer mes achats</Link></p>
          </div>
          <aside className="summary">
            <h2>Récapitulatif</h2>
            <div className="sum-row"><span>{t.count} article{t.count > 1 ? "s" : ""}</span><span className="tab-num">{fmt(t.total + t.saved)}</span></div>
            {t.saved > 0 && <div className="sum-row save"><span>Économies promo</span><span className="tab-num">−{fmt(t.saved)}</span></div>}
            <div className="sum-row total"><span className="eyebrow">Total</span><b className="tab-num">{fmt(t.total)}</b></div>
            <button className="btn btn-or" onClick={() => nav("/commande")}>Passer la commande</button>
            <p className="note">Aucun paiement en ligne : la commande est confirmée avec vous sur WhatsApp.</p>
          </aside>
        </div>
      )}
    </div>
  </>;
}

/* ---------- /commande ---------- */
export function CheckoutPage() {
  const { lines } = useCart();
  const { data: cities } = useCities();
  const { data: codes } = usePromoCodes();
  const { data: st } = useSettings();
  const nav = useNavigate();
  const t = cartTotals(lines);
  const missing = missingEngraving(lines);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [codeIn, setCodeIn] = useState("");
  const [code, setCode] = useState<{ code: string; ok: boolean; discount: number; msg: string; end?: string | null } | null>(null);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (!city && cities?.length) setCity(cities[0].name); }, [cities, city]);
  useEffect(() => { useCart.getState().setMini(false); }, []);

  const cityObj = cities?.find((c) => c.name === city);
  /** Un code promo ne s'applique qu'aux articles qui ne sont pas déjà en promotion. */
  const isDiscounted = (l: typeof lines[number]) => !!l.promotionId || (!!l.compareAtPrice && l.compareAtPrice > l.unitPrice);
  const eligible = lines.filter((l) => !isDiscounted(l));
  const eligibleTotal = eligible.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  useEffect(() => { if (!eligible.length && code) { setCode(null); setCodeIn(""); } }, [eligible.length, code]);
  const isOther = /autre/i.test(city);

  const applyCode = () => {
    const c = codeIn.trim().toUpperCase();
    if (!c) { setCode(null); return; }
    const found = codes?.find((x) => x.code === c);
    const now = Date.now();
    if (!found || (found.startsAt && new Date(found.startsAt).getTime() > now) || (found.endsAt && new Date(found.endsAt).getTime() < now)) {
      setCode({ code: c, ok: false, discount: 0, msg: "Code inconnu ou expiré : il sera transmis et vérifié par notre équipe." }); return;
    }
    if (found.minAmount && eligibleTotal < found.minAmount) {
      setCode({ code: c, ok: false, discount: 0, msg: `Ce code s'applique dès ${fmt(found.minAmount)} d'articles hors promotion.` }); return;
    }
    const discount = found.discountType === "percent" ? Math.round((eligibleTotal * found.discountValue) / 100) : found.discountType === "fixed" ? Math.min(found.discountValue, eligibleTotal) : 0;
    setCode({ code: c, ok: true, discount, end: found.endsAt, msg: discount ? `Code appliqué : −${fmt(discount)} (remise confirmée sur WhatsApp).` : found.description || "Code enregistré, il sera pris en compte sur WhatsApp." });
  };

  const ref = useMemo(() => orderRef(), []);
  const errors = {
    name: !name.trim(),
    area: isOther && !area.trim(),
    engraving: missing.length > 0,
  };
  const valid = !errors.name && !errors.area && !errors.engraving && lines.length > 0;
  const message = buildOrderMessage(lines, {
    ref, name: name.trim(), city, area: area.trim(), phone: phone.trim(), note: note.trim(),
    code: code?.code, discount: code?.ok ? code.discount : 0, intro: st?.wa_intro, outro: st?.wa_outro,
  });
  const href = waLink(cityObj?.whatsapp || "237694577671", message);

  const send = (e: React.MouseEvent) => {
    setTried(true);
    if (!valid) { e.preventDefault(); document.querySelector(".co-block.bad, .invalid")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    const items = lines.map((l) => ({ product_id: l.productId, slug: l.slug, name: l.name, option_id: l.optionId, option: l.optionLabel, engraving: l.engravingText, qty: l.quantity, unit_price: l.unitPrice, promotion_id: l.promotionId }));
    void supabase.from("order_intents").insert({
      reference: ref, customer_name: name.trim(), customer_whatsapp: phone.trim() || null, city, area: area.trim() || null,
      note: note.trim() || null, promo_code: code?.code || null, items, total: t.total - (code?.ok ? code.discount : 0), source_page: "/commande",
    }).then(() => {}, () => {});
    try { sessionStorage.setItem("db_last_order", JSON.stringify({ ref, href })); } catch { /* */ }
    setTimeout(() => nav("/commande/envoyee"), 300);
  };

  if (!lines.length) return <>
    <Seo title="Commande" />
    <div className="wrap sent"><h1>Votre panier est vide</h1><p>Ajoutez au moins un bijou pour passer commande.</p><div className="btns" style={{ marginTop: 20 }}><Link className="btn btn-or" to="/boutique">Voir la boutique</Link></div></div>
  </>;

  return <>
    <Seo title="Finaliser ma commande" />
    <PageHead crumbs={[{ to: "/", label: "Accueil" }, { to: "/panier", label: "Panier" }, { label: "Commande" }]} eyebrow="Dernière étape" title="Finaliser ma commande" intro="Vérifiez vos gravures et vos coordonnées. Votre commande s'ouvrira dans WhatsApp, prête à envoyer." />
    <div className="wrap">
      <div className="cart-page">
        <div>
          <div className={`co-block ${tried && errors.engraving ? "bad" : ""}`}>
            <h2><span className="n">1</span>Vos bijoux</h2>
            <p>Relisez chaque texte à graver : il sera transmis tel quel à l'atelier.</p>
            {lines.map((l) => (
              <div className="co-item" key={l.lineId}>
                <img src={mediaUrl(l.image, "sm")} alt="" />
                <div>
                  <h3>{l.name}</h3>
                  <div className="meta">{l.optionLabel} · Qté {l.quantity}</div>
                  <EngravingEditor l={l} />
                </div>
                <b className="tab-num" style={{ color: "var(--or-clair)" }}>{fmtS(l.unitPrice * l.quantity)}</b>
              </div>
            ))}
          </div>

          <div className="co-block">
            <h2><span className="n">2</span>Vos coordonnées</h2>
            <p>Pour préparer et livrer votre commande.</p>
            <div className="form-grid">
              <div className="field full"><label htmlFor="co-name">Nom complet *</label>
                <input id="co-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={tried && errors.name ? "invalid" : ""} />
                {tried && errors.name && <span className="err">Indiquez votre nom</span>}</div>
              <div className="field"><label htmlFor="co-city">Ville</label>
                <select id="co-city" value={city} onChange={(e) => setCity(e.target.value)}>{cities?.map((c) => <option key={c.id}>{c.name}</option>)}</select></div>
              <div className="field"><label htmlFor="co-area">{isOther ? "Ville et quartier de livraison *" : "Quartier"}</label>
                <input id="co-area" type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder={isOther ? "Ex. Bafoussam, Tamdja" : "Ex. Bonamoussadi"} className={tried && errors.area ? "invalid" : ""} />
                {tried && errors.area && <span className="err">Indiquez votre ville de livraison</span>}</div>
              <div className="field full"><label htmlFor="co-phone">Votre numéro WhatsApp (facultatif)</label>
                <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6XX XX XX XX" /></div>
              <div className="field full"><label htmlFor="co-note">Note pour l'atelier (facultatif)</label>
                <textarea id="co-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Date de remise souhaitée, emballage cadeau…" /></div>
            </div>
          </div>

          {eligible.length > 0 && <div className="co-block">
            <h2><span className="n">3</span>Code promo</h2>
            <p>Vous avez un code reçu sur Facebook ou dans le groupe WhatsApp ?{eligible.length < lines.length ? ` Il s'applique uniquement aux articles hors promotion (${fmt(eligibleTotal)}).` : ""}</p>
            <div className="code-row">
              <input type="text" aria-label="Code promo" value={codeIn} onChange={(e) => setCodeIn(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyCode()} placeholder="Ex. DB2304" />
              <button className="btn btn-ghost" type="button" onClick={applyCode}>Appliquer</button>
            </div>
            {code && <p className={code.ok ? "ok" : "warn"} style={{ margin: "10px 0 0" }}>{code.msg}</p>}
            {code?.ok && code.end && <p className="warn" style={{ margin: "6px 0 0" }}>Ce code <CountdownText end={code.end} prefix="expire dans" /> : envoyez votre commande avant.</p>}
          </div>}
          {eligible.length === 0 && <div className="co-block promo-ok">
            <p style={{ margin: 0 }}><b className="gold">Prix promo appliqué.</b> Vos bijoux bénéficient déjà d'une promotion{t.saved > 0 ? ` : vous économisez ${fmt(t.saved)}` : ""}.</p>
          </div>}
        </div>

        <aside className="summary">
          <h2>Récapitulatif</h2>
          <div className="sum-row"><span>{t.count} article{t.count > 1 ? "s" : ""}</span><span className="tab-num">{fmt(t.total + t.saved)}</span></div>
          {t.saved > 0 && <div className="sum-row save"><span>Économies promo</span><span className="tab-num">−{fmt(t.saved)}</span></div>}
          {code?.ok && code.discount > 0 && <div className="sum-row save"><span>Code {code.code}</span><span className="tab-num">−{fmt(code.discount)}</span></div>}
          <div className="sum-row total"><span className="eyebrow">Total</span><b className="tab-num">{fmt(t.total - (code?.ok ? code.discount : 0))}</b></div>
          <a className="btn btn-wa" href={href} target="_blank" rel="noopener" onClick={send}>
            <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Z" /></svg>
            Envoyer ma commande sur WhatsApp
          </a>
          {tried && !valid && <p className="err" style={{ marginTop: 10 }}>Complétez les champs en rouge avant d'envoyer.</p>}
          <p className="note">Votre commande part au showroom {/douala/i.test(city) ? "de Douala" : "de Yaoundé"}. Paiement et délai confirmés avec vous sur WhatsApp.</p>
        </aside>
      </div>
    </div>
  </>;
}

/* ---------- /commande/envoyee ---------- */
export function SentPage() {
  const clear = useCart((s) => s.clear);
  const nav = useNavigate();
  let last: { ref: string; href: string } | null = null;
  try { last = JSON.parse(sessionStorage.getItem("db_last_order") || "null"); } catch { /* */ }
  return (
    <div className="wrap sent">
      <Seo title="Commande prête" />
      <div className="ring-ok"><svg width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 10l4 4 8-8" /></svg></div>
      <h1>Votre commande est prête dans WhatsApp</h1>
      <p>Appuyez sur <b>Envoyer</b> dans WhatsApp pour la transmettre. Notre équipe vous répond pour confirmer le délai et le paiement.</p>
      {last?.ref && <div className="ref">Réf. {last.ref}</div>}
      <div className="btns">
        {last?.href && <a className="btn btn-wa" href={last.href} target="_blank" rel="noopener">Rouvrir WhatsApp</a>}
        <button className="btn btn-ghost" onClick={() => { clear(); nav("/"); }}>Vider le panier</button>
      </div>
    </div>
  );
}
