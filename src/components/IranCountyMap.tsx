import L from "leaflet";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import iranCounties from "../data/iran-counties.geo.json";
import { ConnectionStatus } from "./ConnectionStatus";
import { MapControls } from "./map/MapControls";
import { VehicleDetailModal } from "./map/VehicleDetailModal";
import {
  TRANSIT_CITIES,
  createCityMarker,
  createVehicleIcon,
} from "./map/mapIcons";
import {
  haversine,
  calculateLookaheadBearing,
  smoothAngle,
  interpolate,
  calculateTotalDistance,
  formatDurationFa,
  toPersianDigits,
} from "../utils/tracking";
import { INITIAL_FLEET, type FleetVehicleConfig } from "../data/fleetRoutes";
import { MapPin } from "lucide-react";

const mode = import.meta.env.MODE;
const BASE_MAP =
  (mode === "development"
    ? import.meta.env.VITE_MAP_URL
    : (window as any).env?.VITE_MAP_URL) ||
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

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

        {/* 1. Precise City Geo Markers (Theme-reactive) */}
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

      {/* Floating Toolbar in Top-Right Corner */}
      <MapControls
        autoFollow={autoFollow}
        running={running}
        speedMultiplier={speedMultiplier}
        onFitAllRoutes={handleFitAllRoutes}
        onToggleAutoFollow={() => {
          const next = !autoFollow;
          setAutoFollow(next);
          if (next && selectedVehicle) handleRecenterOnVehicle(selectedVehicle);
        }}
        onRecenter={() => {
          if (selectedVehicle) handleRecenterOnVehicle(selectedVehicle);
          else if (fleet.length > 0) handleRecenterOnVehicle(fleet[0]);
        }}
        onToggleRunning={() => setRunning(!running)}
        onToggleSpeed={toggleSpeed}
        onResetRoutes={handleResetRoutes}
      />

      {/* Floating Connection Status Widget in Bottom-Right Corner */}
      <div className="map-floating-panel map-pos-bottom-right">
        <ConnectionStatus isConnected={isConnected} />
      </div>

      {/* Single Vehicle Detail Modal when a truck is clicked */}
      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          running={running}
          liveSpeed={liveSpeeds[selectedVehicle.id] || 0}
          stats={activeStats}
          onClose={() => setSelectedVehicle(null)}
          onRecenter={handleRecenterOnVehicle}
        />
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
