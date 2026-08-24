import L from "leaflet";
import type { LatLng } from "../../utils/tracking";

// Exact key transit cities with precise GPS coordinates
export const TRANSIT_CITIES: { name: string; position: LatLng; isHub?: boolean }[] = [
  { name: "تهران", position: [35.6892, 51.389], isHub: true },
  { name: "مشهد", position: [36.2972, 59.6067], isHub: true },
  { name: "تبریز", position: [38.08, 46.2919], isHub: true },
  { name: "اصفهان", position: [32.6546, 51.668], isHub: true },
  { name: "شیراز", position: [29.5918, 52.5837], isHub: false },
  { name: "بندرعباس", position: [27.1832, 56.2666], isHub: true },
  { name: "بوشهر", position: [28.9234, 50.8203], isHub: false },
  { name: "یزد", position: [31.8974, 54.3569], isHub: false },
  { name: "قزوین", position: [36.2797, 50.0049], isHub: false },
  { name: "زنجان", position: [36.6736, 48.4787], isHub: false },
  { name: "سمنان", position: [35.5769, 53.397], isHub: false },
  { name: "شاهرود", position: [36.4182, 54.9763], isHub: false },
];

/**
 * Creates a theme-reactive city waypoint marker icon
 */
export function createCityMarker(cityName: string, isHub: boolean = false): L.DivIcon {
  const dotBg = isHub ? "#0284c7" : "#0d9488";
  return L.divIcon({
    className: "city-geo-marker",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div class="city-marker-wrap">
        <div class="city-marker-badge">
          <span style="
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${dotBg};
            box-shadow: 0 0 6px ${dotBg};
            display: inline-block;
          "></span>
          <span>${cityName}</span>
        </div>
        <div class="city-marker-dot" style="border-color: ${dotBg};"></div>
      </div>
    `,
  });
}

/**
 * Creates a moving vehicle icon with direction rotation
 */
export function createVehicleIcon(
  heading: number,
  color: string,
  id: string,
  isSelected: boolean
): L.DivIcon {
  const darkColor =
    color === "#3b82f6"
      ? "#1d4ed8"
      : color === "#10b981"
      ? "#047857"
      : color === "#f59e0b"
      ? "#b45309"
      : "#be123c";

  const size = 40;
  const anchor = 20;

  return L.divIcon({
    className: `truck-leaflet-marker marker-${id} ${
      isSelected ? "is-selected-marker" : ""
    }`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    html: `
      <div
        class="truck-marker-inner"
        style="transform: rotate(${heading.toFixed(
          2
        )}deg); border-color: ${color}; box-shadow: 0 0 ${
      isSelected ? 22 : 14
    }px ${color}${
      isSelected ? "cc" : "88"
    }, 0 4px 12px rgba(0,0,0,0.6), inset 0 0 8px ${color}60;"
        onmousedown="event.stopPropagation();"
        onpointerdown="event.stopPropagation();"
        onclick="event.stopPropagation(); event.preventDefault(); if (window.__selectFleetVehicle) window.__selectFleetVehicle('${id}');"
      >
        <div class="truck-heading-pointer" style="border-bottom-color: ${color}; filter: drop-shadow(0 0 6px ${color});"></div>
        <div class="truck-vehicle-body">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3.5" y="4.5" width="2" height="4" rx="1" fill="#0f172a" stroke="${color}" stroke-width="0.5" />
            <rect x="18.5" y="4.5" width="2" height="4" rx="1" fill="#0f172a" stroke="${color}" stroke-width="0.5" />
            <rect x="3.5" y="15" width="2" height="4.5" rx="1" fill="#0f172a" stroke="${color}" stroke-width="0.5" />
            <rect x="18.5" y="15" width="2" height="4.5" rx="1" fill="#0f172a" stroke="${color}" stroke-width="0.5" />
            <path d="M6 7.5C6 4.5 7.5 2 12 2C16.5 2 18 4.5 18 7.5V19C18 20.5 16.5 21.5 12 21.5C7.5 21.5 6 20.5 6 19V7.5Z" fill="url(#truckGrad-${id})" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M7.5 7C7.5 5 8.5 4 12 4C15.5 4 16.5 5 16.5 7L16 9.5H8L7.5 7Z" fill="#ffffff" fill-opacity="0.9" />
            <rect x="8" y="11" width="8" height="6.5" rx="1.5" fill="#1e293b" fill-opacity="0.75" />
            <circle cx="8" cy="3.5" r="0.9" fill="#fef08a" />
            <circle cx="16" cy="3.5" r="0.9" fill="#fef08a" />
            <defs>
              <linearGradient id="truckGrad-${id}" x1="6" y1="2" x2="18" y2="21.5" gradientUnits="userSpaceOnUse">
                <stop stop-color="${color}" />
                <stop offset="1" stop-color="${darkColor}" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div class="truck-pulse-ring" style="border-color: ${color}90;"></div>
    `,
  });
}
