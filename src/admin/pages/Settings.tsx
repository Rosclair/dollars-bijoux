import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/core";
import { toast } from "../../components/ui";
import { Confirm, F, Toggle, run, useRefresh, useReorder } from "../kit";

export function SettingsPage() {
  const { data } = useQuery({ queryKey: ["adm-settings"], queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data });
  const { data: citiesData } = useQuery({ queryKey: ["adm-cities"], queryFn: async () => (await supabase.from("cities").select("*").order("sort_order")).data ?? [] });
  const refresh = useRefresh();
  const [s, setS] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [del, setDel] = useState<any>(null);
  useEffect(() => { if (data) setS({ ...data, stats: data.stats || [], pages: data.pages || {}, seo: data.seo || {} }); }, [data]);
  useEffect(() => { if (citiesData) setCities(citiesData); }, [citiesData]);
  const ro = useReorder(cities, setCities);
  if (!s) return <p className="muted">Chargement…</p>;
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  const setP = (k: string, v: string) => setS({ ...s, pages: { ...s.pages, [k]: v } });
  const setSeo = (k: string, v: string) => setS({ ...s, seo: { ...s.seo, [k]: v } });
  const phoneOk = (n: string) => /^237[26]\d{8}$/.test(n);

  const save = async () => {
    for (const c of cities) if (!c.name?.trim() || !phoneOk(c.whatsapp_number || "")) { toast(`Ville « ${c.name || "?"} » : numéro au format 2376XXXXXXXX`); return; }
    if (s.support_whatsapp && !phoneOk(s.support_whatsapp)) { toast("Numéro service client au format 2376XXXXXXXX"); return; }
    const { id, updated_at, ...row } = s;
    for (const k of Object.keys(row)) if (row[k] === "") row[k] = null;
    row.stats = (s.stats || []).filter((x: any) => x.value?.trim());
    const ok = await run(supabase.from("settings").update(row).eq("id", 1).select());
    if (!ok) return;
    const prevIds = (citiesData ?? []).map((c: any) => c.id);
    const removed = prevIds.filter((x: string) => !cities.some((c) => c.id === x));
    if (removed.length) await supabase.from("cities").delete().in("id", removed);
    for (const [k, c] of cities.entries()) {
      const r = { name: c.name.trim(), whatsapp_number: c.whatsapp_number, sort_order: k + 1, is_active: c.is_active };
      const res = c.id ? await supabase.from("cities").update(r).eq("id", c.id) : await supabase.from("cities").insert(r);
      if (res.error) { toast(`Erreur ville : ${res.error.message}`); return; }
    }
    toast("Paramètres enregistrés"); refresh();
  };
  return <>
    <div className="adm-head"><div><h1>Paramètres</h1><p>Numéros WhatsApp, coordonnées, textes et référencement.</p></div></div>
    <div className="split-a">
      <div>
        <div className="card-a"><h3>Villes et numéros WhatsApp</h3><p className="sub">La ville choisie par le client à la commande détermine le numéro qui reçoit le message. La première ville est aussi le numéro principal du site. Format : 2376XXXXXXXX.</p>
          <div className="rowlist">{cities.map((c, i) => (
            <div key={c.id || i} className="rowitem" {...ro.bind(i)} style={{ gridTemplateColumns: "auto 1fr 1fr auto auto" }}>
              <span className="handle">⋮⋮</span>
              <input type="text" value={c.name} onChange={(e) => setCities(cities.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Ville" />
              <input type="text" inputMode="numeric" value={c.whatsapp_number} onChange={(e) => setCities(cities.map((x, j) => (j === i ? { ...x, whatsapp_number: e.target.value.replace(/\D/g, "") } : x)))} placeholder="2376XXXXXXXX" style={!phoneOk(c.whatsapp_number || "") ? { borderColor: "#7a3030" } : undefined} />
              <label className="tg"><input type="checkbox" checked={c.is_active} onChange={(e) => setCities(cities.map((x, j) => (j === i ? { ...x, is_active: e.target.checked } : x)))} aria-label="Active" /></label>
              <button className="ab sm danger" onClick={() => setDel(i)}>✕</button>
            </div>))}</div>
          <button className="ab sm" style={{ marginTop: 10 }} onClick={() => setCities([...cities, { name: "", whatsapp_number: "237", is_active: true }])}>+ Ajouter une ville</button>
        </div>
        <div className="card-a"><h3>Message WhatsApp de commande</h3><div className="fgrid">
          <F label="Première ligne" full><input type="text" value={s.wa_intro || ""} onChange={(e) => set("wa_intro", e.target.value)} /></F>
          <F label="Dernière ligne" full><input type="text" value={s.wa_outro || ""} onChange={(e) => set("wa_outro", e.target.value)} /></F>
        </div></div>
        <div className="card-a"><h3>Textes des pages</h3><div className="fgrid">
          <F label="À propos" full><textarea value={s.pages.a_propos || ""} onChange={(e) => setP("a_propos", e.target.value)} /></F>
          <F label="Livraison & délais" full hint="Aussi affiché dans l'onglet Livraison de chaque fiche produit."><textarea value={s.pages.livraison || ""} onChange={(e) => setP("livraison", e.target.value)} /></F>
          <F label="Mentions légales" full><textarea value={s.pages.mentions || ""} onChange={(e) => setP("mentions", e.target.value)} style={{ minHeight: 160 }} /></F>
        </div></div>
      </div>
      <div>
        <div className="card-a"><h3>Coordonnées</h3><div style={{ display: "grid", gap: 12 }}>
          <F label="Service client (WhatsApp)"><input type="text" inputMode="numeric" value={s.support_whatsapp || ""} onChange={(e) => set("support_whatsapp", e.target.value.replace(/\D/g, ""))} /></F>
          <F label="Email"><input type="email" value={s.email || ""} onChange={(e) => set("email", e.target.value)} /></F>
          <F label="Adresse Yaoundé"><input type="text" value={s.address_yaounde || ""} onChange={(e) => set("address_yaounde", e.target.value)} /></F>
          <F label="Page Facebook (lien)"><input type="text" value={s.facebook_url || ""} onChange={(e) => set("facebook_url", e.target.value)} placeholder="https://facebook.com/…" /></F>
          <F label="TikTok (lien)"><input type="text" value={s.tiktok_url || ""} onChange={(e) => set("tiktok_url", e.target.value)} /></F>
          <F label="Instagram (lien)"><input type="text" value={s.instagram_url || ""} onChange={(e) => set("instagram_url", e.target.value)} /></F>
          <F label="Groupe WhatsApp des promos (lien)"><input type="text" value={s.whatsapp_group_url || ""} onChange={(e) => set("whatsapp_group_url", e.target.value)} placeholder="https://chat.whatsapp.com/…" /></F>
        </div></div>
        <div className="card-a"><h3>Bandeau et chiffres clés</h3><div style={{ display: "grid", gap: 12 }}>
          <F label="Texte du bandeau quand aucune promo n'est en cours" hint="Vide = bandeau masqué"><input type="text" value={s.topbar_fallback_text || ""} onChange={(e) => set("topbar_fallback_text", e.target.value)} /></F>
          {[0, 1, 2].map((i) => <div key={i} className="fgrid"><F label={`Chiffre ${i + 1}`}><input type="text" value={s.stats[i]?.value || ""} onChange={(e) => { const c = [...s.stats]; c[i] = { ...(c[i] || {}), value: e.target.value }; set("stats", c); }} /></F>
            <F label="Légende"><input type="text" value={s.stats[i]?.label || ""} onChange={(e) => { const c = [...s.stats]; c[i] = { ...(c[i] || {}), label: e.target.value }; set("stats", c); }} /></F></div>)}
        </div></div>
        <div className="card-a"><h3>Référencement</h3><div style={{ display: "grid", gap: 12 }}>
          <F label="Titre Google de l'accueil"><input type="text" value={s.seo.title || ""} onChange={(e) => setSeo("title", e.target.value)} /></F>
          <F label="Description Google" hint={`${(s.seo.description || "").length} / 160 caractères conseillés`}><textarea value={s.seo.description || ""} onChange={(e) => setSeo("description", e.target.value)} style={{ minHeight: 70 }} /></F>
        </div></div>
        <div className="card-a"><h3>Maintenance</h3><Toggle checked={!!s.maintenance_mode} onChange={(v) => set("maintenance_mode", v)} label="Mode maintenance (le public voit « Bientôt de retour »)" /></div>
      </div>
    </div>
    <div className="savebar"><button className="ab pri" onClick={save}>Enregistrer les paramètres</button></div>
    {del !== null && <Confirm text={`Retirer la ville « ${cities[del]?.name} » ? (effectif après enregistrement)`} yes="Retirer" onYes={() => { setCities(cities.filter((_, j) => j !== del)); setDel(null); }} onNo={() => setDel(null)} />}
  </>;
}
