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

const EYE = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
const EYE_OFF = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;

function PasswordInput({ id, value, onChange, onBlur, autoComplete, invalid, describedBy }: { id: string; value: string; onChange: (v: string) => void; onBlur?: () => void; autoComplete: string; invalid?: boolean; describedBy?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwd">
      <input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        aria-invalid={invalid || undefined} aria-describedby={describedBy} className={invalid ? "bad" : ""} />
      <button type="button" className="eye" onClick={() => setShow(!show)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={show}>{show ? EYE_OFF : EYE}</button>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const signup = mode === "signup";

  const errors = {
    email: !email.trim() ? "Saisissez votre email." : !EMAIL_RE.test(email.trim()) ? "Adresse email invalide (ex. nom@gmail.com)." : "",
    pwd: !pwd ? "Saisissez votre mot de passe." : signup && pwd.length < 8 ? "8 caractères minimum." : signup && !(/[A-Za-z]/.test(pwd) && /\d/.test(pwd)) ? "Utilisez au moins une lettre et un chiffre." : "",
    pwd2: signup ? (!pwd2 ? "Confirmez le mot de passe." : pwd2 !== pwd ? "Les deux mots de passe ne correspondent pas." : "") : "",
  };
  const show = (k: keyof typeof errors) => touched[k] && errors[k];
  const strength = !pwd ? 0 : [pwd.length >= 8, /[A-Z]/.test(pwd) && /[a-z]/.test(pwd), /\d/.test(pwd), /[^A-Za-z0-9]/.test(pwd), pwd.length >= 12].filter(Boolean).length;
  const strengthLabel = ["", "Très faible", "Faible", "Moyen", "Bon", "Excellent"][strength];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setInfo("");
    setTouched({ email: true, pwd: true, pwd2: true });
    if (errors.email || errors.pwd || errors.pwd2) return;
    setBusy(true);
    if (signup) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pwd, options: { emailRedirectTo: `${location.origin}/admin` } });
      setBusy(false);
      if (error) { setErr(/already|registered/i.test(error.message) ? "Un compte existe déjà avec cet email : connectez-vous." : /weak|password/i.test(error.message) ? "Mot de passe refusé : choisissez-en un plus robuste." : error.message); return; }
      if (!data.session) { setInfo("Compte créé. Ouvrez l'email de confirmation envoyé à cette adresse, cliquez sur le lien, puis connectez-vous ici."); setMode("login"); setPwd(""); setPwd2(""); setTouched({}); }
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pwd });
    setBusy(false);
    if (error) setErr(/confirm/i.test(error.message) ? "Confirmez d'abord votre adresse avec le lien reçu par email." : /invalid/i.test(error.message) ? "Email ou mot de passe incorrect." : error.message);
  };
  const switchMode = () => { setMode(signup ? "login" : "signup"); setErr(""); setInfo(""); setTouched({}); setPwd2(""); };
  return (
    <div className="adm login">
      <title>Connexion — Administration Dollars Bijoux</title>
      <meta name="robots" content="noindex" />
      <form onSubmit={submit} noValidate>
        <Logo />
        <div><h1 style={{ fontSize: 28 }}>{signup ? "Créer mon accès" : "Administration"}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>{signup ? "Uniquement pour une adresse autorisée par l'équipe. Choisissez votre mot de passe." : "Accès réservé à l'équipe Dollars Bijoux."}</p></div>
        <div className="f"><label htmlFor="lg-email" style={{ fontSize: 12, fontWeight: 700, color: "#bdb4a4" }}>Email</label>
          <input id="lg-email" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={!!show("email") || undefined} aria-describedby="lg-email-err" className={show("email") ? "bad" : ""} />
          {show("email") && <small id="lg-email-err" className="err-a">{errors.email}</small>}</div>
        <div className="f"><label htmlFor="lg-pwd" style={{ fontSize: 12, fontWeight: 700, color: "#bdb4a4" }}>Mot de passe</label>
          <PasswordInput id="lg-pwd" value={pwd} onChange={setPwd} onBlur={() => setTouched((t) => ({ ...t, pwd: true }))} autoComplete={signup ? "new-password" : "current-password"} invalid={!!show("pwd")} describedBy="lg-pwd-err" />
          {signup && pwd && <div className="strength"><div className="meter"><i style={{ width: `${strength * 20}%`, background: strength <= 2 ? "#e05252" : strength === 3 ? "#e0b452" : "#5cc48a" }} /></div><small className="muted">{strengthLabel}</small></div>}
          {show("pwd") && <small id="lg-pwd-err" className="err-a">{errors.pwd}</small>}</div>
        {signup && <div className="f"><label htmlFor="lg-pwd2" style={{ fontSize: 12, fontWeight: 700, color: "#bdb4a4" }}>Confirmer le mot de passe</label>
          <PasswordInput id="lg-pwd2" value={pwd2} onChange={setPwd2} onBlur={() => setTouched((t) => ({ ...t, pwd2: true }))} autoComplete="new-password" invalid={!!show("pwd2")} describedBy="lg-pwd2-err" />
          {show("pwd2") ? <small id="lg-pwd2-err" className="err-a">{errors.pwd2}</small> : pwd2 && pwd2 === pwd ? <small style={{ color: "#7fd4a1" }}>Les mots de passe correspondent.</small> : null}</div>}
        {err && <p className="err-a" role="alert" style={{ margin: 0 }}>{err}</p>}
        {info && <p className="warn-a" role="status" style={{ margin: 0 }}>{info}</p>}
        <button className="ab pri" disabled={busy}>{busy ? "Patientez…" : signup ? "Créer mon accès" : "Se connecter"}</button>
        <button type="button" className="ab" onClick={switchMode}>{signup ? "J'ai déjà un accès : me connecter" : "Première connexion ? Créer mon accès"}</button>
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
