You are helping me build a project for the 2026 NASA Space Apps Challenge, "Earth's surface is an endless dance" (NISAR). The challenge is to build an interactive, open-source, user-friendly web application that uses radar remote sensing data from the NASA-ISRO NISAR mission to track and visualize surface change.

## Project description
Explore how North American land has changed from natural disasters between the launch of NISAR and today (November 2026).

## Scope
- Region: North America
- Disaster types: Forest fires, floods, hurricanes
- Fires and floods are the priority. Hurricanes are a stretch goal.

## Core feature
1. Set up a Leaflet map of North America.
2. Provide a layer or disaster-type selector (Wildfires / Floods / Hurricanes). Selecting one shows that event's data overlaid on the Leaflet map.
3. Add a before/after slider at the bottom of the map so the user can compare imagery or change data within a chosen timeframe. A date range or time slider is a plus.
4. Let the user navigate to any event in the list below. Start with Thunder Bay 36.

## Starter events

Wildfires
- Thunder Bay 36 fire, northwestern Ontario (BUILD THIS FIRST). It is the largest wildfire at 318,813 ha. It peaked in July 2026, so the before passes (from June 17 on) and the burn scar after are both covered. Source: https://en.wikipedia.org/wiki/2026_Canadian_wildfires
- British Columbia and Northwest Territories fires, July 2026. One example is the Fiftynine Creek wildfire west of Cache Creek, BC, around July 17. Source: https://www.arabnews.pk/node/2651676/world

Floods
- Texas Hill Country, mid-July 2026. Over 20 inches of rain fell in parts of Texas, including along the Pedernales River around July 16. Source: https://www.ajc.com/news/2026/07/weather-conditions-again-brought-devastating-floods-to-a-vulnerable-swath-of-texas/
- Indiana and the Midwest, mid-August 2026. The White River in Anderson, Ind., rose to a record 24.9 feet, surpassing a mark that has stood since 1913. Source: https://www.nhpr.org/2026-08-15/the-midwest-braces-for-more-heavy-flooding-as-indiana-seeks-federal-aid
- Early November 2026 (very recent, so data may still be processing). Flooding hit Pagosa Springs, Colorado, and Florida's Space Coast, where Melbourne recorded 11.51 inches of rain on a Monday. Source: https://www.foxweather.com/extreme-weather/video-photo-flood-cross-country-storm-southwest-florida-southeast-northeast

## Data sources
- NISAR data: ASF Data Search Vertex (https://search.asf.alaska.edu/) and the NISAR Data User Guide (https://nisar-docs.asf.alaska.edu/). NASA Earthdata Search (https://search.earthdata.nasa.gov/search) is also available.
- Optional supplements for context or gap-filling: optical imagery and GIS layers, and the Canadian RADARSAT Constellation Mission (https://donnees-data.asc-csa.gc.ca/en/dataset/rcm).
- SAR tutorial: https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial

## Steps
1. Start with Thunder Bay 36. Find NISAR acquisitions over the fire area for before (from about June 17, 2026) and after (post-burn scar). Download them, or use ASF's processed products.
2. Process them (for example, backscatter in dB with HH/HV