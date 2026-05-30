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
const AMBER  = "#ffb020";
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
  
  if (numStr.length === 2) {
    return numStr.includes(p);
  }
  
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
  const [cat,    setCat]    = useState("3d");
  const [digits, setDigits] = useState(new Set());
  const [types,  setTypes]  = useState(new Set(["all"]));
  const [mode,   setMode]   = useState("ramble");
  const [view,   setView]   = useState("numbers");
  const [cuts,   setCuts]   = useState([]);
  const [cutIn,  setCutIn]  = useState("");
  const [result, setResult] = useState(null);
  const [toast,  setToast]  = useState("");

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
    const finalRamble = [];
    const rambleSeen = new Set();
    ramble.forEach(x => { if (!rambleSeen.has(x.num)) { rambleSeen.add(x.num); finalRamble.push(x); } });
    setResult({ ramble: finalRamble, groups });
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
    const finalRamble = [];
    const rambleSeen = new Set();
    ramble.forEach(x => { if (!rambleSeen.has(x.num)) { rambleSeen.add(x.num); finalRamble.push(x); } });
    setResult({ ramble: finalRamble, groups });
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

  const tOpts = cat === "3d" ? 
    [{ k: "all", l: "All", bg: BLUE, glow: BLUE }, { k: "single", l: "Single", bg: GRN, glow: GRN }, { k: "double", l: "Double", bg: TEAL, glow: TEAL }, { k: "triple", l: "Triple", bg: PUR, glow: PUR }] : 
    [{ k: "all", l: "All", bg: BLUE, glow: BLUE }, { k: "single", l: "Single", bg: GRN, glow: GRN }, { k: "double", l: "Double", bg: TEAL, glow: TEAL }];
  const viewLabel = view === "numbers" ? "NUMBERS VIEW" : "TOTAL VIEW";

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "-apple-system,'Segoe UI',sans-serif", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, display: "flex", flexDirection: "column" }}>

        {/* HEADER */}
        <div style={{ background: `linear-gradient(135deg,${CARD},#0a1020)`, padding: "12px 13px 10px", borderBottom: `1px solid rgba(79,124,255,0.2)`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🎰</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: TXT, letterSpacing: 1.5, textTransform: "uppercase" }}>Number Creator</div>
            </div>
          </div>
          <button onClick={() => { copyText(window.location.href, () => pop("✓ Link copied to clipboard!")); }} style={{ background: "rgba(79,124,255,0.1)", border: `1px solid rgba(79,124,255,0.3)`, borderRadius: 6, color: BLUE, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>🔗 Share</button>
        </div>

        {/* AD SLOT */}
        <div style={{ width: "100%", height: 60, display: "flex", justifyContent: "center", alignItems: "center", margin: "10px 0" }}>
          <div dangerouslySetInnerHTML={{ __html: `<script type="text/javascript">atOptions = {'key' : '04186cbc5baf73e8902ddcf9b1dc6923','format' : 'iframe','height' : 50,'width' : 320,'params' : {}};</script><script type="text/javascript" src="https://www.highperformanceformat.com/04186cbc5baf73e8902ddcf9b1dc6923/invoke.js"></script>` }} />
        </div>

        {/* CAT TABS */}
        <div style={{ padding: "0 10px 8px", display: "flex", gap: 6 }}>
          {[{ k: "2d", l: "2D" }, { k: "3d", l: "3D" }].map(({ k, l }) => {
            const on = cat === k;
            return (
              <button key={k} onClick={() => switchCat(k)} style={{ flex: 1, padding: "5px 8px", border: on ? "none" : `1px solid rgba(79,124,255,0.2)`, borderRadius: 8, cursor: "pointer", fontWeight: 800, fontSize: 13, fontFamily: "inherit", background: on ? `linear-gradient(135deg,${BLUE},${BLUE2})` : "rgba(79,124,255,0.06)", color: on ? "#fff" : TXTS, boxShadow: on ? `0 0 16px rgba(79,124,255,0.4)` : "none", transition: "all 0.2s" }}>{l}</button>
            );
          })}
        </div>

        {/* বাকি কন্টেন্ট */}
        <div style={{ padding: "0 10px" }}>
          {/* DIGIT + TYPE */}
          <div style={{ background: CARD, borderRadius: 12, padding: "10px", marginBottom: 8, border: `1px solid rgba(79,124,255,0.12)` }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ flex: "0 0 auto" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: BLUE, letterSpacing: 2, marginBottom: 7, textTransform: "uppercase" }}>Select Digits</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5, width: 182 }}>
                  {[0,1,2,3,4,5,6,7,8,9].map(d => {
                    const on = digits.has(d);
                    return (<button key={d} onClick={() => tapDigit(d)} style={{ width: 33, height: 33, borderRadius: "50%", border: on ? "none" : `1.5px solid rgba(79,124,255,0.2)`, fontSize: 13, fontWeight: 800, cursor: "pointer", transition: "all 0.15s", background: on ? `linear-gradient(145deg,${BLUE},${BLUE2})` : "rgba(255,255,255,0.04)", color: on ? "#fff" : TXTS, boxShadow: on ? `0 0 12px rgba(79,124,255,0.6)` : "none" }}>{d}</button>);
                  })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: BLUE, letterSpacing: 2, marginBottom: 7, textTransform: "uppercase" }}>Type</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                  {tOpts.map(({ k, l, bg, glow }) => {
                    const on = types.has(k);
                    return (<button key={k} onClick={() => tapType(k)} style={{ padding: "7px 4px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 10, background: on ? bg : "rgba(255,255,255,0.05)", color: on ? "#fff" : TXTS, boxShadow: on ? `0 0 12px ${glow}66` : "none", gridColumn: cat === "3d" && k === "triple" ? "1/-1" : "auto" }}>{l}</button>);
                  })}
                </div>
              </div>
            </div>
          </div>
          
          {/* CUT PAIR */}
          <div style={{ background: CARD, borderRadius: 12, padding: "9px 10px", marginBottom: 8, border: `1px solid rgba(255,71,87,0.2)` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: RED, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>✂ Cut Pair</div>
            <div style={{ display: "flex", gap: 5 }}>
              <input type="text" inputMode="numeric" maxLength={2} value={cutIn} onChange={e => setCutIn(e.target.value.replace(/\D/g, "").slice(0, 2))} onKeyDown={e => e.key === "Enter" && addCut()} placeholder="Enter 2 digits" style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: `1px solid rgba(255,71,87,0.3)`, background: "rgba(255,71,87,0.06)", color: TXT, fontSize: 14, fontWeight: 700, outline: "none" }} />
              <button onClick={addCut} style={{ padding: "7px 14px", border: "none", borderRadius: 7, cursor: "pointer", background: RED, color: "#fff", fontSize: 11, fontWeight: 800 }}>+ Add</button>
            </div>
            {cuts.length > 0 && (<div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>{cuts.map(p => (<div key={p} style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(255,71,87,0.12)", border: `1px solid ${RED}`, borderRadius: 6, padding: "3px 8px" }}><span style={{ fontSize: 12, fontWeight: 800, color: RED }}>{p}</span><button onClick={() => setCuts(prev => prev.filter(x => x !== p))} style={{ background: "none", border: "none", cursor: "pointer", color: RED }}>×</button></div>))}</div>)}
          </div>

          {/* MODE | VIEW */}
          <div style={{ background: CARD, borderRadius: 12, padding: "8px 10px", marginBottom: 8, border: `1px solid rgba(79,124,255,0.12)` }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: BLUE, letterSpacing: 2, marginBottom: 6, textAlign: "center", textTransform: "uppercase" }}>Mode</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[{ k: "direct", l: "Direct" }, { k: "ramble", l: "Ramble" }].map(({ k, l }) => { const on = mode === k; return (<button key={k} onClick={() => setMode(k)} style={{ flex: 1, padding: "6px 4px", border: on ? "none" : `1px solid rgba(79,124,255,0.2)`, borderRadius: 6, background: on ? `linear-gradient(135deg,${BLUE},${BLUE2})` : "rgba(79,124,255,0.05)", color: on ? "#fff" : TXTS }}>{l}</button>); })}
                </div>
              </div>
              <div style={{ width: 1, background: "rgba(79,124,255,0.2)", height: 36, margin: "0 10px", marginTop: 8 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: BLUE, letterSpacing: 2, marginBottom: 6, textAlign: "center", textTransform: "uppercase" }}>View</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[{ k: "numbers", l: "Numbers" }, { k: "totals", l: "By Total" }].map(({ k, l }) => { const on = view === k; return (<button key={k} onClick={() => setView(k)} style={{ flex: 1, padding: "6px 4px", border: on ? "none" : `1px solid rgba(79,124,255,0.2)`, borderRadius: 6, background: on ? `linear-gradient(135deg,${TEAL},#0a8f8f)` : "rgba(79,124,255,0.05)", color: on ? "#fff" : TXTS }}>{l}</button>); })}
                </div>
              </div>
            </div>
          </div>

          {/* CREATE BUTTON */}
          <button onClick={create} style={{ width: "100%", padding: "10px", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 900, cursor: "pointer", background: `linear-gradient(135deg,${BLUE},${BLUE2})`, color: "#fff", marginBottom: 10 }}>⚡ Create {cat.toUpperCase()}</button>

          {/* OUTPUT */}
          <div style={{ background: CARD, borderRadius: 12, padding: "12px", minHeight: 220, maxHeight: 440, overflowY: "auto", border: `1px solid rgba(79,124,255,0.12)`, marginBottom: 8 }}>
            {!result && (<div style={{ color: "#1a2340", fontSize: 12, textAlign: "center", padding: "80px 0" }}>Select Numbers to Create</div>)}
            {result && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: BLUE, marginBottom: 10 }}>RESULT <span style={{ color: TXTS }}>({viewLabel})</span></div>
                {view === "numbers" && (<div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>{items.map((x, i) => (<div key={i} style={{ background: CARD2, borderRadius: 8, padding: "7px 5px", border: `1px solid rgba(79,124,255,0.1)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 13, fontWeight: 800, color: TXT }}>{x.num}</span><Tag tp={x.tp} /></div>))}</div>)}
                {view === "totals" && byTotal(items).map(({ t, its }) => (<div key={t} style={{ marginBottom: 7, borderRadius: 9, overflow: "hidden", border: `1px solid rgba(79,124,255,0.15)` }}><div style={{ background: `linear-gradient(135deg,${BLUE},${BLUE2})`, padding: "5px 10px", display: "flex", justifyContent: "space-between" }}><span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>Total: {t}</span><button onClick={() => copyRow(its.map(x => x.num))} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 5, fontSize: 9 }}>⧉ Copy</button></div><div style={{ padding: "7px", background: CARD2, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>{its.map((x, i) => (<div key={i} style={{ background: CARD, borderRadius: 6, padding: "5px 3px", border: `1px solid rgba(79,124,255,0.1)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 12, fontWeight: 800, color: TXT }}>{x.num}</span><Tag tp={x.tp} /></div>))}</div></div>))}
              </>
            )}
          </div>

          {/* RESET + COPY */}
          <div style={{ display: "flex", gap: 8, paddingBottom: 20 }}>
            <button onClick={reset} style={{ flex: 1, padding: "11px", border: `1px solid rgba(79,124,255,0.2)`, borderRadius: 9, background: "rgba(79,124,255,0.06)", color: TXTS }}>↺ Reset</button>
            <button onClick={copyAll} style={{ flex: 1, padding: "11px", border: "none", borderRadius: 9, background: `linear-gradient(135deg,${GRN},#0aad60)`, color: "#fff" }}>⧉ Copy All</button>
          </div>
        </div>
      </div>
      {toast && (<div style={{ position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg,${BLUE},${BLUE2})`, color: "#fff", padding: "9px 22px", borderRadius: 30, fontSize: 12, fontWeight: 800, zIndex: 999 }}>{toast}</div>)}
    </div>
  );
}