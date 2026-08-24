import React from "react";
import {
  Crosshair,
  Maximize2,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  FastForward,
} from "lucide-react";
import { toPersianDigits } from "../../utils/tracking";

interface MapControlsProps {
  autoFollow: boolean;
  running: boolean;
  speedMultiplier: number;
  onFitAllRoutes: () => void;
  onToggleAutoFollow: () => void;
  onRecenter: () => void;
  onToggleRunning: () => void;
  onToggleSpeed: () => void;
  onResetRoutes: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  autoFollow,
  running,
  speedMultiplier,
  onFitAllRoutes,
  onToggleAutoFollow,
  onRecenter,
  onToggleRunning,
  onToggleSpeed,
  onResetRoutes,
}) => {
  return (
    <div className="map-floating-panel map-pos-top-right">
      <div className="map-control-group">
        <button
          type="button"
          className="map-control-btn"
          title="نمایش کل نقشه کشور"
          onClick={onFitAllRoutes}
        >
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
          onClick={onToggleAutoFollow}
        >
          <Navigation size={16} />
        </button>

        <button
          type="button"
          className="map-control-btn"
          title="تمرکز روی خودروی انتخابی"
          onClick={onRecenter}
        >
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
          onClick={onToggleRunning}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>

        {/* Speed multiplier toggle */}
        <button
          type="button"
          className="map-control-btn"
          title={`سرعت شبیه‌سازی: ${toPersianDigits(speedMultiplier)}x`}
          onClick={onToggleSpeed}
        >
          <div className="flex items-center text-[10px] font-bold font-mono">
            <FastForward size={12} className="mr-0.5" />
            <span>{speedMultiplier}x</span>
          </div>
        </button>

        <button
          type="button"
          className="map-control-btn"
          title="شروع مجدد همه مسیرها از مبدا"
          onClick={onResetRoutes}
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
};

export default MapControls;
