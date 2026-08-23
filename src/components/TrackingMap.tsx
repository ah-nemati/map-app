import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Compass,
  Crosshair,
  Maximize2,
  Navigation,
  Plus,
  Minus,
  Layers,
  LayoutGrid,
  Check,
  X,
  RotateCw,
  Sun,
  Moon,
  Map as MapIcon,
  Globe,
  EyeOff,
} from "lucide-react";
import {
  type LatLng,
  type RouteStats,
  geoToLatLng,
  haversine,
  bearing,
  calculateLookaheadBearing,
  smoothAngle,
  interpolate,
  calculateTotalDistance,
  getRouteBounds,
  formatDurationFa,
  toPersianDigits,
} from "../utils/tracking";
import defaultRouteData from "../data/route.json";
import { useTheme } from "../context/ThemeContext";

// START (Tehran South Terminal) and END (Bandar Abbas Shahid Rajaee Port)
const START_POINT: LatLng = [35.6567, 51.4089];
const END_POINT: LatLng = [27.1450, 56.0650];

// Static Path Options to prevent React-Leaflet from re-applying styles mid-zoom
const BASE_ROUTE_STYLE: L.PolylineOptions = {
  color: "#3b82f6",
  weight: 6,
  opacity: 0.85,
  lineCap: "round",
  lineJoin: "round",
};

const TRAVELED_ROUTE_STYLE: L.PolylineOptions = {
  color: "#10b981",
  weight: 6,
  opacity: 0.95,
  lineCap: "round",
  lineJoin: "round",
};

// Map Tile Layer Providers
export const TILE_PROVIDERS = {
  dark: {
    id: "dark",
    name: "نقشه تیره (Dark)",
    shortName: "تیره",
    description: "کنتراست بالا و بهینه‌سازی شده برای دید شب",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
    icon: Moon,
    previewGradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    accentColor: "#3b82f6",
    tag: "تیره",
  },
  street: {
    id: "street",
    name: "نقشه خیابانی (Street)",
    shortName: "خیابانی",
    description: "جزئیات کامل راه‌ها، تقاطع‌ها و نام شهرها",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: "abc",
    maxZoom: 19,
    icon: MapIcon,
    previewGradient: "linear-gradient(135deg, #cbd5e1 0%, #64748b 100%)",
    accentColor: "#10b981",
    tag: "استاندارد",
  },
  satellite: {
    id: "satellite",
    name: "تصاویر ماهواره‌ای (Satellite)",
    shortName: "ماهواره‌ای",
    description: "تصاویر با کیفیت واقعی هوایی و عوارض زمین",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri &mdash; Maxar, Earthstar Geographics',
    subdomains: "abc",
    maxZoom: 18,
    icon: Globe,
    previewGradient: "linear-gradient(135deg, #0c4a6e 0%, #064e3b 100%)",
    accentColor: "#06b6d4",
    tag: "هوایی HD",
  },
  light: {
    id: "light",
    name: "نقشه روشن (Light)",
    shortName: "روشن",
    description: "طراحی مینیمال و خوانا برای محیط‌های روشن",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
    icon: Sun,
    previewGradient: "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)",
    accentColor: "#f59e0b",
    tag: "روشن",
  },
} as const;

export type TileLayerKey = keyof typeof TILE_PROVIDERS;
export type CornerPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";
export type HudPosition = CornerPosition | "hidden";

const CORNER_ORDER: CornerPosition[] = [
  "top-right",
  "bottom-right",
  "bottom-left",
  "top-left",
];

const POSITION_LABELS: Record<CornerPosition, { name: string; icon: string }> = {
  "top-right": { name: "بالا - راست", icon: "↗" },
  "top-left": { name: "بالا - چپ", icon: "↖" },
  "bottom-right": { name: "پایین - راست", icon: "↘" },
  "bottom-left": { name: "پایین - چپ", icon: "↙" },
};

const STORAGE_KEY_TOOLS_POS = "map_tools_position";
const STORAGE_KEY_HUD_POS = "map_hud_position";
const STORAGE_KEY_LAYER = "map_tile_layer";

// Custom DOM Marker for the vehicle
function createVehicleIcon(heading: number) {
  return L.divIcon({
    className: "truck-leaflet-marker",
    html: `
      <div class="truck-marker-inner" style="transform: rotate(${heading.toFixed(2)}deg);">
        <div class="truck-heading-pointer"></div>
        <div class="truck-vehicle-body">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3.5" y="4.5" width="2" height="4" rx="1" fill="#0f172a" stroke="#60a5fa" stroke-width="0.5" />
            <rect x="18.5" y="4.5" width="2" height="4" rx="1" fill="#0f172a" stroke="#60a5fa" stroke-width="0.5" />
            <rect x="3.5" y="15" width="2" height="4.5" rx="1" fill="#0f172a" stroke="#60a5fa" stroke-width="0.5" />
            <rect x="18.5" y="15" width="2" height="4.5" rx="1" fill="#0f172a" stroke="#60a5fa" stroke-width="0.5" />
            <path d="M6 7.5C6 4.5 7.5 2 12 2C16.5 2 18 4.5 18 7.5V19C18 20.5 16.5 21.5 12 21.5C7.5 21.5 6 20.5 6 19V7.5Z" fill="url(#truckGrad)" stroke="#93c5fd" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M7.5 7C7.5 5 8.5 4 12 4C15.5 4 16.5 5 16.5 7L16 9.5H8L7.5 7Z" fill="#38bdf8" fill-opacity="0.9" />
            <rect x="8" y="11" width="8" height="6.5" rx="1.5" fill="#1e293b" fill-opacity="0.75" />
            <circle cx="8" cy="3.5" r="0.9" fill="#fef08a" />
            <circle cx="16" cy="3.5" r="0.9" fill="#fef08a" />
            <defs>
              <linearGradient id="truckGrad" x1="6" y1="2" x2="18" y2="21.5" gradientUnits="userSpaceOnUse">
                <stop stop-color="#3b82f6" />
                <stop offset="1" stop-color="#1d4ed8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div class="truck-pulse-ring"></div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

// Start & End Pins
function createPinIcon(type: "start" | "end") {
  const isStart = type === "start";
  return L.divIcon({
    className: "waypoint-pin-marker",
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: ${isStart ? "#10b981" : "#f43f5e"};
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: 800;
        font-family: 'Vazirmatn FD', 'Vazirmatn', sans-serif;
      ">
        ${isStart ? "مبدا" : "مقصد"}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

interface TrackingMapProps {
  running: boolean;
  setRunning: (v: boolean) => void;
  speedMultiplier?: number;
  seekProgress?: number | null; // 0 to 1 for interactive scrubber
  onStats: (stats: RouteStats) => void;
  onRouteLoaded?: (totalPoints: number, totalDistKm: number) => void;
}

export default function TrackingMap({
  running,
  setRunning,
  speedMultiplier = 2,
  seekProgress = null,
  onStats,
  onRouteLoaded,
}: TrackingMapProps) {
  const { theme } = useTheme();
  const [route, setRoute] = useState<LatLng[]>([]);
  
  // Customizable positions with default top-right for navigation tools
  const [toolsPosition, setToolsPosition] = useState<CornerPosition>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TOOLS_POS) as CornerPosition | null;
    if (saved && ["top-right", "top-left", "bottom-right", "bottom-left"].includes(saved)) {
      return saved;
    }
    return "top-right"; // Default: Top-Right as requested!
  });

  const [hudPosition, setHudPosition] = useState<HudPosition>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HUD_POS) as HudPosition | null;
    if (saved && ["top-right", "top-left", "bottom-right", "bottom-left", "hidden"].includes(saved)) {
      return saved;
    }
    return "top-left"; // Default: Top-Left so it doesn't overlap tools in Top-Right
  });

  const [activeTileLayer, setActiveTileLayer] = useState<TileLayerKey>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LAYER) as TileLayerKey | null;
    if (saved && TILE_PROVIDERS[saved]) {
      return saved;
    }
    return theme === "dark" ? "dark" : "street";
  });

  const [autoFollow, setAutoFollow] = useState(true);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentHeading, setCurrentHeading] = useState(0);

  // Popup toggle states
  const [isStylePopupOpen, setIsStylePopupOpen] = useState(false);
  const [isPositionPopupOpen, setIsPositionPopupOpen] = useState(false);

  // References for outside-click detection
  const toolsContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync default map tile when theme changes if user hasn't explicitly set custom
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LAYER);
    if (!saved) {
      setActiveTileLayer(theme === "dark" ? "dark" : "street");
    }
  }, [theme]);

  // Handle position changes with smart separation to prevent collision
  const handleUpdateToolsPosition = (newPos: CornerPosition) => {
    setToolsPosition(newPos);
    localStorage.setItem(STORAGE_KEY_TOOLS_POS, newPos);

    // If HUD occupies the same corner, push HUD to another corner
    if (hudPosition === newPos) {
      const remainingCorners = CORNER_ORDER.filter((c) => c !== newPos);
      const nextHud = remainingCorners[0] || "top-left";
      setHudPosition(nextHud);
      localStorage.setItem(STORAGE_KEY_HUD_POS, nextHud);
    }
  };

  const handleUpdateHudPosition = (newPos: HudPosition) => {
    setHudPosition(newPos);
    localStorage.setItem(STORAGE_KEY_HUD_POS, newPos);
  };

  const handleCycleToolsPosition = () => {
    const currentIndex = CORNER_ORDER.indexOf(toolsPosition);
    const nextIndex = (currentIndex + 1) % CORNER_ORDER.length;
    handleUpdateToolsPosition(CORNER_ORDER[nextIndex]);
  };

  const handleSelectTileLayer = (layerKey: TileLayerKey) => {
    setActiveTileLayer(layerKey);
    localStorage.setItem(STORAGE_KEY_LAYER, layerKey);
    setIsStylePopupOpen(false);
  };

  // Close popups on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolsContainerRef.current &&
        !toolsContainerRef.current.contains(e.target as Node)
      ) {
        setIsStylePopupOpen(false);
        setIsPositionPopupOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsStylePopupOpen(false);
        setIsPositionPopupOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // References for imperative, high-performance updates (Zero Re-render on map frames)
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const traveledPolylineRef = useRef<L.Polyline | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastStatsEmitRef = useRef<number>(0);
  const isUserInteractingRef = useRef<boolean>(false);

  // Simulation state with continuous angle tracking
  const simState = useRef({
    pointIndex: 0,
    segmentProgress: 0,
    totalDistance: 0,
    cumulativeDistances: [] as number[],
    renderedHeading: 0,
    targetHeading: 0,
  });

  // Helper to update marker rotation without recreating DOM nodes
  const updateMarkerRotation = useCallback((heading: number) => {
    if (!markerRef.current) return;
    const element = markerRef.current.getElement();
    if (element) {
      const inner = element.querySelector<HTMLElement>(".truck-marker-inner");
      if (inner) {
        inner.style.transform = `rotate(${heading.toFixed(2)}deg)`;
      }
    }
  }, []);

  // Helper to emit stats at throttled rate
  const emitStats = useCallback(
    (index: number, speed: number, heading: number) => {
      const totalPoints = route.length;
      if (!totalPoints) return;

      const cumDistances = simState.current.cumulativeDistances;
      const coveredKm = cumDistances[index] || Number((index * 0.45).toFixed(1));
      const totalKm = simState.current.totalDistance || 1280;
      const remainingKm = Math.max(0, totalKm - coveredKm);
      const percent = Math.min(100, Math.round((coveredKm / totalKm) * 100));

      const avgSpeed = speed > 0 ? speed : 85;
      const remainingSeconds = (remainingKm / avgSpeed) * 3600;

      onStats({
        speed: Math.round(speed),
        distance: Number(coveredKm.toFixed(1)),
        totalDistance: Number(totalKm.toFixed(1)),
        percent,
        eta: formatDurationFa(remainingSeconds),
        elapsedSeconds: 0,
        heading: Math.round(heading),
        currentPointIndex: index,
      });
    },
    [route.length, onStats]
  );

  // 1. Load Route Data and initialize orientation along road
  useEffect(() => {
    try {
      if (defaultRouteData?.geometry?.coordinates) {
        const parsed = geoToLatLng(defaultRouteData.geometry.coordinates);
        setRoute(parsed);
        const totalDist = calculateTotalDistance(parsed);
        simState.current.totalDistance = totalDist;

        // Precompute cumulative distances along route for instant lookup
        let acc = 0;
        const cum: number[] = [0];
        for (let i = 0; i < parsed.length - 1; i++) {
          acc += haversine(parsed[i], parsed[i + 1]) / 1000;
          cum.push(acc);
        }
        simState.current.cumulativeDistances = cum;

        // Initialize heading immediately to face along route
        const initialHead = calculateLookaheadBearing(parsed, 0, 0);
        simState.current.renderedHeading = initialHead;
        simState.current.targetHeading = initialHead;
        setCurrentHeading(Math.round(initialHead));

        if (markerRef.current) {
          markerRef.current.setLatLng(parsed[0]);
          updateMarkerRotation(initialHead);
        }

        if (onRouteLoaded) {
          onRouteLoaded(parsed.length, totalDist);
        }
      }
    } catch (e) {
      console.warn("Failed to parse default route, using fallback endpoints", e);
      const fallback = [START_POINT, END_POINT];
      setRoute(fallback);
      const fallbackHead = bearing(START_POINT, END_POINT);
      simState.current.renderedHeading = fallbackHead;
      simState.current.targetHeading = fallbackHead;
      setCurrentHeading(Math.round(fallbackHead));
    }
  }, [onRouteLoaded, updateMarkerRotation]);

  // 2. Handle interactive seek / scrubber changes with instant angle snapping
  useEffect(() => {
    if (seekProgress !== null && route.length > 1) {
      const targetIndex = Math.min(
        route.length - 2,
        Math.max(0, Math.floor(seekProgress * (route.length - 1)))
      );
      simState.current.pointIndex = targetIndex;
      simState.current.segmentProgress = 0;

      const currentPoint = route[targetIndex];
      const head = calculateLookaheadBearing(route, targetIndex, 0);

      // Snap the continuous heading immediately on seek
      simState.current.renderedHeading = head;
      simState.current.targetHeading = head;

      const normalizedHead = ((Math.round(head) % 360) + 360) % 360;
      setCurrentHeading(normalizedHead);

      if (markerRef.current) {
        markerRef.current.setLatLng(currentPoint);
        updateMarkerRotation(head);
      }

      if (traveledPolylineRef.current) {
        traveledPolylineRef.current.setLatLngs(route.slice(0, targetIndex + 1));
      }

      if (autoFollow && mapRef.current) {
        mapRef.current.panTo(currentPoint, { animate: false });
      }

      emitStats(targetIndex, 0, normalizedHead);
    }
  }, [seekProgress, route, autoFollow, emitStats, updateMarkerRotation]);

  // 3. Ultra-Smooth Animation Engine with Damped Shortest-Arc Rotation
  useEffect(() => {
    if (!running || route.length < 2) {
      setCurrentSpeed(0);
      return;
    }

    let lastTimestamp = 0;

    const tick = (now: number) => {
      if (!lastTimestamp) lastTimestamp = now;
      let deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      // Cap deltaSec to avoid large leaps on background tab switches
      if (deltaSec > 0.1) deltaSec = 0.1;

      const speedFactor = 0.45 * speedMultiplier;
      simState.current.segmentProgress += deltaSec * speedFactor;

      while (simState.current.segmentProgress >= 1) {
        simState.current.segmentProgress -= 1;
        simState.current.pointIndex++;

        if (simState.current.pointIndex >= route.length - 1) {
          simState.current.pointIndex = route.length - 1;
          simState.current.segmentProgress = 0;
          setRunning(false);
          setCurrentSpeed(0);
          return;
        }
      }

      const idx = simState.current.pointIndex;
      const p1 = route[idx];
      const p2 = route[idx + 1] || p1;

      const currentPos = interpolate(p1, p2, simState.current.segmentProgress);

      // Calculate lookahead road bearing
      const targetHead = calculateLookaheadBearing(route, idx, simState.current.segmentProgress);
      simState.current.targetHeading = targetHead;

      // Smoothly interpolate angle with continuous shortest-arc math
      const smoothSpeed = 6 + Math.min(speedMultiplier * 2, 12);
      const currentHead = smoothAngle(
        simState.current.renderedHeading,
        targetHead,
        deltaSec,
        smoothSpeed
      );
      simState.current.renderedHeading = currentHead;

      // Direct Leaflet Marker Update
      if (markerRef.current) {
        markerRef.current.setLatLng(currentPos);
        updateMarkerRotation(currentHead);
      }

      if (traveledPolylineRef.current && idx % 3 === 0) {
        traveledPolylineRef.current.setLatLngs(route.slice(0, idx + 1));
      }

      // Auto-follow camera
      if (autoFollow && mapRef.current && !isUserInteractingRef.current) {
        const center = mapRef.current.getCenter();
        const distToCenter = haversine([center.lat, center.lng], currentPos);
        if (distToCenter > 1500) {
          mapRef.current.panTo(currentPos, { animate: false });
        }
      }

      const simulatedSpeedKmh = 82 + Math.sin(now / 800) * 8 + (speedMultiplier > 1 ? 15 : 0);

      if (now - lastStatsEmitRef.current > 100) {
        lastStatsEmitRef.current = now;
        const normalizedDisplayHeading = ((Math.round(currentHead) % 360) + 360) % 360;
        setCurrentSpeed(Math.round(simulatedSpeedKmh));
        setCurrentHeading(normalizedDisplayHeading);
        emitStats(idx, simulatedSpeedKmh, normalizedDisplayHeading);
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [running, route, speedMultiplier, autoFollow, setRunning, emitStats, updateMarkerRotation]);

  const initialCenter = useMemo<LatLng>(() => {
    return route.length > 0 ? route[0] : START_POINT;
  }, [route]);

  const routeBounds = useMemo(() => {
    return getRouteBounds(route);
  }, [route]);

  const handleRecenterOnVehicle = useCallback(() => {
    if (!mapRef.current || !route.length) return;
    const currentIdx = simState.current.pointIndex;
    const pos = route[currentIdx] || route[0];
    mapRef.current.setView(pos, 13, { animate: true });
    setAutoFollow(true);
  }, [route]);

  const handleFitRouteBounds = useCallback(() => {
    if (!mapRef.current || !route.length) return;
    mapRef.current.fitBounds(routeBounds, {
      padding: [40, 40],
      animate: true,
    });
    setAutoFollow(false);
  }, [route, routeBounds]);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) mapRef.current.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) mapRef.current.zoomOut();
  }, []);

  if (!route.length) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm font-medium">در حال بارگذاری داده‌های مکانی مسیر...</p>
        </div>
      </div>
    );
  }

  // Popup positioning alignment helper based on current tools position
  const getPopupAlignmentClass = (pos: CornerPosition) => {
    switch (pos) {
      case "top-right":
        return "popup-align-top-right";
      case "top-left":
        return "popup-align-top-left";
      case "bottom-right":
        return "popup-align-bottom-right";
      case "bottom-left":
        return "popup-align-bottom-left";
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 1. Leaflet Interactive Map */}
      <MapContainer
        center={initialCenter}
        zoom={6}
        className="map"
        zoomControl={false}
        attributionControl={false}
        ref={(m) => {
          if (m) {
            mapRef.current = m;
            m.on("movestart", () => {
              isUserInteractingRef.current = true;
            });
            m.on("moveend", () => {
              isUserInteractingRef.current = false;
            });
          }
        }}
      >
        <MapInitializer bounds={routeBounds} />

        {/* Dynamic Tile Layer */}
        <TileLayer
          url={TILE_PROVIDERS[activeTileLayer].url}
          attribution={TILE_PROVIDERS[activeTileLayer].attribution}
          subdomains={TILE_PROVIDERS[activeTileLayer].subdomains}
          maxZoom={TILE_PROVIDERS[activeTileLayer].maxZoom}
        />

        {/* Base Full Route Polyline */}
        <Polyline positions={route} pathOptions={BASE_ROUTE_STYLE} />

        {/* Traveled Route Polyline */}
        <Polyline
          ref={traveledPolylineRef}
          positions={[route[0]]}
          pathOptions={TRAVELED_ROUTE_STYLE}
        />

        {/* Start Point Marker */}
        <Marker position={route[0]} icon={createPinIcon("start")}>
          <Popup className="custom-map-popup">
            <div className="p-1 text-right text-xs">
              <strong className="text-emerald-500">مبدا حرکت: تهران</strong>
              <p>پایانه ترانزیت و باربری تهران جنوب</p>
              <p className="mt-1 text-secondary text-[11px]">ساعت حرکت: ۰۶:۰۰</p>
            </div>
          </Popup>
        </Marker>

        {/* End Point Marker */}
        <Marker position={route[route.length - 1]} icon={createPinIcon("end")}>
          <Popup className="custom-map-popup">
            <div className="p-1 text-right text-xs">
              <strong className="text-rose-500">مقصد نهایی: بندرعباس</strong>
              <p>مجتمع بندری و اسکله شهید رجایی</p>
              <p className="mt-1 text-secondary text-[11px]">طول کل مسیر: {toPersianDigits(1280)} کیلومتر</p>
            </div>
          </Popup>
        </Marker>

        {/* Real-Time Truck Marker */}
        <Marker
          ref={markerRef}
          position={route[0]}
          icon={createVehicleIcon(currentHeading || simState.current.renderedHeading || 0)}
        >
          <Popup className="custom-map-popup">
            <div className="p-1 text-right text-xs">
              <strong className="text-blue-500">کشنده ولوو FH500</strong>
              <p>شماره پایش ناوگان: {toPersianDigits("IR-92841")}</p>
              <p className="mt-1 text-emerald-500 font-bold">
                سرعت لحظه‌ای: {toPersianDigits(currentSpeed)} کیلومتر/ساعت
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* 2. Floating Map HUD & Controls System (Z-INDEX 1000+) */}
      <div className="map-floating-overlay">
        
        {/* =========================================================================
            A. Telemetry Speed HUD (Configurable Position)
            ========================================================================= */}
        {hudPosition !== "hidden" && (
          <div className={`map-floating-panel map-pos-${hudPosition}`}>
            <div className="map-speed-hud">
              <div className="speed-gauge-circle">
                <span className="speed-number">{toPersianDigits(currentSpeed)}</span>
              </div>
              <div className="flex flex-col">
                <span className="speed-unit">سرعت لحظه‌ای (کیلومتر/ساعت)</span>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                  <Compass
                    size={14}
                    className="text-blue-500 transition-transform duration-200"
                    style={{ transform: `rotate(${currentHeading}deg)` }}
                  />
                  <span>زاویه قطب‌نما: {toPersianDigits(currentHeading)}°</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            B. Map Tools Panel (Default Top-Right with Position & Style Controls)
            ========================================================================= */}
        <div
          ref={toolsContainerRef}
          className={`map-floating-panel map-pos-${toolsPosition}`}
        >
          <div className="map-control-group">
            {/* Zoom In */}
            <button
              type="button"
              className="map-control-btn"
              title="بزرگ‌نمایی (+)"
              onClick={handleZoomIn}
            >
              <Plus size={18} />
            </button>

            {/* Zoom Out */}
            <button
              type="button"
              className="map-control-btn"
              title="کوچک‌نمایی (-)"
              onClick={handleZoomOut}
            >
              <Minus size={18} />
            </button>

            <div className="map-control-divider" />

            {/* Fit Full Route */}
            <button
              type="button"
              className="map-control-btn"
              title="نمایش کل مسیر (Full Route)"
              onClick={handleFitRouteBounds}
            >
              <Maximize2 size={16} />
            </button>

            {/* Auto Follow Toggle */}
            <button
              type="button"
              className={`map-control-btn ${autoFollow ? "is-active" : ""}`}
              title={
                autoFollow
                  ? "دنبال‌کردن خودکار خودرو (فعال)"
                  : "دنبال‌کردن خودکار خودرو (غیرفعال)"
              }
              onClick={() => {
                const next = !autoFollow;
                setAutoFollow(next);
                if (next) handleRecenterOnVehicle();
              }}
            >
              <Navigation size={16} />
            </button>

            {/* Recenter / Focus Vehicle */}
            <button
              type="button"
              className="map-control-btn"
              title="تمرکز روی موقعیت خودرو"
              onClick={handleRecenterOnVehicle}
            >
              <Crosshair size={16} />
            </button>

            <div className="map-control-divider" />

            {/* Map Style Trigger Button */}
            <button
              type="button"
              className={`map-control-btn ${isStylePopupOpen ? "is-active" : ""}`}
              title={`پوسته نقشه (فعلی: ${TILE_PROVIDERS[activeTileLayer].shortName})`}
              onClick={() => {
                setIsStylePopupOpen((prev) => !prev);
                setIsPositionPopupOpen(false);
              }}
            >
              <Layers size={17} />
            </button>

            {/* Tool Position Control Trigger Button */}
            <button
              type="button"
              className={`map-control-btn ${isPositionPopupOpen ? "is-active" : ""}`}
              title="تنظیم موقعیت ابزارهای نقشه"
              onClick={() => {
                setIsPositionPopupOpen((prev) => !prev);
                setIsStylePopupOpen(false);
              }}
            >
              <LayoutGrid size={17} />
            </button>
          </div>

          {/* -----------------------------------------------------------------------
              POPUP 1: Map Style Selector Menu
              ----------------------------------------------------------------------- */}
          {isStylePopupOpen && (
            <div className={`map-floating-popup map-style-popup ${getPopupAlignmentClass(toolsPosition)}`}>
              <div className="popup-header">
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Layers size={16} />
                  <span>انتخاب پوسته نقشه</span>
                </div>
                <button
                  type="button"
                  className="popup-close-btn"
                  onClick={() => setIsStylePopupOpen(false)}
                  title="بستن"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="map-style-grid">
                {(Object.keys(TILE_PROVIDERS) as TileLayerKey[]).map((key) => {
                  const item = TILE_PROVIDERS[key];
                  const Icon = item.icon;
                  const isSelected = activeTileLayer === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      className={`map-style-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => handleSelectTileLayer(key)}
                    >
                      {/* Swatch Preview Box */}
                      <div
                        className="style-swatch-box"
                        style={{ background: item.previewGradient }}
                      >
                        <Icon size={18} className="style-swatch-icon" />
                        {isSelected && (
                          <div className="style-swatch-badge">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-between">
                          <span className="style-title font-semibold">{item.name}</span>
                          <span
                            className="style-tag"
                            style={{
                              borderColor: `${item.accentColor}40`,
                              color: item.accentColor,
                            }}
                          >
                            {item.tag}
                          </span>
                        </div>
                        <p className="style-desc">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------------
              POPUP 2: Map Controls Position Customizer
              ----------------------------------------------------------------------- */}
          {isPositionPopupOpen && (
            <div className={`map-floating-popup map-position-popup ${getPopupAlignmentClass(toolsPosition)}`}>
              <div className="popup-header">
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <LayoutGrid size={16} />
                  <span>تنظیم موقعیت ابزارها</span>
                </div>
                <button
                  type="button"
                  className="popup-close-btn"
                  onClick={() => setIsPositionPopupOpen(false)}
                  title="بستن"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Section 1: Navigation Tools Placement */}
              <div className="position-section">
                <div className="flex items-center justify-between mb-2">
                  <span className="section-label">موقعیت نوار ابزار نقشه:</span>
                  <span className="text-xs text-blue-500 font-bold">
                    {POSITION_LABELS[toolsPosition].name}
                  </span>
                </div>

                {/* 2x2 Corner Grid */}
                <div className="corner-grid-2x2">
                  <button
                    type="button"
                    className={`corner-grid-btn ${toolsPosition === "top-right" ? "is-selected" : ""}`}
                    onClick={() => handleUpdateToolsPosition("top-right")}
                  >
                    <span className="corner-arrow">↗</span>
                    <span>بالا - راست</span>
                  </button>

                  <button
                    type="button"
                    className={`corner-grid-btn ${toolsPosition === "top-left" ? "is-selected" : ""}`}
                    onClick={() => handleUpdateToolsPosition("top-left")}
                  >
                    <span className="corner-arrow">↖</span>
                    <span>بالا - چپ</span>
                  </button>

                  <button
                    type="button"
                    className={`corner-grid-btn ${toolsPosition === "bottom-right" ? "is-selected" : ""}`}
                    onClick={() => handleUpdateToolsPosition("bottom-right")}
                  >
                    <span className="corner-arrow">↘</span>
                    <span>پایین - راست</span>
                  </button>

                  <button
                    type="button"
                    className={`corner-grid-btn ${toolsPosition === "bottom-left" ? "is-selected" : ""}`}
                    onClick={() => handleUpdateToolsPosition("bottom-left")}
                  >
                    <span className="corner-arrow">↙</span>
                    <span>پایین - چپ</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Telemetry Speed HUD Placement */}
              <div className="position-section mt-3 pt-3 border-t border-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="section-label">موقعیت پنل سرعت (HUD):</span>
                  <span className="text-xs text-emerald-500 font-bold">
                    {hudPosition === "hidden"
                      ? "مخفی"
                      : POSITION_LABELS[hudPosition]?.name || hudPosition}
                  </span>
                </div>

                <div className="hud-corner-chips">
                  {CORNER_ORDER.map((corner) => (
                    <button
                      key={corner}
                      type="button"
                      className={`hud-chip-btn ${hudPosition === corner ? "is-selected" : ""}`}
                      onClick={() => handleUpdateHudPosition(corner)}
                    >
                      <span>{POSITION_LABELS[corner].icon}</span>
                      <span>{POSITION_LABELS[corner].name.split(" ")[0]}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`hud-chip-btn ${hudPosition === "hidden" ? "is-selected danger" : ""}`}
                    onClick={() => handleUpdateHudPosition("hidden")}
                    title="مخفی‌کردن پنل سرعت"
                  >
                    <EyeOff size={13} />
                    <span>مخفی</span>
                  </button>
                </div>
              </div>

              {/* Quick Cycle Button */}
              <div className="mt-3 pt-3 border-t border-card flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="quick-cycle-btn"
                  onClick={handleCycleToolsPosition}
                >
                  <RotateCw size={14} className="text-blue-500" />
                  <span>چرخش سریع موقعیت ابزارها</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            C. Bottom Route Status Pill
            ========================================================================= */}
        <div className="map-bottom-status-bar">
          <div className="route-info-pill">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>محور شریانی تهران - بندرعباس (کریدور شمال-جنوب)</span>
            <span className="pill-dot">•</span>
            <span className="text-primary font-mono font-medium">IR-TRANSIT-۸۴</span>
          </div>
        </div>

      </div>
    </div>
  );
}

function MapInitializer({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && bounds) {
      map.fitBounds(bounds, { padding: [30, 30] });
      initializedRef.current = true;
    }
  }, [map, bounds]);

  return null;
}
