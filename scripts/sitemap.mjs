// Génère public/sitemap.xml et public/robots.txt au moment du build (tolérant aux erreurs réseau).
import { writeFileSync } from "node:fs";
const SITE = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://dollarsbijoux.com")).replace(/\/$/, "");
const SB = process.env.VITE_SUPABASE_URL || "https://zkrhgrkievtgdhedritc.supabase.co";
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_FKfFl_sTpEI8-5hqBbiVLQ_kNYOWtJt";
const statics = ["/", "/boutique", "/creer", "/promos", "/mariage", "/famille", "/entreprises", "/revendeurs", "/contact", "/a-propos", "/livraison"];
const get = async (path) => {
  try {
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(8000) });
    return r.ok ? await r.json() : [];
  } catch { return []; }
};
const [products, cats, promos] = await Promise.all([
  get("products?select=slug,updated_at&is_published=eq.true"),
  get("categories?select=slug&is_active=eq.true"),
  get("promotions?select=slug"),
]);
const urls = [
  ...statics.map((p) => ({ loc: p })),
  ...cats.map((c) => ({ loc: `/boutique/${c.slug}` })),
  ...products.map((p) => ({ loc: `/produit/${p.slug}`, lastmod: p.updated_at?.slice(0, 10) })),
  ...promos.map((p) => ({ loc: `/promos/${p.slug}` })),
];
writeFileSync("public/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`);
const DEMO = process.env.VITE_DEMO !== "0";
writeFileSync("public/robots.txt", DEMO ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /panier\nDisallow: /commande\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`sitemap: ${urls.length} URLs (${SITE})`);
