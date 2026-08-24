import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import {
  LogOut,
  Truck,
  Clock,
  Radio,
  Calendar,
  Sun,
  Moon,
} from "lucide-react";
import IranCountyMap from "../components/IranCountyMap";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "../components/ui/Button";
import {
  toPersianDigits,
  formatPersianDate,
  formatPersianTime,
} from "../utils/tracking";
import { INITIAL_FLEET } from "../data/fleetRoutes";

export default function Dashboard() {
  const [running, setRunning] = useState(true);
  const [currentClock, setCurrentClock] = useState<Date>(new Date());
  const [isConnected] = useState<boolean>(true);
  const fleet = INITIAL_FLEET;

  const mapRef = useRef<L.Map | null>(null);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="dashboard" dir="rtl">
      {/* 1. Header Topbar */}
      <header className="topbar">
        <div className="brand-wrapper">
          <div className="brand-icon-box">
            <Truck size={24} />
          </div>
          <div className="brand-text">
            <h1>سامانه هوشمند مانیتورینگ ناوگان ترانزیت</h1>
            <span>رهگیری زنده و چندگانه ناوگان جاده‌ای کشور</span>
          </div>
        </div>

        <div className="topbar-actions">
          {/* Live Shamsi / Persian Date & Time Widget */}
          <div className="hidden md:flex topbar-widget-datetime">
            <Calendar size={14} className="text-blue-500 shrink-0" />
            <span className="font-semibold">
              {formatPersianDate(currentClock, true)}
            </span>
            <span className="opacity-40">|</span>
            <Clock size={13} className="text-emerald-500 shrink-0" />
            <span className="text-emerald-400 font-mono font-bold">
              {formatPersianTime(currentClock)}
            </span>
          </div>

          {/* Live GPS Status Indicator */}
          <div className="hidden sm:flex topbar-widget-status">
            <Radio size={14} className="text-emerald-500 animate-pulse shrink-0" />
            <span className="font-medium">
              جی‌پی‌اس فعال ({toPersianDigits(fleet.length)} ناوگان آنلاین)
            </span>
          </div>

          {/* Dark / Light Mode Switcher */}
          <Button
            variant="glass"
            size="sm"
            onClick={toggleTheme}
            title={theme === "dark" ? "تغییر به حالت روشن" : "تغییر به حالت تیره"}
            className="flex items-center gap-1.5"
          >
            {theme === "dark" ? (
              <>
                <Sun size={16} className="text-amber-400" />
                <span className="hidden md:inline text-xs">روشن</span>
              </>
            ) : (
              <>
                <Moon size={16} className="text-blue-500" />
                <span className="hidden md:inline text-xs">تیره</span>
              </>
            )}
          </Button>

          {/* User Account & Logout */}
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="hover:border-rose-500 hover:text-rose-500"
          >
            <LogOut size={16} />
            <span>{user?.username || "مدیر ارشد"}</span>
          </Button>
        </div>
      </header>

      {/* 2. Full Width Map Layout */}
      <section className="tracking-layout flex-1 relative h-[calc(100vh-64px)] w-full">
        <div className="map-container h-full w-full">
          <IranCountyMap
            mapRef={mapRef}
            isConnected={isConnected}
            running={running}
            setRunning={setRunning}
            speedMultiplier={2}
          />
        </div>
      </section>
    </main>
  );
}
