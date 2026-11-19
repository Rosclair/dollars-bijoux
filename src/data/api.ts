import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/core";
import type { Category, City, Option, Product, Promotion, PromoCode, Section, Settings, Testimonial, WeddingPack } from "./types";

const STALE = 5 * 60 * 1000;

function check<T>(r: { data: T | null; error: any }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

/* ---------- Catalogue ---------- */
async function fetchCatalog(): Promise<Product[]> {
  const [prods, imgs, opts] = await Promise.all([
    supabase.from("products").select("*, categories(slug,name)").eq("is_published", true).order("sort_order"),
    supabase.from("product_images").select("product_id,path,alt,sort_order").order("sort_order"),
    supabase.from("option_prices").select("*").eq("is_active", true).order("sort_order"),
  ]);
  const P = check(prods) as any[], I = check(imgs) as any[], O = check(opts) as any[];
  return P.map((p) => {
    const options: Option[] = O.filter((o) => o.product_id === p.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((o) => ({
      id: o.option_id, label: o.label, price: o.price, effectivePrice: o.effective_price,
      comparePrice: o.display_compare_price, isQuote: !!o.is_quote, swatch: o.swatch,
      promotionId: o.promotion_id, promoEndsAt: o.promo_ends_at,
    }));
    return {
      id: p.id, slug: p.slug, name: p.name,
      categorySlug: p.categories?.slug ?? null, categoryName: p.categories?.name ?? null,
      shortDescription: p.short_description, description: p.description,
      badge: p.badge_type ? { type: p.badge_type, label: p.badge_label || "" } : null,
      optionLabel: p.option_label || "Finition", options,
      images: I.filter((i) => i.product_id === p.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((i) => ({ path: i.path, alt: i.alt })),
      engraving: {
        mode: p.engraving_mode || "none", label: p.engraving_label || "Texte à graver",
        placeholder: p.engraving_placeholder || "", maxLength: p.engraving_max_length || 20,
        hint: p.engraving_hint, livePreview: !!p.engraving_live_preview,
      },
      isFeatured: !!p.is_featured, sortOrder: p.sort_order ?? 0, createdAt: p.created_at,
    } as Product;
  }).filter((p) => p.options.length > 0);
}
export const useCatalog = () => useQuery({ queryKey: ["catalog"], queryFn: fetchCatalog, staleTime: STALE });

export function minPrice(p: Product) {
  const v = p.options.filter((o) => !o.isQuote).map((o) => o.effectivePrice);
  return v.length ? Math.min(...v) : 0;
}
export const isOnPromo = (p: Product) => p.options.some((o) => o.promotionId);
export const mainOption = (p: Product) => {
  const buyable = p.options.filter((o) => !o.isQuote);
  return buyable.reduce((a, b) => (b.effectivePrice < a.effectivePrice ? b : a), buyable[0] ?? p.options[0]);
};

/* ---------- Catégories ---------- */
export const useCategories = () => useQuery({
  queryKey: ["categories"], staleTime: STALE,
  queryFn: async (): Promise<Category[]> => (check(await supabase.from("categories").select("*").order("sort_order")) as any[])
    .map((c) => ({ id: c.id, slug: c.slug, name: c.name, imagePath: c.image_path, sortOrder: c.sort_order })),
});

/* ---------- Promotions ---------- */
const mapPromo = (p: any): Promotion => ({
  id: p.id, slug: p.slug, title: p.title, subtitle: p.subtitle, body: p.body, kind: p.kind,
  startsAt: p.starts_at, endsAt: p.ends_at, quota: p.quota, reserved: p.reserved_count ?? 0,
  bannerDesktop: p.banner_desktop_path, bannerMobile: p.banner_mobile_path, ctaLabel: p.cta_label, ctaLink: p.cta_link,
  topbarText: p.topbar_text, showInTopbar: !!p.show_in_topbar, showCountdown: !!p.show_countdown, isFeatured: !!p.is_featured,
});
export const usePromotions = () => useQuery({
  queryKey: ["promotions"], staleTime: STALE,
  queryFn: async (): Promise<Promotion[]> => {
    const rows = check(await supabase.from("promotions").select("*").order("ends_at")) as any[];
    const now = Date.now();
    return rows.map(mapPromo).filter((p) => new Date(p.startsAt).getTime() <= now && new Date(p.endsAt).getTime() > now);
  },
});
export const usePromotionItems = () => useQuery({
  queryKey: ["promotion_items"], staleTime: STALE,
  queryFn: async () => check(await supabase.from("promotion_items").select("promotion_id,product_option_id")) as { promotion_id: string; product_option_id: string }[],
});
export const usePromoCodes = () => useQuery({
  queryKey: ["promo_codes"], staleTime: STALE,
  queryFn: async (): Promise<PromoCode[]> => (check(await supabase.from("promo_codes").select("*")) as any[]).map((c) => ({
    code: c.code, description: c.description, discountType: c.discount_type, discountValue: c.discount_value ?? 0,
    minAmount: c.min_amount ?? 0, startsAt: c.starts_at, endsAt: c.ends_at, showOnSite: !!c.show_on_site,
  })),
});

/* ---------- Contenus ---------- */
export const useSections = () => useQuery({
  queryKey: ["sections"], staleTime: STALE,
  queryFn: async (): Promise<Section[]> => (check(await supabase.from("home_sections").select("*").order("sort_order")) as any[]).map((s) => ({
    key: s.key, eyebrow: s.eyebrow, title: s.title, subtitle: s.subtitle, body: s.body, imagePath: s.image_path,
    ctaLabel: s.cta_label, ctaLink: s.cta_link, data: s.data || {}, sortOrder: s.sort_order,
  })),
});
export const useSettings = () => useQuery({
  queryKey: ["settings"], staleTime: STALE,
  queryFn: async (): Promise<Settings> => check(await supabase.from("settings").select("*").eq("id", 1).single()) as any,
});
export const useCities = () => useQuery({
  queryKey: ["cities"], staleTime: STALE,
  queryFn: async (): Promise<City[]> => (check(await supabase.from("cities").select("*").order("sort_order")) as any[])
    .map((c) => ({ id: c.id, name: c.name, whatsapp: c.whatsapp_number })),
});
export const useWeddingPacks = () => useQuery({
  queryKey: ["wedding_packs"], staleTime: STALE,
  queryFn: async (): Promise<WeddingPack[]> => (check(await supabase.from("wedding_packs").select("*").order("sort_order")) as any[])
    .map((w) => ({ id: w.id, slug: w.slug, name: w.name, price: w.price, compareAt: w.compare_at_price, features: w.features || [], highlighted: !!w.is_highlighted })),
});
export const useTestimonials = () => useQuery({
  queryKey: ["testimonials"], staleTime: STALE,
  queryFn: async (): Promise<Testimonial[]> => (check(await supabase.from("testimonials").select("*").order("sort_order")) as any[])
    .map((t) => ({ id: t.id, quote: t.quote, author: t.author, context: t.context, rating: t.rating ?? 5 })),
});

/** Numéro WhatsApp principal (1re ville active) */
export function useMainWhatsapp() {
  const { data } = useCities();
  return data?.[0]?.whatsapp || "237694577671";
}
