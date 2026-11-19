import { Link, useNavigate } from "react-router-dom";
import type { Product } from "../data/types";
import { mainOption, minPrice } from "../data/api";
import { fmtS } from "../lib/core";
import { Icon, Img, addProduct, toast } from "./ui";

export default function ProductCard({ p }: { p: Product }) {
  const nav = useNavigate();
  const multi = p.options.length > 1;
  const o = mainOption(p);
  const url = `/produit/${p.slug}`;
  const quick = () => {
    if (!multi && p.engraving.mode !== "required" && !o.isQuote) { addProduct(p, o, null); toast(`${p.name} ajouté au panier`); }
    else nav(url);
  };
  return (
    <article className="card">
      {p.badge && <span className={`pill ${p.badge.type === "creation" ? "new" : p.badge.type}`}>{p.badge.label}</span>}
      <Link className="ph" to={url} aria-label={`Voir ${p.name}`}><Img path={p.images[0]?.path} alt={p.images[0]?.alt || p.name} sizes="(max-width:700px) 50vw, 300px" /></Link>
      <button className="add" type="button" onClick={quick} aria-label={`Ajouter ${p.name} au panier`}>{Icon.plus}</button>
      <div className="body">
        <span className="cat-l">{p.categoryName}</span>
        <h3><Link to={url}>{p.name}</Link></h3>
        {p.engraving.mode === "required" && <span className="perso-flag">{Icon.pen}Personnalisable</span>}
        <div className="pr">
          {o.isQuote ? <b>Sur devis</b> : <>
            {multi && <span className="from">dès</span>}
            <b className="tab-num">{fmtS(minPrice(p))}</b>
            {o.comparePrice ? <span className="old tab-num">{fmtS(o.comparePrice)}</span> : null}
          </>}
        </div>
      </div>
    </article>
  );
}

export function GridSkeleton({ n = 8 }: { n?: number }) {
  return <div className="grid">{Array.from({ length: n }).map((_, i) => <div key={i} className="sk sk-card" />)}</div>;
}
