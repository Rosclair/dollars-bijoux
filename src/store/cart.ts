import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartLine {
  lineId: string;
  productId: string;          // id produit, ou "pack:<slug>" pour un pack mariage
  slug: string;
  name: string;
  image: string | null;
  optionId: string | null;
  optionLabel: string;
  unitPrice: number;
  compareAtPrice: number | null;
  promotionId: string | null;
  engravingText: string | null;
  engravingMode: "none" | "optional" | "required";
  engravingLabel: string;
  engravingMax: number;
  quantity: number;
}

type NewLine = Omit<CartLine, "lineId" | "quantity"> & { quantity?: number };

interface CartState {
  lines: CartLine[];
  miniOpen: boolean;
  lastAdded: string | null;
  add: (l: NewLine) => void;
  setQty: (lineId: string, q: number) => void;
  setEngraving: (lineId: string, t: string | null) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  reprice: (fn: (l: CartLine) => Partial<CartLine> | null) => void;
  setMini: (o: boolean) => void;
}

const safeStorage = createJSONStorage(() => {
  try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); return localStorage; }
  catch { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; }
});

const sameKey = (a: { productId: string; optionId: string | null; engravingText: string | null }, b: typeof a) =>
  a.productId === b.productId && a.optionId === b.optionId && (a.engravingText || "") === (b.engravingText || "");

export const useCart = create<CartState>()(persist((set) => ({
  lines: [], miniOpen: false, lastAdded: null,
  add: (l) => set((s) => {
    const q = l.quantity ?? 1;
    const ex = s.lines.find((x) => sameKey(x, l));
    if (ex) return { lines: s.lines.map((x) => (x === ex ? { ...x, quantity: x.quantity + q } : x)), lastAdded: ex.lineId, miniOpen: true };
    const lineId = Math.random().toString(36).slice(2, 10);
    return { lines: [...s.lines, { ...l, quantity: q, lineId }], lastAdded: lineId, miniOpen: true };
  }),
  setQty: (id, q) => set((s) => ({ lines: q < 1 ? s.lines.filter((l) => l.lineId !== id) : s.lines.map((l) => (l.lineId === id ? { ...l, quantity: q } : l)) })),
  setEngraving: (id, t) => set((s) => ({ lines: s.lines.map((l) => (l.lineId === id ? { ...l, engravingText: t && t.trim() ? t.trim() : null } : l)) })),
  remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.lineId !== id) })),
  clear: () => set({ lines: [] }),
  reprice: (fn) => set((s) => {
    let changed = false;
    const lines = s.lines.map((l) => { const u = fn(l); if (!u) return l; changed = true; return { ...l, ...u }; });
    return changed ? { lines } : s;
  }),
  setMini: (o) => set({ miniOpen: o }),
}), { name: "db_cart_v1", storage: safeStorage, partialize: (s) => ({ lines: s.lines }) as any }));

export const cartTotals = (lines: CartLine[]) => {
  let total = 0, saved = 0, count = 0;
  for (const l of lines) {
    total += l.unitPrice * l.quantity; count += l.quantity;
    if (l.compareAtPrice && l.compareAtPrice > l.unitPrice) saved += (l.compareAtPrice - l.unitPrice) * l.quantity;
  }
  return { total, saved, count };
};

export const missingEngraving = (lines: CartLine[]) => lines.filter((l) => l.engravingMode === "required" && !l.engravingText);
