// Finds NISAR GCOV (backscatter) passes over each event and writes
// public/data/<event-id>.json for the map.
//
// Usage: node scripts/fetch-nisar.ts [event-id ...]   (Node 22.18+)
//
// For each event it queries the ASF Search API and keeps the frame (track) whose
// footprint is centered closest to the event, so every pass shares one viewing geometry.
// The map uses each pass's public browse PNG (an HH/HV color composite). That PNG is
// north-up but rotated inside a black margin, so this script downloads it and finds
// the pixel corners of the valid data. The map then matches those corners to the
// footprint's lat/lon corners to georeference the image.

import { mkdirSync, writeFileSync } from 'node:fs'
import pngjs from 'pngjs'
import { EVENTS } from '../src/events.ts'

const { PNG } = pngjs
const ASF = 'https://api.daac.asf.alaska.edu/services/search/param'

type Pt = [number, number]
type Png = InstanceType<typeof PNG>

// Half-size of the area kept around each event, in degrees.
const HALF_LAT = 1.2
const HALF_LON = 1.8
// Output pixels average a STEP x STEP block of source pixels (~200 m each), keeping file sizes small.
const STEP = 2

async function search(lat: number, lon: number, start: string, end: string) {
  const params = new URLSearchParams({
    platform: 'NISAR',
    processingLevel: 'GCOV',
    intersectsWith: `POINT(${lon} ${lat})`,
    start: `${start}T00:00:00Z`,
    end: `${end}T23:59:59Z`,
    output: 'geojson',
    maxResults: '500',
  })
  const res = await fetch(`${ASF}?${params}`)
  if (!res.ok) throw new Error(`ASF search failed: ${res.status}`)
  return (await res.json()).features as any[]
}

// Corners of the valid (non-black) data in the image: [top, right, bottom, left] as [x, y].
function pixelCorners(png: Png): Pt[] {
  const { width, height, data } = png
  let top: Pt = [0, height], bottom: Pt = [0, -1], left: Pt = [width, 0], right: Pt = [-1, 0]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (data[i] + data[i + 1] + data[i + 2] <= 3) continue
      if (y < top[1]) top = [x, y]
      if (y > bottom[1]) bottom = [x, y]
      if (x < left[0]) left = [x, y]
      if (x > right[0]) right = [x, y]
    }
  }
  return [top, right, bottom, left]
}

// Footprint corners in the same order as pixelCorners: [top, right, bottom, left] as [lon, lat].
function footprintCorners(ring: Pt[]): Pt[] {
  const pts = ring.slice(0, 4)
  const pick = (f: (p: Pt) => number) => pts.reduce((a, b) => (f(b) > f(a) ? b : a))
  const corners = [pick((p) => p[1]), pick((p) => p[0]), pick((p) => -p[1]), pick((p) => -p[0])]
  if (new Set(corners).size !== 4) throw new Error('Footprint is axis-aligned; corner matching is ambiguous')
  return corners
}

// Affine map (lon, lat) -> (x, y) pixel, solved exactly from three corner pairs.
function affine(from: Pt[], to: Pt[]) {
  const [a, b, c] = from
  const det = (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1])
  const coef = (k: 0 | 1) => {
    const A = ((to[0][k] - to[2][k]) * (b[1] - c[1]) - (to[1][k] - to[2][k]) * (a[1] - c[1])) / det
    const B = ((a[0] - c[0]) * (to[1][k] - to[2][k]) - (b[0] - c[0]) * (to[0][k] - to[2][k])) / det
    return [A, B, to[2][k] - A * c[0] - B * c[1]]
  }
  const [fx, fy] = [coef(0), coef(1)]
  return ([lon, lat]: Pt): Pt => [fx[0] * lon + fx[1] * lat + fx[2], fy[0] * lon + fy[1] * lat + fy[2]]
}

function insidePolygon([x, y]: Pt, ring: Pt[]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
const invMercY = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90

// Resamples the browse image onto a Web Mercator grid covering `bounds` ([[S, W], [N, E]]),
// so Leaflet can draw it with a plain image overlay. Pixels outside the footprint are transparent.
function warp(src: Png, ring: Pt[], bounds: [Pt, Pt]) {
  const corners = footprintCorners(ring)
  const toPx = affine(corners, pixelCorners(src))
  const [[s, w], [n, e]] = bounds
  const [x0] = toPx([w, n]), [x1] = toPx([e, n]), [, y0] = toPx([w, n]), [, y1] = toPx([w, s])
  const width = Math.round(Math.abs(x1 - x0) / STEP), height = Math.round(Math.abs(y1 - y0) / STEP)
  const out = new PNG({ width, height })
  const [ys, yn] = [mercY(s), mercY(n)]
  for (let r = 0; r < height; r++) {
    const lat = invMercY(yn - ((r + 0.5) / height) * (yn - ys))
    for (let c = 0; c < width; c++) {
      const lon = w + ((c + 0.5) / width) * (e - w)
      const o = (r * width + c) * 4
      if (!insidePolygon([lon, lat], ring)) continue
      const [x, y] = toPx([lon, lat]).map((v) => Math.floor(v - STEP / 2))
      if (x < 0 || y < 0 || x + STEP > src.width || y + STEP > src.height) continue
      const sum = [0, 0, 0]
      for (let dy = 0; dy < STEP; dy++) {
        for (let dx = 0; dx < STEP; dx++) {
          const i = ((y + dy) * src.width + x + dx) * 4
          for (let k = 0; k < 3; k++) sum[k] += src.data[i + k]
        }
      }
      for (let k = 0; k < 3; k++) out.data[o + k] = Math.round(sum[k] / (STEP * STEP))
      out.data[o + 3] = 255
    }
  }
  return PNG.sync.write(out, { deflateLevel: 9 })
}

async function run(id: string) {
  const ev = EVENTS.find((e) => e.id === id)
  if (!ev) throw new Error(`Unknown event ${id}`)
  const features = await search(ev.lat, ev.lon, ...ev.search)

  // Keep one granule per acquisition (prefer the non-provisional collection), grouped by track/frame.
  const byTrack = new Map<string, Map<string, any>>()
  for (const f of features) {
    const p = f.properties
    const key = `${p.pathNumber}-${p.frameNumber}`
    if (!byTrack.has(key)) byTrack.set(key, new Map())
    const t = byTrack.get(key)!
    const prev = t.get(p.startTime)
    if (!prev || prev.properties.collectionName.includes('PROVISIONAL')) t.set(p.startTime, f)
  }
  const dist = (f: any) => {
    const ring: Pt[] = f.geometry.coordinates[0].slice(0, 4)
    const [lon, lat] = ring.reduce((a, b) => [a[0] + b[0] / 4, a[1] + b[1] / 4], [0, 0])
    return Math.hypot((lon - ev.lon) * Math.cos((lat * Math.PI) / 180), lat - ev.lat)
  }
  const tracks = [...byTrack.values()].map((t) => [...t.values()])
  tracks.sort((a, b) => dist(a[0]) - dist(b[0]))
  const granules = (tracks[0] ?? []).sort((a, b) => a.properties.startTime.localeCompare(b.properties.startTime))

  // Every pass of an event is cropped to the same window, so before/after images align exactly.
  const bounds: [Pt, Pt] = [
    [ev.lat - HALF_LAT, ev.lon - HALF_LON],
    [ev.lat + HALF_LAT, ev.lon + HALF_LON],
  ]
  const dir = `public/data/${id}`
  mkdirSync(dir, { recursive: true })

  const passes = []
  for (const f of granules) {
    const p = f.properties
    const url: string | undefined = p.browse?.find((u: string) => u.endsWith('_LATLON.png'))
    if (!url) continue
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`  skip ${p.startTime}: browse ${res.status}`)
      continue
    }
    const ring: Pt[] = f.geometry.coordinates[0]
    const image = `${id}/${p.startTime.slice(0, 10)}.png`
    writeFileSync(`public/data/${image}`, warp(PNG.sync.read(Buffer.from(await res.arrayBuffer())), ring, bounds))
    passes.push({
      date: p.startTime,
      granule: p.sceneName,
      direction: p.flightDirection,
      track: p.pathNumber,
      frame: p.frameNumber,
      image,
      footprint: ring.map(([lon, lat]) => [lat, lon]),
    })
    console.log(`  ${p.startTime} track ${p.pathNumber} frame ${p.frameNumber}`)
  }

  writeFileSync(`public/data/${id}.json`, JSON.stringify({ id, bounds, passes }, null, 1))
  console.log(`${id}: ${passes.length} passes`)
}

const ids = process.argv.slice(2)
for (const id of ids.length ? ids : EVENTS.map((e) => e.id)) await run(id)
