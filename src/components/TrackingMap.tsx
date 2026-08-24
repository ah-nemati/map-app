import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Crosshair,
  Maximize2,
  Navigation,
  Plus,
  Minus,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Calendar,
  Package,
  UserCheck,
  Phone,
  Truck,
  MapPin,
  X,
  Radio,
} from "lucide-react";
import {
  haversine,
  calculateLookaheadBearing,
  smoothAngle,
  interpolate,
  calculateTotalDistance,
  getRouteBounds,
  formatDurationFa,
  toPersianDigits,
} from "../utils/tracking";
import { INITIAL_FLEET, type FleetVehicleConfig } from "../data/fleetRoutes";
import { useTheme } from "../context/ThemeContext";

export const TILE_PROVIDERS = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  },
  street: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: "abc",
    maxZoom: 19,
  },
};

function createVehicleIcon(heading: number, color: string, id: string, isSelected: boolean) {
  const darkColor =
    color === "#3b82f6"
      ? "#1d4ed8"
      : color === "#10b981"
      ? "#047857"
      : color === "#f59e0b"
      ? "#b45309"
      : "#be123c";

  // Exact 40x40 circle with center at (20, 20)
  const size = 40;
  const anchor = 20;

  return L.divIcon({
    className: `truck-leaflet-marker marker-${id} ${isSelected ? "is-selected-marker" : ""}`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    html: `
      <div
        class="truck-marker-inner"
        style="transform: rotate(${heading.toFixed(2)}deg); border-color: ${color}; box-shadow: 0 0 ${isSelected ? 22 : 14}px ${color}${isSelected ? "cc" : "88"}, 0 4px 12px rgba(0,0,0,0.6), inset 0 0 8px ${color}60;"
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

function createPinIcon(type: "start" | "end", label: string, color: string) {
  const isStart = type === "start";
  return L.divIcon({
    className: "waypoint-pin-marker",
    html: `
      <div style="
        position: relative;
        transform: translate(-50%, -50%);
        width: max-content;
        height: 28px;
        padding: 0 12px;
        border-radius: 9999px;
        background: ${isStart ? "#10b981" : color || "#f43f5e"};
        border: 2px solid #ffffff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.5), 0 0 8px ${isStart ? "#10b981" : color || "#f43f5e"}88;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        font-family: 'Vazirmatn FD', 'Vazirmatn', sans-serif;
        white-space: nowrap;
        pointer-events: auto;
        box-sizing: border-box;
      ">
        <span>${label}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

interface TrackingMapProps {
  running: boolean;
  setRunning: (v: boolean) => void;
  speedMultiplier?: number;
}

export default function TrackingMap({
  running,
  setRunning,
  speedMultiplier = 2,
}: TrackingMapProps) {
  const { theme } = useTheme();
  const fleet = INITIAL_FLEET;

  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicleConfig | null>(null);
  const [autoFollow, setAutoFollow] = useState(false);
  const [liveSpeeds, setLiveSpeeds] = useState<Record<string, number>>({});
  const [vehicleStats, setVehicleStats] = useState<
    Record<string, { percent: number; distance: number; totalDistance: number; eta: string }>
  >({});

  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const traveledPolylineRefs = useRef<Record<string, L.Polyline | null>>({});
  const animationFrameRef = useRef<number | null>(null);
  const lastStatsEmitRef = useRef<number>(0);
  const isUserInteractingRef = useRef<boolean>(false);

  // Per-vehicle simulation state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simStates = useRef<Record<string, any>>({});

  const handleSelectVehicle = useCallback((v: FleetVehicleConfig) => {
    setSelectedVehicle(v);
    setAutoFollow(false);
    const state = simStates.current[v.id];
    const pos = v.route[state?.pointIndex || 0] || v.route[0];
    if (mapRef.current) {
      mapRef.current.panTo(pos, { animate: true });
    }
  }, []);

  // Global window hook for instant native clicks on moving markers
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__selectFleetVehicle = (id: string) => {
      const v = fleet.find((item) => item.id === id);
      if (v) {
        handleSelectVehicle(v);
      }
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__selectFleetVehicle;
    };
  }, [fleet, handleSelectVehicle]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedVehicle(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Initialize simulation states for all fleet vehicles
  useEffect(() => {
    fleet.forEach((v) => {
      const totalDist = calculateTotalDistance(v.route);
      let acc = 0;
      const cum: number[] = [0];
      for (let i = 0; i < v.route.length - 1; i++) {
        acc += haversine(v.route[i], v.route[i + 1]) / 1000;
        cum.push(acc);
      }

      const initialHead = calculateLookaheadBearing(v.route, 0, 0);

      simStates.current[v.id] = {
        totalDistance: totalDist,
        cumulativeDistances: cum,
        renderedHeading: initialHead,
        targetHeading: initialHead,
        pointIndex: 0,
        segmentProgress: 0,
      };

      setVehicleStats((prev) => ({
        ...prev,
        [v.id]: {
          percent: 0,
          distance: 0,
          totalDistance: totalDist,
          eta: "در مسیر",
        },
      }));
    });
  }, [fleet]);

  const updateMarkerRotation = useCallback((id: string, heading: number) => {
    const marker = markerRefs.current[id];
    if (!marker) return;
    const element = marker.getElement();
    if (element) {
      const inner = element.querySelector<HTMLElement>(".truck-marker-inner");
      if (inner) inner.style.transform = `rotate(${heading.toFixed(2)}deg)`;
    }
  }, []);

  // Multi-vehicle animation loop (Simultaneously moves all trucks along their independent routes)
  useEffect(() => {
    if (!running || fleet.length === 0) {
      setLiveSpeeds((prev) => {
        const reset: Record<string, number> = {};
        for (const key of Object.keys(prev)) reset[key] = 0;
        return reset;
      });
      return;
    }

    let lastTimestamp = 0;

    const tick = (now: number) => {
      if (!lastTimestamp) lastTimestamp = now;
      let deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (deltaSec > 0.1) deltaSec = 0.1;

      let allFinished = true;
      const newSpeeds: Record<string, number> = {};
      const newStatsMap: Record<string, { percent: number; distance: number; totalDistance: number; eta: string }> = {};

      fleet.forEach((v) => {
        const state = simStates.current[v.id];
        if (!state || state.pointIndex >= v.route.length - 1) {
          newSpeeds[v.id] = 0;
          return;
        }

        allFinished = false;

        // Progression along route
        const speedFactor = 0.6 * speedMultiplier * v.speedFactor;
        state.segmentProgress += deltaSec * speedFactor;

        while (state.segmentProgress >= 1) {
          state.segmentProgress -= 1;
          state.pointIndex++;

          if (state.pointIndex >= v.route.length - 1) {
            state.pointIndex = v.route.length - 1;
            state.segmentProgress = 0;
            break;
          }
        }

        const idx = state.pointIndex;
        if (idx >= v.route.length - 1) {
          newSpeeds[v.id] = 0;
          return;
        }

        const p1 = v.route[idx];
        const p2 = v.route[idx + 1] || p1;
        const currentPos = interpolate(p1, p2, state.segmentProgress);

        const targetHead = calculateLookaheadBearing(v.route, idx, state.segmentProgress);
        state.targetHeading = targetHead;

        const smoothSpeed = 6 + Math.min(speedMultiplier * 2, 12);
        const currentHead = smoothAngle(state.renderedHeading, targetHead, deltaSec, smoothSpeed);
        state.renderedHeading = currentHead;

        const marker = markerRefs.current[v.id];
        if (marker) {
          marker.setLatLng(currentPos);
          updateMarkerRotation(v.id, currentHead);
        }

        // Always update traveled polyline directly to currentPos so line is 100% connected
        const poly = traveledPolylineRefs.current[v.id];
        if (poly) {
          poly.setLatLngs([...v.route.slice(0, idx + 1), currentPos]);
        }

        // Realistic live speed
        const baseSpeed = 82;
        const variance = Math.sin(now / 1000 + v.speedFactor * 10) * 8;
        const simulatedSpeedKmh = Math.round((baseSpeed + variance) * v.speedFactor + (speedMultiplier > 1 ? 12 : 0));
        newSpeeds[v.id] = simulatedSpeedKmh;

        const cumDistances = state.cumulativeDistances || [];
        const coveredKm = cumDistances[idx] || 0;
        const totalKm = state.totalDistance || 1000;
        const remainingKm = Math.max(0, totalKm - coveredKm);
        const percent = Math.min(100, Math.round((coveredKm / totalKm) * 100));
        const remainingSeconds = (remainingKm / (simulatedSpeedKmh || 80)) * 3600;

        newStatsMap[v.id] = {
          percent,
          distance: Number(coveredKm.toFixed(1)),
          totalDistance: Number(totalKm.toFixed(1)),
          eta: formatDurationFa(remainingSeconds),
        };

        if (selectedVehicle?.id === v.id && autoFollow && mapRef.current && !isUserInteractingRef.current) {
          const center = mapRef.current.getCenter();
          const distToCenter = haversine([center.lat, center.lng], currentPos);
          if (distToCenter > 1500) {
            mapRef.current.panTo(currentPos, { animate: false });
          }
        }
      });

      setLiveSpeeds(newSpeeds);

      if (now - lastStatsEmitRef.current > 200) {
        lastStatsEmitRef.current = now;
        setVehicleStats((prev) => ({ ...prev, ...newStatsMap }));
      }

      if (allFinished) {
        setRunning(false);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [running, fleet, speedMultiplier, selectedVehicle, autoFollow, setRunning, updateMarkerRotation]);

  const allFleetBounds = useMemo(() => {
    const allPoints = fleet.flatMap((v) => [v.route[0], v.route[v.route.length - 1]]);
    return getRouteBounds(allPoints);
  }, [fleet]);

  const handleRecenterOnVehicle = useCallback((v: FleetVehicleConfig) => {
    if (!mapRef.current) return;
    const state = simStates.current[v.id];
    const pos = v.route[state?.pointIndex || 0] || v.route[0];
    mapRef.current.setView(pos, 12, { animate: true });
    setAutoFollow(true);
  }, []);

  const handleFitAllRoutes = useCallback(() => {
    if (!mapRef.current || !allFleetBounds) return;
    mapRef.current.fitBounds(allFleetBounds, { padding: [50, 50], animate: true });
    setAutoFollow(false);
  }, [allFleetBounds]);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) mapRef.current.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) mapRef.current.zoomOut();
  }, []);

  const handleResetRoutes = useCallback(() => {
    fleet.forEach((v) => {
      const state = simStates.current[v.id];
      if (state) {
        state.pointIndex = 0;
        state.segmentProgress = 0;
        const initialHead = calculateLookaheadBearing(v.route, 0, 0);
        state.renderedHeading = initialHead;
        state.targetHeading = initialHead;

        const marker = markerRefs.current[v.id];
        if (marker) {
          marker.setLatLng(v.route[0]);
          updateMarkerRotation(v.id, initialHead);
        }

        const poly = traveledPolylineRefs.current[v.id];
        if (poly) {
          poly.setLatLngs([v.route[0]]);
        }
      }
    });
  }, [fleet, updateMarkerRotation]);

  const currentTileConfig = theme === "dark" ? TILE_PROVIDERS.dark : TILE_PROVIDERS.street;
  const activeStats = selectedVehicle ? vehicleStats[selectedVehicle.id] : null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        center={[32.5, 53.5]}
        zoom={6}
        className="map"
        zoomControl={false}
        attributionControl={false}
        ref={(m) => {
          if (m) {
            mapRef.current = m;
            m.on("movestart", () => { isUserInteractingRef.current = true; });
            m.on("moveend", () => { isUserInteractingRef.current = false; });
            
            // Proximity click detection on map: click near moving vehicle selects it
            m.on("click", (e: L.LeafletMouseEvent) => {
              const clickPoint = e.containerPoint;
              for (const v of fleet) {
                const marker = markerRefs.current[v.id];
                if (marker) {
                  const markerPos = marker.getLatLng();
                  const markerPoint = m.latLngToContainerPoint(markerPos);
                  const pixelDist = Math.hypot(clickPoint.x - markerPoint.x, clickPoint.y - markerPoint.y);
                  if (pixelDist <= 32) {
                    handleSelectVehicle(v);
                    return;
                  }
                }
              }
            });
          }
        }}
      >
        {allFleetBounds && <MapInitializer bounds={allFleetBounds} />}

        <TileLayer
          url={currentTileConfig.url}
          attribution={currentTileConfig.attribution}
          subdomains={currentTileConfig.subdomains}
          maxZoom={currentTileConfig.maxZoom}
        />

        {fleet.map((v) => {
          const isSelected = selectedVehicle?.id === v.id;
          const routeOpacity = isSelected ? 0.75 : 0.4;
          const routeWeight = isSelected ? 5 : 3.5;
          const traveledWeight = isSelected ? 7 : 5;

          return (
            <div key={`fleet-corridor-${v.id}`}>
              {/* Full Corridor Route Line (Clickable to select vehicle) */}
              <Polyline
                positions={v.route}
                eventHandlers={{
                  click: () => handleSelectVehicle(v),
                }}
                pathOptions={{
                  color: v.color,
                  weight: routeWeight,
                  opacity: routeOpacity,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />

              {/* Traveled Path Polyline (Directly connected to truck position) */}
              <Polyline
                ref={(el) => { traveledPolylineRefs.current[v.id] = el; }}
                positions={[v.route[0]]}
                eventHandlers={{
                  click: () => handleSelectVehicle(v),
                }}
                pathOptions={{
                  color: v.color,
                  weight: traveledWeight,
                  opacity: isSelected ? 0.95 : 0.8,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />

              {/* Origin Marker */}
              <Marker position={v.route[0]} icon={createPinIcon("start", v.origin.split(" ")[0], v.color)} />

              {/* Destination Marker */}
              <Marker position={v.route[v.route.length - 1]} icon={createPinIcon("end", v.destination.split(" ")[0], v.color)} />

              {/* Moving Vehicle Marker with Direct Event Handling */}
              <Marker
                ref={(el) => { markerRefs.current[v.id] = el; }}
                position={v.route[0]}
                icon={createVehicleIcon(simStates.current[v.id]?.renderedHeading || 0, v.color, v.id, isSelected)}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    handleSelectVehicle(v);
                  },
                  mousedown: (e) => {
                    L.DomEvent.stopPropagation(e);
                  },
                }}
              />
            </div>
          );
        })}
      </MapContainer>

      {/* Floating Clean Map Controls (NO repositioning buttons, NO layer switcher) */}
      <div className="map-floating-overlay">
        {/* Right Corner Map Navigation Toolbar */}
        <div className="map-floating-panel map-pos-top-right">
          <div className="map-control-group">
            <button type="button" className="map-control-btn" title="بزرگ‌نمایی (+)" onClick={handleZoomIn}>
              <Plus size={18} />
            </button>
            <button type="button" className="map-control-btn" title="کوچک‌نمایی (-)" onClick={handleZoomOut}>
              <Minus size={18} />
            </button>
            
            <div className="map-control-divider" />
            
            <button type="button" className="map-control-btn" title="نمایش کل کریدورها و ناوگان" onClick={handleFitAllRoutes}>
              <Maximize2 size={16} />
            </button>
            
            <button
              type="button"
              className={`map-control-btn ${autoFollow ? "is-active" : ""}`}
              title={autoFollow ? "دنبال‌کردن خودکار خودرو (فعال)" : "دنبال‌کردن خودکار خودرو (غیرفعال)"}
              onClick={() => {
                const next = !autoFollow;
                setAutoFollow(next);
                if (next && selectedVehicle) handleRecenterOnVehicle(selectedVehicle);
              }}
            >
              <Navigation size={16} />
            </button>

            <button
              type="button"
              className="map-control-btn"
              title="تمرکز روی خودروی انتخابی"
              onClick={() => {
                if (selectedVehicle) handleRecenterOnVehicle(selectedVehicle);
                else if (fleet.length > 0) handleRecenterOnVehicle(fleet[0]);
              }}
            >
              <Crosshair size={16} />
            </button>

            <div className="map-control-divider" />

            {/* Play / Pause simulation toggle button */}
            <button
              type="button"
              className={`map-control-btn ${running ? "is-active" : ""}`}
              title={running ? "توقف موقت شبیه‌سازی حرکت" : "شروع شبیه‌سازی حرکت ناوگان"}
              onClick={() => setRunning(!running)}
            >
              {running ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              type="button"
              className="map-control-btn"
              title="شروع مجدد همه مسیرها از مبدا"
              onClick={handleResetRoutes}
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* The ONLY Single Beautiful Glassmorphic Detail Modal when a truck is clicked */}
        {selectedVehicle && (
          <div className="vehicle-detail-modal">
            {/* Header */}
            <div className="modal-header-row">
              <div className="flex items-center gap-3">
                <div
                  className="modal-truck-badge"
                  style={{ background: selectedVehicle.color }}
                >
                  <Truck size={20} />
                </div>
                <div className="modal-title-box">
                  <h3>{selectedVehicle.name}</h3>
                  <span>{selectedVehicle.model}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVehicle(null)}
                className="modal-close-btn"
                title="بستن پنجره جزئیات"
              >
                <X size={16} />
              </button>
            </div>

            {/* Live Status & Speed Bar */}
            <div className="modal-stats-grid">
              <div className="modal-stat-box">
                <span className="modal-stat-label">وضعیت پایش:</span>
                <div className="modal-stat-value">
                  <Radio size={13} className={running ? "text-emerald-500 animate-pulse" : "text-amber-500"} />
                  <span className="text-xs">
                    {running && (liveSpeeds[selectedVehicle.id] || 0) > 0 ? "در حال حرکت" : "متوقف شده"}
                  </span>
                </div>
              </div>

              <div className="modal-stat-box">
                <span className="modal-stat-label">سرعت لحظه‌ای:</span>
                <span className="modal-stat-value font-mono" style={{ color: selectedVehicle.color }}>
                  {toPersianDigits(liveSpeeds[selectedVehicle.id] || 0)} <span className="text-[10px] text-slate-400 font-normal">km/h</span>
                </span>
              </div>
            </div>

            {/* Progress & Distance */}
            {activeStats && (
              <div className="modal-progress-card">
                <div className="modal-progress-header">
                  <span className="text-secondary font-medium">پیشرفت مسیر ({selectedVehicle.origin.split(" ")[0]} ← {selectedVehicle.destination.split(" ")[0]})</span>
                  <span className="font-mono font-bold" style={{ color: selectedVehicle.color }}>{toPersianDigits(activeStats.percent)}٪</span>
                </div>
                
                {/* Progress Bar */}
                <div className="modal-progress-bar-bg">
                  <div
                    className="modal-progress-bar-fill"
                    style={{ width: `${activeStats.percent}%`, backgroundColor: selectedVehicle.color }}
                  />
                </div>

                <div className="modal-progress-meta">
                  <span>طی‌شده: {toPersianDigits(activeStats.distance)} km</span>
                  <span>زمان تخمینی: {activeStats.eta}</span>
                </div>
              </div>
            )}

            {/* Detailed Vehicle & Logistics Info */}
            <div className="modal-info-list">
              <div className="modal-info-row">
                <span className="modal-info-label"><UserCheck size={13} /> راننده مسئول:</span>
                <span className="modal-info-value">{selectedVehicle.driver}</span>
              </div>

              <div className="modal-info-row">
                <span className="modal-info-label"><Phone size={13} /> شماره تماس:</span>
                <span className="modal-info-value font-mono">{toPersianDigits(selectedVehicle.driverPhone)}</span>
              </div>

              <div className="modal-info-row">
                <span className="modal-info-label"><Truck size={13} /> پلاک کشنده:</span>
                <span className="modal-info-value font-mono">{selectedVehicle.plate}</span>
              </div>

              <div className="modal-info-row">
                <span className="modal-info-label"><Package size={13} /> محموله و وزن:</span>
                <span className="modal-info-value text-emerald-400">{selectedVehicle.cargo} ({toPersianDigits(selectedVehicle.cargoWeight)})</span>
              </div>

              <div className="modal-info-row">
                <span className="modal-info-label"><Calendar size={13} /> شماره بارنامه:</span>
                <span className="modal-info-value font-mono">{selectedVehicle.invoiceNumber}</span>
              </div>

              <div className="modal-info-row">
                <span className="modal-info-label"><Clock size={13} /> زمان خروج از مبدا:</span>
                <span className="modal-info-value text-cyan-400">ساعت {toPersianDigits(selectedVehicle.startTime)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <button
              type="button"
              className="modal-primary-btn"
              style={{ background: `linear-gradient(135deg, ${selectedVehicle.color}, ${selectedVehicle.accentColor})` }}
              onClick={() => handleRecenterOnVehicle(selectedVehicle)}
            >
              <Crosshair size={15} />
              <span>تمرکز و زوم روی خودرو</span>
            </button>
          </div>
        )}

        {/* Bottom Fleet Status Pill (With generous spacing and proper RTL typography) */}
        <div className="map-bottom-status-bar">
          <div className="route-info-pill">
            <div className="pill-item">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-primary">پایش زنده ناوگان ترانزیت</span>
            </div>
            <span className="pill-divider" />
            <div className="pill-item">
              <span>{toPersianDigits(fleet.length)} ناوگان در حال حرکت</span>
            </div>
            <span className="pill-divider" />
            <div className="pill-item text-muted">
              <MapPin size={13} className="text-blue-400" />
              <span>جهت مشاهده اطلاعات، روی خودرو کلیک کنید</span>
            </div>
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
      map.fitBounds(bounds, { padding: [40, 40] });
      initializedRef.current = true;
    }
  }, [map, bounds]);

  return null;
}
