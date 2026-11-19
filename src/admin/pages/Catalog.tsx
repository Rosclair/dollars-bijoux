import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { mediaUrl, supabase, SUPABASE_URL } from "../../lib/core";
import { toast } from "../../components/ui";
import { Confirm, F, ImageField, Toggle, run, slugify, useRefresh, useReorder } from "../kit";
import { useAdmCategories } from "./Products";

/* ---------- Catégories ---------- */
export function Categories() {
  const { data } = useAdmCategories();
  const refresh = useRefresh();
  const [list, setList] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [del, setDel] = useState<any>(null);
  useEffect(() => { if (data) setList(data); }, [data]);
  const ro = useReorder(list, setList);
  const dirtyOrder = data && list.map((c) => c.id).join() !== data.map((c: any) => c.id).join();
  const saveOrder = async () => { for (const [k, c] of list.entries()) await supabase.from("categories").update({ sort_order: k + 1 }).eq("id", c.id); toast("Ordre enregistré"); refresh(); };
  const save = async () => {
    if (!edit.name.trim()) { toast("Le nom est obligatoire"); return; }
    const row = { name: edit.name.trim(), slug: slugify(edit.slug || edit.name), image_path: edit.image_path, is_active: edit.is_active };
    const ok = edit.id ? await run(supabase.from("categories").update(row).eq("id", edit.id).select(), "Catégorie enregistrée")
      : await run(supabase.from("categories").insert({ ...row, sort_order: list.length + 1 }).select(), "Catégorie créée");
    if (ok) { setEdit(null); refresh(); }
  };
  const remove = async () => { await run(supabase.from("categories").delete().eq("id", del.id).select(), "Catégorie supprimée"); setDel(null); refresh(); };
  return <>
    <div className="adm-head"><div><h1>Catégories</h1><p>Elles apparaissent en ronds dorés sur l'accueil et comme filtres de la boutique. Glissez pour changer l'ordre.</p></div>
      <div style={{ display: "flex", gap: 8 }}>{dirtyOrder && <button className="ab pri" onClick={saveOrder}>Enregistrer l'ordre</button>}<button className="ab" onClick={() => setEdit({ name: "", slug: "", image_path: null, is_active: true })}>+ Nouvelle catégorie</button></div></div>
    <div className="rowlist">
      {list.map((c, i) => (
        <div key={c.id} className="rowitem" {...ro.bind(i)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="handle">⋮⋮</span><img src={mediaUrl(c.image_path, "sm")} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} /></div>
          <div><b>{c.name}</b> <span className="muted">/boutique/{c.slug}</span> {!c.is_active && <span className="chip grey">Masquée</span>}</div>
          <div style={{ display: "flex", gap: 6 }}><button className="ab sm" onClick={() => setEdit({ ...c })}>Modifier</button><button className="ab sm danger" onClick={() => setDel(c)}>✕</button></div>
        </div>
      ))}
    </div>
    {edit && <div className="ovl" onClick={() => setEdit(null)}><div className="ovl-box" onClick={(e) => e.stopPropagation()}>
      <h2>{edit.id ? "Modifier la catégorie" : "Nouvelle catégorie"}</h2>
      <div className="fgrid">
        <F label="Nom *"><input type="text" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value, ...(edit.id ? {} : { slug: slugify(e.target.value) }) })} /></F>
        <F label="Adresse" hint={`/boutique/${edit.slug}`}><input type="text" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></F>
        <ImageField label="Image ronde" spec="category" value={edit.image_path} onChange={(v) => setEdit({ ...edit, image_path: v })} />
        <Toggle checked={edit.is_active} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Visible sur le site" />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}><button className="ab" onClick={() => setEdit(null)}>Annuler</button><button className="ab pri" onClick={save}>Enregistrer</button></div>
    </div></div>}
    {del && <Confirm text={`Supprimer la catégorie « ${del.name} » ? Ses produits resteront, sans catégorie.`} onYes={remove} onNo={() => setDel(null)} />}
  </>;
}

/* ---------- Médiathèque ---------- */
const FOLDERS = ["products", "categories", "sections", "promotions", "testimonials"];
export function Media() {
  const [folder, setFolder] = useState("products");
  const [del, setDel] = useState<string | null>(null);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["adm-media", folder],
    queryFn: async () => {
      const { data } = await supabase.storage.from("media").list(folder, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
      const bases = new Map<string, any>();
      (data ?? []).forEach((f) => { const m = f.name.match(/^(.+)_(sm|md|lg)\.webp$/); if (m) bases.set(m[1], f); });
      return [...bases.entries()].map(([b, f]) => ({ path: `${folder}/${b}`, created: f.created_at }));
    },
  });
  const { data: used } = useQuery({
    queryKey: ["adm-media-used"],
    queryFn: async () => {
      const [a, b, c, d, e, f] = await Promise.all([
        supabase.from("product_images").select("path"), supabase.from("categories").select("image_path"),
        supabase.from("home_sections").select("image_path,data"), supabase.from("promotions").select("banner_desktop_path,banner_mobile_path"),
        supabase.from("testimonials").select("photo_path"), supabase.from("settings").select("seo"),
      ]);
      return JSON.stringify([a.data, b.data, c.data, d.data, e.data, f.data]);
    },
  });
  const copy = async (p: string) => { try { await navigator.clipboard.writeText(`${SUPABASE_URL}/storage/v1/object/public/media/${p}_lg.webp`); toast("Adresse copiée"); } catch { toast("Copie impossible"); } };
  const remove = async () => {
    if (!del) return;
    const { error } = await supabase.storage.from("media").remove(["sm", "md", "lg"].map((s) => `${del}_${s}.webp`));
    toast(error ? `Erreur : ${error.message}` : "Image supprimée"); setDel(null); refetch();
  };
  return <>
    <div className="adm-head"><div><h1>Médiathèque</h1><p>Toutes les images envoyées depuis l'administration (3 tailles WebP chacune).</p></div></div>
    <div className="toolbar">{FOLDERS.map((f) => <button key={f} className={`ab sm ${folder === f ? "pri" : ""}`} onClick={() => setFolder(f)}>{{ products: "Produits", categories: "Catégories", sections: "Sections", promotions: "Promotions", testimonials: "Témoignages" }[f]}</button>)}</div>
    {isLoading ? <p className="muted">Chargement…</p> : !data?.length ? <p className="muted">Aucune image dans ce dossier pour l'instant. Les photos de démonstration du site ne sont pas listées ici : remplacez-les depuis chaque produit ou section.</p> :
      <div className="imgs-a">{data.map((m) => {
        const inUse = used?.includes(m.path);
        return <div className="imgbox" key={m.path}>
          {inUse && <span className="chip green first">Utilisée</span>}
          <img src={mediaUrl(m.path, "sm")} alt="" />
          <div className="bar"><button className="ab sm" onClick={() => copy(m.path)}>Copier l'adresse</button><button className="ab sm danger" onClick={() => setDel(m.path)}>✕</button></div>
        </div>;
      })}</div>}
    {del && <Confirm text={used?.includes(del) ? "Attention : cette image est encore utilisée sur le site. La supprimer laissera un emplacement vide. Continuer ?" : "Supprimer définitivement cette image ?"} onYes={remove} onNo={() => setDel(null)} />}
  </>;
}
