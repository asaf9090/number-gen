import { useState, useEffect } from "react";

const BG    = "#080c14";
const CARD   = "#0f1623";
const CARD2  = "#161f30";
const BLUE   = "#4f7cff";
const BLUE2  = "#2d5be3";
const TEAL   = "#0dbcbc";
const PUR    = "#8b5cf6";
const GRN    = "#10d97a";
const RED    = "#ff4757";
const TXT    = "#f0f6ff";
const TXTS   = "#6b7a99";

// Register PWA service worker
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}

function totalOf(s) {
  return s.split("").map(Number).reduce((a, b) => a + b, 0) % 10;
}

function classify3(a, b, c) {
  if (a === b && b === c) return "triple";
  if (a === b || b === c || a === c) return "double";
  return "single";
}

function perms3(a, b, c) {
  const set = new Set();
  const arr = [a, b, c];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++)
        if (i !== j && j !== k && i !== k)
          set.add(`${arr[i]}${arr[j]}${arr[k]}`);
  return [...set].sort();
}

function classify2(a, b) { return a === b ? "double" : "single"; }

function perms2(a, b) {
  const set = new Set();
  [`${a}${b}`, `${b}${a}`].forEach(s => { if (s.length === 2) set.add(s); });
  return [...set].sort();
}

function hasCutPair(numStr, pair) {
  const p = pair.trim();
  if (p.length !== 2) return false;
  if (numStr.length === 2) return numStr.includes(p);
  const digit1 = p[0];
  const digit2 = p[1];
  return numStr.includes(digit1) && numStr.includes(digit2);
}

function copyText(text, cb) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(cb).catch(() => fallbackCopy(text, cb));
  } else {
    fallbackCopy(text, cb);
  }
}

function fallbackCopy(text, cb) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand("copy"); cb(); } catch (e) {}
  document.body.removeChild(ta);
}

const TB = {
  single: { bg: "rgba(16,217,122,0.15)", bd: "#10d97a", tx: "#10d97a", s: "S" },
  double: { bg: "rgba(79,124,255,0.18)", bd: "#4f7cff", tx: "#7da8ff", s: "D" },
  triple: { bg: "rgba(255,71,87,0.18)",  bd: "#ff4757", tx: "#ff7b87", s: "T" },
};

function Tag({ tp }) {
  const c = TB[tp] || TB.single;
  return (
    <span style={{
      fontSize: 9, fontWeight: 900, padding: "2px 5px", borderRadius: 4,
      background: c.bg, border: `1px solid ${c.bd}`, color: c.tx,
      marginLeft: 3, verticalAlign: "middle", letterSpacing: 0.5,
    }}>{c.s}</span>
  );
}

export default function App() {
  const [cat, setCat] = useState("3d");
  const [digits, setDigits] = useState(new Set());
  const [types, setTypes] = useState(new Set(["all"]));
  const [mode, setMode] = useState("ramble");
  const [view, setView] = useState("numbers");
  const [cuts, setCuts] = useState([]);
  const [cutIn, setCutIn] = useState("");
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState("");

  function switchCat(c) {
    setCat(c); setDigits(new Set()); setTypes(new Set(["all"]));
    setMode("ramble"); setView("numbers"); setResult(null);
    setCuts([]); setCutIn("");
  }

  function tapDigit(d) {
    setDigits(p => { const s = new Set(p); s.has(d) ? s.delete(d) : s.add(d); return s; });
  }

  function tapType(t) {
    setTypes(p => {
      const s = new Set(p);
      if (t === "all") { s.clear(); s.add("all"); }
      else { s.delete("all"); s.has(t) ? s.delete(t) : s.add(t); if (!s.size) s.add("all"); }
      return s;
    });
  }

  function addCut() {
    const p = cutIn.trim();
    if (!/^\d{2}$/.test(p)) { pop("⚠ Enter exactly 2 digits"); return; }
    if (cuts.includes(p)) { pop("Already added"); return; }
    setCuts(prev => [...prev, p]);
    setCutIn("");
  }

  function isExcluded(numStr, cutList) {
    return cutList.some(p => hasCutPair(numStr, p));
  }

  function create() {
    if (digits.size < 2) { pop("⚠ Select at least 2 digits"); return; }
    cat === "3d" ? create3(cuts) : create2(cuts);
  }

  function create3(cutList) {
    const dg = [...digits].sort((a, b) => a - b);
    const seen = new Set(), ramble = [], groups = [];
    for (let i = 0; i < dg.length; i++)
      for (let j = i; j < dg.length; j++)
        for (let k = j; k < dg.length; k++) {
          const [a, b, c] = [dg[i], dg[j], dg[k]];
          const tp = classify3(a, b, c);
          if (!types.has("all") && !types.has(tp)) continue;
          const key = [a, b, c].sort().join("");
          if (seen.has(key)) continue;
          seen.add(key);
          const allPs = perms3(a, b, c);
          const ps = cutList.length > 0 ? allPs.filter(n => !isExcluded(n, cutList)) : allPs;
          if (!ps.length) continue;
          ramble.push({ num: ps[0], tp, total: totalOf(ps[0]) });
          groups.push({ base: ps[0], perms: ps.map(n => ({ num: n, tp, total: totalOf(n) })) });
        }
    if (!ramble.length) { pop("No numbers found"); return; }
    setResult({ ramble, groups });
  }

  function create2(cutList) {
    const dg = [...digits].sort((a, b) => a - b);
    const seen = new Set(), ramble = [], groups = [];
    for (let i = 0; i < dg.length; i++)
      for (let j = i; j < dg.length; j++) {
        const [a, b] = [dg[i], dg[j]];
        const tp = classify2(a, b);
        if (!types.has("all") && !types.has(tp)) continue;
        const key = [a, b].sort().join("");
        if (seen.has(key)) continue;
        seen.add(key);
        const allPs = a === b ? [`${a}${a}`] : perms2(a, b);
        const ps = cutList.length > 0 ? allPs.filter(n => !isExcluded(n, cutList)) : allPs;
        if (!ps.length) continue;
        ramble.push({ num: ps[0], tp, total: totalOf(ps[0]) });
        groups.push({ base: ps[0], perms: ps.map(n => ({ num: n, tp, total: totalOf(n) })) });
      }
    if (!ramble.length) { pop("No numbers found"); return; }
    setResult({ ramble, groups });
  }

  function reset() {
    setDigits(new Set()); setTypes(new Set(["all"]));
    setMode("ramble"); setView("numbers"); setResult(null);
    setCuts([]); setCutIn("");
  }

  function copyAll() {
    if (!result) { pop("Nothing to copy"); return; }
    const nums = mode === "ramble" ? result.ramble.map(x => x.num) : result.groups.flatMap(g => g.perms.map(p => p.num));
    if (!nums.length) { pop("No numbers"); return; }
    copyText(nums.join(", "), () => pop(`✓ Copied ${nums.length} numbers!`));
  }

  function copyRow(nums) { copyText(nums.join(", "), () => pop(`✓ Copied ${nums.length} numbers!`)); }
  function pop(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const items = !result ? [] : mode === "ramble" ? result.ramble : result.groups.flatMap(g => g.perms);
  function byTotal(arr) {
    const m = {};
    arr.forEach(x => { (m[x.total] = m[x.total] || []).push(x); });
    return Object.keys(m).map(Number).sort((a, b) => a - b).map(t => ({ t, its: m[t] }));
  }

  const tOpts = cat === "3d" ? [
    { k: "all", l: "All", bg: BLUE, glow: BLUE },
    { k: "single", l: "Single", bg: GRN, glow: GRN },
    { k: "double", l: "Double", bg: TEAL, glow: TEAL },
    { k: "triple", l: "Triple", bg: PUR, glow: PUR },
  ] : [
    { k: "all", l: "All", bg: BLUE, glow: BLUE },
    { k: "single", l: "Single", bg: GRN, glow: GRN },
    { k: "double", l: "Double", bg: TEAL, glow: TEAL },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "-apple-system,'Segoe UI',sans-serif", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, display: "flex", flexDirection: "column" }}>
        
        {/* HEADER */}
        <div style={{ background: `linear-gradient(135deg,${CARD},#0a1020)`, padding: "12px 13px 10px", borderBottom: `1px solid rgba(79,124,255,0.2)`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🎰</span>
            <div style={{ fontSize: 15, fontWeight: 900, color: TXT, letterSpacing: 1.5, textTransform: "uppercase" }}>Number Creator</div>
          </div>
          <button onClick={() => { copyText(window.location.href, () => pop("✓ Link copied!")); }} style={{ background: "rgba(79,124,255,0.1)", border: `1px solid rgba(79,124,255,0.3)`, borderRadius: 6, color: BLUE, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🔗 Share</button>
        </div>

        {/* AD SLOT */}
        <div style={{ width: "100%", height: 60, display: "flex", justifyContent: "center", alignItems: "center", margin: "10px 0" }}>
          <div dangerouslySetInnerHTML={{ __html: `
            <script type="text/javascript">
              atOptions = {
                'key' : '04186cbc5baf73e8902ddcf9b1dc6923',
                'format' : 'iframe',
                'height' : 50,
                'width' : 320,
                'params' : {}
              };
            </script>
            <script type="text/javascript" src="https://www.highperformanceformat.com/04186cbc5baf73e8902ddcf9b1dc6923/invoke.js"></script>
          `}} />
        </div>

        {/* অ্যাপের বাকি কন্টেন্ট এখানে থাকবে (আপনার আগের কোড অনুযায়ী) */}
        
        {/* ... (বাকি বাটন এবং আউটপুট সেকশন এখানে বসবে) ... */}

      </div>
    </div>
  );
}