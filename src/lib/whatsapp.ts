import { fmt } from "./core";
import type { CartLine } from "../store/cart";

export interface OrderInfo {
  ref: string; name: string; city: string; area?: string; phone?: string; note?: string;
  code?: string; discount?: number; intro?: string; outro?: string;
}

/** Construit le message WhatsApp de commande (fonction pure). */
export function buildOrderMessage(lines: CartLine[], o: OrderInfo): string {
  const out: string[] = [];
  out.push((o.intro || "Bonjour DOLLARS BIJOUX").replace(/[\u{1F000}-\u{1FFFF}]/gu, "").trim());
  out.push(`Réf. commande : ${o.ref}`);
  out.push("Je souhaite commander :", "");
  let total = 0;
  lines.forEach((l, i) => {
    total += l.unitPrice * l.quantity;
    out.push(`${i + 1}. ${l.name} — ${l.optionLabel}`);
    if (l.engravingText) out.push(`   Gravure : « ${l.engravingText} »`);
    const was = l.compareAtPrice && l.compareAtPrice > l.unitPrice ? ` (au lieu de ${fmt(l.compareAtPrice)})` : "";
    out.push(`   Qté ${l.quantity} × ${fmt(l.unitPrice)}${was}`, "");
  });
  if (o.discount && o.discount > 0) {
    out.push(`Sous-total : ${fmt(total)}`, `Remise ${o.code} : -${fmt(o.discount)}`);
    total -= o.discount;
  }
  out.push(`TOTAL : ${fmt(Math.max(0, total))}`);
  if (o.code) out.push(`Code promo : ${o.code}`);
  out.push("");
  out.push(`Nom : ${o.name}`);
  out.push(`Ville : ${o.city}${o.area ? " — " + o.area : ""}`);
  if (o.phone) out.push(`WhatsApp : ${o.phone}`);
  if (o.note) out.push(`Note : ${o.note}`);
  out.push("", o.outro || "Merci de me confirmer la disponibilité, le délai et le mode de paiement.");
  return out.join("\n");
}
