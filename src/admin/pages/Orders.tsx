import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fmt, supabase, waLink } from "../../lib/core";
import { toast } from "../../components/ui";
import { ORDER_STATUS, fmtDate, promoStatus, run, useRefresh } from "../kit";

type Order = { id: string; reference: string; created_at: string; customer_name: string | null; customer_whatsapp: string | null; city: string | null; area: string | null; note: string | null; promo_code: string | null; items: any[]; total: number | null; status: string; admin_note: string | null };

const useOrders = () => useQuery({
  queryKey: ["adm-orders"],
  queryFn: async () => ((await supabase.from("order_intents").select("*").order("created_at", { ascending: false }).limit(1000)).data ?? []) as Order[],
});

export function Dashboard() {
  const { data: orders } = useOrders();
  const { data: promos } = useQuery({ queryKey: ["adm-promos"], queryFn: async () => (await supabase.from("promotions").select("*").order("ends_at")).data ?? [] });
  const nav = useNavigate();
  const stats = useMemo(() => {
    const o = (orders ?? []).filter((x) => x.status !== "cancelled");
    const day = new Date(); day.setHours(0, 0, 0, 0);
    const week = Date.now() - 7 * 86400_000;
    const today = o.filter((x) => new Date(x.created_at) >= day);
    const w = o.filter((x) => new Date(x.created_at).getTime() >= week);
    const top = new Map<string, number>();
    w.forEach((x) => x.items?.forEach((i: any) => top.set(i.name, (top.get(i.name) || 0) + (i.qty || 1))));
    const cities = new Map<string, number>();
    w.forEach((x) => cities.set(x.city || "—", (cities.get(x.city || "—") || 0) + 1));
    return {
      today: today.length, week: w.length, weekTotal: w.reduce((s, x) => s + (x.total || 0), 0),
      pending: o.filter((x) => x.status === "new").length,
      top: [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5), cities: [...cities.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [orders]);
  const live = (promos ?? []).filter((p: any) => promoStatus(p).l === "En cours");
  return <>
    <div className="adm-head"><div><h1>Tableau de bord</h1><p>Vue d'ensemble des commandes envoyées sur WhatsApp.</p></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="ab" onClick={() => nav("/admin/produits/nouveau")}>+ Nouveau produit</button><button className="ab pri" onClick={() => nav("/admin/promotions/nouveau?type=flash")}>+ Promo flash</button></div></div>
    <div className="kpis">
      <div className="kpi"><b>{stats.today}</b><span>commandes aujourd'hui</span></div>
      <div className="kpi"><b>{stats.week}</b><span>commandes sur 7 jours</span></div>
      <div className="kpi"><b>{fmt(stats.weekTotal).replace(" FCFA", "")}</b><span>FCFA estimés sur 7 jours</span></div>
      <div className="kpi"><b>{stats.pending}</b><span>à confirmer</span></div>
    </div>
    <div className="split-a">
      <div className="card-a">
        <h3>Promotions en cours</h3><p className="sub">Temps restant et réservations.</p>
        {live.length ? live.map((p: any) => {
          const left = Math.max(0, new Date(p.ends_at).getTime() - Date.now());
          const pct = p.quota ? Math.min(100, Math.round((p.reserved_count / p.quota) * 100)) : null;
          return <div key={p.id} style={{ padding: "10px 0", borderTop: "1px solid #2a251b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><Link to={`/admin/promotions/${p.id}`} style={{ fontWeight: 700 }}>{p.title}</Link><span className="muted">{Math.floor(left / 86400_000)} j {Math.floor((left % 86400_000) / 3600_000)} h restants</span></div>
            {pct !== null && <div style={{ marginTop: 8 }}><small className="muted">{p.reserved_count} / {p.quota} réservés</small><div style={{ height: 6, background: "#2a251b", borderRadius: 3, marginTop: 4 }}><div style={{ width: `${pct}%`, height: "100%", background: "var(--rouge)", borderRadius: 3 }} /></div></div>}
          </div>;
        }) : <p className="muted">Aucune promotion en cours.</p>}
      </div>
      <div className="card-a">
        <h3>Sur 7 jours</h3>
        <p className="sub">Produits les plus commandés</p>
        {stats.top.length ? stats.top.map(([n, q]) => <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span>{n}</span><b>{q}</b></div>) : <p className="muted">Pas encore de commande.</p>}
        <p className="sub" style={{ marginTop: 14 }}>Par ville</p>
        {stats.cities.map(([c, n]) => <div key={c} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>{c}</span><b>{n}</b></div>)}
      </div>
    </div>
    <div className="card-a"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3>Dernières commandes</h3><Link to="/admin/commandes" className="ab sm">Tout voir</Link></div>
      <OrdersTable orders={(orders ?? []).slice(0, 8)} />
    </div>
  </>;
}

function OrdersTable({ orders }: { orders: Order[] }) {
  const nav = useNavigate();
  if (!orders.length) return <p className="muted">Aucune commande pour le moment.</p>;
  return (
    <div className="tbl-wrap" style={{ marginTop: 12 }}><table className="tbl"><thead><tr><th>Date</th><th>Réf.</th><th>Client</th><th>Ville</th><th>Articles</th><th>Total</th><th>Statut</th></tr></thead>
      <tbody>{orders.map((o) => { const st = ORDER_STATUS[o.status] || ORDER_STATUS.new; return (
        <tr key={o.id} onClick={() => nav(`/admin/commandes/${o.id}`)} style={{ cursor: "pointer" }}>
          <td>{fmtDate(o.created_at)}</td><td style={{ fontWeight: 700 }}>{o.reference}</td><td>{o.customer_name}</td><td>{o.city}</td>
          <td>{o.items?.reduce((s: number, i: any) => s + (i.qty || 1), 0)}</td><td className="tab-num">{fmt(o.total || 0)}</td><td><span className={`chip ${st.c}`}>{st.l}</span></td>
        </tr>); })}</tbody></table></div>
  );
}

export function OrdersList() {
  const { data, isLoading } = useOrders();
  const [q, setQ] = useState(""); const [st, setSt] = useState(""); const [city, setCity] = useState(""); const [period, setPeriod] = useState("");
  const list = useMemo(() => (data ?? []).filter((o) => {
    if (st && o.status !== st) return false;
    if (city && o.city !== city) return false;
    if (period) { const d = Number(period) * 86400_000; if (Date.now() - new Date(o.created_at).getTime() > d) return false; }
    if (q) { const s = q.toLowerCase(); if (!`${o.reference} ${o.customer_name} ${o.customer_whatsapp}`.toLowerCase().includes(s)) return false; }
    return true;
  }), [data, q, st, city, period]);
  const cities = [...new Set((data ?? []).map((o) => o.city).filter(Boolean))] as string[];
  const csv = () => {
    const rows = [["Date", "Référence", "Client", "WhatsApp", "Ville", "Quartier", "Articles", "Gravures", "Code promo", "Total", "Statut"],
      ...list.map((o) => [fmtDate(o.created_at), o.reference, o.customer_name, o.customer_whatsapp, o.city, o.area,
        o.items.map((i: any) => `${i.qty}x ${i.name} (${i.option})`).join(" | "), o.items.filter((i: any) => i.engraving).map((i: any) => i.engraving).join(" | "),
        o.promo_code, o.total, ORDER_STATUS[o.status]?.l])];
    const txt = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + txt], { type: "text/csv" })); a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  return <>
    <div className="adm-head"><div><h1>Commandes</h1><p>Chaque commande envoyée sur WhatsApp depuis le site est enregistrée ici.</p></div><button className="ab" onClick={csv} disabled={!list.length}>Exporter (CSV)</button></div>
    <div className="toolbar">
      <input type="search" placeholder="Référence, nom, numéro…" value={q} onChange={(e) => setQ(e.target.value)} />
      <select value={st} onChange={(e) => setSt(e.target.value)}><option value="">Tous les statuts</option>{Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select>
      <select value={city} onChange={(e) => setCity(e.target.value)}><option value="">Toutes les villes</option>{cities.map((c) => <option key={c}>{c}</option>)}</select>
      <select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="">Toute période</option><option value="1">24 h</option><option value="7">7 jours</option><option value="30">30 jours</option></select>
    </div>
    {isLoading ? <p className="muted">Chargement…</p> : <OrdersTable orders={list} />}
  </>;
}

export function OrderDetail() {
  const { id } = useParams();
  const { data } = useOrders();
  const refresh = useRefresh();
  const o = data?.find((x) => x.id === id);
  const [note, setNote] = useState<string | null>(null);
  if (!data) return <p className="muted">Chargement…</p>;
  if (!o) return <p>Commande introuvable. <Link to="/admin/commandes">Retour</Link></p>;
  const setStatus = async (s: string) => {
    const first = s === "confirmed" && o.status === "new";
    const ok = await run(supabase.from("order_intents").update({ status: s }).eq("id", o.id).select(), "Statut mis à jour");
    if (ok && first) {
      const per = new Map<string, number>();
      o.items.forEach((i: any) => i.promotion_id && per.set(i.promotion_id, (per.get(i.promotion_id) || 0) + (i.qty || 1)));
      for (const [pid, qty] of per) await supabase.rpc("bump_promotion_reserved", { p_promotion: pid, p_qty: qty });
      if (per.size) toast("Jauge de la promotion mise à jour");
    }
    refresh();
  };
  const saveNote = async () => { await run(supabase.from("order_intents").update({ admin_note: note }).eq("id", o.id).select(), "Note enregistrée"); refresh(); };
  const atelier = `Commande ${o.reference} — ${o.customer_name} (${o.city})\n` + o.items.map((i: any) => `• ${i.qty} × ${i.name} — ${i.option}${i.engraving ? `\n   GRAVURE : « ${i.engraving} »` : ""}`).join("\n") + (o.note ? `\nNote client : ${o.note}` : "");
  const copy = async () => { try { await navigator.clipboard.writeText(atelier); toast("Copié pour l'atelier"); } catch { toast("Copie impossible"); } };
  const phone = (o.customer_whatsapp || "").replace(/\D/g, "");
  const phoneIntl = phone.length === 9 ? `237${phone}` : phone;
  return <>
    <div className="adm-head"><div><Link to="/admin/commandes" className="muted">← Commandes</Link><h1>{o.reference}</h1><p>{fmtDate(o.created_at)} · {o.customer_name} · {o.city}{o.area ? ` — ${o.area}` : ""}</p></div>
      <span className={`chip ${ORDER_STATUS[o.status]?.c}`} style={{ fontSize: 13 }}>{ORDER_STATUS[o.status]?.l}</span></div>
    <div className="split-a">
      <div className="card-a">
        <h3>Articles</h3><p className="sub">Les gravures sont à reproduire exactement.</p>
        {o.items.map((i: any, k: number) => (
          <div key={k} style={{ padding: "12px 0", borderTop: "1px solid #2a251b", display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div><b>{i.qty} × {i.name}</b><div className="muted">{i.option}</div>{i.engraving && <div className="engr-big">« {i.engraving} »</div>}</div>
            <b className="tab-num">{fmt((i.unit_price || 0) * (i.qty || 1))}</b>
          </div>))}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #3a3326", paddingTop: 12, marginTop: 6 }}><b>Total</b><b className="tab-num">{fmt(o.total || 0)}</b></div>
        {o.promo_code && <p className="muted">Code promo : <b>{o.promo_code}</b></p>}
        {o.note && <p><b>Note du client :</b> {o.note}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button className="ab pri" onClick={copy}>Copier pour l'atelier</button>
          {phoneIntl && <a className="ab wa" href={waLink(phoneIntl, `Bonjour ${o.customer_name || ""}, nous avons bien reçu votre commande ${o.reference}.`)} target="_blank" rel="noopener">Ouvrir la discussion WhatsApp</a>}
        </div>
      </div>
      <div>
        <div className="card-a"><h3>Statut</h3><p className="sub">Passer en « Confirmée » met à jour la jauge des promotions concernées.</p>
          <div style={{ display: "grid", gap: 6 }}>{Object.entries(ORDER_STATUS).map(([k, v]) => <button key={k} className={`ab ${o.status === k ? "pri" : ""}`} onClick={() => setStatus(k)}>{v.l}</button>)}</div>
        </div>
        <div className="card-a"><h3>Note interne</h3><p className="sub">Visible uniquement dans l'administration.</p>
          <textarea value={note ?? o.admin_note ?? ""} onChange={(e) => setNote(e.target.value)} />
          <button className="ab" style={{ marginTop: 8 }} onClick={saveNote}>Enregistrer la note</button>
          {o.customer_whatsapp && <p className="muted" style={{ marginTop: 12 }}>WhatsApp client : {o.customer_whatsapp}</p>}
        </div>
      </div>
    </div>
  </>;
}
