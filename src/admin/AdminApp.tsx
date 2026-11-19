import { lazy, Suspense, useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/core";
import { Logo, Toast, toast } from "../components/ui";
import { useAdminSession } from "./kit";
import "./admin.css";

const Dashboard = lazy(() => import("./pages/Orders").then((m) => ({ default: m.Dashboard })));
const OrdersList = lazy(() => import("./pages/Orders").then((m) => ({ default: m.OrdersList })));
const OrderDetail = lazy(() => import("./pages/Orders").then((m) => ({ default: m.OrderDetail })));
const ProductsList = lazy(() => import("./pages/Products").then((m) => ({ default: m.ProductsList })));
const ProductEdit = lazy(() => import("./pages/Products").then((m) => ({ default: m.ProductEdit })));
const Categories = lazy(() => import("./pages/Catalog").then((m) => ({ default: m.Categories })));
const Media = lazy(() => import("./pages/Catalog").then((m) => ({ default: m.Media })));
const PromotionsList = lazy(() => import("./pages/Promotions").then((m) => ({ default: m.PromotionsList })));
const PromotionEdit = lazy(() => import("./pages/Promotions").then((m) => ({ default: m.PromotionEdit })));
const PromoCodes = lazy(() => import("./pages/Promotions").then((m) => ({ default: m.PromoCodes })));
const SectionsList = lazy(() => import("./pages/Content").then((m) => ({ default: m.SectionsList })));
const SectionEdit = lazy(() => import("./pages/Content").then((m) => ({ default: m.SectionEdit })));
const WeddingPacks = lazy(() => import("./pages/Content").then((m) => ({ default: m.WeddingPacks })));
const Testimonials = lazy(() => import("./pages/Content").then((m) => ({ default: m.Testimonials })));
const SettingsPage = lazy(() => import("./pages/Settings").then((m) => ({ default: m.SettingsPage })));

const NAV: ({ grp: string } | { to: string; label: string; end?: boolean })[] = [
  { to: "/admin", label: "Tableau de bord", end: true },
  { to: "/admin/commandes", label: "Commandes" },
  { grp: "Catalogue" },
  { to: "/admin/produits", label: "Produits" },
  { to: "/admin/categories", label: "Catégories" },
  { to: "/admin/medias", label: "Médiathèque" },
  { grp: "Ventes" },
  { to: "/admin/promotions", label: "Promotions" },
  { to: "/admin/codes-promo", label: "Codes promo" },
  { to: "/admin/packs-mariage", label: "Packs mariage" },
  { grp: "Site" },
  { to: "/admin/accueil", label: "Page d'accueil" },
  { to: "/admin/temoignages", label: "Témoignages" },
  { to: "/admin/parametres", label: "Paramètres" },
];

function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setInfo("");
    if (mode === "signup") {
      if (pwd.length < 8) { setErr("Le mot de passe doit faire au moins 8 caractères."); return; }
      if (pwd !== pwd2) { setErr("Les deux mots de passe ne correspondent pas."); return; }
      setBusy(true);
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pwd, options: { emailRedirectTo: `${location.origin}/admin` } });
      setBusy(false);
      if (error) { setErr(error.message.includes("already") ? "Un compte existe déjà avec cet email : connectez-vous." : error.message); return; }
      if (!data.session) setInfo("Compte créé. Ouvrez l'email de confirmation envoyé à cette adresse, cliquez sur le lien, puis connectez-vous ici.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pwd });
    setBusy(false);
    if (error) setErr(error.message.includes("confirm") ? "Confirmez d'abord votre adresse avec le lien reçu par email." : error.message.includes("Invalid") ? "Email ou mot de passe incorrect." : error.message);
  };
  return (
    <div className="adm login">
      <title>Connexion — Administration Dollars Bijoux</title>
      <meta name="robots" content="noindex" />
      <form onSubmit={submit}>
        <Logo />
        <div><h1 style={{ fontSize: 28 }}>{mode === "login" ? "Administration" : "Créer mon accès"}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>{mode === "login" ? "Accès réservé à l'équipe Dollars Bijoux." : "Uniquement pour une adresse autorisée par l'équipe. Choisissez votre mot de passe."}</p></div>
        <label className="f"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="f"><span>Mot de passe</span><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={pwd} onChange={(e) => setPwd(e.target.value)} required /></label>
        {mode === "signup" && <label className="f"><span>Confirmer le mot de passe</span><input type="password" autoComplete="new-password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} required /></label>}
        {err && <p className="err-a" style={{ margin: 0 }}>{err}</p>}
        {info && <p className="warn-a" style={{ margin: 0 }}>{info}</p>}
        <button className="ab pri" disabled={busy}>{busy ? "Patientez…" : mode === "login" ? "Se connecter" : "Créer mon accès"}</button>
        <button type="button" className="ab" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); setInfo(""); }}>{mode === "login" ? "Première connexion ? Créer mon accès" : "J'ai déjà un accès : me connecter"}</button>
        <Link to="/" className="muted" style={{ fontSize: 12.5, textAlign: "center" }}>← Retour au site</Link>
      </form>
    </div>
  );
}

export default function AdminApp() {
  const s = useAdminSession();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  if (s.loading) return <div className="adm login"><p className="muted">Chargement…</p></div>;
  if (!s.email) return <><Login /><Toast /></>;
  if (!s.isAdmin) return (
    <div className="adm login"><div style={{ textAlign: "center", maxWidth: 420 }}>
      <h1>Accès réservé</h1><p className="muted">Le compte {s.email} n'a pas les droits d'administration.</p>
      <button className="ab" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
    </div></div>
  );
  const logout = async () => { await supabase.auth.signOut(); toast("Déconnecté"); nav("/admin"); };
  return (
    <div className="adm">
      <title>Administration — Dollars Bijoux</title>
      <meta name="robots" content="noindex" />
      <aside className={`adm-side ${open ? "on" : ""}`}>
        <Link to="/admin" style={{ textDecoration: "none" }}><Logo /></Link>
        <nav>
          {NAV.map((n, i) => "grp" in n ? <div key={i} className="grp">{n.grp}</div> :
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : "")}>{n.label}</NavLink>)}
        </nav>
        <div className="bottom">
          <a className="ab" href="/" target="_blank" rel="noopener">Voir le site ↗</a>
          <span className="muted" style={{ fontSize: 12, wordBreak: "break-all" }}>{s.email}</span>
          <button className="ab" onClick={logout}>Se déconnecter</button>
        </div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <div className="adm-top"><button className="ab" onClick={() => setOpen(true)}>☰ Menu</button><Logo /></div>
        <main className="adm-main">
          <Suspense fallback={<p className="muted">Chargement…</p>}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="commandes" element={<OrdersList />} />
              <Route path="commandes/:id" element={<OrderDetail />} />
              <Route path="produits" element={<ProductsList />} />
              <Route path="produits/:id" element={<ProductEdit />} />
              <Route path="categories" element={<Categories />} />
              <Route path="medias" element={<Media />} />
              <Route path="promotions" element={<PromotionsList />} />
              <Route path="promotions/:id" element={<PromotionEdit />} />
              <Route path="codes-promo" element={<PromoCodes />} />
              <Route path="packs-mariage" element={<WeddingPacks />} />
              <Route path="accueil" element={<SectionsList />} />
              <Route path="accueil/:key" element={<SectionEdit />} />
              <Route path="temoignages" element={<Testimonials />} />
              <Route path="parametres" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <Toast />
    </div>
  );
}
