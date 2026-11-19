import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fmtS, mediaUrl, supabase } from "../../lib/core";
import { toast } from "../../components/ui";
import { Confirm, F, ImageField, Num, Toggle, fmtDate, fromLocalInput, promoStatus, run, slugify, toLocalInput, useRefresh } from "../kit";

const useAdmPromos = () => useQuery({ queryKey: ["adm-promos"], queryFn: async () => (await supabase.from("promotions").select("*").order("starts_at", { ascending: false })).data ?? [] });
const useAdmItems = () => useQuery({ queryKey: ["adm-promo-items"], queryFn: async () => (await supabase.from("promotion_items").select("*")).data ?? [] });
const useAdmCatalog = () => useQuery({
  queryKey: ["adm-catalog-opts"],
  queryFn: async () => {
    const [p, o, i] = await Promise.all([supabase.from("products").select("id,name,is_published").order("name"), supabase.from("product_options").select("*").order("sort_order"), supabase.from("product_images").select("product_id,path,sort_order").order("sort_order")]);
    return (p.data ?? []).map((x: any) => ({ ...x, options: (o.data ?? []).filter((y: any) => y.product_id === x.id && !y.is_quote), img: (i.data ?? []).find((y: any) => y.product_id === x.id)?.path }));
  },
});

export function PromotionsList() {
  const { data } = useAdmPromos();
  const { data: items } = useAdmItems();
  const refresh = useRefresh();
  const nav = useNavigate();
  const [del, setDel] = useState<any>(null);
  const duplicate = async (p: any) => {
    const { id, created_at, ...rest } = p;
    const start = new Date(); const end = new Date(Date.now() + (new Date(p.ends_at).getTime() - new Date(p.starts_at).getTime()));
    const np: any = await run(supabase.from("promotions").insert({ ...rest, slug: `${p.slug}-${Date.now().toString(36)}`, title: `${p.title} (copie)`, starts_at: start.toISOString(), ends_at: end.toISOString(), reserved_count: 0, is_active: false }).select().single());
    if (!np) return;
    const its = (items ?? []).filter((x: any) => x.promotion_id === p.id);
    if (its.length) await supabase.from("promotion_items").insert(its.map((x: any) => ({ promotion_id: np.id, product_option_id: x.product_option_id, promo_price: x.promo_price })));
    toast("Promotion dupliquée (désactivée) : ajustez les dates"); refresh(); nav(`/admin/promotions/${np.id}`);
  };
  const remove = async () => { await run(supabase.from("promotions").delete().eq("id", del.id).select(), "Promotion supprimée"); setDel(null); refresh(); };
  return <>
    <div className="adm-head"><div><h1>Promotions</h1><p>Les prix promo s'appliquent et s'arrêtent tout seuls aux dates choisies.</p></div>
      <div style={{ display: "flex", gap: 8 }}><Link className="ab" to="/admin/promotions/nouveau?type=flash">+ Promo flash</Link><Link className="ab pri" to="/admin/promotions/nouveau">+ Nouvelle promotion</Link></div></div>
    <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Promotion</th><th>Statut</th><th>Début</th><th>Fin</th><th>Options</th><th>Réservations</th><th></th></tr></thead>
      <tbody>{(data ?? []).map((p: any) => { const st = promoStatus(p); const n = (items ?? []).filter((x: any) => x.promotion_id === p.id).length; return (
        <tr key={p.id}>
          <td><Link to={`/admin/promotions/${p.id}`} style={{ fontWeight: 700 }}>{p.title}</Link><div className="muted" style={{ fontSize: 12 }}>{{ campaign: "Campagne", flash: "Flash", quota: "Premières commandes" }[p.kind as string]}{p.show_in_topbar ? " · bandeau" : ""}</div></td>
          <td><span className={`chip ${st.c}`}>{st.l}</span></td><td>{fmtDate(p.starts_at)}</td><td>{fmtDate(p.ends_at)}</td><td>{n}</td>
          <td>{p.quota ? `${p.reserved_count} / ${p.quota}` : "—"}</td>
          <td style={{ whiteSpace: "nowrap" }}><Link className="ab sm" to={`/admin/promotions/${p.id}`}>Modifier</Link> <button className="ab sm" onClick={() => duplicate(p)}>Dupliquer</button> <button className="ab sm danger" onClick={() => setDel(p)}>✕</button></td>
        </tr>); })}</tbody></table></div>
    {del && <Confirm text={`Supprimer « ${del.title} » ? Les prix reviendront immédiatement à la normale.`} onYes={remove} onNo={() => setDel(null)} />}
  </>;
}

const isoIn = (h: number, m = 0) => { const d = new Date(); const s = d.toISOString().slice(0, 10); return new Date(`${s}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+01:00`).toISOString(); };
const endOfMonth = () => { const d = new Date(); const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)); return new Date(`${last.toISOString().slice(0, 10)}T23:59:00+01:00`).toISOString(); };

export function PromotionEdit() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const isNew = id === "nouveau";
  const nav = useNavigate();
  const refresh = useRefresh();
  const { data: promos } = useAdmPromos();
  const { data: allItems } = useAdmItems();
  const { data: cat } = useAdmCatalog();
  const [p, setP] = useState<any>(null);
  const [items, setItems] = useState<Record<string, number | null>>({});
  const [search, setSearch] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) {
      const flash = sp.get("type") === "flash";
      setP({ title: flash ? "Promotion flash" : "", slug: "", subtitle: "", body: "", kind: flash ? "flash" : "campaign",
        starts_at: flash ? isoIn(10) : new Date().toISOString(), ends_at: flash ? isoIn(16) : endOfMonth(),
        quota: null, reserved_count: 0, banner_desktop_path: null, banner_mobile_path: null, cta_label: "", cta_link: "", topbar_text: "",
        show_in_topbar: flash, show_countdown: true, is_featured: false, is_active: true });
      setItems({}); return;
    }
    const x = promos?.find((y: any) => y.id === id); if (!x || !allItems) return;
    setP({ ...x, subtitle: x.subtitle || "", body: x.body || "", cta_label: x.cta_label || "", cta_link: x.cta_link || "", topbar_text: x.topbar_text || "" });
    setItems(Object.fromEntries(allItems.filter((i: any) => i.promotion_id === id).map((i: any) => [i.product_option_id, i.promo_price])));
  }, [id, promos, allItems, isNew, sp]);

  const conflicts = useMemo(() => {
    if (!p || !promos || !allItems) return [];
    const s = new Date(p.starts_at).getTime(), e = new Date(p.ends_at).getTime();
    const others = promos.filter((o: any) => o.id !== p.id && o.is_active && new Date(o.starts_at).getTime() < e && new Date(o.ends_at).getTime() > s);
    return allItems.filter((i: any) => i.product_option_id in items && others.some((o: any) => o.id === i.promotion_id)).map((i: any) => others.find((o: any) => o.id === i.promotion_id)?.title);
  }, [p, promos, allItems, items]);

  if (!p || !cat) return <p className="muted">Chargement…</p>;
  const set = (k: string, v: any) => setP((s: any) => ({ ...s, [k]: v }));
  const st = promoStatus(p);
  const shown = cat.filter((x: any) => x.options.length && (!search || x.name.toLowerCase().includes(search.toLowerCase()) || x.options.some((o: any) => o.id in items)));
  const applyPct = () => {
    if (!pct) return;
    const next = { ...items };
    Object.keys(next).forEach((oid) => { const o = cat.flatMap((x: any) => x.options).find((y: any) => y.id === oid); if (o) next[oid] = Math.round((o.price * (100 - pct)) / 100 / 100) * 100; });
    setItems(next); toast(`-${pct} % appliqué (arrondi à la centaine)`);
  };
  const save = async () => {
    if (!p.title.trim()) { toast("Le titre est obligatoire"); return; }
    if (new Date(p.ends_at) <= new Date(p.starts_at)) { toast("La fin doit être après le début"); return; }
    const bad = Object.entries(items).find(([, v]) => v === null || v === undefined || v < 0);
    if (bad) { toast("Indiquez un prix promo pour chaque option cochée"); return; }
    setBusy(true);
    const row = { title: p.title.trim(), slug: slugify(p.slug || p.title), subtitle: p.subtitle || null, body: p.body || null, kind: p.kind, starts_at: p.starts_at, ends_at: p.ends_at,
      quota: p.quota || null, reserved_count: p.reserved_count || 0, banner_desktop_path: p.banner_desktop_path, banner_mobile_path: p.banner_mobile_path,
      cta_label: p.cta_label || null, cta_link: p.cta_link || null, topbar_text: p.topbar_text || null, show_in_topbar: p.show_in_topbar, show_countdown: p.show_countdown, is_featured: p.is_featured, is_active: p.is_active };
    if (promos?.some((o: any) => o.slug === row.slug && o.id !== p.id)) row.slug = `${row.slug}-${Date.now().toString(36)}`;
    const saved: any = isNew ? await run(supabase.from("promotions").insert(row).select().single()) : await run(supabase.from("promotions").update(row).eq("id", p.id).select().single());
    if (!saved) { setBusy(false); return; }
    await supabase.from("promotion_items").delete().eq("promotion_id", saved.id);
    const rows = Object.entries(items).map(([oid, v]) => ({ promotion_id: saved.id, product_option_id: oid, promo_price: v as number }));
    if (rows.length) { const r = await supabase.from("promotion_items").insert(rows); if (r.error) toast(`Erreur produits : ${r.error.message}`); }
    setBusy(false); toast("Promotion enregistrée"); refresh();
    if (isNew) nav(`/admin/promotions/${saved.id}`, { replace: true });
  };
  return <>
    <div className="adm-head"><div><Link to="/admin/promotions" className="muted">← Promotions</Link><h1>{isNew ? "Nouvelle promotion" : p.title}</h1>{!isNew && <span className={`chip ${st.c}`}>{st.l}</span>}</div>
      {!isNew && <a className="ab" href={`/promos/${p.slug}`} target="_blank" rel="noopener">Voir la page ↗</a>}</div>
    <div className="split-a">
      <div>
        <div className="card-a"><h3>La promotion</h3>
          <div className="fgrid">
            <F label="Titre *" full><input type="text" value={p.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex. La Grande Promo de fin d'année" /></F>
            <F label="Accroche (prix mis en avant)" hint="Ex. L'ensemble complet 10 000 FCFA"><input type="text" value={p.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></F>
            <F label="Type"><select value={p.kind} onChange={(e) => set("kind", e.target.value)}><option value="campaign">Campagne</option><option value="flash">Promo flash</option><option value="quota">Premières commandes (quota)</option></select></F>
            <F label="Texte" full><textarea value={p.body} onChange={(e) => set("body", e.target.value)} /></F>
          </div>
        </div>
        <div className="card-a"><h3>Dates</h3><p className="sub">Heure du Cameroun. Raccourcis :{" "}
          <button className="ab sm" onClick={() => { set("starts_at", isoIn(10)); set("ends_at", isoIn(16)); }}>Flash 10h–16h aujourd'hui</button>{" "}
          <button className="ab sm" onClick={() => { set("starts_at", new Date().toISOString()); set("ends_at", endOfMonth()); }}>Jusqu'à la fin du mois</button></p>
          <div className="fgrid">
            <F label="Début"><input type="datetime-local" value={toLocalInput(p.starts_at)} onChange={(e) => set("starts_at", fromLocalInput(e.target.value))} /></F>
            <F label="Fin"><input type="datetime-local" value={toLocalInput(p.ends_at)} onChange={(e) => set("ends_at", fromLocalInput(e.target.value))} /></F>
            <F label="Quota (facultatif)" hint="Ex. 100 premières commandes"><Num value={p.quota} onChange={(v) => set("quota", v)} /></F>
            <F label="Déjà réservés" hint="Avance aussi quand une commande passe en « Confirmée »"><Num value={p.reserved_count} onChange={(v) => set("reserved_count", v ?? 0)} /></F>
          </div>
        </div>
        <div className="card-a"><h3>Produits concernés</h3><p className="sub">Cochez les options en promo et indiquez leur prix promo.</p>
          {conflicts.length > 0 && <p className="warn-a">Attention : certaines options sont aussi dans « {[...new Set(conflicts)].join(", ")} » sur la même période. Le prix de la promo qui se termine le plus tôt s'appliquera.</p>}
          <div className="toolbar">
            <input type="search" placeholder="Rechercher un produit" value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="muted">Réduction rapide :</span><div style={{ width: 90 }}><Num value={pct} onChange={setPct} placeholder="%" /></div>
            <button className="ab sm" onClick={applyPct} disabled={!pct || !Object.keys(items).length}>Appliquer aux options cochées</button>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {shown.map((x: any) => (
              <div key={x.id} style={{ border: "1px solid #2a251b", borderRadius: 8, padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>{x.img && <img src={mediaUrl(x.img, "sm")} alt="" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 4 }} />}<b>{x.name}</b>{!x.is_published && <span className="chip grey">Non publié</span>}</div>
                {x.options.map((o: any) => { const on = o.id in items; const v = items[o.id]; const off = on && v ? Math.round(100 - (v / o.price) * 100) : null; return (
                  <div key={o.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr 120px auto", gap: 10, alignItems: "center", padding: "4px 0" }}>
                    <label className="tg"><input type="checkbox" checked={on} onChange={(e) => { const n = { ...items }; if (e.target.checked) n[o.id] = o.price; else delete n[o.id]; setItems(n); }} aria-label={o.label} /></label>
                    <span>{o.label} <span className="muted">· {fmtS(o.price)}</span></span>
                    {on ? <Num value={v} onChange={(nv) => setItems({ ...items, [o.id]: nv })} placeholder="Prix promo" /> : <span />}
                    <span className={off ? "chip red" : ""}>{off ? `-${off} %` : ""}</span>
                  </div>); })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div>
        <div className="card-a"><h3>Affichage</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <Toggle checked={p.is_active} onChange={(v) => set("is_active", v)} label="Promotion active" />
            <Toggle checked={p.show_in_topbar} onChange={(v) => set("show_in_topbar", v)} label="Dans le bandeau rouge en haut du site" />
            {p.show_in_topbar && <F label="Texte du bandeau"><input type="text" value={p.topbar_text} onChange={(e) => set("topbar_text", e.target.value)} placeholder="Ex. Promo flash : chaînes prénom dès 4 900 F" /></F>}
            <Toggle checked={p.show_countdown} onChange={(v) => set("show_countdown", v)} label="Afficher le compte à rebours" />
            <Toggle checked={p.is_featured} onChange={(v) => set("is_featured", v)} label="Mise en avant sur l'accueil" />
            <F label="Bouton : texte"><input type="text" value={p.cta_label} onChange={(e) => set("cta_label", e.target.value)} placeholder="Voir la promo" /></F>
            <F label="Bouton : lien" hint="Vide = page de la promotion"><input type="text" value={p.cta_link} onChange={(e) => set("cta_link", e.target.value)} placeholder="/promos/…" /></F>
          </div>
        </div>
        <div className="card-a"><h3>Bannières</h3>
          <div style={{ display: "grid", gap: 16 }}>
            <ImageField label="Ordinateur (16:10)" spec="promo_desktop" value={p.banner_desktop_path} onChange={(v) => set("banner_desktop_path", v)} />
            <ImageField label="Téléphone (4:5)" spec="promo_mobile" value={p.banner_mobile_path} onChange={(v) => set("banner_mobile_path", v)} />
          </div>
        </div>
      </div>
    </div>
    <div className="savebar"><Link className="ab" to="/admin/promotions">Annuler</Link><button className="ab pri" onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer la promotion"}</button></div>
  </>;
}

/* ---------- Codes promo ---------- */
export function PromoCodes() {
  const { data } = useQuery({ queryKey: ["adm-codes"], queryFn: async () => (await supabase.from("promo_codes").select("*").order("code")).data ?? [] });
  const refresh = useRefresh();
  const [edit, setEdit] = useState<any>(null);
  const [del, setDel] = useState<any>(null);
  const save = async () => {
    const code = (edit.code || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!code) { toast("Le code est obligatoire"); return; }
    const row = { code, description: edit.description || null, discount_type: edit.discount_type, discount_value: edit.discount_value || 0, min_amount: edit.min_amount || 0,
      starts_at: edit.starts_at || null, ends_at: edit.ends_at || null, show_on_site: edit.show_on_site, is_active: edit.is_active };
    const ok = edit.id ? await run(supabase.from("promo_codes").update(row).eq("id", edit.id).select(), "Code enregistré") : await run(supabase.from("promo_codes").insert(row).select(), "Code créé");
    if (ok) { setEdit(null); refresh(); }
  };
  const remove = async () => { await run(supabase.from("promo_codes").delete().eq("id", del.id).select(), "Code supprimé"); setDel(null); refresh(); };
  const label = (c: any) => c.discount_type === "percent" ? `-${c.discount_value} %` : c.discount_type === "fixed" ? `-${fmtS(c.discount_value)}` : "Informatif";
  return <>
    <div className="adm-head"><div><h1>Codes promo</h1><p>Le client saisit le code à la commande ; il est transmis dans le message WhatsApp.</p></div>
      <button className="ab pri" onClick={() => setEdit({ code: "", description: "", discount_type: "none", discount_value: 0, min_amount: 0, starts_at: null, ends_at: null, show_on_site: true, is_active: true })}>+ Nouveau code</button></div>
    <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Code</th><th>Remise</th><th>Validité</th><th>Affiché</th><th>Actif</th><th></th></tr></thead>
      <tbody>{(data ?? []).map((c: any) => <tr key={c.id}>
        <td><b style={{ letterSpacing: ".1em" }}>{c.code}</b><div className="muted" style={{ fontSize: 12 }}>{c.description}</div></td>
        <td>{label(c)}{c.min_amount ? <div className="muted" style={{ fontSize: 12 }}>dès {fmtS(c.min_amount)}</div> : null}</td>
        <td>{c.starts_at || c.ends_at ? `${fmtDate(c.starts_at)} → ${fmtDate(c.ends_at)}` : "Sans limite"}</td>
        <td>{c.show_on_site ? "Oui" : "Non"}</td><td>{c.is_active ? <span className="chip green">Actif</span> : <span className="chip grey">Inactif</span>}</td>
        <td style={{ whiteSpace: "nowrap" }}><button className="ab sm" onClick={() => setEdit({ ...c })}>Modifier</button> <button className="ab sm danger" onClick={() => setDel(c)}>✕</button></td>
      </tr>)}</tbody></table></div>
    {edit && <div className="ovl" onClick={() => setEdit(null)}><div className="ovl-box" onClick={(e) => e.stopPropagation()}>
      <h2>{edit.id ? "Modifier le code" : "Nouveau code"}</h2>
      <div className="fgrid">
        <F label="Code *"><input type="text" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} placeholder="Ex. DBWEEK01" /></F>
        <F label="Type de remise"><select value={edit.discount_type} onChange={(e) => setEdit({ ...edit, discount_type: e.target.value })}><option value="none">Aucune (code informatif)</option><option value="percent">Pourcentage</option><option value="fixed">Montant fixe</option></select></F>
        <F label="Description pour le client" full><input type="text" value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></F>
        {edit.discount_type !== "none" && <F label={edit.discount_type === "percent" ? "Remise (%)" : "Remise (FCFA)"}><Num value={edit.discount_value} onChange={(v) => setEdit({ ...edit, discount_value: v ?? 0 })} /></F>}
        <F label="Montant minimum (FCFA)"><Num value={edit.min_amount} onChange={(v) => setEdit({ ...edit, min_amount: v ?? 0 })} /></F>
        <F label="Début (facultatif)"><input type="datetime-local" value={toLocalInput(edit.starts_at)} onChange={(e) => setEdit({ ...edit, starts_at: fromLocalInput(e.target.value) })} /></F>
        <F label="Fin (facultatif)"><input type="datetime-local" value={toLocalInput(edit.ends_at)} onChange={(e) => setEdit({ ...edit, ends_at: fromLocalInput(e.target.value) })} /></F>
        <Toggle checked={edit.show_on_site} onChange={(v) => setEdit({ ...edit, show_on_site: v })} label="Afficher sur la page Promos" />
        <Toggle checked={edit.is_active} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Actif" />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}><button className="ab" onClick={() => setEdit(null)}>Annuler</button><button className="ab pri" onClick={save}>Enregistrer</button></div>
    </div></div>}
    {del && <Confirm text={`Supprimer le code ${del.code} ?`} onYes={remove} onNo={() => setDel(null)} />}
  </>;
}
