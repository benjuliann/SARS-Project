// Disaster events shown in the app. Shared by the UI and scripts/fetch-nisar.ts.
// `lat`/`lon` are approximate event locations; `date` is the onset/peak used to
// pick default before/after passes; `search` is the NISAR acquisition window.

export type DisasterType = 'wildfire' | 'flood' | 'hurricane'

export interface DisasterEvent {
  id: string
  type: DisasterType
  name: string
  place: string
  lat: number
  lon: number
  date: string
  search: [string, string]
  summary: string
  source: string
}

export const EVENTS: DisasterEvent[] = [
  {
    id: 'thunder-bay-36',
    type: 'wildfire',
    name: 'Thunder Bay 36 fire',
    place: 'Wabakimi Provincial Park, northwestern Ontario',
    lat: 50.4,
    lon: -89.6,
    date: '2026-07-12',
    search: ['2026-06-15', '2026-11-14'],
    summary:
      'Largest wildfire of the 2026 season at 318,813 ha. It formed on July 12 when several fires merged and destroyed Namaygoosisagagun (Collins) First Nation.',
    source: 'https://en.wikipedia.org/wiki/2026_Canadian_wildfires',
  },
  {
    id: 'fiftynine-creek',
    type: 'wildfire',
    name: 'Fiftynine Creek fire',
    place: 'West of Cache Creek, British Columbia',
    lat: 50.8,
    lon: -121.45,
    date: '2026-07-17',
    search: ['2026-06-15', '2026-11-14'],
    summary: 'One of several British Columbia wildfires in July 2026, burning around July 17.',
    source: 'https://www.arabnews.pk/node/2651676/world',
  },
  {
    id: 'fort-simpson',
    type: 'wildfire',
    name: 'Northwest Territories fires',
    place: 'Near Fort Simpson, NWT',
    lat: 61.86,
    lon: -121.35,
    date: '2026-07-16',
    search: ['2026-06-01', '2026-11-14'],
    summary: 'Several wildfires burned near Fort Simpson in July 2026.',
    source: 'https://en.wikipedia.org/wiki/2026_Canadian_wildfires',
  },
  {
    id: 'texas-hill-country',
    type: 'flood',
    name: 'Texas Hill Country flood',
    place: 'Pedernales River, Texas',
    lat: 30.28,
    lon: -98.41,
    date: '2026-07-16',
    search: ['2026-06-15', '2026-09-15'],
    summary: 'More than 20 inches of rain fell in parts of Texas, including along the Pedernales River, around July 16.',
    source:
      'https://www.ajc.com/news/2026/07/weather-conditions-again-brought-devastating-floods-to-a-vulnerable-swath-of-texas/',
  },
  {
    id: 'anderson-indiana',
    type: 'flood',
    name: 'White River flood',
    place: 'Anderson, Indiana',
    lat: 40.1,
    lon: -85.68,
    date: '2026-08-14',
    search: ['2026-07-15', '2026-09-30'],
    summary: 'The White River at Anderson rose to a record 24.9 ft, breaking a mark that had stood since 1913.',
    source: 'https://www.nhpr.org/2026-08-15/the-midwest-braces-for-more-heavy-flooding-as-indiana-seeks-federal-aid',
  },
  {
    id: 'pagosa-springs',
    type: 'flood',
    name: 'Pagosa Springs flood',
    place: 'Pagosa Springs, Colorado',
    lat: 37.27,
    lon: -107.01,
    date: '2026-11-02',
    search: ['2026-10-01', '2026-11-14'],
    summary: 'Early-November flooding. This is very recent, so NISAR products may still be processing.',
    source:
      'https://www.foxweather.com/extreme-weather/video-photo-flood-cross-country-storm-southwest-florida-southeast-northeast',
  },
  {
    id: 'melbourne-florida',
    type: 'flood',
    name: 'Space Coast flood',
    place: 'Melbourne, Florida',
    lat: 28.08,
    lon: -80.61,
    date: '2026-11-02',
    search: ['2026-10-01', '2026-11-14'],
    summary: 'Melbourne recorded 11.51 inches of rain in one day. This is very recent, so NISAR products may still be processing.',
    source:
      'https://www.foxweather.com/extreme-weather/video-photo-flood-cross-country-storm-southwest-florida-southeast-northeast',
  },
]
