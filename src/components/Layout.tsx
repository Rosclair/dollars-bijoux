import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCatalog, useCities, useMainWhatsapp, usePromotions, useSettings } from "../data/api";
import { cartTotals, useCart } from "../store/cart";
import { fmt, fmtS, mediaUrl, supabase, waLink } from "../lib/core";
import { CountdownText, Icon, Logo, Toast, toast } from "./ui";

const NAV = [
  { to: "/creer", label: "Créer le vôtre" },
  { to: "/promos", label: "Promos" },
  { to: "/boutique", label: "Boutique" },
  { to: "/mariage", label: "Mariage" },
  { to: "/entreprises", label: "Entreprises" },
];

function TopBar() {
  const { data: promos } = usePromotions();
  const { data: s } = useSettings();
  const p = promos?.filter((x) => x.showInTopbar)[0];
  if (!p && !s?.topbar_fallback_text) return null;
  return (
    <div className="topbar" role="region" aria-label="Promotion en cours">
      <div className="wrap">
        {p ? <>
          <span>{p.topbarText || p.title}</span>
          {p.showCountdown && <span className="cd-mini"><CountdownText end={p.endsAt} /></span>}
        </> : <span>{s?.topbar_fallback_text}</span>}
      </div>
    </div>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const count = cartTotals(useCart((s) => s.lines)).count;
  const nav = useNavigate();
  return (
    <header className="site">
      <div className="wrap">
        <Link to="/" aria-label="Dollars Bijoux, accueil" style={{ textDecoration: "none" }}><Logo /></Link>
        <nav className="main" aria-label="Navigation principale">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? "active" : "")}>{n.label}</NavLink>)}
        </nav>
        <div className="h-right">
          <button className="cart-btn" onClick={() => nav("/panier")} aria-label={`Panier, ${count} article(s)`}>
            {Icon.bag} <span className="hide-xs">Panier</span> <span className="cart-count">{count}</span>
          </button>
          <button className="burger" onClick={onMenu} aria-label="Ouvrir le menu">{Icon.menu}</button>
        </div>
      </div>
    </header>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: cities } = useCities();
  return (
    <div className={`mmenu ${open ? "on" : ""}`} aria-hidden={!open} inert={!open} role="dialog" aria-label="Menu">
      <div className="mmenu-top"><Logo /><button className="x" onClick={onClose} aria-label="Fermer le menu">✕</button></div>
      <nav>
        <Link to="/" onClick={onClose}>Accueil</Link>
        {NAV.map((n) => <Link key={n.to} to={n.to} onClick={onClose}>{n.label}</Link>)}
        <Link to="/famille" onClick={onClose}>Famille</Link>
        <Link to="/revendeurs" onClick={onClose}>Revendeurs</Link>
        <Link to="/contact" onClick={onClose}>Contact</Link>
      </nav>
      <div className="mm-contacts">
        {cities?.filter((c) => c.name !== "Autre ville").map((c) => (
          <a key={c.id} className="btn btn-wa" href={waLink(c.whatsapp, "Bonjour DOLLARS BIJOUX")} target="_blank" rel="noopener">WhatsApp {c.name}</a>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  const { data: s } = useSettings();
  const { data: cities } = useCities();
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <Logo big />
            <p style={{ marginTop: 16, maxWidth: "34ch" }}>Bijoux contemporains en acier inoxydable, personnalisés à votre nom depuis 2017.</p>
          </div>
          <div>
            <h4>Nos showrooms</h4>
            {s?.address_yaounde && <p>{s.address_yaounde}</p>}
            {cities?.filter((c) => c.name !== "Autre ville").map((c) => (
              <a key={c.id} href={waLink(c.whatsapp, "Bonjour DOLLARS BIJOUX")} target="_blank" rel="noopener">{c.name} · WhatsApp {c.whatsapp.replace(/^237(\d{3})(\d{2})(\d{2})(\d{2})$/, "$1 $2 $3 $4")}</a>
            ))}
            {s?.support_whatsapp && <a href={waLink(s.support_whatsapp, "Bonjour, j'ai une réclamation concernant ma commande.")} target="_blank" rel="noopener">Service client · +{s.support_whatsapp}</a>}
          </div>
          <div>
            <h4>Boutique</h4>
            <Link to="/boutique">Tous les bijoux</Link>
            <Link to="/promos">Promotions</Link>
            <Link to="/creer">Studio de gravure</Link>
            <Link to="/mariage">Mariage</Link>
            <Link to="/famille">Famille</Link>
            <Link to="/entreprises">Entreprises</Link>
            <Link to="/revendeurs">Revendeurs</Link>
          </div>
          <div>
            <h4>Infos</h4>
            <Link to="/a-propos">À propos</Link>
            <Link to="/livraison">Livraison & délais</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/mentions-legales">Mentions légales</Link>
            {s?.facebook_url && <a href={s.facebook_url} target="_blank" rel="noopener">Facebook</a>}
            {s?.whatsapp_group_url && <a href={s.whatsapp_group_url} target="_blank" rel="noopener">Groupe WhatsApp des promos</a>}
            {s?.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
          </div>
        </div>
        <div className="copy"><span>© {new Date().getFullYear()} Dollars Bijoux. Tous droits réservés.</span><span>Commandes et paiements confirmés sur WhatsApp</span></div>
      </div>
    </footer>
  );
}

function MiniCart() {
  const { lines, miniOpen, lastAdded, setMini } = useCart();
  const nav = useNavigate();
  const t = cartTotals(lines);
  const added = lines.find((l) => l.lineId === lastAdded);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setMini(false);
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [setMini]);
  const go = (to: string) => { setMini(false); nav(to); };
  return <>
    <div className={`scrim ${miniOpen ? "on" : ""}`} onClick={() => setMini(false)} />
    <aside className={`drawer ${miniOpen ? "on" : ""}`} aria-hidden={!miniOpen} inert={!miniOpen} aria-label="Article ajouté">
      <div className="d-head"><h3>Ajouté à votre écrin</h3><button className="x" onClick={() => setMini(false)} aria-label="Fermer">✕</button></div>
      <div className="d-body">
        {added && <div className="mini-added">
          <img src={mediaUrl(added.image, "sm")} alt="" />
          <div>
            <h4 style={{ margin: 0, fontFamily: "var(--f-display)", fontSize: 20 }}>{added.name}</h4>
            <div className="meta" style={{ fontSize: 13, color: "var(--gris)" }}>{added.optionLabel} · Qté {added.quantity}</div>
            {added.engravingText && <div className="engr-txt">{added.engravingText}</div>}
            <b style={{ color: "var(--or-clair)" }}>{fmtS(added.unitPrice * added.quantity)}</b>
          </div>
        </div>}
        <p style={{ color: "var(--gris)", fontSize: 13.5 }}>{t.count} article{t.count > 1 ? "s" : ""} dans votre panier. Il reste enregistré sur ce téléphone.</p>
      </div>
      <div className="d-foot">
        <div className="tot"><span className="eyebrow">Total</span><b className="gold tab-num">{fmt(t.total)}</b></div>
        <div className="mini-actions">
          <button className="btn btn-or" onClick={() => go("/commande")}>Commander</button>
          <button className="btn btn-ghost" onClick={() => go("/panier")}>Voir mon panier</button>
          <button className="linkbtn" onClick={() => setMini(false)} style={{ justifySelf: "center" }}>Continuer mes achats</button>
        </div>
      </div>
    </aside>
  </>;
}

/** Met à jour les prix du panier si le catalogue a changé (promo terminée, nouveau prix). */
function CartRepricer() {
  const { data } = useCatalog();
  const reprice = useCart((s) => s.reprice);
  useEffect(() => {
    if (!data) return;
    let changed = 0;
    reprice((l) => {
      const p = data.find((x) => x.id === l.productId); if (!p) return null;
      const o = p.options.find((x) => x.id === l.optionId); if (!o) return null;
      if (o.effectivePrice !== l.unitPrice || o.comparePrice !== l.compareAtPrice) { changed++; return { unitPrice: o.effectivePrice, compareAtPrice: o.comparePrice, promotionId: o.promotionId }; }
      return null;
    });
    if (changed) toast("Certains prix de votre panier ont été mis à jour");
  }, [data, reprice]);
  return null;
}

function useStaffSession() {
  const [staff, setStaff] = useState(false);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setStaff(!!data.session)); }, []);
  return staff;
}

export default function Layout() {
  const { data: settings } = useSettings();
  const staff = useStaffSession();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const wa = useMainWhatsapp();
  const t = cartTotals(useCart((s) => s.lines));
  const nav = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); setMenu(false); }, [loc.pathname]);
  useEffect(() => { document.body.style.overflow = menu ? "hidden" : ""; }, [menu]);
  if (settings?.maintenance_mode && !staff) return (
    <div className="wrap sent" style={{ minHeight: "100vh", display: "grid", placeContent: "center" }}>
      <Logo big />
      <h1 style={{ marginTop: 24 }}>Bientôt de retour</h1>
      <p>Notre boutique en ligne fait peau neuve. En attendant, commandez sur WhatsApp.</p>
      <div className="btns" style={{ marginTop: 20 }}><a className="btn btn-wa" href={waLink(wa, "Bonjour DOLLARS BIJOUX")} target="_blank" rel="noopener">Commander sur WhatsApp</a></div>
    </div>
  );
  return <>
    <a href="#contenu" className="skip">Aller au contenu</a>
    <TopBar />
    <Header onMenu={() => setMenu(true)} />
    <MobileMenu open={menu} onClose={() => setMenu(false)} />
    <main id="contenu"><Outlet /></main>
    <Footer />
    <a className="fab" href={waLink(wa, "Bonjour DOLLARS BIJOUX, j'ai une question sur vos bijoux.")} target="_blank" rel="noopener" aria-label="Discuter sur WhatsApp">{Icon.wa}</a>
    <div className="mbar">
      <button className="btn btn-ghost" onClick={() => nav("/panier")}>Panier · <span className="tab-num">{fmtS(t.total)}</span></button>
      <Link className="btn btn-or" to="/promos">Promos</Link>
    </div>
    <MiniCart />
    <CartRepricer />
    <Toast />
  </>;
}
