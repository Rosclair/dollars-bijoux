import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { isOnPromo, minPrice, useCatalog, useCategories } from "../data/api";
import ProductCard, { GridSkeleton } from "../components/ProductCard";
import { PageHead, Seo } from "../components/ui";
import { LoadError } from "./Home";

const SORTS = [
  { k: "mis-en-avant", l: "Mis en avant" },
  { k: "prix-asc", l: "Prix croissant" },
  { k: "prix-desc", l: "Prix décroissant" },
  { k: "nouveautes", l: "Nouveautés" },
];

export default function Shop() {
  const { categorie } = useParams();
  const [sp, setSp] = useSearchParams();
  const sort = sp.get("tri") || "mis-en-avant";
  const { data: cat, isLoading, isError } = useCatalog();
  const { data: cats } = useCategories();
  const current = categorie === "promos" ? { slug: "promos", name: "Promos" } : cats?.find((c) => c.slug === categorie);

  const list = useMemo(() => {
    let l = [...(cat ?? [])];
    if (categorie === "promos") l = l.filter(isOnPromo);
    else if (categorie) l = l.filter((p) => p.categorySlug === categorie);
    if (sort === "prix-asc") l.sort((a, b) => minPrice(a) - minPrice(b));
    else if (sort === "prix-desc") l.sort((a, b) => minPrice(b) - minPrice(a));
    else if (sort === "nouveautes") l.sort((a, b) => (b.badge?.type === "new" ? 1 : 0) - (a.badge?.type === "new" ? 1 : 0) || b.createdAt.localeCompare(a.createdAt));
    else l.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder);
    return l;
  }, [cat, categorie, sort]);

  if (isError) return <LoadError />;
  const title = current?.name || "Tous nos bijoux";
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return <>
    <Seo title={categorie ? title : "Boutique"} description="Chaînes prénom, bracelets gravés, bagues, boucles d'oreilles et ensembles en acier inoxydable, personnalisés au Cameroun." />
    <PageHead
      crumbs={[{ to: "/", label: "Accueil" }, categorie ? { to: "/boutique", label: "Boutique" } : { label: "Boutique" }, ...(categorie ? [{ label: title }] : [])]}
      eyebrow="La boutique" title={title}
      intro="Touchez un bijou pour choisir sa finition et le texte à graver. Votre panier reste enregistré sur ce téléphone, sans inscription." />
    <section className="sec-tight">
      <div className="wrap">
        <div className="shop-bar">
          <nav className="filters" aria-label="Catégories">
            <Link className={!categorie ? "on" : ""} to={`/boutique${qs}`}>Tous</Link>
            <Link className={categorie === "promos" ? "on" : ""} to={`/boutique/promos${qs}`}>Promos</Link>
            {cats?.map((c) => <Link key={c.slug} className={categorie === c.slug ? "on" : ""} to={`/boutique/${c.slug}${qs}`}>{c.name}</Link>)}
          </nav>
          <label className="sort" htmlFor="tri">Trier
            <select id="tri" value={sort} onChange={(e) => { const n = new URLSearchParams(sp); n.set("tri", e.target.value); setSp(n, { replace: true }); }}>
              {SORTS.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
            </select>
          </label>
        </div>
        {isLoading ? <GridSkeleton /> : list.length ? (
          <div className="grid wide">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        ) : (
          <div className="empty-state"><h2>Aucun bijou ici pour l'instant</h2><p>Revenez bientôt, ou découvrez toute la collection.</p><Link className="btn btn-or" to="/boutique">Voir tous les bijoux</Link></div>
        )}
      </div>
    </section>
  </>;
}
