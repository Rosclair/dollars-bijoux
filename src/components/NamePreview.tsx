import { useLayoutEffect, useRef, useState } from "react";

/** Aperçu SVG d'une chaîne prénom : texte doré ou argenté, chaînes accrochées aux lettres. */
export default function NamePreview({ text, finish, style = "script", height }: { text: string; finish: "gold" | "silver"; style?: "script" | "caps"; height?: number }) {
  const tRef = useRef<SVGTextElement>(null);
  const [d, setD] = useState({ l: "", r: "", fs: style === "caps" ? 84 : 104 });
  const v = (text || "").trim() || "Votre prénom";
  const shown = style === "caps" ? v.toUpperCase() : v;
  const grad = finish === "gold" ? "url(#npOr)" : "url(#npArg)";

  useLayoutEffect(() => {
    const el = tRef.current; if (!el) return;
    const compute = () => {
      let fs = style === "caps" ? 84 : 104;
      el.setAttribute("font-size", String(fs));
      let bb: DOMRect | { x: number; y: number; width: number; height: number };
      try { bb = el.getBBox(); } catch { bb = { x: 180, y: 170, width: 280, height: 100 }; }
      if (bb.width > 560) { fs = (fs * 560) / bb.width; el.setAttribute("font-size", String(fs)); try { bb = el.getBBox(); } catch { /* */ } }
      const y = bb.y + bb.height * (style === "caps" ? 0.32 : 0.42), xl = bb.x + 6, xr = bb.x + bb.width - 6;
      setD({ l: `M 40 -10 Q 60 ${y * 0.85} ${xl} ${y}`, r: `M 600 -10 Q 580 ${y * 0.85} ${xr} ${y}`, fs });
    };
    compute();
    (document as any).fonts?.ready?.then(compute);
  }, [shown, style]);

  return (
    <svg viewBox="0 0 640 380" role="img" aria-label={`Aperçu : ${shown}`} style={{ width: "100%", height: height ?? "auto", maxHeight: 420, display: "block" }}>
      <defs>
        <linearGradient id="npOr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8a6526" /><stop offset=".3" stopColor="#f6e3a6" /><stop offset=".5" stopColor="#c49a45" /><stop offset=".72" stopColor="#fff2c6" /><stop offset="1" stopColor="#9a762f" /></linearGradient>
        <linearGradient id="npArg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7a7a7a" /><stop offset=".3" stopColor="#f7f7f7" /><stop offset=".5" stopColor="#a8a8a8" /><stop offset=".72" stopColor="#ffffff" /><stop offset="1" stopColor="#808080" /></linearGradient>
        <filter id="npGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity=".7" /></filter>
      </defs>
      <path d={d.l} fill="none" stroke={grad} strokeWidth="3.2" strokeDasharray="7 3" strokeLinecap="round" />
      <path d={d.r} fill="none" stroke={grad} strokeWidth="3.2" strokeDasharray="7 3" strokeLinecap="round" />
      <text ref={tRef} x="320" y="250" textAnchor="middle" filter="url(#npGlow)" fontSize={d.fs}
        fontFamily={style === "caps" ? "Cormorant Garamond, serif" : "Pinyon Script, cursive"} fontWeight={style === "caps" ? 700 : 400}
        letterSpacing={style === "caps" ? 4 : 0} fill={grad} stroke={finish === "gold" ? "#5e4416" : "#555"} strokeWidth=".6">{shown}</text>
    </svg>
  );
}
