import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fmtS, mediaUrl, supabase } from "../../lib/core";
import NamePreview from "../../components/NamePreview";
import { toast } from "../../components/ui";
import { Confirm, F, ImageUploader, Num, Toggle, run, slugify, useRefresh, useReorder } from "../kit";

const BADGES = [{ v: "", l: "Aucun" }, { v: "promo", l: "Promo (rouge)" }, { v: "new", l: "Nouveau" }, { v: "top", l: "Best-seller (or)" }, { v: "creation", l: "Création" }];

export const useAdmCategories = () => useQuery({ queryKey: ["adm-cats"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [] });
const useAdmProducts = () => useQuery({
  queryKey: ["adm-products"],
  queryFn: async () => {
    const [p, i, o] = await Promise.all([
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("product_images").select("*").order("sort_order"),
      supabase.from("option_prices").select("*").order("sort_order"),
    ]);
    return (p.data ?? []).map((x: any) => ({ ...x, images: (i.data ?? []).filter((y: any) => y.product_id === x.id), options: (o.data ?? []).filter((y: any) => y.product_id === x.id) }));
  },
});

export function ProductsList() {
  const { data, isLoading } = useAdmProducts();
  const { data: cats } = useAdmCategories();
  const refresh = useRefresh();
  const nav = useNavigate();
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [st, setSt] = useState("");
  const [del, setDel] = useState<any>(null);
  const list = useMemo(() => (data ?? []).filter((p: any) =>
    (!cat || p.category_id === cat) && (!st || (st === "pub" ? p.is_published : !p.is_published)) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))), [data, q, cat, st]);
  const toggle = async (p: any, field: "is_published" | "is_featured") => { await run(supabase.from("products").update({ [field]: !p[field] }).eq("id", p.id).select()); refresh(); };
  const duplicate = async (p: any) => {
    const { id, images, options, created_at, updated_at, categories, ...rest } = p;
    const slug = `${p.slug}-copie-${Math.floor(Math.random() * 1000)}`;
    const np: any = await run(supabase.from("products").insert({ ...rest, slug, name: `${p.name} (copie)`, is_published: false }).select().single());
    if (!np) return;
    if (options.length) await supabase.from("product_options").insert(options.map((o: any, k: number) => ({ product_id: np.id, label: o.label, price: o.price, compare_at_price: o.compare_at_price, is_quote: o.is_quote, swatch: o.swatch, sort_order: k, is_active: o.is_active })));
    if (images.length) await supabase.from("product_images").insert(images.map((im: any, k: number) => ({ product_id: np.id, path: im.path, alt: im.alt, sort_order: k })));
    toast("Produit dupliqué (non publié)"); refresh(); nav(`/admin/produits/${np.id}`);
  };
  const remove = async () => { await run(supabase.from("products").delete().eq("id", del.id).select(), "Produit supprimé"); setDel(null); refresh(); };
  const catName = (id: string) => cats?.find((c: any) => c.id === id)?.name ?? "—";
  return <>
    <div className="adm-head"><div><h1>Produits</h1><p>{data?.length ?? 0} produits · les non publiés sont invisibles sur le site.</p></div><Link className="ab pri" to="/admin/produits/nouveau">+ Nouveau produit</Link></div>
    <div className="toolbar">
      <input type="search" placeholder="Rechercher un produit" value={q} onChange={(e) => setQ(e.target.value)} />
      <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Toutes les catégories</option>{cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={st} onChange={(e) => setSt(e.target.value)}><option value="">Tous</option><option value="pub">Publiés</option><option value="draft">Non publiés</option></select>
    </div>
    {isLoading ? <p className="muted">Chargement…</p> : <div className="tbl-wrap"><table className="tbl">
      <thead><tr><th></th><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Badge</th><th>Publié</th><th>Accueil</th><th></th></tr></thead>
      <tbody>{list.map((p: any) => {
        const buy = p.options.filter((o: any) => !o.is_quote && o.is_active);
        const min = buy.length ? Math.min(...buy.map((o: any) => o.effective_price)) : null;
        const promo = p.options.some((o: any) => o.promotion_id);
        return <tr key={p.id}>
          <td>{p.images[0] ? <img className="thumb" src={mediaUrl(p.images[0].path, "sm")} alt="" /> : <div className="thumb" />}</td>
          <td><Link to={`/admin/produits/${p.id}`} style={{ fontWeight: 700 }}>{p.name}</Link>{p.engraving_mode !== "none" && <div className="muted" style={{ fontSize: 12 }}>Gravure {p.engraving_mode === "required" ? "obligatoire" : "facultative"}</div>}</td>
          <td>{catName(p.category_id)}</td>
          <td className="tab-num">{min !== null ? <>{buy.length > 1 ? "dès " : ""}{fmtS(min)}</> : "Sur devis"}{promo && <span className="chip red" style={{ marginLeft: 6 }}>Promo</span>}</td>
          <td>{p.badge_type ? <span className="chip gold">{p.badge_label || p.badge_type}</span> : <span className="muted">—</span>}</td>
          <td><label className="tg"><input type="checkbox" checked={p.is_published} onChange={() => toggle(p, "is_published")} aria-label="Publié" /></label></td>
          <td><label className="tg"><input type="checkbox" checked={p.is_featured} onChange={() => toggle(p, "is_featured")} aria-label="Mis en avant" /></label></td>
          <td style={{ whiteSpace: "nowrap" }}><Link className="ab sm" to={`/admin/produits/${p.id}`}>Modifier</Link> <button className="ab sm" onClick={() => duplicate(p)}>Dupliquer</button> <button className="ab sm danger" onClick={() => setDel(p)}>✕</button></td>
        </tr>;
      })}</tbody></table></div>}
    {del && <Confirm text={`Supprimer définitivement « ${del.name} » ? Ses options et ses liens avec les promotions seront supprimés. Les commandes déjà passées restent dans l'historique.`} onYes={remove} onNo={() => setDel(null)} />}
  </>;
}

type Opt = { id?: string; label: string; price: number | null; compare_at_price: number | null; is_quote: boolean; swatch: string | null; is_active: boolean; effective?: number; promo?: boolean };
type Img = { id?: string; path: string; alt: string | null };

const EMPTY = { name: "", slug: "", category_id: "", short_description: "", description: "", badge_type: "", badge_label: "", option_label: "Finition",
  engraving_mode: "none", engraving_label: "Prénom à graver", engraving_placeholder: "Ex. Clémentine", engraving_max_length: 14, engraving_hint: "", engraving_live_preview: false,
  is_published: false, is_featured: false, sort_order: 100 };

export function ProductEdit() {
  const { id } = useParams();
  const isNew = id === "nouveau";
  const nav = useNavigate();
  const refresh = useRefresh();
  const { data: all } = useAdmProducts();
  const { data: cats } = useAdmCategories();
  const [p, setP] = useState<any>(null);
  const [opts, setOpts] = useState<Opt[]>([]);
  const [imgs, setImgs] = useState<Img[]>([]);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);
  const ro = useReorder(opts, setOpts);
  const ri = useReorder(imgs, setImgs);

  useEffect(() => {
    if (isNew) { setP({ ...EMPTY }); setOpts([{ label: "Argenté", price: null, compare_at_price: null, is_quote: false, swatch: "silver", is_active: true }]); setImgs([]); return; }
    const x = all?.find((y: any) => y.id === id); if (!x) return;
    setP({ ...EMPTY, ...x, badge_type: x.badge_type || "", badge_label: x.badge_label || "", category_id: x.category_id || "", engraving_hint: x.engraving_hint || "", short_description: x.short_description || "", description: x.description || "" });
    setOpts(x.options.map((o: any) => ({ id: o.option_id, label: o.label, price: o.price, compare_at_price: o.compare_at_price, is_quote: o.is_quote, swatch: o.swatch, is_active: o.is_active, effective: o.effective_price, promo: !!o.promotion_id })));
    setImgs(x.images.map((i: any) => ({ id: i.id, path: i.path, alt: i.alt })));
  }, [id, all, isNew]);

  if (!p) return <p className="muted">Chargement…</p>;
  const set = (k: string, v: any) => setP((s: any) => ({ ...s, [k]: v, ...(k === "name" && !slugTouched ? { slug: slugify(v) } : {}) }));
  const setO = (i: number, k: keyof Opt, v: any) => setOpts((s) => s.map((o, j) => (j === i ? { ...o, [k]: v } : o)));

  const save = async () => {
    const e: string[] = [];
    if (!p.name.trim()) e.push("Le nom est obligatoire.");
    if (!p.category_id) e.push("Choisissez une catégorie.");
    if (!p.slug.trim()) e.push("L'adresse (slug) est obligatoire.");
    if (all?.some((x: any) => x.slug === p.slug && x.id !== p.id)) e.push("Cette adresse (slug) est déjà utilisée par un autre produit.");
    const active = opts.filter((o) => o.is_active && o.label.trim());
    if (!active.length) e.push("Ajoutez au moins une option active.");
    if (opts.some((o) => o.label.trim() && !o.is_quote && (o.price === null || o.price <= 0))) e.push("Chaque option doit avoir un prix (ou être « sur devis »).");
    setErrs(e); if (e.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setBusy(true);
    const row = {
      name: p.name.trim(), slug: slugify(p.slug), category_id: p.category_id, short_description: p.short_description || null, description: p.description || null,
      badge_type: p.badge_type || null, badge_label: p.badge_type ? p.badge_label || null : null, option_label: p.option_label || "Finition",
      engraving_mode: p.engraving_mode, engraving_label: p.engraving_label || null, engraving_placeholder: p.engraving_placeholder || null,
      engraving_max_length: p.engraving_max_length || 20, engraving_hint: p.engraving_hint || null, engraving_live_preview: !!p.engraving_live_preview,
      is_published: !!p.is_published, is_featured: !!p.is_featured, sort_order: p.sort_order ?? 100,
    };
    const saved: any = isNew ? await run(supabase.from("products").insert(row).select().single()) : await run(supabase.from("products").update(row).eq("id", p.id).select().single());
    if (!saved) { setBusy(false); return; }
    const pid = saved.id;
    // options
    const prev = isNew ? [] : (all?.find((y: any) => y.id === pid)?.options ?? []).map((o: any) => o.option_id);
    const keep = opts.filter((o) => o.label.trim());
    const removed = prev.filter((x: string) => !keep.some((o) => o.id === x));
    if (removed.length) await supabase.from("product_options").delete().in("id", removed);
    for (const [k, o] of keep.entries()) {
      const r = { product_id: pid, label: o.label.trim(), price: o.is_quote ? 0 : o.price ?? 0, compare_at_price: o.compare_at_price || null, is_quote: o.is_quote, swatch: (o.swatch || null) as any, sort_order: k, is_active: o.is_active };
      const res = o.id ? await supabase.from("product_options").update(r).eq("id", o.id) : await supabase.from("product_options").insert(r);
      if (res.error) toast(`Option « ${o.label} » : ${res.error.message}`);
    }
    // images
    await supabase.from("product_images").delete().eq("product_id", pid);
    if (imgs.length) await supabase.from("product_images").insert(imgs.map((im, k) => ({ product_id: pid, path: im.path, alt: im.alt || p.name, sort_order: k })));
    setBusy(false); toast("Produit enregistré"); refresh();
    if (isNew) nav(`/admin/produits/${pid}`, { replace: true });
  };

  const preview = p.engraving_placeholder?.replace(/^Ex\.\s*/, "") || "Prénom";
  return <>
    <div className="adm-head"><div><Link to="/admin/produits" className="muted">← Produits</Link><h1>{isNew ? "Nouveau produit" : p.name}</h1></div>
      {!isNew && <a className="ab" href={`/produit/${p.slug}`} target="_blank" rel="noopener">Voir sur le site ↗</a>}</div>
    {errs.length > 0 && <div className="card-a" style={{ borderColor: "#5a2424" }}>{errs.map((e) => <p key={e} className="err-a" style={{ margin: "2px 0" }}>{e}</p>)}</div>}

    <div className="split-a">
      <div>
        <div className="card-a"><h3>Informations</h3><p className="sub">Ce que le client lit sur la fiche produit.</p>
          <div className="fgrid">
            <F label="Nom du produit *" full><input type="text" value={p.name} onChange={(e) => set("name", e.target.value)} /></F>
            <F label="Adresse de la page (slug)" hint={`dollarsbijoux.com/produit/${p.slug || "…"}`}><input type="text" value={p.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} /></F>
            <F label="Catégorie *"><select value={p.category_id} onChange={(e) => set("category_id", e.target.value)}><option value="">Choisir…</option>{cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
            <F label="Description courte" full hint="Affichée sous le nom (1 ou 2 phrases)."><textarea value={p.short_description} onChange={(e) => set("short_description", e.target.value)} style={{ minHeight: 70 }} /></F>
            <F label="Description complète" full hint="Onglet « Description » de la fiche. Laissez vide pour reprendre la description courte."><textarea value={p.description} onChange={(e) => set("description", e.target.value)} /></F>
            <F label="Badge"><select value={p.badge_type} onChange={(e) => set("badge_type", e.target.value)}>{BADGES.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}</select></F>
            <F label="Texte du badge" hint="Ex. -33 %, Flash, Nouveau"><input type="text" value={p.badge_label} disabled={!p.badge_type} onChange={(e) => set("badge_label", e.target.value)} /></F>
          </div>
        </div>

        <div className="card-a"><h3>Options et prix</h3><p className="sub">Une ligne par variante (finition, modèle, formule…). Les prix promo se règlent dans <Link to="/admin/promotions" style={{ color: "var(--or-clair)" }}>Promotions</Link>.</p>
          <F label="Nom du choix affiché au client"><input type="text" value={p.option_label} onChange={(e) => set("option_label", e.target.value)} placeholder="Finition, Modèle, Formule…" /></F>
          <div className="rowlist" style={{ marginTop: 12 }}>
            {opts.map((o, i) => (
              <div key={o.id || i} className="opt-card" {...ro.bind(i)}>
                <span className="handle" title="Glisser pour réordonner">⋮⋮</span>
                <div className="opt-body">
                  <div className="opt-l1">
                    <input type="text" value={o.label} onChange={(e) => setO(i, "label", e.target.value)} placeholder="Libellé (ex. Doré)" aria-label="Libellé" />
                    <button type="button" className="ab sm danger" onClick={() => setOpts(opts.filter((_, j) => j !== i))} aria-label="Supprimer l'option">✕</button>
                  </div>
                  <div className="opt-l2">
                    <F label="Prix (FCFA)"><Num value={o.price} onChange={(v) => setO(i, "price", v)} placeholder={o.is_quote ? "—" : "Ex. 7500"} /></F>
                    <F label="Prix barré"><Num value={o.compare_at_price} onChange={(v) => setO(i, "compare_at_price", v)} placeholder="Facultatif" /></F>
                    <F label="Pastille"><select value={o.swatch || ""} onChange={(e) => setO(i, "swatch", e.target.value || null)}><option value="">Aucune</option><option value="gold">Dorée</option><option value="silver">Argentée</option></select></F>
                  </div>
                  <div className="opt-l3">
                    <Toggle checked={o.is_quote} onChange={(v) => setO(i, "is_quote", v)} label="Sur devis" />
                    <Toggle checked={o.is_active} onChange={(v) => setO(i, "is_active", v)} label="Active" />
                    {o.promo && <span className="chip red">En promo : {fmtS(o.effective || 0)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="ab sm" style={{ marginTop: 10 }} onClick={() => setOpts([...opts, { label: "", price: null, compare_at_price: null, is_quote: false, swatch: null, is_active: true }])}>+ Ajouter une option</button>
        </div>

        <div className="card-a"><h3>Photos</h3><p className="sub">Jusqu'à 8 photos. Glissez pour changer l'ordre : la première est la photo principale.</p>
          <div className="imgs-a">
            {imgs.map((im, i) => (
              <div className="imgbox" key={im.path + i} {...ri.bind(i)}>
                {i === 0 && <span className="chip gold first">Principale</span>}
                <img src={mediaUrl(im.path, "sm")} alt="" />
                <div className="bar">
                  <button type="button" className="ab sm" onClick={() => ri.move(i, i - 1)} disabled={i === 0}>←</button>
                  <button type="button" className="ab sm" onClick={() => ri.move(i, i + 1)} disabled={i === imgs.length - 1}>→</button>
                  <button type="button" className="ab sm danger" onClick={() => setImgs(imgs.filter((_, j) => j !== i))}>✕</button>
                </div>
              </div>
            ))}
          </div>
          {imgs.length < 8 && <div style={{ marginTop: 12 }}><ImageUploader spec="product" onUploaded={(path) => setImgs((s) => [...s, { path, alt: p.name }])} /></div>}
        </div>
      </div>

      <div>
        <div className="card-a"><h3>Visibilité</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <Toggle checked={p.is_published} onChange={(v) => set("is_published", v)} label="Publié sur le site" />
            <Toggle checked={p.is_featured} onChange={(v) => set("is_featured", v)} label="Mis en avant (affiché en premier)" />
            <F label="Ordre d'affichage" hint="Plus petit = plus haut"><Num value={p.sort_order} onChange={(v) => set("sort_order", v ?? 0)} /></F>
          </div>
        </div>
        <div className="card-a"><h3>Gravure</h3><p className="sub">Ce que le client doit écrire avant de commander.</p>
          <div style={{ display: "grid", gap: 12 }}>
            <F label="Mode"><select value={p.engraving_mode} onChange={(e) => set("engraving_mode", e.target.value)}>
              <option value="none">Aucune gravure</option><option value="optional">Facultative (case « Ajouter une gravure »)</option><option value="required">Obligatoire (impossible de commander sans)</option></select></F>
            {p.engraving_mode !== "none" && <>
              <F label="Titre du champ"><input type="text" value={p.engraving_label} onChange={(e) => set("engraving_label", e.target.value)} /></F>
              <F label="Exemple affiché dans le champ"><input type="text" value={p.engraving_placeholder} onChange={(e) => set("engraving_placeholder", e.target.value)} /></F>
              <F label="Nombre maximum de caractères"><Num value={p.engraving_max_length} onChange={(v) => set("engraving_max_length", v ?? 20)} /></F>
              <F label="Aide (facultatif)"><input type="text" value={p.engraving_hint} onChange={(e) => set("engraving_hint", e.target.value)} placeholder="Ex. Majuscules et accents acceptés" /></F>
              <Toggle checked={p.engraving_live_preview} onChange={(v) => set("engraving_live_preview", v)} label="Aperçu doré/argenté en direct (chaînes prénom)" />
              <div className="preview-mini">
                <small className="muted">Aperçu client</small>
                {p.engraving_live_preview && <div style={{ border: "1px solid #2a251b", margin: "8px 0" }}><NamePreview text={preview} finish="gold" /></div>}
                <div style={{ fontSize: 12, fontWeight: 700, color: "#bdb4a4", margin: "8px 0 4px" }}>{p.engraving_mode === "optional" ? "☐ Ajouter une gravure (offerte) → " : ""}{p.engraving_label}{p.engraving_mode === "required" ? " · OBLIGATOIRE" : ""}</div>
                <input type="text" disabled placeholder={p.engraving_placeholder} />
                <small className="muted">0 / {p.engraving_max_length}</small>
              </div>
            </>}
          </div>
        </div>
      </div>
    </div>
    <div className="savebar"><Link className="ab" to="/admin/produits">Annuler</Link><button className="ab pri" onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le produit"}</button></div>
  </>;
}
