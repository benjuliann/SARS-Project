import 'leaflet/dist/leaflet.css'
import './style.css'
import L from 'leaflet'
import { EVENTS, type DisasterEvent, type DisasterType } from './events.ts'

interface Pass {
  date: string
  granule: string
  direction: string
  track: number
  frame: number
  image: string
  footprint: [number, number][]
}
interface EventData {
  bounds: L.LatLngBoundsLiteral
  passes: Pass[]
}

const TYPES: { type: DisasterType; label: string }[] = [
  { type: 'wildfire', label: 'Wildfires' },
  { type: 'flood', label: 'Floods' },
  { type: 'hurricane', label: 'Hurricanes' },
]
const DATA = `${import.meta.env.BASE_URL}data/`
const DAY = 86_400_000

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <aside id="panel">
    <h1>Surface change from space</h1>
    <p class="lede">How North American land changed after 2026 disasters, as seen by the NASA–ISRO NISAR L-band radar.</p>
    <div id="types" role="tablist"></div>
    <ul id="events"></ul>
    <section id="details"></section>
  </aside>
  <div id="map-wrap">
    <div id="map"></div>
    <div id="divider" hidden></div>
    <div id="swipe" hidden>
      <span id="before-label"></span>
      <input id="swipe-range" type="range" min="0" max="1000" value="500" aria-label="Before/after swipe" />
      <span id="after-label"></span>
    </div>
  </div>
`

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

// --- Map -------------------------------------------------------------------

const map = L.map('map', { zoomControl: true }).setView([50, -100], 3)
const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 18, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' },
).addTo(map)
const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors',
})
L.control.layers({ Satellite: satellite, Streets: streets }, undefined, { position: 'topright' }).addTo(map)
map.attributionControl.addAttribution('NISAR data: NASA/JPL-Caltech, ISRO, via ASF DAAC')

// Before/after images live in their own panes so each can be clipped to one side of the divider.
map.createPane('before').style.zIndex = '410'
map.createPane('after').style.zIndex = '420'

const markers = L.layerGroup().addTo(map)
let beforeLayer: L.ImageOverlay | undefined
let afterLayer: L.ImageOverlay | undefined
let footprintLayer: L.Polygon | undefined

const range = $<HTMLInputElement>('#swipe-range')
L.DomEvent.disableClickPropagation($('#swipe'))

function updateClip() {
  // Put the divider directly above the slider thumb.
  const size = map.getSize()
  const r = range.getBoundingClientRect()
  const x = r.left - map.getContainer().getBoundingClientRect().left + (Number(range.value) / 1000) * r.width
  const nw = map.containerPointToLayerPoint([0, 0])
  const se = map.containerPointToLayerPoint(size)
  const cx = map.containerPointToLayerPoint([x, 0]).x
  map.getPane('before')!.style.clip = `rect(${nw.y}px, ${cx}px, ${se.y}px, ${nw.x}px)`
  map.getPane('after')!.style.clip = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${cx}px)`
  $('#divider').style.left = `${x}px`
}
map.on('move resize', updateClip)
range.addEventListener('input', updateClip)

// --- State & UI --------------------------------------------------------------

let currentType: DisasterType = 'wildfire'
let current: DisasterEvent | undefined
let data: EventData | undefined
let loadToken = 0

function renderTypes() {
  $('#types').innerHTML = TYPES.map(
    (t) =>
      `<button role="tab" data-type="${t.type}" aria-selected="${t.type === currentType}">${t.label}</button>`,
  ).join('')
}

function renderEvents() {
  const list = EVENTS.filter((e) => e.type === currentType)
  $('#events').innerHTML = list.length
    ? list
        .map(
          (e) => `<li><button data-id="${e.id}" class="${e.id === current?.id ? 'active' : ''}">
            <strong>${e.name}</strong><span>${e.place} · ${fmt(e.date)}</span></button></li>`,
        )
        .join('')
    : '<li class="empty">No events of this type yet.</li>'

  markers.clearLayers()
  for (const e of list) {
    L.circleMarker([e.lat, e.lon], { radius: 7, color: '#fff', weight: 2, fillColor: '#e4572e', fillOpacity: 1 })
      .bindTooltip(e.name)
      .on('click', () => selectEvent(e))
      .addTo(markers)
  }
}

function clearOverlays() {
  beforeLayer?.remove()
  afterLayer?.remove()
  footprintLayer?.remove()
  beforeLayer = afterLayer = footprintLayer = undefined
  $('#swipe').hidden = $('#divider').hidden = true
}

async function selectEvent(e: DisasterEvent) {
  current = e
  data = undefined
  const token = ++loadToken
  renderEvents()
  clearOverlays()
  $('#details').innerHTML = `${eventInfo(e)}<p class="note">Loading NISAR passes…</p>`

  try {
    const res = await fetch(`${DATA}${e.id}.json`)
    if (res.ok) data = await res.json()
  } catch {
    // Treated as "no data" below.
  }
  if (token !== loadToken) return

  if (!data?.passes.length) {
    map.flyTo([e.lat, e.lon], 8)
    $('#details').innerHTML = `${eventInfo(e)}<p class="note">No NISAR GCOV passes have been processed for this event yet.</p>`
    return
  }
  map.flyToBounds(data.bounds)

  const { passes } = data
  const t = Date.parse(e.date)
  const lag = e.type === 'wildfire' ? 30 * DAY : 0 // burn scars are clearest weeks after ignition
  const before = passes.findLast((p) => Date.parse(p.date) < t) ?? passes[0]
  const after = passes.find((p) => Date.parse(p.date) >= t + lag) ?? passes[passes.length - 1]
  const options = (sel: Pass) =>
    passes.map((p) => `<option value="${p.date}" ${p === sel ? 'selected' : ''}>${fmt(p.date)}</option>`).join('')

  const p0 = passes[0]
  $('#details').innerHTML = `${eventInfo(e)}
    <div class="dates">
      <label>Before<select id="before">${options(before)}</select></label>
      <label>After<select id="after">${options(after)}</select></label>
    </div>
    <p class="note">Drag the slider at the bottom of the map to compare. Images are NISAR L2 GCOV
      browse composites (HH/HV backscatter), track ${p0.track} ${p0.direction.toLowerCase()}, frame ${p0.frame}.
      Using one track keeps the viewing geometry the same for every date.</p>
    <p class="note">${passes.length} passes: ${fmt(p0.date)} – ${fmt(passes[passes.length - 1].date)}</p>
    ${passes.some((p) => Date.parse(p.date) >= t) ? '' : '<p class="note"><strong>No NISAR pass after this event has been published yet.</strong> Only pre-event imagery is available.</p>'}`

  $('#before').addEventListener('change', showPasses)
  $('#after').addEventListener('change', showPasses)
  showPasses()
}

function eventInfo(e: DisasterEvent) {
  return `<h2>${e.name}</h2>
    <p class="place">${e.place} · ${fmt(e.date)}</p>
    <p>${e.summary}</p>
    <p><a href="${e.source}" target="_blank" rel="noopener">Source</a></p>`
}

function showPasses() {
  if (!data) return
  const pick = (id: string) => data!.passes.find((p) => p.date === $<HTMLSelectElement>(id).value)!
  const before = pick('#before')
  const after = pick('#after')

  clearOverlays()
  beforeLayer = L.imageOverlay(DATA + before.image, data.bounds, { pane: 'before' }).addTo(map)
  afterLayer = L.imageOverlay(DATA + after.image, data.bounds, { pane: 'after' }).addTo(map)
  footprintLayer = L.polygon(after.footprint, { color: '#fff', weight: 1, dashArray: '4 4', fill: false })
    .bindTooltip(after.granule)
    .addTo(map)

  $('#before-label').textContent = `Before · ${fmt(before.date)}`
  $('#after-label').textContent = `After · ${fmt(after.date)}`
  $('#swipe').hidden = $('#divider').hidden = false
  updateClip()
}

$('#types').addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-type]')
  if (!btn) return
  currentType = btn.dataset.type as DisasterType
  renderTypes()
  renderEvents()
})

$('#events').addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]')
  const e = EVENTS.find((x) => x.id === btn?.dataset.id)
  if (e) selectEvent(e)
})

renderTypes()
renderEvents()
selectEvent(EVENTS.find((e) => e.id === 'thunder-bay-36')!)
