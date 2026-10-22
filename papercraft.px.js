// Porsche 911 GT3 RS papercraft, isometric pixel art for the EUJ01 profile README.
// A printed sheet drops in, the net is cut out, glue tabs stand up, the body sides fold up, and many
// thin creased strips curl over in a wave (nose to roof, then tail to roof) so the paper follows the
// 911's curves. Each strip has rounded shoulders: two narrow creased facets per edge. Then the
// frog-eye fender pods close, the swan-neck wing lands, wheels drop in, the car drives off, and the
// next sheet drops in (seamless loop).
// Every panel is a 3D polygon hinged to its parent. Each frame sets the fold angles, projects
// isometrically, and rasterizes with a z-buffer. Build: node export_gif.mjs -> assets/papercraft.gif

pal({
  k: "#1b1b1f", // outline, crease, intakes
  d: "#34404f", D: "#222a35", // tinted glass lit / shade
  c: "#3a3a42", C: "#26262c", // carbon (wing)
  w: "#eef3f2", W: "#c9d3d6", // headlight lit / shade
  r: "#d6262b", // tail light bar
  t: "#202024", m: "#4a4d56", M: "#2c2e34", o: "#ffd23f", // tire, rim, spoke, yellow ceramic brake caliper
  Y: "#ffd34d", // sparkle
  h: "#6b6660", // shadow dither
})
shades("12345", "#b9a0e8") // light purple print: 1 fold line, 2 shade, 3 half shade, 4 lit, 5 unused
shades("6789", "#ebe4d5") // white paper (sheet, glue tabs): 6 fold line, 7 shade, 8 half shade, 9 lit

const S = 7, ZF = 8.1 // px per iso unit, px per unit of height (2:1 dimetric)
const nrm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l) }
const VIEW = nrm([1.15, 1.15, 1]), LIGHT = nrm([-0.35, 0.55, 1])
const add = (a, b) => a.map((x, i) => x + b[i]), sub = (a, b) => a.map((x, i) => x - b[i])
const mul = (a, k) => a.map((x) => x * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const newell = (pts) => { let n = [0, 0, 0]; pts.forEach((a, i) => { n = add(n, cross(a, pts[(i + 1) % pts.length])) }); return nrm(n) }
const lerp = (a, b, t) => a + (b - a) * t
const chaikin = (pts) => { const o = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; o.push([lerp(a[0], b[0], 0.25), lerp(a[1], b[1], 0.25)], [lerp(a[0], b[0], 0.75), lerp(a[1], b[1], 0.75)]) } o.push(pts.at(-1)); return o }

// ---------- the paper model (units: X = length, front at +X; Y = width; Z = up) ----------
const WID = 5, H0 = 0.5 // H0: ground clearance on wheels
const RY = 0.55, RD = 0.3 // rounded shoulder: width on the top, drop on the side
// 911 side silhouette, smoothed. Sharp creases stay at the front bottom, the windshield base and the rear bottom.
const FRONT = chaikin([[12, 0], [12.1, 0.55], [11.95, 0.95], [11.4, 1.2], [10, 1.4], [8.3, 1.55]])
const REAR = chaikin([[8.3, 1.55], [6.5, 2.72], [5.4, 3.02], [4.4, 3.0], [3.4, 2.78], [2.3, 2.35], [1.2, 1.85], [0.45, 1.45], [0.05, 1.05], [0, 0.5], [0, 0]])
const BODY = [[0, 0], ...FRONT, ...REAR.slice(1, -1)]
const NB = BODY.length, NFRONT = FRONT.length - 1 // strips 1..NFRONT are nose, bumper and hood
let PEAK = 1; BODY.forEach((p, i) => { if (p[1] > BODY[PEAK][1]) PEAK = i }) // the forward chain stops at the roof top
const topZ = (x, rear) => { // height of the top curve at x (front part or rear part)
  const seg = rear ? REAR : FRONT
  for (let i = 0; i < seg.length - 1; i++) { const [a, b] = [seg[i], seg[i + 1]]; if ((x - a[0]) * (x - b[0]) <= 0 && a[0] !== b[0]) return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])) }
  return 0
}
const WHEELS = [[2.6, -0.12, 1.35], [10.1, -0.12, 1.25], [2.6, WID + 0.12, 1.35], [10.1, WID + 0.12, 1.25]] // x, y, radius
const CENTER = [6, WID / 2, 1.2]

const P = {}
const piece = (name, o) => (P[name] = { decals: [], ink: "body", ...o })
const deco = (name, pts, c) => P[name].decals.push([pts, c])
const side = (y, xz) => xz.map(([x, z]) => [x, y, z])
const outward = (pts, mid = CENTER) => { const v = newell(pts), c = pts.reduce((a, p) => add(a, mul(p, 1 / pts.length)), [0, 0, 0]); return dot(v, sub(c, mid)) < 0 ? mul(v, -1) : v }
const circ = (y, x, z, r, n = 16) => Array.from({ length: n }, (_, k) => [x + r * Math.cos(k * 2 * Math.PI / n), y, z + r * Math.sin(k * 2 * Math.PI / n)])

// the body profile offset inward by e (mitered); the bottom edge stays put
function inset(prof, e) {
  const n = prof.length, seg = (i) => { const a = prof[i], b = prof[(i + 1) % n], d = nrm([b[0] - a[0], b[1] - a[1], 0]); return { a, d, nn: [-d[1], d[0]], e: i === 0 ? 0 : e } }
  return prof.map((p, k) => {
    const s0 = seg((k - 1 + n) % n), s1 = seg(k)
    const A0 = [s0.a[0] + s0.nn[0] * s0.e, s0.a[1] + s0.nn[1] * s0.e], A1 = [s1.a[0] + s1.nn[0] * s1.e, s1.a[1] + s1.nn[1] * s1.e]
    const det = s0.d[0] * -s1.d[1] - s0.d[1] * -s1.d[0]
    if (Math.abs(det) < 1e-6) return [p[0] + s1.nn[0] * s1.e, p[1] + s1.nn[1] * s1.e]
    const s = ((A1[0] - A0[0]) * -s1.d[1] - (A1[1] - A0[1]) * -s1.d[0]) / det
    return [A0[0] + s0.d[0] * s, A0[1] + s0.d[1] * s]
  })
}
// shoulder levels (quarter circle): [y from the side, inset]
const LEVELS = [0, 45, 90].map((deg) => [RY - RY * Math.cos(deg * Math.PI / 180), RD - RD * Math.sin(deg * Math.PI / 180)]).reverse() // top -> side
const OFF = LEVELS.map(([, e]) => inset(BODY, e))
const at = (lv, i, t, y) => { const a = OFF[lv][i], b = OFF[lv][(i + 1) % NB]; return [lerp(a[0], b[0], t), y, lerp(a[1], b[1], t)] }

// strips: 0 = floor, 1..PEAK-1 fold forward from the floor, NB-1..PEAK fold back from the floor
piece("body0", { verts: [[0, 0, 0], [12, 0, 0], [12, WID, 0], [0, WID, 0]], normal: [0, 0, -1] })
for (let i = 1; i < NB; i++) {
  const fwd = i < PEAK, k = fwd ? i : (i + 1) % NB // the profile point shared with the parent strip
  const verts = [at(0, i, 0, RY), at(0, i, 1, RY), at(0, i, 1, WID - RY), at(0, i, 0, WID - RY)]
  piece("body" + i, { verts, normal: outward(verts), parent: "body" + (fwd ? i - 1 : (i + 1) % NB), seg: i,
    hinge: [[BODY[k][0], RY, BODY[k][1]], [BODY[k][0], WID - RY, BODY[k][1]]] })
  for (const [sd, ys] of [["L", (y) => y], ["R", (y) => WID - y]]) {
    for (let lv = 0; lv < LEVELS.length - 1; lv++) {
      const y0 = ys(LEVELS[lv][0]), y1 = ys(LEVELS[lv + 1][0])
      const fv = [at(lv, i, 0, y0), at(lv, i, 1, y0), at(lv + 1, i, 1, y1), at(lv + 1, i, 0, y1)]
      piece(`sh${sd}${lv}_${i}`, { verts: fv, normal: outward(fv), parent: lv ? `sh${sd}${lv - 1}_${i}` : "body" + i, hinge: [fv[0], fv[1]], strip: i })
    }
  }
}
const CAP = OFF.at(-1)
for (const [nm, y] of [["bodyL", 0], ["bodyR", WID]]) {
  const verts = side(y, CAP)
  piece(nm, { verts, normal: outward(verts), parent: "body0", hinge: [[CAP[0][0], y, 0], [CAP[1][0], y, 0]] })
}

// ---------- print on the body ----------
const band = (i, t0, t1, y0, y1) => [at(0, i, t0, y0), at(0, i, t1, y0), at(0, i, t1, y1), at(0, i, t0, y1)]
function paint(i0, i1, axis, v0, v1, y0, y1, c) { // print a band on strips i0..i1 where x (axis 0) or z (axis 2) lies in v0..v1
  for (let i = i0; i <= i1; i++) {
    const a = BODY[i][axis === 0 ? 0 : 1], b = BODY[(i + 1) % NB][axis === 0 ? 0 : 1]
    if (a === b) { if (a >= v0 && a <= v1) deco("body" + i, band(i, 0, 1, y0, y1), c); continue }
    let t0 = (v0 - a) / (b - a), t1 = (v1 - a) / (b - a)
    if (t0 > t1) [t0, t1] = [t1, t0]
    t0 = Math.max(t0, 0); t1 = Math.min(t1, 1)
    if (t1 > t0) deco("body" + i, band(i, t0, t1, y0, y1), c)
  }
}
const F = [1, NFRONT], R = [NFRONT + 1, NB - 1]
paint(...F, 0, 8.3, 11.9, 1.7, 2.25, "kk"); paint(...F, 0, 8.3, 11.9, 2.75, 3.3, "kk") // black hood stripes
paint(...F, 2, 0.12, 0.62, 1.4, 3.6, "kk") // center intake
paint(...F, 2, 0.36, 0.6, 2.05, 2.95, "99") // number plate
paint(...F, 2, 0.15, 0.62, 0.3, 1.2, "kk"); paint(...F, 2, 0.15, 0.62, WID - 1.2, WID - 0.3, "kk") // side intakes
paint(...F, 2, 0, 0.1, 0, WID, "kk") // front lip
paint(...R, 0, 6.6, 8.15, 0.75, WID - 0.75, "dD") // windshield
paint(...R, 0, 2.9, 4.5, 0.85, WID - 0.85, "dD") // rear glass
for (let k = 0; k < 4; k++) paint(...R, 0, 1.05 + k * 0.25, 1.17 + k * 0.25, 0.9, WID - 0.9, "kk") // engine lid louvers
paint(...R, 0, 0.06, 0.42, 0.3, WID - 0.3, "rr") // light bar
paint(...R, 2, 0, 0.42, 0.3, WID - 0.3, "kk") // diffuser
paint(...R, 2, 0.48, 0.62, 2.0, 2.4, "mm"); paint(...R, 2, 0.48, 0.62, 2.6, 3.0, "mm") // exhausts

const FONT = { G: ".11|1..|1.1|1.1|.11", T: "111|.1.|.1.|.1.|.1.", 3: "111|..1|.11|..1|111", R: "11.|1.1|11.|1.1|1.1", S: ".11|1..|.1.|..1|11.", " ": "...|...|...|...|..." }
const winTop = (x) => topZ(x, true) - RD - 0.12
const range = (a, b, n) => Array.from({ length: n }, (_, k) => lerp(a, b, k / (n - 1)))
for (const [cap, y] of [["bodyL", 0], ["bodyR", WID]]) {
  deco(cap, circ(y, 10.1, 1.25 - H0, 1.38), "kk") // wheel arches
  deco(cap, circ(y, 2.6, 1.35 - H0, 1.48), "kk")
  deco(cap, side(y, [[6.95, 2.0], ...range(6.6, 4.65, 7).map((x) => [x, winTop(x)]), [4.65, 2.0]]), "dD") // door window
  deco(cap, side(y, [[4.45, 2.0], ...range(4.45, 3.0, 6).map((x) => [x, winTop(x)]), [3.55, 2.0]]), "dD") // quarter window
  deco(cap, side(y, [[7.0, 0.4], [7.14, 0.4], [7.14, 2.0], [7.0, 2.0]]), "11") // door shut lines
  deco(cap, side(y, [[4.5, 0.4], [4.64, 0.4], [4.64, 2.0], [4.5, 2.0]]), "11")
  deco(cap, side(y, [[4.8, 1.68], [5.25, 1.68], [5.25, 1.81], [4.8, 1.81]]), "kk") // door handle
  deco(cap, side(y, [[3.55, 1.95], [4.35, 1.95], [4.15, 1.4], [3.75, 1.4]]), "kk") // rear quarter air intake
  deco(cap, side(y, [[0.3, 0.12], [11.7, 0.12], [11.7, 0.28], [0.3, 0.28]]), "kk") // side skirt
  deco(cap, side(y, [[0.15, 0.8], [0.75, 0.95], [0.75, 1.05], [0.15, 0.95]]), "rr") // tail light wrap
  if (y === WID) [..."GT3 RS"].forEach((ch, li) => FONT[ch].split("|").forEach((row, r) => [...row].forEach((on, col) => {
    if (on !== "1") return
    const x0 = 4.1 + (li * 4 + col) * 0.2, z0 = 0.36 + (4 - r) * 0.17
    deco(cap, side(y, [[x0, z0], [x0 + 0.2, z0], [x0 + 0.2, z0 + 0.17], [x0, z0 + 0.17]]), "kk")
  })))
}

// glue tabs on the body sides, folded in under the lowest shoulder facet
for (const [cap, sd] of [["bodyL", "L"], ["bodyR", "R"]]) {
  for (let i = 1; i < NB; i++) {
    const f = P[`sh${sd}${LEVELS.length - 2}_${i}`], [a, b, c, d] = f.verts // a, b on the shoulder's upper edge; c, d on the cap edge
    if (Math.hypot(...sub(c, d)) < 0.25) continue
    const pt = (u, v) => add(add(mul(d, (1 - u) * (1 - v)), mul(c, u * (1 - v))), add(mul(a, (1 - u) * v), mul(b, u * v)))
    const verts = [pt(0.15, 0), pt(0.85, 0), pt(0.75, 0.7), pt(0.25, 0.7)].map((p) => sub(p, mul(f.normal, 0.03)))
    piece(`tab${cap}${i}`, { verts, normal: f.normal, parent: cap, hinge: [d, c], tab: true, under: `sh${sd}${LEVELS.length - 2}_${i}`, ink: "white" })
  }
}

// frog-eye fender pods: smooth bulges on the hood, each with an oval headlight
const HB = (x) => topZ(x) - RD
for (const [nm, y0, y1] of [["podL", 0, 1.2], ["podR", WID - 1.2, WID]]) {
  const top = chaikin([[11.75, HB(11.75)], [11.7, 1.55], [11.3, 1.9], [10.4, 2.06], [9.4, 2.0], [8.8, 1.8], [8.55, HB(8.55)]])
  const prof = [top.at(-1), ...top.slice(0, -1)], n = prof.length, mid = [10.2, (y0 + y1) / 2, 1.6]
  let peak = 1; prof.forEach((p, i) => { if (p[1] > prof[peak][1]) peak = i })
  const sp = (i, t, y) => { const [a, b] = [prof[i], prof[(i + 1) % n]]; return [lerp(a[0], b[0], t), y, lerp(a[1], b[1], t)] }
  const attach = "body" + FRONT.findIndex((p) => p[0] < 10.2)
  for (let i = 0; i < n; i++) {
    const verts = [sp(i, 0, y0), sp(i, 1, y0), sp(i, 1, y1), sp(i, 0, y1)], fwd = i < peak, k = fwd ? i : (i + 1) % n
    piece(nm + i, { verts, normal: outward(verts, mid), parent: i ? nm + (fwd ? i - 1 : (i + 1) % n) : attach, rigid: !i,
      hinge: i ? [[prof[k][0], y0, prof[k][1]], [prof[k][0], y1, prof[k][1]]] : null, lifted: true })
  }
  for (const [cap, y] of [["L", y0], ["R", y1]]) {
    const verts = side(y, prof)
    piece(nm + cap, { verts, normal: outward(verts, mid), parent: nm + 0, hinge: [[prof[0][0], y, prof[0][1]], [prof[1][0], y, prof[1][1]]], lifted: true })
    deco(nm + cap, circ(y, 10.1, 1.25 - H0, 1.38), "kk")
  }
  const hi = prof.findIndex((p, i) => i && p[0] >= 11.45 && prof[(i + 1) % n][0] < 11.45) // the strip under the headlight
  const s = P[nm + hi], u = nrm(sub(s.verts[1], s.verts[0])), c = add(sp(hi, 0.5, (y0 + y1) / 2), mul(s.normal, 0.02))
  const lamp = Array.from({ length: 12 }, (_, k) => add(c, add(mul(u, 0.3 * Math.cos(k * Math.PI / 6)), [0, 0.38 * Math.sin(k * Math.PI / 6), 0])))
  piece(nm + "lamp", { verts: lamp, normal: s.normal, parent: nm + hi, rigid: true, ink: "wW", lifted: true })
}

// swan-neck rear wing: two uprights fold up from the engine lid, the wing drops on, end plates fold down
const WZ = 2.95, lid = "body" + BODY.findIndex((p, i) => i > PEAK && p[0] < 2.0)
for (const y of [1.5, 3.5]) {
  const verts = [[2.2, y, topZ(2.2, true)], [1.6, y, topZ(1.6, true)], [1.1, y, WZ + 0.05], [1.7, y, WZ + 0.05]]
  piece("upright" + y, { verts, normal: [0, 1, 0], parent: lid, hinge: [verts[0], verts[1]], ink: "cC", lifted: true })
}
piece("wing", { verts: [[1.8, 0, WZ], [0, 0, WZ], [0, WID, WZ], [1.8, WID, WZ]], normal: [0, 0, 1], parent: lid, rigid: true, drop: true, ink: "cC", lifted: true })
for (const [nm, y, ny] of [["plateL", 0, -1], ["plateR", WID, 1]]) {
  const verts = [[1.8, y, WZ], [0, y, WZ], [0, y, WZ - 0.6], [1.5, y, WZ - 0.6]]
  piece(nm, { verts, normal: [0, ny, 0], parent: "wing", hinge: [verts[0], verts[1]], ink: "cC", lifted: true })
}

for (const p of Object.values(P)) { // unfold angle: turn about the hinge until the normal matches the parent's
  if (!p.hinge) continue
  const u = nrm(sub(p.hinge[1], p.hinge[0])), np = P[p.parent].normal
  p.unfold = Math.atan2(dot(u, cross(p.normal, np)), dot(p.normal, np))
}

// ---------- timeline (frame numbers at 10 fps) ----------
const LAND = 4, CUT = 5, DROP = [9, 4, 1.2, 0] // sheet height on frames 0-3
for (const p of Object.values(P)) if (p.tab) p.when = [6, 10]
P.bodyL.when = [11, 16]; P.bodyR.when = [14, 19]
let T = 20
const wave = (idx) => { idx.forEach((i, k) => { // strips curl over one frame apart; their shoulders follow
  P["body" + i].when = [T + k, T + k + 4]
  for (const sd of "LR") for (let lv = 0; lv < LEVELS.length - 1; lv++) P[`sh${sd}${lv}_${i}`].when = [T + k + 2 + lv, T + k + 5 + lv]
}); T += idx.length + 6 }
wave(Array.from({ length: PEAK - 1 }, (_, k) => k + 1)) // nose -> roof
wave(Array.from({ length: NB - PEAK }, (_, k) => NB - 1 - k)) // tail -> roof
const step = (pred, len) => { for (const [nm, p] of Object.entries(P)) if (pred(nm, p)) p.when = [T, T + len]; T += len }
step((nm) => /^pod[LR][LR]$/.test(nm), 3)
step((nm) => /^pod[LR]\d+$/.test(nm) && nm !== "podL0" && nm !== "podR0", 5)
step((nm) => nm.startsWith("upright"), 3); step((nm) => nm === "wing", 3); step((nm) => nm.startsWith("plate"), 3)
const WHEELS_IN = [T + 1, T + 6], SPARKLE = [T + 7, T + 15], DRIVE_START = T + 16
const DRIVE = [0, 0.5, 1.2, 2.2, 3.6, 5.4, 7.6, 10.2, 13.2, 16.6, 20.4, 24.6, 29.2, 34]
const N = DRIVE_START + DRIVE.length + 2 // two empty frames, then the next sheet drops in
const HOLD = { [LAND]: 7, [CUT]: 3, [WHEELS_IN[1]]: 2, [SPARKLE[1]]: 4 }
const smooth = (t) => { t = Math.min(Math.max(t, 0), 1); return t * t * (3 - 2 * t) }
const prog = (p, f) => (p.when ? smooth((f - p.when[0]) / (p.when[1] - p.when[0])) : 1)

function state(f) {
  const d = f - DRIVE_START
  return { f, sheet: f <= LAND, drop: f < DROP.length ? DROP[f] : 0, wheels: smooth((f - WHEELS_IN[0]) / (WHEELS_IN[1] - 1 - WHEELS_IN[0])),
    bounce: f === WHEELS_IN[1], drive: d < 0 ? 0 : d < DRIVE.length ? DRIVE[d] : null, sparkle: f >= SPARKLE[0] && f <= SPARKLE[1] }
}

// 3x4 affine matrices
const mm = (A, B) => { const o = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { let v = c === 3 ? A[r * 4 + 3] : 0; for (let k = 0; k < 3; k++) v += A[r * 4 + k] * B[k * 4 + c]; o.push(v) } return o }
const ap = (M, p) => [0, 1, 2].map((r) => M[r * 4] * p[0] + M[r * 4 + 1] * p[1] + M[r * 4 + 2] * p[2] + M[r * 4 + 3])
const tr = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z]
function rot(a, b, ang) {
  const [x, y, z] = nrm(sub(b, a)), c = Math.cos(ang), s = Math.sin(ang), C = 1 - c
  const R = [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C]
  const t = sub(a, [0, 1, 2].map((r) => R[r * 3] * a[0] + R[r * 3 + 1] * a[1] + R[r * 3 + 2] * a[2]))
  return [R[0], R[1], R[2], t[0], R[3], R[4], R[5], t[1], R[6], R[7], R[8], t[2]]
}

// ---------- scene: polygons [world pts, ink, outline id, depth bias, decal] ----------
function scene(st) {
  const polys = [], mats = {}
  const root = tr(st.drive, 0, H0 * st.wheels + (st.bounce ? 0.12 : 0) + st.drop)
  const mat = (nm) => {
    if (!mats[nm]) {
      const p = P[nm]
      if (!p.parent) mats[nm] = root
      else if (p.rigid) mats[nm] = mm(mat(p.parent), tr(0, 0, p.drop ? (1 - prog(p, st.f)) ** 2 * 6 : 0))
      else mats[nm] = mm(mat(p.parent), rot(p.hinge[0], p.hinge[1], (1 - prog(p, st.f)) * p.unfold))
    }
    return mats[nm]
  }
  const settled = (nm) => { const p = P[nm]; return prog(p, st.f) >= 1 && (!p.parent || settled(p.parent)) }
  const early = (p) => (p.drop && st.f < p.when[0]) || (p.parent && P[p.parent].drop && st.f < P[p.parent].when[0])
  Object.entries(P).forEach(([nm, p], id) => {
    if (p.tab && prog(P[p.under], st.f) >= 1) return // glued shut: the tab is inside the car
    if (early(p)) return // the wing has not arrived yet
    const M = mat(nm), bias = p.lifted ? 0.004 : p.tab ? -0.006 : 0
    const done = settled(nm)
    polys.push([p.verts.map((v) => ap(M, v)), p.ink, id, bias, false, done])
    for (const [pts, c] of p.decals) polys.push([pts.map((v) => ap(M, v)), c, id, bias + 0.002, true, done])
  })
  if (st.sheet) { // the sheet: the flat net's bounds plus a margin
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
    for (const [pts] of polys) for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    const z = st.drop - 0.01
    polys.push([[[x0 - 0.8, y0 - 0.8, z], [x1 + 0.8, y0 - 0.8, z], [x1 + 0.8, y1 + 0.8, z], [x0 - 0.8, y1 + 0.8, z]], "white", 9000, -0.01, false])
  }
  if (st.wheels > 0) {
    const drop = (1 - st.wheels) ** 2 * 7, spin = -st.f * Math.PI / 5
    WHEELS.forEach(([xc, yw, R], wi) => {
      const c = [xc + st.drive, yw, R + drop], ring = (r, n = 18) => circ(yw, c[0], c[2], r, n)
      polys.push([ring(R), "tt", 8000 + wi, 0, false])
      polys.push([ring(R * 0.74), "mm", 8000 + wi, 0.002, false])
      polys.push([[[0.35, 0.5], [0.62, 0.5], [0.62, 1.25], [0.35, 1.25]].map(([r, a]) => add(c, [r * R * Math.cos(a), 0, r * R * Math.sin(a)])), "oo", 8000 + wi, 0.003, false]) // brake caliper
      for (let k = 0; k < 10; k++) { // multi-spoke rim
        const a = spin + k * Math.PI / 5, e = [Math.cos(a), 0, Math.sin(a)], q = [-Math.sin(a), 0, Math.cos(a)]
        polys.push([[add(c, mul(q, 0.05)), add(add(c, mul(e, R * 0.72)), mul(q, 0.06)), add(add(c, mul(e, R * 0.72)), mul(q, -0.06)), add(c, mul(q, -0.05))], "MM", 8000 + wi, 0.004, false])
      }
      polys.push([ring(R * 0.14, 8), "mm", 8000 + wi, 0.005, false]) // center lock
    })
    if (st.wheels >= 1) polys.push([[[-0.5, -0.5, 0], [12.5, -0.5, 0], [12.5, WID + 0.5, 0], [-0.5, WID + 0.5, 0]].map((v) => add(v, [st.drive, 0, 0])), "shadow", -2, -5, false])
  }
  return polys
}

// ---------- rasterizer ----------
const CW = 900, CH = 560, OX = 330, OY = 280
const proj = (p) => [(p[0] - p[1]) * S + OX, (p[0] + p[1]) * S / 2 - p[2] * ZF + OY, dot(p, VIEW)]
const facing = (n) => (dot(n, VIEW) < 0 ? mul(n, -1) : n) // paper looks the same from both sides
function inkOf(ink, n) {
  const b = dot(facing(n), LIGHT)
  if (ink === "body") return b > 0.8 ? "4" : b > 0.45 ? "3" : "2"
  if (ink === "white") return b > 0.8 ? "9" : b > 0.45 ? "8" : "7"
  return b > 0.45 ? ink[0] : ink[1]
}

function raster(polys) {
  const col = new Array(CW * CH).fill(""), fin = new Uint8Array(CW * CH), id = new Int32Array(CW * CH).fill(-1), dep = new Float64Array(CW * CH).fill(-Infinity), nr = new Array(CW * CH)
  for (const [pts, ink, pid, bias, decal, done] of polys) {
    const sc = pts.map(proj)
    let area = 0
    sc.forEach((a, i) => { const b = sc[(i + 1) % sc.length]; area += a[0] * b[1] - b[0] * a[1] })
    if (Math.abs(area / 2) < 0.15) continue // edge-on
    let best = 0, tri = null // plane through the widest vertex triple: depth = p.z + A*dx + B*dy
    for (let i = 0; i < sc.length; i++) for (let j = i + 1; j < sc.length; j++) for (let k = j + 1; k < sc.length; k++) {
      const [p, q, r] = [sc[i], sc[j], sc[k]], a2 = Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1]))
      if (a2 > best) { best = a2; tri = [p, q, r] }
    }
    const [p, q, r] = tri, det = (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])
    const A = ((q[2] - p[2]) * (r[1] - p[1]) - (r[2] - p[2]) * (q[1] - p[1])) / det, B = ((r[2] - p[2]) * (q[0] - p[0]) - (q[2] - p[2]) * (r[0] - p[0])) / det
    const n = newell(pts), key = ink === "shadow" ? null : inkOf(ink, n)
    const x0 = Math.max(0, Math.floor(Math.min(...sc.map((v) => v[0])))), x1 = Math.min(CW, Math.ceil(Math.max(...sc.map((v) => v[0]))) + 1)
    const y0 = Math.max(0, Math.floor(Math.min(...sc.map((v) => v[1])))), y1 = Math.min(CH, Math.ceil(Math.max(...sc.map((v) => v[1]))) + 1)
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const X = x + 0.5, Y = y + 0.5
      let inside = false
      for (let i = 0, j = sc.length - 1; i < sc.length; j = i++) {
        const [ax, ay] = sc[i], [bx, by] = sc[j]
        if ((ay > Y) !== (by > Y) && X < (bx - ax) * (Y - ay) / (by - ay) + ax) inside = !inside
      }
      if (!inside) continue
      const z = p[2] + A * (X - p[0]) + B * (Y - p[1]) + bias, o = y * CW + x
      if (z <= dep[o] || (decal && id[o] !== pid)) continue // decals stay on their own panel
      dep[o] = z
      if (ink === "shadow") { col[o] = (x + y) % 2 ? "h" : ""; continue }
      col[o] = key; id[o] = pid; nr[o] = facing(n); fin[o] = done ? 1 : 0
    }
  }
  // outlines: silhouette and depth steps in k; folded creases in k only where they turn sharply
  // (gentle creases between the thin strips stay soft); unfolded hinges as dashed fold lines
  const out = col.slice()
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const o = y * CW + x
    if (id[o] < 0) continue
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy, q = Y * CW + X
      const nid = X < 0 || Y < 0 || X >= CW || Y >= CH ? -1 : id[q]
      if (nid < 0) { out[o] = "k"; break }
      if (nid === id[o]) continue
      const jump = dep[o] - dep[q]
      if (jump > 0.9) { out[o] = "k"; break }
      if (jump < -0.9 || id[o] < nid) continue
      const flat = dot(nr[o], nr[q])
      if (flat < 0.82) { out[o] = "k"; break }
      if (flat > 0.9995 && (x + y) % 3 && id[o] < 8000 && nid < 8000 && !(fin[o] && fin[q])) out[o] = "234".includes(col[o]) ? "1" : "789".includes(col[o]) ? "6" : col[o]
    }
  }
  return out
}

function sparkles(g, f) {
  let x0 = CW, x1 = 0, y0 = CH, y1 = 0
  g.forEach((c, o) => { if (c && c !== "h") { const x = o % CW, y = (o / CW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) } })
  const spots = [[x0 - 6, y0 + 10], [x1 + 5, y0 + 3], [x1 - 10, y1 + 5], [x0 + 14, y0 - 6], [(x0 + x1) >> 1, y0 - 10]]
  spots.forEach(([cx, cy], k) => {
    if ((k + f) % 2) return
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
      if ((Math.abs(dx) === 2 || Math.abs(dy) === 2) && (k + f) % 4) continue
      const X = cx + dx, Y = cy + dy; if (X >= 0 && Y >= 0 && X < CW && Y < CH) g[Y * CW + X] = "Y"
    }
  })
}

// ---------- render every frame once, crop to the shared bounds ----------
const grids = Array.from({ length: N }, (_, f) => {
  const st = state(f)
  if (st.drive === null) return new Array(CW * CH).fill("")
  const g = raster(scene(st))
  if (st.sparkle) sparkles(g, f)
  return g
})
let bx0 = CW, bx1 = 0, by0 = CH, by1 = 0
grids.slice(LAND, DRIVE_START).forEach((g) => g.forEach((c, o) => {
  if (!c) return
  const x = o % CW, y = (o / CW) | 0
  bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y)
}))
bx0 -= 3; by0 -= 3
const W = bx1 - bx0 + 4, Hh = by1 - by0 + 4

anim("papercraft", { w: W, h: Hh, fps: 10 }, ...grids.map((g, f) => frame({ hold: HOLD[f] ?? 1 }, (c) => {
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const k = g[(y + by0) * CW + x + bx0]
    if (k) c.px(x, y, k)
  }
})))
