import { useId, type CSSProperties } from "react";
import s from "../InvitationTemplate.module.css";

/** Separate decorative layers: entry motion is on the wrapper, wind on its child. */
export function Flowers({ position = "bottomLeft", variety }: { position?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight"; variety?: "magnolia" | "trumpet" | "blossoms" }) {
  const kind = variety ?? (position.startsWith("top") ? "trumpet" : position === "bottomLeft" ? "magnolia" : "blossoms");
  return <span aria-hidden="true" data-reveal="bloom" data-flower={kind} className={`${s.flowers} ${s[position]} ${s[kind]}`}><i /></span>;
}

export function Swan({ reverse = false }: { reverse?: boolean }) {
  return <span aria-hidden="true" data-reveal="swan" className={`${s.swan} ${reverse ? s.swanReverse : ""}`}><i /><span className={s.swanRosette} /></span>;
}

export function Petals() {
  return <div className={s.petals} aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ "--petal-index": i } as CSSProperties} />)}</div>;
}

export function Lace() {
  return <div className={s.lace} aria-hidden="true" data-reveal="lace" />;
}

/** A code-native carved frame: layered outlines, scrollwork and engraved leaves. */
export function CarvedFrame({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const pigment = `url(#carve-${id})`;
  const outline = "M200 32C145 80 72 0 31 65C5 104 31 131 21 181C8 258 29 301 20 366C8 417 26 442 31 472C55 520 140 465 200 510C260 465 345 520 369 472C374 442 392 417 380 366C371 301 392 258 379 181C369 131 395 104 369 65C328 0 255 80 200 32Z";
  return <svg aria-hidden="true" className={`${s.carvedFrame} ${className}`} viewBox="0 0 400 540" preserveAspectRatio="none" fill="none">
    <defs><linearGradient id={`carve-${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--inv-frame-highlight)" /><stop offset=".25" stopColor="var(--inv-frame)" /><stop offset=".55" stopColor="var(--inv-frame-shadow)" /><stop offset=".8" stopColor="var(--inv-frame)" /><stop offset="1" stopColor="var(--inv-frame-highlight)" /></linearGradient></defs>
    <path d={outline} stroke="var(--inv-frame-shadow)" strokeWidth="12" />
    <path d={outline} stroke={pigment} strokeWidth="9" />
    <path d={outline} transform="translate(-1 -1)" stroke="var(--inv-frame-highlight)" strokeWidth=".8" />
    <path d={outline} transform="translate(2 2)" stroke="var(--inv-frame-shadow)" strokeWidth=".8" />
    <path d={outline} transform="translate(10 14) scale(.95 .95)" stroke="var(--inv-frame-highlight)" strokeWidth="1" />
    {[false, true].map((bottom) => <g key={String(bottom)} transform={bottom ? "translate(400 540) rotate(180)" : undefined} stroke="var(--inv-frame-highlight)" strokeWidth=".75" fill={pigment}>
      <path d="M200 55C183 32 171 32 176 19C183 5 196 22 200 39C204 22 217 5 224 19C229 32 217 32 200 55Z" />
      <path d="M200 40C191 23 190 4 200 2C210 4 209 23 200 40Z" />
      <path d="M192 51C159 52 147 20 132 27C119 35 149 49 174 50M208 51C241 52 253 20 268 27C281 35 251 49 226 50" />
      <path d="M200 56C150 70 121 31 91 35C62 36 42 63 56 81C67 95 81 78 68 70C62 65 56 70 61 75M200 56C250 70 279 31 309 35C338 36 358 63 344 81C333 95 319 78 332 70C338 65 344 70 339 75" fill="none" />
      <path d="M196 52L182 23M204 52L218 23M200 39V12M174 50L148 33M226 50L252 33" stroke="var(--inv-frame-shadow)" />
      {[0,1,2,3,4,5].map((i)=><g key={i} transform={`translate(${79+i*11} ${38+i*2}) rotate(${-35+i*8})`}><path d="M0 10C-9 3 -8 -9 0 -15C3 -5 8 4 0 10Z" /><path d="M0 7V-10" stroke="var(--inv-frame-shadow)" /></g>)}
      {[0,1,2,3,4,5].map((i)=><g key={i} transform={`translate(${321-i*11} ${38+i*2}) rotate(${35-i*8})`}><path d="M0 10C9 3 8 -9 0 -15C-3 -5 -8 4 0 10Z" /><path d="M0 7V-10" stroke="var(--inv-frame-shadow)" /></g>)}
    </g>)}
    {[false, true].map((right) => <g key={String(right)} transform={right ? "translate(400 0) scale(-1 1)" : undefined} stroke="var(--inv-frame-highlight)" strokeWidth=".7" fill={pigment}>
      <path d="M22 141C62 198 3 252 29 302C59 349 13 395 30 448" fill="none" strokeWidth="3" />
      {[145,180,215,250,285,320,355,390,425].map((y, i) => <g key={y}><path d={`M26 ${y + 18}C${i % 2 ? 10 : 40} ${y + 5} ${i % 2 ? 12 : 44} ${y - 8} 26 ${y - 15}C${i % 2 ? 30 : 22} ${y} 31 ${y + 9} 26 ${y + 18}Z`} /><path d={`M26 ${y+12}Q${i%2?21:32} ${y} 26 ${y-10}`} stroke="var(--inv-frame-shadow)" /></g>)}
    </g>)}
  </svg>;
}

export function Fan() {
  return <svg viewBox="0 0 360 200" aria-hidden="true" className={s.fan} data-reveal="fan">
    {Array.from({ length: 11 }, (_, i) => <g key={i} style={{ "--fan-angle": `${(i - 5) * 13}deg`, "--fan-order": i } as CSSProperties}>
      <path d="M180 184L161 24Q180 9 199 24Z" fill={i % 2 ? "var(--inv-primary)" : "var(--inv-frame)"} stroke="var(--inv-secondary)" strokeWidth="1.4" />
      <path d="M180 179V32M168 35Q180 45 192 35M170 60Q180 72 190 60" fill="none" stroke="var(--inv-secondary)" />
      <path d="M180 100C157 79 170 70 180 86C190 70 203 79 180 100Z" fill="var(--inv-accent)" />
    </g>)}
    <circle cx="180" cy="184" r="5" fill="var(--inv-secondary)" />
  </svg>;
}

export function AnimatedName({ value, second = false }: { value: string; second?: boolean }) {
  return <span className={`${s.animatedName} ${second ? s.secondName : ""}`} aria-label={value}>
    {Array.from(value).map((letter, index) => <span aria-hidden="true" key={index} style={{ "--letter": index } as CSSProperties}>{letter === " " ? "\u00a0" : letter}</span>)}
  </span>;
}
