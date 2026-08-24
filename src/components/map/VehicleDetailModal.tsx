import React from "react";
import {
  Crosshair,
  Clock,
  Calendar,
  Package,
  UserCheck,
  Phone,
  Truck,
  X,
  Radio,
} from "lucide-react";
import { toPersianDigits } from "../../utils/tracking";
import type { FleetVehicleConfig } from "../../data/fleetRoutes";

interface VehicleStats {
  percent: number;
  distance: number;
  totalDistance: number;
  eta: string;
}

interface VehicleDetailModalProps {
  vehicle: FleetVehicleConfig;
  running: boolean;
  liveSpeed: number;
  stats?: VehicleStats | null;
  onClose: () => void;
  onRecenter: (v: FleetVehicleConfig) => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  running,
  liveSpeed,
  stats,
  onClose,
  onRecenter,
}) => {
  return (
    <div className="vehicle-detail-modal">
      {/* Header */}
      <div className="modal-header-row">
        <div className="modal-header-left">
          <div
            className="modal-truck-badge"
            style={{ background: vehicle.color }}
          >
            <Truck size={20} />
          </div>
          <div className="modal-title-box">
            <h3>{vehicle.name}</h3>
            <span>{vehicle.model}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
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
            <Radio
              size={13}
              className={
                running
                  ? "text-emerald-500 animate-pulse"
                  : "text-amber-500"
              }
            />
            <span className="text-xs">
              {running && (liveSpeed || 0) > 0
                ? "در حال حرکت"
                : "متوقف شده"}
            </span>
          </div>
        </div>

        <div className="modal-stat-box">
          <span className="modal-stat-label">سرعت لحظه‌ای:</span>
          <span
            className="modal-stat-value font-mono"
            style={{ color: vehicle.color }}
          >
            {toPersianDigits(liveSpeed || 0)}{" "}
            <span className="text-[10px] text-slate-400 font-normal">
              km/h
            </span>
          </span>
        </div>
      </div>

      {/* Progress & Distance */}
      {stats && (
        <div className="modal-progress-card">
          <div className="modal-progress-header">
            <span className="text-secondary font-medium">
              پیشرفت مسیر ({vehicle.origin.split(" ")[0]} ←{" "}
              {vehicle.destination.split(" ")[0]})
            </span>
            <span
              className="font-mono font-bold"
              style={{ color: vehicle.color }}
            >
              {toPersianDigits(stats.percent)}٪
            </span>
          </div>

          <div className="modal-progress-bar-bg">
            <div
              className="modal-progress-bar-fill"
              style={{
                width: `${stats.percent}%`,
                backgroundColor: vehicle.color,
              }}
            />
          </div>

          <div className="modal-progress-meta">
            <span>طی‌شده: {toPersianDigits(stats.distance)} km</span>
            <span>زمان تخمینی: {stats.eta}</span>
          </div>
        </div>
      )}

      {/* Detailed Vehicle & Logistics Info */}
      <div className="modal-info-list">
        <div className="modal-info-row">
          <span className="modal-info-label">
            <UserCheck size={13} /> راننده مسئول:
          </span>
          <span className="modal-info-value">{vehicle.driver}</span>
        </div>

        <div className="modal-info-row">
          <span className="modal-info-label">
            <Phone size={13} /> شماره تماس:
          </span>
          <span className="modal-info-value font-mono">
            {toPersianDigits(vehicle.driverPhone)}
          </span>
        </div>

        <div className="modal-info-row">
          <span className="modal-info-label">
            <Truck size={13} /> پلاک کشنده:
          </span>
          <span className="modal-info-value font-mono">
            {vehicle.plate}
          </span>
        </div>

        <div className="modal-info-row">
          <span className="modal-info-label">
            <Package size={13} /> محموله و وزن:
          </span>
          <span className="modal-info-value text-emerald-400">
            {vehicle.cargo} ({toPersianDigits(vehicle.cargoWeight)})
          </span>
        </div>

        <div className="modal-info-row">
          <span className="modal-info-label">
            <Calendar size={13} /> شماره بارنامه:
          </span>
          <span className="modal-info-value font-mono">
            {vehicle.invoiceNumber}
          </span>
        </div>

        <div className="modal-info-row">
          <span className="modal-info-label">
            <Clock size={13} /> زمان خروج از مبدا:
          </span>
          <span className="modal-info-value text-cyan-400">
            ساعت {toPersianDigits(vehicle.startTime)}
          </span>
        </div>
      </div>

      {/* Modal Actions */}
      <button
        type="button"
        className="modal-primary-btn"
        style={{
          background: `linear-gradient(135deg, ${vehicle.color}, ${vehicle.accentColor})`,
        }}
        onClick={() => onRecenter(vehicle)}
      >
        <Crosshair size={15} />
        <span>تمرکز و زوم روی خودرو</span>
      </button>
    </div>
  );
};

export default VehicleDetailModal;
