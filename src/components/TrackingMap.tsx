import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = [number, number];

type Stats = {
  speed: number;
  distance: number;
  percent: number;
  eta: string;
};

const START = { lat: 35.6892, lng: 51.389 };
const END = { lat: 27.1832, lng: 56.2808 };

const createTruckIcon = (rotation: number) =>
  L.divIcon({
    className: "",
    html: `
      <div class="truck-marker" style="transform:rotate(${rotation}deg)">
        🚚
      </div>
    `,
    iconSize: [45, 45],
  });

async function getRoute(): Promise<Point[]> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${START.lng},${START.lat};${END.lng},${END.lat}` +
    `?overview=full&geometries=geojson`;

  const response = await fetch(url);
  const data = await response.json();

  return data.routes[0].geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng],
  );
}

function interpolate(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function getHeading(a: Point, b: Point) {
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
}

export default function TrackingMap({
  running,
  setRunning,
  onStats,
}: {
  running: boolean;
  setRunning: (v: boolean) => void;
  onStats: (v: Stats) => void;
}) {
  const [route, setRoute] = useState<Point[]>([]);
  const [position, setPosition] = useState<Point>([START.lat, START.lng]);
  const [rotation, setRotation] = useState(0);

  const animation = useRef<number | null>(null);

  const mover = useRef({
    index: 0,
    progress: 0,
  });

  useEffect(() => {
    getRoute().then((r) => {
      setRoute(r);
      setPosition(r[0]);
    });
  }, []);

  useEffect(() => {
    if (!running || route.length < 2) return;

    let last = 0;

    const animate = (time: number) => {
      if (!last) last = time;

      const delta = (time - last) / 1000;
      last = time;

      const state = mover.current;

      const current = route[state.index];
      const next = route[state.index + 1];

      if (!next) {
        setRunning(false);
        return;
      }

      state.progress += delta * 0.12;

      if (state.progress >= 1) {
        state.progress = 0;
        state.index++;
      }

      const pos = interpolate(current, next, state.progress);

      setPosition(pos);
      setRotation(getHeading(current, next));

      onStats({
        speed: Math.round(82),
        distance: Number((state.index * 0.65).toFixed(1)),
        percent: Math.floor((state.index / route.length) * 100),
        eta: "۴ ساعت و ۲۰ دقیقه",
      });

      animation.current = requestAnimationFrame(animate);
    };

    animation.current = requestAnimationFrame(animate);

    return () => {
      if (animation.current) cancelAnimationFrame(animation.current);
    };
  }, [running, route]);

  if (!route.length)
    return (
      <div className="loading-map">
        در حال دریافت مسیر واقعی جاده‌ای ایران...
      </div>
    );

  return (
    <MapContainer center={position} zoom={6} className="map">
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <Polyline
        positions={route}
        pathOptions={{
          color: "#2563eb",
          weight: 8,
        }}
      />

      <Marker position={position} icon={createTruckIcon(rotation)} />

      <FollowCamera position={position} />
    </MapContainer>
  );
}

function FollowCamera({ position }: { position: Point }) {
  const map = useMap();

  useEffect(() => {
    map.panTo(position, {
      animate: true,
      duration: 0.25,
    });
  }, [position]);

  return null;
}
