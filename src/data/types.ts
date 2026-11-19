export type Swatch = "gold" | "silver" | null;
export type EngravingMode = "none" | "optional" | "required";

export interface Option {
  id: string;
  label: string;
  price: number;
  effectivePrice: number;
  comparePrice: number | null;
  isQuote: boolean;
  swatch: Swatch;
  promotionId: string | null;
  promoEndsAt: string | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  categorySlug: string | null;
  categoryName: string | null;
  shortDescription: string | null;
  description: string | null;
  badge: { type: "promo" | "new" | "top" | "creation"; label: string } | null;
  optionLabel: string;
  options: Option[];
  images: { path: string; alt: string | null }[];
  engraving: { mode: EngravingMode; label: string; placeholder: string; maxLength: number; hint: string | null; livePreview: boolean };
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Category { id: string; slug: string; name: string; imagePath: string | null; sortOrder: number }

export interface Promotion {
  id: string; slug: string; title: string; subtitle: string | null; body: string | null;
  kind: "campaign" | "flash" | "quota"; startsAt: string; endsAt: string;
  quota: number | null; reserved: number; bannerDesktop: string | null; bannerMobile: string | null;
  ctaLabel: string | null; ctaLink: string | null; topbarText: string | null;
  showInTopbar: boolean; showCountdown: boolean; isFeatured: boolean;
}

export interface PromoCode { code: string; description: string | null; discountType: "none" | "percent" | "fixed"; discountValue: number; minAmount: number; startsAt: string | null; endsAt: string | null; showOnSite: boolean }

export interface Section {
  key: string; eyebrow: string | null; title: string | null; subtitle: string | null; body: string | null;
  imagePath: string | null; ctaLabel: string | null; ctaLink: string | null;
  data: Record<string, any>; sortOrder: number;
}

export interface Settings {
  brand_name: string; tagline: string; support_whatsapp: string; email: string; address_yaounde: string;
  facebook_url: string | null; tiktok_url: string | null; instagram_url: string | null; whatsapp_group_url: string | null;
  wa_intro: string; wa_outro: string; topbar_fallback_text: string | null;
  stats: { value: string; label: string }[]; pages: Record<string, string>; seo: Record<string, string>;
  maintenance_mode: boolean;
}

export interface City { id: string; name: string; whatsapp: string }
export interface WeddingPack { id: string; slug: string; name: string; price: number; compareAt: number | null; features: string[]; highlighted: boolean }
export interface Testimonial { id: string; quote: string; author: string | null; context: string | null; rating: number }
