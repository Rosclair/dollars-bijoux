import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fmtS, mediaUrl, supabase } from "../../lib/core";
import { toast } from "../../components/ui";
import { Confirm, F, ImageField, ListEditor, Num, Toggle, run, slugify, useRefresh, useReorder } from "../kit";
import { useAdmCategories } from "./Products";

const NAMES: Record<string, { l: string; d: string }> = {
  hero: { l: "Bannière d'accueil", d: "Grand titre, image, boutons, chiffres clés" },
  categories: { l: "Ronds des collections", d: "Catégories affichées sous la bannière" },
  studio: { l: "Studio de gravure", d: "Aperçu du prénom en direct" },
  promo: { l: "Bloc promotion", d: "Promo mise en avant, compte à rebours, codes" },
  shop: { l: "Boutique", d: "Grille de produits avec filtres" },
  wedding: { l: "Mariage", d: "Texte, image et packs mariage" },
  family: { l: "Famille (Atcha)", d: "Tableau des prix par nombre de chaînes" },
  business: { l: "Entreprises", d: "Offre pin's, porte-clés, hôtels" },
  trust: { l: "Réassurance", d: "4 blocs : matière, fabrication, livraison, paiement" },
  testimonials: { l: "Témoignages", d: "Avis clients" },
  reseller: { l: "Revendeurs", d: "Bandeau devenir revendeur" },
};
const useAdmSections = () => useQuery({ queryKey: ["adm-sections"], queryFn: async () => (await supabase.from("home_sections").select("*").order("sort_order")).data ?? [] });

export function SectionsList() {
  const { data } = useAdmSections();
  const refresh = useRefresh();
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { if (data) setList(data); }, [data]);
  const ro = useReorder(list, setList);
  const dirty = data && list.map((s) => s.key).join() !== data.map((s: any) => s.key).join();
  const saveOrder = async () => { for (const [k, s] of list.entries()) await supabase.from("home_sections").update({ sort_order: k + 1 }).eq("key", s.key); toast("Ordre de l'accueil enregistré"); refresh(); };
  const toggle = async (s: any) => { await run(supabase.from("home_sections").update({ is_visible: !s.is_visible }).eq("key", s.key).select(), s.is_visible ? "Section masquée" : "Section affichée"); refresh(); };
  return <>
    <div className="adm-head"><div><h1>Page d'accueil</h1><p>Glissez pour changer l'ordre des sections, masquez-en, modifiez textes et images.</p></div>
      <div style={{ display: "flex", gap: 8 }}>{dirty && <button className="ab pri" onClick={saveOrder}>Enregistrer l'ordre</button>}<a className="ab" href="/" target="_blank" rel="noopener">Voir l'accueil ↗</a></div></div>
    <div className="rowlist">
      {list.map((s, i) => (
        <div key={s.key} className="rowitem" {...ro.bind(i)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="handle">⋮⋮</span><b className="muted">{String(i + 1).padStart(2, "0")}</b></div>
          <div><b>{NAMES[s.key]?.l || s.key}</b> {!s.is_visible && <span className="chip grey">Masquée</span>}<div className="muted" style={{ fontSize: 12.5 }}>{s.title || NAMES[s.key]?.d}</div></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="ab sm" onClick={() => ro.move(i, i - 1)} aria-label="Monter">↑</button><button className="ab sm" onClick={() => ro.move(i, i + 1)} aria-label="Descendre">↓</button>
            <label className="tg"><input type="checkbox" checked={s.is_visible} onChange={() => toggle(s)} aria-label="Visible" /></label>
            <Link className="ab sm" to={`/admin/accueil/${s.key}`}>Modifier</Link>
          </div>
        </div>
      ))}
    </div>
  </>;
}

export function SectionEdit() {
  const { key } = useParams();
  const { data } = useAdmSections();
  const { data: cats } = useAdmCategories();
  const { data: products } = useQuery({ queryKey: ["adm-prod-names"], queryFn: async () => (await supabase.from("products").select("slug,name").order("name")).data ?? [] });
  const { data: promos } = useQuery({ queryKey: ["adm-promos"], queryFn: async () => (await supabase.from("promotions").select("*").order("starts_at", { ascending: false })).data ?? [] });
  const refresh = useRefresh();
  const [s, setS] = useState<any>(null);
  useEffect(() => { const x = data?.find((y: any) => y.key === key); if (x) setS({ ...x, data: x.data || {} }); }, [data, key]);
  if (!s) return <p className="muted">Chargement…</p>;
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  const d = s.data; const setD = (k: string, v: any) => setS({ ...s, data: { ...s.data, [k]: v } });
  const setDD = (k: string, sub: string, v: any) => setD(k, { ...(d[k] || {}), [sub]: v });
  const save = async () => {
    const { key: k, updated_at, sort_order, ...row } = s;
    for (const f of ["eyebrow", "title", "subtitle", "body", "cta_label", "cta_link"]) if (row[f] === "") row[f] = null;
    if (await run(supabase.from("home_sections").update(row).eq("key", k).select(), "Section enregistrée")) refresh();
  };
  const T = (k: string, label: string, opts?: { area?: boolean; hint?: string; full?: boolean }) => (
    <F label={label} hint={opts?.hint} full={opts?.full ?? opts?.area}>{opts?.area ? <textarea value={s[k] || ""} onChange={(e) => set(k, e.target.value)} /> : <input type="text" value={s[k] || ""} onChange={(e) => set(k, e.target.value)} />}</F>);
  const imgs: string[] = d.images || [];
  return <>
    <div className="adm-head"><div><Link to="/admin/accueil" className="muted">← Page d'accueil</Link><h1>{NAMES[s.key]?.l || s.key}</h1><p>{NAMES[s.key]?.d}</p></div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Toggle checked={s.is_visible} onChange={(v) => set("is_visible", v)} label="Visible" /><a className="ab" href="/" target="_blank" rel="noopener">Voir l'accueil ↗</a></div></div>

    {!["categories", "trust"].includes(s.key) && <div className="card-a"><h3>Textes</h3><p className="sub">Champ vide = texte par défaut de la maquette.</p>
      <div className="fgrid">
        {T("eyebrow", "Petit titre doré (au-dessus)", { full: true })}
        {T("title", "Titre", { full: true, hint: s.key === "hero" ? "Le mot en calligraphie doit apparaître dans le titre." : "Un point suivi d'une phrase crée un retour à la ligne." })}
        {s.key !== "testimonials" && T("body", "Texte", { area: true })}
        {["hero", "studio", "family", "business", "reseller"].includes(s.key) && <>{T("cta_label", "Texte du bouton")}{s.key !== "studio" && s.key !== "business" && T("cta_link", "Lien du bouton", { hint: "Ex. /creer, /promos, /famille" })}</>}
      </div>
    </div>}

    {s.key === "hero" && <div className="card-a"><h3>Bannière</h3>
      <div className="fgrid">
        <F label="Mot en calligraphie dorée"><input type="text" value={d.script_word || ""} onChange={(e) => setD("script_word", e.target.value)} /></F>
        <F label="Bouton secondaire : texte"><input type="text" value={d.secondary_cta?.label || ""} onChange={(e) => setDD("secondary_cta", "label", e.target.value)} /></F>
        <F label="Bouton secondaire : lien"><input type="text" value={d.secondary_cta?.link || ""} onChange={(e) => setDD("secondary_cta", "link", e.target.value)} /></F>
        <ImageField label="Image principale (portrait 4:5)" spec="hero" value={s.image_path} onChange={(v) => set("image_path", v)} />
        <F label="Carte flottante : petit titre"><input type="text" value={d.float_card?.eyebrow || ""} onChange={(e) => setDD("float_card", "eyebrow", e.target.value)} /></F>
        <F label="Carte flottante : titre"><input type="text" value={d.float_card?.title || ""} onChange={(e) => setDD("float_card", "title", e.target.value)} /></F>
        <F label="Carte flottante : texte" full><input type="text" value={d.float_card?.text || ""} onChange={(e) => setDD("float_card", "text", e.target.value)} /></F>
        <F label="Pastille ronde : grand texte"><input type="text" value={d.round_badge?.big || ""} onChange={(e) => setDD("round_badge", "big", e.target.value)} /></F>
        <F label="Pastille ronde : petit texte"><input type="text" value={d.round_badge?.small || ""} onChange={(e) => setDD("round_badge", "small", e.target.value)} /></F>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>Les chiffres clés (213 K abonnés…) se modifient dans <Link to="/admin/parametres" style={{ color: "var(--or-clair)" }}>Paramètres</Link>.</p>
    </div>}

    {s.key === "categories" && <div className="card-a"><h3>Collections affichées</h3><p className="sub">Cochez et ordonnez les catégories visibles en ronds.</p>
      <Toggle checked={!!d.show_promos_bubble} onChange={(v) => setD("show_promos_bubble", v)} label="Afficher la bulle « Promos » en premier" />
      <div style={{ marginTop: 12 }}><ListOrder all={(cats ?? []).map((c: any) => ({ v: c.slug, l: c.name }))} value={d.category_slugs || []} onChange={(v) => setD("category_slugs", v)} /></div>
    </div>}

    {s.key === "studio" && <div className="card-a"><h3>Studio</h3><div className="fgrid">
      <F label="Produit ajouté au panier"><select value={d.product_slug || ""} onChange={(e) => setD("product_slug", e.target.value)}>{products?.map((p: any) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></F>
      <F label="Prénom affiché par défaut"><input type="text" value={d.default_text || ""} onChange={(e) => setD("default_text", e.target.value)} /></F>
    </div></div>}

    {s.key === "promo" && <div className="card-a"><h3>Promotion mise en avant</h3><div className="fgrid">
      <F label="Promotion" hint="« Automatique » = la promotion en cours mise en avant qui se termine le plus tôt."><select value={d.promotion_slug || "auto"} onChange={(e) => setD("promotion_slug", e.target.value)}><option value="auto">Automatique</option>{promos?.map((p: any) => <option key={p.id} value={p.slug}>{p.title}</option>)}</select></F>
      <Toggle checked={!!d.show_codes} onChange={(v) => setD("show_codes", v)} label="Afficher les codes promo" />
    </div></div>}

    {s.key === "shop" && <div className="card-a"><h3>Grille</h3><div className="fgrid three">
      <F label="Nombre de produits"><Num value={d.limit} onChange={(v) => setD("limit", v || 24)} /></F>
      <F label="Filtre par défaut"><select value={d.default_filter || "all"} onChange={(e) => setD("default_filter", e.target.value)}><option value="all">Tous</option><option value="promos">Promos</option>{cats?.map((c: any) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></F>
      <Toggle checked={!!d.featured_only} onChange={(v) => setD("featured_only", v)} label="Produits mis en avant uniquement" />
    </div></div>}

    {s.key === "wedding" && <div className="card-a"><h3>Image</h3><ImageField label="Image (carrée)" spec="section" value={s.image_path} onChange={(v) => set("image_path", v)} /><p className="muted" style={{ fontSize: 12.5 }}>Les packs se modifient dans <Link to="/admin/packs-mariage" style={{ color: "var(--or-clair)" }}>Packs mariage</Link>.</p></div>}

    {(s.key === "family" || s.key === "business") && <div className="card-a"><h3>Images (3)</h3><p className="sub">La première image est plus grande.</p>
      <div className="fgrid three">{[0, 1, 2].map((i) => <div key={i}><ImageField label={`Image ${i + 1}`} spec="section" value={imgs[i] || null} onChange={(v) => { const c = [...imgs]; c[i] = v as string; setD("images", c.filter(Boolean)); }} /></div>)}</div>
      {s.key === "family" && <F label="Produit dont les prix sont affichés"><select value={d.product_slug || ""} onChange={(e) => setD("product_slug", e.target.value)}>{products?.map((p: any) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></F>}
    </div>}

    {s.key === "business" && <div className="card-a"><h3>Points et message</h3>
      <F label="Points de la liste" full><ListEditor value={d.points || []} onChange={(v) => setD("points", v)} /></F>
      <div style={{ marginTop: 12 }}><F label="Message WhatsApp prérempli" full><textarea value={d.whatsapp_message || ""} onChange={(e) => setD("whatsapp_message", e.target.value)} /></F></div>
    </div>}

    {s.key === "trust" && <div className="card-a"><h3>Blocs de réassurance</h3>
      {(d.items || []).map((it: any, i: number) => (
        <div key={i} className="fgrid three" style={{ padding: "10px 0", borderTop: "1px solid #2a251b" }}>
          <F label="Icône"><select value={it.icon} onChange={(e) => { const c = [...d.items]; c[i] = { ...it, icon: e.target.value }; setD("items", c); }}><option value="shield">Bouclier</option><option value="factory">Atelier</option><option value="truck">Livraison</option><option value="phone">Téléphone</option></select></F>
          <F label="Titre"><input type="text" value={it.title} onChange={(e) => { const c = [...d.items]; c[i] = { ...it, title: e.target.value }; setD("items", c); }} /></F>
          <F label="Texte"><input type="text" value={it.text} onChange={(e) => { const c = [...d.items]; c[i] = { ...it, text: e.target.value }; setD("items", c); }} /></F>
        </div>))}
    </div>}

    {s.key === "reseller" && <div className="card-a"><h3>Chiffre clé et message</h3><div className="fgrid">
      <F label="Chiffre mis en avant"><input type="text" value={d.big_figure || ""} onChange={(e) => setD("big_figure", e.target.value)} /></F>
      <F label="Légende du chiffre"><input type="text" value={d.big_caption || ""} onChange={(e) => setD("big_caption", e.target.value)} /></F>
      <F label="Message WhatsApp prérempli" full><textarea value={d.whatsapp_message || ""} onChange={(e) => setD("whatsapp_message", e.target.value)} /></F>
    </div></div>}

    {s.key === "testimonials" && <p className="muted">Les avis se gèrent dans <Link to="/admin/temoignages" style={{ color: "var(--or-clair)" }}>Témoignages</Link>.</p>}
    <div className="savebar"><Link className="ab" to="/admin/accueil">Retour</Link><button className="ab pri" onClick={save}>Enregistrer la section</button></div>
  </>;
}

function ListOrder({ all, value, onChange }: { all: { v: string; l: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const ordered = [...value.map((v) => all.find((a) => a.v === v)).filter(Boolean), ...all.filter((a) => !value.includes(a.v))] as { v: string; l: string }[];
  const { bind, move } = useReorder(ordered, (o) => onChange(o.filter((x) => value.includes(x.v)).map((x) => x.v)));
  return <div className="rowlist">{ordered.map((a, i) => (
    <div key={a.v} className="rowitem" {...bind(i)}>
      <span className="handle">⋮⋮</span>
      <label className="tg"><input type="checkbox" checked={value.includes(a.v)} onChange={(e) => onChange(e.target.checked ? [...value, a.v] : value.filter((x) => x !== a.v))} />{a.l}</label>
      <div style={{ display: "flex", gap: 6 }}><button className="ab sm" onClick={() => move(i, i - 1)}>↑</button><button className="ab sm" onClick={() => move(i, i + 1)}>↓</button></div>
    </div>))}</div>;
}

/* ---------- Packs mariage ---------- */
export function WeddingPacks() {
  const { data } = useQuery({ queryKey: ["adm-packs"], queryFn: async () => (await supabase.from("wedding_packs").select("*").order("sort_order")).data ?? [] });
  const refresh = useRefresh();
  const [edit, setEdit] = useState<any>(null);
  const [del, setDel] = useState<any>(null);
  const save = async () => {
    if (!edit.name?.trim() || !edit.price) { toast("Nom et prix obligatoires"); return; }
    const row = { name: edit.name.trim(), slug: slugify(edit.slug || edit.name), price: edit.price, compare_at_price: edit.compare_at_price || null, features: (edit.features || []).filter((x: string) => x.trim()), is_highlighted: edit.is_highlighted, sort_order: edit.sort_order ?? 0, is_active: edit.is_active };
    const ok = edit.id ? await run(supabase.from("wedding_packs").update(row).eq("id", edit.id).select(), "Pack enregistré") : await run(supabase.from("wedding_packs").insert(row).select(), "Pack créé");
    if (ok) { setEdit(null); refresh(); }
  };
  const remove = async () => { await run(supabase.from("wedding_packs").delete().eq("id", del.id).select(), "Pack supprimé"); setDel(null); refresh(); };
  return <>
    <div className="adm-head"><div><h1>Packs mariage</h1><p>Affichés sur l'accueil et sur la page Mariage.</p></div><button className="ab pri" onClick={() => setEdit({ name: "", slug: "", price: null, compare_at_price: null, features: [""], is_highlighted: false, sort_order: (data?.length ?? 0) + 1, is_active: true })}>+ Nouveau pack</button></div>
    <div className="rowlist">{(data ?? []).map((p: any) => (
      <div key={p.id} className="rowitem"><span className="chip gold">{p.sort_order}</span>
        <div><b>{p.name}</b> · {fmtS(p.price)} {p.compare_at_price ? <span className="muted" style={{ textDecoration: "line-through" }}>{fmtS(p.compare_at_price)}</span> : null} {p.is_highlighted && <span className="chip gold">Le plus choisi</span>} {!p.is_active && <span className="chip grey">Masqué</span>}<div className="muted" style={{ fontSize: 12.5 }}>{p.features.join(" · ")}</div></div>
        <div style={{ display: "flex", gap: 6 }}><button className="ab sm" onClick={() => setEdit({ ...p })}>Modifier</button><button className="ab sm danger" onClick={() => setDel(p)}>✕</button></div></div>))}</div>
    {edit && <div className="ovl" onClick={() => setEdit(null)}><div className="ovl-box" onClick={(e) => e.stopPropagation()}>
      <h2>{edit.id ? "Modifier le pack" : "Nouveau pack"}</h2>
      <div className="fgrid">
        <F label="Nom *"><input type="text" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></F>
        <F label="Ordre"><Num value={edit.sort_order} onChange={(v) => setEdit({ ...edit, sort_order: v ?? 0 })} /></F>
        <F label="Prix (FCFA) *"><Num value={edit.price} onChange={(v) => setEdit({ ...edit, price: v })} /></F>
        <F label="Prix barré"><Num value={edit.compare_at_price} onChange={(v) => setEdit({ ...edit, compare_at_price: v })} /></F>
        <F label="Ce que contient le pack" full><ListEditor value={edit.features || []} onChange={(v) => setEdit({ ...edit, features: v })} placeholder="Ex. 2 alliances gravées" /></F>
        <Toggle checked={edit.is_highlighted} onChange={(v) => setEdit({ ...edit, is_highlighted: v })} label="Mettre en avant (« Le plus choisi »)" />
        <Toggle checked={edit.is_active} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Visible" />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}><button className="ab" onClick={() => setEdit(null)}>Annuler</button><button className="ab pri" onClick={save}>Enregistrer</button></div>
    </div></div>}
    {del && <Confirm text={`Supprimer le pack ${del.name} ?`} onYes={remove} onNo={() => setDel(null)} />}
  </>;
}

/* ---------- Témoignages ---------- */
export function Testimonials() {
  const { data } = useQuery({ queryKey: ["adm-testi"], queryFn: async () => (await supabase.from("testimonials").select("*").order("sort_order")).data ?? [] });
  const refresh = useRefresh();
  const [edit, setEdit] = useState<any>(null);
  const [del, setDel] = useState<any>(null);
  const save = async () => {
    if (!edit.quote?.trim()) { toast("Le texte est obligatoire"); return; }
    const row = { quote: edit.quote.trim(), author: edit.author || null, context: edit.context || null, rating: edit.rating || 5, photo_path: edit.photo_path, is_visible: edit.is_visible, sort_order: edit.sort_order ?? 0 };
    const ok = edit.id ? await run(supabase.from("testimonials").update(row).eq("id", edit.id).select(), "Témoignage enregistré") : await run(supabase.from("testimonials").insert(row).select(), "Témoignage ajouté");
    if (ok) { setEdit(null); refresh(); }
  };
  const remove = async () => { await run(supabase.from("testimonials").delete().eq("id", del.id).select(), "Témoignage supprimé"); setDel(null); refresh(); };
  return <>
    <div className="adm-head"><div><h1>Témoignages</h1><p>Avis de clients affichés sur l'accueil et le studio. Utilisez de vrais retours clients, avec leur accord.</p></div><button className="ab pri" onClick={() => setEdit({ quote: "", author: "", context: "", rating: 5, photo_path: null, is_visible: true, sort_order: (data?.length ?? 0) + 1 })}>+ Ajouter</button></div>
    <div className="rowlist">{(data ?? []).map((t: any) => (
      <div key={t.id} className="rowitem">{t.photo_path ? <img src={mediaUrl(t.photo_path, "sm")} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} /> : <span className="chip gold">{"★".repeat(t.rating)}</span>}
        <div><i>« {t.quote} »</i><div className="muted" style={{ fontSize: 12.5 }}>{[t.author, t.context].filter(Boolean).join(", ")} {!t.is_visible && <span className="chip grey">Masqué</span>}</div></div>
        <div style={{ display: "flex", gap: 6 }}><button className="ab sm" onClick={() => setEdit({ ...t })}>Modifier</button><button className="ab sm danger" onClick={() => setDel(t)}>✕</button></div></div>))}</div>
    {edit && <div className="ovl" onClick={() => setEdit(null)}><div className="ovl-box" onClick={(e) => e.stopPropagation()}>
      <h2>{edit.id ? "Modifier le témoignage" : "Nouveau témoignage"}</h2>
      <div className="fgrid">
        <F label="Texte *" full><textarea value={edit.quote} onChange={(e) => setEdit({ ...edit, quote: e.target.value })} /></F>
        <F label="Auteur"><input type="text" value={edit.author || ""} onChange={(e) => setEdit({ ...edit, author: e.target.value })} placeholder="Ex. Ylenâ B." /></F>
        <F label="Contexte"><input type="text" value={edit.context || ""} onChange={(e) => setEdit({ ...edit, context: e.target.value })} placeholder="Ex. cliente, Douala" /></F>
        <F label="Note (1 à 5)"><select value={edit.rating} onChange={(e) => setEdit({ ...edit, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} étoile{n > 1 ? "s" : ""}</option>)}</select></F>
        <F label="Ordre"><Num value={edit.sort_order} onChange={(v) => setEdit({ ...edit, sort_order: v ?? 0 })} /></F>
        <ImageField label="Photo (facultatif)" spec="testimonial" value={edit.photo_path} onChange={(v) => setEdit({ ...edit, photo_path: v })} />
        <Toggle checked={edit.is_visible} onChange={(v) => setEdit({ ...edit, is_visible: v })} label="Visible" />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}><button className="ab" onClick={() => setEdit(null)}>Annuler</button><button className="ab pri" onClick={save}>Enregistrer</button></div>
    </div></div>}
    {del && <Confirm text="Supprimer ce témoignage ?" onYes={remove} onNo={() => setDel(null)} />}
  </>;
}
