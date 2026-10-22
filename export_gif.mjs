// Export the pxl anim at an integer scale for the README (pxl's own GIF is 1x).
// Usage: node export_gif.mjs [scale=2]   -> assets/papercraft.gif (+ preview/contact.png strip via pxl build)
import { writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const pxl = join(homedir(), ".claude", "skills", "pxl-pixel-art", "src")
const { loadProject } = await import(pathToFileURL(join(pxl, "index.ts")).href)
const { encodeGif } = await import(pathToFileURL(join(pxl, "node", "gif.ts")).href)

const scale = Number(process.argv[2] ?? 2)
const here = import.meta.dirname
const frames = loadProject(join(here, "papercraft.px.js")).frames("papercraft")
const up = ({ w, h, data }) => {
  const out = new Uint32Array(w * scale * h * scale)
  for (let y = 0; y < h * scale; y++) for (let x = 0; x < w * scale; x++) out[y * w * scale + x] = data[((y / scale) | 0) * w + ((x / scale) | 0)]
  return { w: w * scale, h: h * scale, data: out }
}
const gif = encodeGif(frames.map((f) => ({ img: up(f.img), ms: f.ms })))
writeFileSync(join(here, "assets", "papercraft.gif"), gif)
console.log(`wrote assets/papercraft.gif (${frames.length} frames, ${frames[0].img.w * scale}x${frames[0].img.h * scale}, ${(gif.length / 1024) | 0} KB)`)
