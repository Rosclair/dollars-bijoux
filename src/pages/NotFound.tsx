import { Link } from "react-router-dom";
import { Seo } from "../components/ui";

export default function NotFound() {
  return (
    <div className="wrap sent">
      <Seo title="Page introuvable" />
      <div className="eyebrow">Erreur 404</div>
      <h1 style={{ marginTop: 12 }}>Ce bijou s'est égaré.</h1>
      <p>La page demandée n'existe pas ou n'est plus disponible.</p>
      <div className="btns" style={{ marginTop: 24 }}>
        <Link className="btn btn-or" to="/boutique">Voir la boutique</Link>
        <Link className="btn btn-ghost" to="/">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
