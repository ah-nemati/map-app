import { useState, useCallback, useEffect } from "react";
import {
  Gauge,
  Route,
  Navigation,
  LogOut,
  Truck,
  MapPin,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Radio,
  UserCheck,
  Package,
  Calendar,
  X,
  ShieldCheck,
  Sun,
  Moon,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import TrackingMap from "../components/TrackingMap";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Progress } from "../components/ui/Progress";
import {
  type RouteStats,
  getCompassDirectionFa,
  toPersianDigits,
  formatPersianDate,
  formatPersianTime,
} from "../utils/tracking";

// Waypoints along Tehran - Bandar Abbas Transit Highway (~1,280 km)
const ROUTE_CHECKPOINTS = [
  {
    name: "تهران (پایانه جنوب)",
    milestonePercent: 0,
    scheduledTime: "۰۶:۰۰",
    scheduledDate: "۲ شهریور",
    description: "مبدا بارگیری و شروع ترانزیت",
  },
  {
    name: "قم (کمربندی ۷۲ تن)",
    milestonePercent: 12,
    scheduledTime: "۰۷:۴۵",
    scheduledDate: "۲ شهریور",
    description: "ایست بازرسی و ورود به آزادراه امیرکبیر",
  },
  {
    name: "کاشان (کمربندی راوند)",
    milestonePercent: 24,
    scheduledTime: "۰۹:۱۵",
    scheduledDate: "۲ شهریور",
    description: "توقفگاه مجتمع خدماتی کویر",
  },
  {
    name: "اصفهان (مورچه‌خورت)",
    milestonePercent: 42,
    scheduledTime: "۱۲:۳۰",
    scheduledDate: "۲ شهریور",
    description: "توقف استراحت و بازرسی ناوگان",
  },
  {
    name: "شیراز (مرودشت / فسا)",
    milestonePercent: 72,
    scheduledTime: "۱۹:۴۵",
    scheduledDate: "۲ شهریور",
    description: "محور کوهستانی و اتصال به جاده داراب",
  },
  {
    name: "بندرعباس (اسکله رجایی)",
    milestonePercent: 100,
    scheduledTime: "۰۵:۳۰ (+۱)",
    scheduledDate: "۳ شهریور",
    description: "مقصد نهایی و تخلیه محموله کانتینری",
  },
];

export default function Dashboard() {
  const [running, setRunning] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2);
  const [seekProgress, setSeekProgress] = useState<number | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [currentClock, setCurrentClock] = useState<Date>(new Date());

  const [stats, setStats] = useState<RouteStats>({
    speed: 0,
    distance: 0,
    totalDistance: 1280,
    percent: 0,
    eta: "۴ ساعت و ۲۰ دقیقه",
    elapsedSeconds: 0,
    heading: 0,
    currentPointIndex: 0,
  });

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Live ticking Persian clock for the header
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStatsUpdate = useCallback((newStats: RouteStats) => {
    setStats(newStats);
  }, []);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) / 100;
    setSeekProgress(val);
  };

  const handleReset = () => {
    setRunning(false);
    setSeekProgress(0);
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 1024) {
      setIsMobileDrawerOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const isSidebarOpen = window.innerWidth <= 1024 ? isMobileDrawerOpen : !isSidebarCollapsed;

  return (
    <main className="dashboard" dir="rtl">
      {/* 1. Header Topbar */}
      <header className="topbar">
        <div className="brand-wrapper">
          <div className="brand-icon-box">
            <Truck size={24} />
          </div>
          <div className="brand-text">
            <h1>سامانه هوشمند مانیتورینگ ناوگان</h1>
            <span>مسیر ترانزیت جاده‌ای تهران - بندرعباس</span>
          </div>
        </div>

        <div className="topbar-actions">
          {/* Live Valid Shamsi / Persian Date & Time Widget */}
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-card bg-control px-3 py-1.5 text-xs">
            <Calendar size={14} className="text-blue-500" />
            <span className="text-primary font-medium">
              {formatPersianDate(currentClock, true)}
            </span>
            <span className="text-muted">|</span>
            <Clock size={13} className="text-emerald-500" />
            <span className="text-emerald-400 font-mono font-bold">
              {formatPersianTime(currentClock)}
            </span>
          </div>

          {/* Live GPS Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-card bg-control px-3 py-1 text-xs">
            <Radio size={14} className="text-emerald-500 animate-pulse" />
            <span className="text-secondary">جی‌پی‌اس فعال ({toPersianDigits(12)} ماهواره)</span>
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

          {/* Toggle Sidebar from Left */}
          <Button
            variant="glass"
            size="sm"
            onClick={handleToggleSidebar}
            title={isSidebarOpen ? "بستن پنل اطلاعات نقشه" : "نمایش اطلاعات نقشه"}
            className="flex items-center gap-1.5"
          >
            {isSidebarOpen ? (
              <>
                <PanelLeftClose size={16} className="text-blue-500" />
                <span>بستن پنل</span>
              </>
            ) : (
              <>
                <PanelLeftOpen size={16} className="text-blue-500" />
                <span>اطلاعات نقشه</span>
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
            <span>{user?.username || "مدیر سیستم"}</span>
          </Button>
        </div>
      </header>

      {/* 2. Responsive Main Layout */}
      <section className="tracking-layout">
        {/* Map Viewport Area */}
        <div className="map-container">
          <TrackingMap
            running={running}
            setRunning={setRunning}
            speedMultiplier={playbackSpeed}
            seekProgress={seekProgress}
            onStats={handleStatsUpdate}
          />
        </div>

        {/* Mobile Backdrop */}
        <div
          className={`sidebar-backdrop ${isMobileDrawerOpen ? "is-visible" : ""}`}
          onClick={() => setIsMobileDrawerOpen(false)}
        />

        {/* Telemetry Sidebar (Opens from LEFT) */}
        <aside
          className={`sidebar ${isSidebarCollapsed ? "is-collapsed" : ""} ${
            isMobileDrawerOpen ? "is-mobile-open" : ""
          }`}
        >
          {/* Sidebar Header with Close Button */}
          <div className="sidebar-header">
            <span className="sidebar-title font-bold flex items-center gap-2">
              <Truck size={18} className="text-blue-500" />
              <span>اطلاعات و وضعیت ناوگان</span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-secondary hover:text-primary"
              onClick={() => {
                setIsSidebarCollapsed(true);
                setIsMobileDrawerOpen(false);
              }}
              title="بستن پنل"
            >
              <X size={18} />
            </Button>
          </div>

          {/* Card 1: Vehicle Status & GPS Fix */}
          <Card variant="glass" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">وضعیت عملیاتی</span>
              <Badge
                variant={running ? "moving" : "idle"}
                pulse={running}
              >
                {running ? "در حال حرکت" : "متوقف / آماده"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-secondary">
              <span className="flex items-center gap-1.5 text-emerald-500">
                <ShieldCheck size={15} /> سامانه تله‌ماتیک متصل
              </span>
              <span className="text-muted">
                بروزرسانی: {formatPersianTime(currentClock)}
              </span>
            </div>
          </Card>

          {/* Card 2: 2x2 Telemetry Metrics Grid */}
          <div className="metric-grid">
            <div className="metric-card-pro">
              <div className="metric-icon-box emerald">
                <Gauge size={20} />
              </div>
              <div className="metric-content">
                <small>سرعت لحظه‌ای</small>
                <strong>
                  {toPersianDigits(stats.speed)}{" "}
                  <span className="text-xs text-secondary">km/h</span>
                </strong>
              </div>
            </div>

            <div className="metric-card-pro">
              <div className="metric-icon-box blue">
                <Route size={20} />
              </div>
              <div className="metric-content">
                <small>مسافت طی‌شده</small>
                <strong>
                  {toPersianDigits(stats.distance)}{" "}
                  <span className="text-xs text-secondary">km</span>
                </strong>
              </div>
            </div>

            <div className="metric-card-pro">
              <div className="metric-icon-box amber">
                <Clock size={20} />
              </div>
              <div className="metric-content">
                <small>زمان تخمینی (ETA)</small>
                <strong className="text-xs font-semibold">{stats.eta}</strong>
              </div>
            </div>

            <div className="metric-card-pro">
              <div className="metric-icon-box cyan">
                <Navigation size={20} />
              </div>
              <div className="metric-content">
                <small>جهت حرکت</small>
                <strong>
                  {toPersianDigits(stats.heading)}°{" "}
                  <span className="text-xs text-secondary">
                    {getCompassDirectionFa(stats.heading)}
                  </span>
                </strong>
              </div>
            </div>
          </div>

          {/* Card 3: Playback Controller & Scrubber */}
          <Card variant="bordered" className="playback-controls-card">
            <div className="flex items-center justify-between">
              <span className="sidebar-title flex items-center gap-1.5">
                <Sliders size={16} className="text-blue-500" /> کنترل حرکت ناوگان
              </span>
              {/* Speed multiplier selector */}
              <div className="speed-multiplier-group">
                {[1, 2, 5, 10].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`speed-btn ${playbackSpeed === s ? "is-active" : ""}`}
                    onClick={() => setPlaybackSpeed(s)}
                  >
                    {toPersianDigits(s)}x
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline Progress Scrubber */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-secondary">
                <span>پیشرفت مسیر</span>
                <span className="font-mono text-blue-500 font-bold">
                  {toPersianDigits(stats.percent)}٪
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={stats.percent}
                onChange={handleSeekChange}
                className="timeline-scrubber"
                title="جابجایی در طول مسیر"
              />
            </div>

            {/* Control Buttons Row */}
            <div className="playback-buttons-row">
              <Button
                variant={running ? "danger" : "success"}
                size="md"
                className="flex-1"
                onClick={() => setRunning(!running)}
              >
                {running ? (
                  <>
                    <Pause size={18} /> توقف موقت
                  </>
                ) : (
                  <>
                    <Play size={18} /> شروع شبیه‌سازی حرکت
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                size="icon"
                onClick={handleReset}
                title="شروع مجدد از مبدا"
              >
                <RotateCcw size={16} />
              </Button>
            </div>
          </Card>

          {/* Card 4: Route Milestones & Checkpoints with Valid Dates & Times */}
          <Card variant="glass" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="sidebar-title flex items-center gap-1.5">
                <MapPin size={16} className="text-emerald-500" /> ایستگاه‌ها و زمان‌بندی مسیر
              </span>
              <span className="text-xs text-secondary">
                کل: {toPersianDigits(stats.totalDistance)} کیلومتر
              </span>
            </div>

            <Progress value={stats.percent} colorVariant="primary" />

            <div className="flex flex-col gap-2 mt-1">
              {ROUTE_CHECKPOINTS.map((checkpoint, idx) => {
                const isPassed = stats.percent >= checkpoint.milestonePercent;
                const isNext =
                  stats.percent < checkpoint.milestonePercent &&
                  (idx === 0 || stats.percent >= ROUTE_CHECKPOINTS[idx - 1].milestonePercent);

                return (
                  <div key={checkpoint.name} className="route-timeline-item">
                    {idx < ROUTE_CHECKPOINTS.length - 1 && (
                      <div className="route-timeline-connector" />
                    )}
                    <div
                      className={`timeline-dot ${
                        isNext
                          ? "is-active"
                          : isPassed
                          ? "is-passed"
                          : idx === ROUTE_CHECKPOINTS.length - 1
                          ? "is-destination"
                          : ""
                      }`}
                    >
                      {isPassed ? "✓" : toPersianDigits(idx + 1)}
                    </div>
                    <div className="flex-1 flex flex-col gap-0.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span
                          className={`font-medium ${
                            isPassed
                              ? "text-emerald-500"
                              : isNext
                              ? "text-blue-500 font-bold"
                              : "text-secondary"
                          }`}
                        >
                          {checkpoint.name}
                        </span>
                        <span className="text-[11px] font-mono text-muted">
                          {toPersianDigits(checkpoint.milestonePercent)}٪
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-muted">
                        <span>{checkpoint.description}</span>
                        <span className="font-mono text-blue-400 font-medium">
                          {checkpoint.scheduledTime}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Card 5: Fleet, Cargo & Valid Trip Information */}
          <Card variant="compact" className="flex flex-col gap-1.5">
            <span className="sidebar-title flex items-center gap-1.5 text-xs text-secondary">
              <Package size={14} className="text-cyan-500" /> مشخصات بارنامه و ناوگان ترانزیت
            </span>
            <div className="info-row">
              <span className="info-label">
                <UserCheck size={13} /> راننده مسئول
              </span>
              <span className="info-value">علیرضا نعمتی</span>
            </div>
            <div className="info-row">
              <span className="info-label">
                <Truck size={13} /> پلاک کشنده
              </span>
              <span className="info-value font-mono">۲۱ - ۹۸۴ ب ۵۲</span>
            </div>
            <div className="info-row">
              <span className="info-label">
                <Package size={13} /> نوع محموله
              </span>
              <span className="info-value text-emerald-500 font-medium">
                تجهیزات صنعتی ({toPersianDigits(22)} تن)
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">
                <Calendar size={13} /> تاریخ صدور بارنامه
              </span>
              <span className="info-value text-slate-200 font-medium">
                {toPersianDigits("۲ شهریور ۱۴۰۴")}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">
                <Clock size={13} /> ساعت حرکت مبدا
              </span>
              <span className="info-value text-cyan-400 font-bold">
                ساعت {toPersianDigits("06:00")}
              </span>
            </div>
          </Card>
        </aside>
      </section>
    </main>
  );
}
