import L from "leaflet";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import iranCounties from "../data/iran-counties.geo.json";
import { ConnectionStatus } from "./ConnectionStatus";
import {
  Crosshair,
  Maximize2,
  Navigation,
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
  FastForward,
} from "lucide-react";
import {
  haversine,
  calculateLookaheadBearing,
  smoothAngle,
  interpolate,
  calculateTotalDistance,
  formatDurationFa,
  toPersianDigits,
  type LatLng,
} from "../utils/tracking";
import { INITIAL_FLEET, type FleetVehicleConfig } from "../data/fleetRoutes";

const mode = import.meta.env.MODE;
const BASE_MAP =
  (mode === "development"
    ? import.meta.env.VITE_MAP_URL
    : (window as any).env?.VITE_MAP_URL);

// Exact key transit cities with precise GPS coordinates
const TRANSIT_CITIES: { name: string; position: LatLng; isHub?: boolean }[] = [
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

function createCityMarker(cityName: string, isHub: boolean = false) {
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

function createVehicleIcon(
  heading: number,
  color: string,
  id: string,
  isSelected: boolean
) {
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
    className: `truck-leaflet-marker marker-${id} ${isSelected ? "is-selected-marker" : ""
      }`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    html: `
      <div
        class="truck-marker-inner"
        style="transform: rotate(${heading.toFixed(
      2
    )}deg); border-color: ${color}; box-shadow: 0 0 ${isSelected ? 22 : 14
      }px ${color}${isSelected ? "cc" : "88"
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

export interface IranCountyMapProps {
  mapRef?: React.MutableRefObject<L.Map | null>;
  isConnected?: boolean;
  running?: boolean;
  setRunning?: (v: boolean) => void;
  speedMultiplier?: number;
}

export const IranCountyMap: React.FC<IranCountyMapProps> = ({
  mapRef: externalMapRef,
  isConnected = true,
  running: externalRunning,
  setRunning: externalSetRunning,
  speedMultiplier: initialSpeedMultiplier = 2,
}) => {
  const [internalRunning, setInternalRunning] = useState(true);
  const running = externalRunning !== undefined ? externalRunning : internalRunning;
  const setRunning = externalSetRunning || setInternalRunning;
  const [speedMultiplier, setSpeedMultiplier] = useState(initialSpeedMultiplier);

  const fleet = INITIAL_FLEET;
  const internalMapRef = useRef<L.Map>(null);

  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicleConfig | null>(null);
  const [autoFollow, setAutoFollow] = useState(false);
  const [liveSpeeds, setLiveSpeeds] = useState<Record<string, number>>({});
  const [vehicleStats, setVehicleStats] = useState<
    Record<string, { percent: number; distance: number; totalDistance: number; eta: string }>
  >({});

  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const traveledPolylineRefs = useRef<Record<string, L.Polyline | null>>({});
  const animationFrameRef = useRef<number | null>(null);
  const lastStatsEmitRef = useRef<number>(0);

  // Per-vehicle simulation state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simStates = useRef<Record<string, any>>({});

  const handleMapRef = (map: L.Map | null) => {
    (internalMapRef as React.MutableRefObject<L.Map | null>).current = map;
    if (externalMapRef) externalMapRef.current = map;
  };

  const handleSelectVehicle = useCallback((v: FleetVehicleConfig) => {
    setSelectedVehicle(v);
    setAutoFollow(false);
    const state = simStates.current[v.id];
    const pos = v.route[state?.pointIndex || 0] || v.route[0];
    if (internalMapRef.current) {
      internalMapRef.current.panTo(pos, { animate: true });
    }
  }, []);

  // Global window hook for clicks on moving markers
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__selectFleetVehicle = (id: string) => {
      const v = fleet.find((item) => item.id === id);
      if (v) handleSelectVehicle(v);
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__selectFleetVehicle;
    };
  }, [fleet, handleSelectVehicle]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedVehicle(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fit bounds to Iran on mount using iranCounties GeoJSON
  useEffect(() => {
    const map = internalMapRef.current;
    if (map) {
      const geojsonLayer = L.geoJSON(iranCounties as any);
      map.fitBounds(geojsonLayer.getBounds(), { padding: [30, 30] });
    }
  }, []);

  // Initialize simulation states for all fleet vehicles with exact initial road bearings
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

      // Set initial marker rotation immediately if DOM element exists
      const marker = markerRefs.current[v.id];
      if (marker) {
        const el = marker.getElement();
        if (el) {
          const inner = el.querySelector<HTMLElement>(".truck-marker-inner");
          if (inner) inner.style.transform = `rotate(${initialHead.toFixed(2)}deg)`;
        }
      }

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
    if (simStates.current[id]) {
      simStates.current[id].renderedHeading = heading;
    }
    const marker = markerRefs.current[id];
    if (!marker) return;
    const element = marker.getElement();
    if (element) {
      const inner = element.querySelector<HTMLElement>(".truck-marker-inner");
      if (inner) inner.style.transform = `rotate(${heading.toFixed(2)}deg)`;
    }
  }, []);

  // Multi-vehicle animation loop
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

      const newSpeeds: Record<string, number> = {};
      const newStatsMap: Record<
        string,
        { percent: number; distance: number; totalDistance: number; eta: string }
      > = {};

      fleet.forEach((v) => {
        const state = simStates.current[v.id];
        if (!state || state.pointIndex >= v.route.length - 1) {
          newSpeeds[v.id] = 0;
          return;
        }

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
        const currentHead = smoothAngle(
          state.renderedHeading ?? targetHead,
          targetHead,
          deltaSec,
          smoothSpeed
        );
        state.renderedHeading = currentHead;

        const marker = markerRefs.current[v.id];
        if (marker) {
          marker.setLatLng(currentPos);
          updateMarkerRotation(v.id, currentHead);
        }

        const poly = traveledPolylineRefs.current[v.id];
        if (poly) {
          poly.setLatLngs([...v.route.slice(0, idx + 1), currentPos]);
        }

        const baseSpeed = 82;
        const variance = Math.sin(now / 1000 + v.speedFactor * 10) * 8;
        const simulatedSpeedKmh = Math.round(
          (baseSpeed + variance) * v.speedFactor + (speedMultiplier > 1 ? 12 : 0)
        );
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

        if (autoFollow && selectedVehicle?.id === v.id && internalMapRef.current) {
          internalMapRef.current.panTo(currentPos, { animate: false });
        }
      });

      if (now - lastStatsEmitRef.current > 350) {
        lastStatsEmitRef.current = now;
        setLiveSpeeds(newSpeeds);
        setVehicleStats((prev) => ({ ...prev, ...newStatsMap }));
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [running, fleet, speedMultiplier, autoFollow, selectedVehicle, updateMarkerRotation]);

  const handleFitAllRoutes = () => {
    const map = internalMapRef.current;
    if (!map) return;
    const geojsonLayer = L.geoJSON(iranCounties as any);
    map.fitBounds(geojsonLayer.getBounds(), { padding: [30, 30] });
    setAutoFollow(false);
  };

  const handleResetRoutes = () => {
    fleet.forEach((v) => {
      const initialHead = calculateLookaheadBearing(v.route, 0, 0);
      simStates.current[v.id] = {
        totalDistance: calculateTotalDistance(v.route),
        cumulativeDistances: simStates.current[v.id]?.cumulativeDistances || [],
        renderedHeading: initialHead,
        targetHeading: initialHead,
        pointIndex: 0,
        segmentProgress: 0,
      };

      const marker = markerRefs.current[v.id];
      if (marker && v.route[0]) {
        marker.setLatLng(v.route[0]);
        updateMarkerRotation(v.id, initialHead);
      }

      const poly = traveledPolylineRefs.current[v.id];
      if (poly && v.route[0]) {
        poly.setLatLngs([v.route[0]]);
      }
    });
  };

  const handleRecenterOnVehicle = (v: FleetVehicleConfig) => {
    const map = internalMapRef.current;
    if (!map) return;
    const state = simStates.current[v.id];
    const pos = v.route[state?.pointIndex || 0] || v.route[0];
    map.setView(pos, 13, { animate: true });
  };

  const toggleSpeed = () => {
    setSpeedMultiplier((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1));
  };

  const activeStats = selectedVehicle ? vehicleStats[selectedVehicle.id] : null;

  const iranBounds: L.LatLngBoundsExpression = [
    [24.396308, 44.031659],
    [39.78373, 63.333481],
  ];

  return (
    <div className="relative w-full h-full overflow-hidden">
      <MapContainer
        ref={handleMapRef as any}
        center={[32.4279, 53.688]}
        zoom={5}
        zoomControl={false}
        style={{
          height: "100%",
          width: "100%",
          zIndex: 10,
          borderRadius: "8px",
          position: "relative",
        }}
        maxBounds={iranBounds}
        maxBoundsViscosity={0}
        minZoom={5}>
        <TileLayer url={BASE_MAP} attribution="© OpenStreetMap contributors" />

        {/* 1. Precise City Geo Markers (Exactly on the cities, theme-reactive) */}
        {TRANSIT_CITIES.map((city) => (
          <Marker
            key={`city-${city.name}`}
            position={city.position}
            icon={createCityMarker(city.name, city.isHub)}
            eventHandlers={{
              click: () => {
                if (internalMapRef.current) {
                  internalMapRef.current.setView(city.position, 10, { animate: true });
                }
              },
            }}
          />
        ))}

        {/* 2. Fleet Transit Routes & Polylines */}
        {fleet.map((v) => {
          const isSelected = selectedVehicle?.id === v.id;
          const startPt = v.route[0];
          const initialBearing = calculateLookaheadBearing(v.route, 0, 0);
          const currentHeading = simStates.current[v.id]?.renderedHeading ?? initialBearing;

          return (
            <React.Fragment key={v.id}>
              {/* Route corridor background dashed polyline */}
              <Polyline
                positions={v.route}
                pathOptions={{
                  color: isSelected ? v.color : "#94a3b8",
                  weight: isSelected ? 4.5 : 3,
                  opacity: isSelected ? 0.85 : 0.45,
                  dashArray: "8, 10",
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />

              {/* Traveled progressive solid polyline */}
              <Polyline
                ref={(r) => {
                  traveledPolylineRefs.current[v.id] = r;
                }}
                positions={[startPt]}
                pathOptions={{
                  color: v.color,
                  weight: isSelected ? 6 : 4,
                  opacity: 0.95,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />

              {/* Real-time Moving Vehicle Marker */}
              <Marker
                ref={(ref) => {
                  markerRefs.current[v.id] = ref;
                }}
                position={startPt}
                icon={createVehicleIcon(currentHeading, v.color, v.id, isSelected)}
                eventHandlers={{
                  click: () => handleSelectVehicle(v),
                }}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Floating Toolbar in Top-Right Corner (Without +/- zoom buttons as requested) */}
      <div className="map-floating-panel map-pos-top-right">
        <div className="map-control-group">
          <button
            type="button"
            className="map-control-btn"
            title="نمایش کل نقشه کشور"
            onClick={handleFitAllRoutes}>
            <Maximize2 size={16} />
          </button>

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
              if (next && selectedVehicle) handleRecenterOnVehicle(selectedVehicle);
            }}>
            <Navigation size={16} />
          </button>

          <button
            type="button"
            className="map-control-btn"
            title="تمرکز روی خودروی انتخابی"
            onClick={() => {
              if (selectedVehicle) handleRecenterOnVehicle(selectedVehicle);
              else if (fleet.length > 0) handleRecenterOnVehicle(fleet[0]);
            }}>
            <Crosshair size={16} />
          </button>

          <div className="map-control-divider" />

          {/* Play / Pause simulation toggle */}
          <button
            type="button"
            className={`map-control-btn ${running ? "is-active" : ""}`}
            title={
              running
                ? "توقف موقت شبیه‌سازی حرکت"
                : "شروع شبیه‌سازی حرکت ناوگان"
            }
            onClick={() => setRunning(!running)}>
            {running ? <Pause size={16} /> : <Play size={16} />}
          </button>

          {/* Speed multiplier toggle */}
          <button
            type="button"
            className="map-control-btn"
            title={`سرعت شبیه‌سازی: ${toPersianDigits(speedMultiplier)}x`}
            onClick={toggleSpeed}>
            <div className="flex items-center text-[10px] font-bold font-mono">
              <FastForward size={12} className="mr-0.5" />
              <span>{speedMultiplier}x</span>
            </div>
          </button>

          <button
            type="button"
            className="map-control-btn"
            title="شروع مجدد همه مسیرها از مبدا"
            onClick={handleResetRoutes}>
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Floating Connection Status Widget in Bottom-Right Corner */}
      <div className="map-floating-panel map-pos-bottom-right">
        <ConnectionStatus isConnected={isConnected} />
      </div>

      {/* Single Vehicle Detail Modal when a truck is clicked */}
      {selectedVehicle && (
        <div className="vehicle-detail-modal">
          {/* Header */}
          <div className="modal-header-row">
            <div className="modal-header-left">
              <div
                className="modal-truck-badge"
                style={{ background: selectedVehicle.color }}>
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
              title="بستن پنجره جزئیات">
              <X size={16} />
            </button>
          </div>

          {/* Live Status & Speed Bar */}
          <div className="modal-stats-grid">
            <div className="modal-stat-box">
              <span className="modal-stat-label">وضعیت پایش:</span>
              <div className="modal-stat-value">
                <Radio
                  size={13}
                  className={
                    running
                      ? "text-emerald-500 animate-pulse"
                      : "text-amber-500"
                  }
                />
                <span className="text-xs">
                  {running && (liveSpeeds[selectedVehicle.id] || 0) > 0
                    ? "در حال حرکت"
                    : "متوقف شده"}
                </span>
              </div>
            </div>

            <div className="modal-stat-box">
              <span className="modal-stat-label">سرعت لحظه‌ای:</span>
              <span
                className="modal-stat-value font-mono"
                style={{ color: selectedVehicle.color }}>
                {toPersianDigits(liveSpeeds[selectedVehicle.id] || 0)}{" "}
                <span className="text-[10px] text-slate-400 font-normal">
                  km/h
                </span>
              </span>
            </div>
          </div>

          {/* Progress & Distance */}
          {activeStats && (
            <div className="modal-progress-card">
              <div className="modal-progress-header">
                <span className="text-secondary font-medium">
                  پیشرفت مسیر ({selectedVehicle.origin.split(" ")[0]} ←{" "}
                  {selectedVehicle.destination.split(" ")[0]})
                </span>
                <span
                  className="font-mono font-bold"
                  style={{ color: selectedVehicle.color }}>
                  {toPersianDigits(activeStats.percent)}٪
                </span>
              </div>

              <div className="modal-progress-bar-bg">
                <div
                  className="modal-progress-bar-fill"
                  style={{
                    width: `${activeStats.percent}%`,
                    backgroundColor: selectedVehicle.color,
                  }}
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
              <span className="modal-info-label">
                <UserCheck size={13} /> راننده مسئول:
              </span>
              <span className="modal-info-value">
                {selectedVehicle.driver}
              </span>
            </div>

            <div className="modal-info-row">
              <span className="modal-info-label">
                <Phone size={13} /> شماره تماس:
              </span>
              <span className="modal-info-value font-mono">
                {toPersianDigits(selectedVehicle.driverPhone)}
              </span>
            </div>

            <div className="modal-info-row">
              <span className="modal-info-label">
                <Truck size={13} /> پلاک کشنده:
              </span>
              <span className="modal-info-value font-mono">
                {selectedVehicle.plate}
              </span>
            </div>

            <div className="modal-info-row">
              <span className="modal-info-label">
                <Package size={13} /> محموله و وزن:
              </span>
              <span className="modal-info-value text-emerald-400">
                {selectedVehicle.cargo} (
                {toPersianDigits(selectedVehicle.cargoWeight)})
              </span>
            </div>

            <div className="modal-info-row">
              <span className="modal-info-label">
                <Calendar size={13} /> شماره بارنامه:
              </span>
              <span className="modal-info-value font-mono">
                {selectedVehicle.invoiceNumber}
              </span>
            </div>

            <div className="modal-info-row">
              <span className="modal-info-label">
                <Clock size={13} /> زمان خروج از مبدا:
              </span>
              <span className="modal-info-value text-cyan-400">
                ساعت {toPersianDigits(selectedVehicle.startTime)}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <button
            type="button"
            className="modal-primary-btn"
            style={{
              background: `linear-gradient(135deg, ${selectedVehicle.color}, ${selectedVehicle.accentColor})`,
            }}
            onClick={() => handleRecenterOnVehicle(selectedVehicle)}>
            <Crosshair size={15} />
            <span>تمرکز و زوم روی خودرو</span>
          </button>
        </div>
      )}

      {/* Bottom Fleet Status Pill */}
      <div className="map-bottom-status-bar">
        <div className="route-info-pill">
          <div className="pill-item">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-primary">
              پایش زنده ناوگان ترانزیت
            </span>
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
  );
};

export default IranCountyMap;
