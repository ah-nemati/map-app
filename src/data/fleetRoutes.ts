import type { LatLng } from "../utils/tracking";

export interface CheckpointInfo {
  name: string;
  milestonePercent: number;
  scheduledTime: string;
  description: string;
}

export interface FleetVehicleConfig {
  id: string;
  name: string;
  model: string;
  driver: string;
  driverPhone: string;
  plate: string;
  color: string;
  accentColor: string;
  origin: string;
  destination: string;
  cargo: string;
  cargoWeight: string;
  invoiceNumber: string;
  issueDate: string;
  startTime: string;
  speedFactor: number;
  route: LatLng[];
  checkpoints: CheckpointInfo[];
}

/**
 * Creates smooth dense GPS coordinate steps along real highway waypoints
 */
function interpolateWaypoints(waypoints: LatLng[], stepsPerSegment = 20): LatLng[] {
  const result: LatLng[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];

    for (let step = 0; step < stepsPerSegment; step++) {
      const t = step / stepsPerSegment;
      const lat = p1[0] + (p2[0] - p1[0]) * t;
      const lng = p1[1] + (p2[1] - p1[1]) * t;
      result.push([lat, lng]);
    }
  }
  result.push(waypoints[waypoints.length - 1]);
  return result;
}

// 1. Route 1: Tehran -> Qom -> Kashan -> Isfahan -> Yazd -> Sirjan -> Bandar Abbas (Central South Corridor)
const tehranToBandarAbbasWaypoints: LatLng[] = [
  [35.6892, 51.389], // تهران
  [34.64, 50.876], // قم
  [33.985, 51.4364], // کاشان
  [33.51, 51.91], // نطنز
  [32.6546, 51.668], // اصفهان
  [31.8974, 54.3569], // یزد
  [31.18, 55.3], // انار
  [30.43, 55.99], // رفسنجان
  [29.452, 55.6813], // سیرجان
  [28.3, 55.88], // حاجی‌آباد
  [27.1832, 56.2666], // بندرعباس
];
const tehranToBandarAbbasRoute = interpolateWaypoints(tehranToBandarAbbasWaypoints, 25);

// 2. Route 2: Tehran -> Semnan -> Damghan -> Shahroud -> Sabzevar -> Neyshabur -> Mashhad (Silk Road East Corridor)
const tehranToMashhadWaypoints: LatLng[] = [
  [35.6892, 51.389], // تهران
  [35.22, 52.34], // گرمسار
  [35.5769, 53.397], // سمنان
  [36.1678, 54.3468], // دامغان
  [36.4182, 54.9763], // شاهرود
  [36.32, 55.58], // میامی
  [36.2126, 57.678], // سبزوار
  [36.2133, 58.7958], // نیشابور
  [36.2972, 59.6067], // مشهد
];
const tehranToMashhadRoute = interpolateWaypoints(tehranToMashhadWaypoints, 25);

// 3. Route 3: Tehran -> Karaj -> Qazvin -> Zanjan -> Miyaneh -> Bostanabad -> Tabriz (Northwest Freeway Corridor)
const tehranToTabrizWaypoints: LatLng[] = [
  [35.6892, 51.389], // تهران
  [35.84, 50.9391], // کرج
  [36.2797, 50.0049], // قزوین
  [36.14, 49.19], // ابهر
  [36.6736, 48.4787], // زنجان
  [37.4239, 47.7147], // میانه
  [37.76, 46.92], // بستان‌آباد
  [38.08, 46.2919], // تبریز
];
const tehranToTabrizRoute = interpolateWaypoints(tehranToTabrizWaypoints, 25);

// 4. Route 4: Isfahan -> Shahreza -> Abadeh -> Marvdasht -> Shiraz -> Kazerun -> Bushehr (Southwest Coastal Corridor)
const isfahanToBushehrWaypoints: LatLng[] = [
  [32.6546, 51.668], // اصفهان
  [32.0089, 51.8689], // شهرضا
  [31.1608, 52.6506], // آباده
  [29.8742, 52.8025], // مرودشت
  [29.5918, 52.5837], // شیراز
  [29.6195, 51.6542], // کازرون
  [29.27, 51.21], // برازجان
  [28.9234, 50.8203], // بوشهر
];
const isfahanToBushehrRoute = interpolateWaypoints(isfahanToBushehrWaypoints, 25);

export const INITIAL_FLEET: FleetVehicleConfig[] = [
  {
    id: "v1",
    name: "ولوو FH500 نیوفیس",
    model: "Volvo FH500 Globetrotter XL",
    driver: "علیرضا نعمتی",
    driverPhone: "۰۹۱۲۳۴۵۶۷۸۹",
    plate: "۲۱ - ۹۸۴ ب ۵۲",
    color: "#3b82f6",
    accentColor: "#60a5fa",
    origin: "تهران",
    destination: "بندرعباس",
    cargo: "تجهیزات صنعتی و الکترونیک",
    cargoWeight: "۲۴ تن",
    invoiceNumber: "TR-849201",
    issueDate: "۲ شهریور ۱۴۰۴",
    startTime: "۰۶:۰۰",
    speedFactor: 1.0,
    route: tehranToBandarAbbasRoute,
    checkpoints: [
      { name: "تهران (مبدا بارگیری)", milestonePercent: 0, scheduledTime: "۰۶:۰۰", description: "پایانه جنوب، اتمام پلمپ بارنامه" },
      { name: "قم (ایست بازرسی)", milestonePercent: 12, scheduledTime: "۰۷:۴۵", description: "عوارضی و باسکول توزین پلیس راه" },
      { name: "کاشان (امیرکبیر)", milestonePercent: 24, scheduledTime: "۰۹:۳۰", description: "توقف کوتاه استراحت و ثبت تاخوگراف" },
      { name: "اصفهان (پایانه ترانزیت)", milestonePercent: 42, scheduledTime: "۱۲:۱۵", description: "سوخت‌گیری و بررسی مدارک ترانزیت" },
      { name: "یزد (کریدور مرکزی)", milestonePercent: 62, scheduledTime: "۱۶:۰۰", description: "ایستگاه سلامت و پایش دمای کانتینر" },
      { name: "سیرجان (مجتمع رفاهی)", milestonePercent: 82, scheduledTime: "۲۰:۳۰", description: "ثبت دوربین پلاک‌خوان و تعویض شیفت" },
      { name: "بندرعباس (مقصد نهایی)", milestonePercent: 100, scheduledTime: "۰۴:۱۵", description: "اسکله شهید رجایی، ورود به انبار گمرک" },
    ],
  },
  {
    id: "v2",
    name: "اسکانیا R450 های‌لاین",
    model: "Scania R450 Streamline",
    driver: "محمد احمدی",
    driverPhone: "۰۹۱۵۱۲۳۴۵۶۷",
    plate: "۷۸ - ۱۱۹ ج ۱۱",
    color: "#10b981",
    accentColor: "#34d399",
    origin: "تهران",
    destination: "مشهد",
    cargo: "محصولات مواد غذایی منجمد",
    cargoWeight: "۱۹ تن",
    invoiceNumber: "MSH-55029",
    issueDate: "۲ شهریور ۱۴۰۴",
    startTime: "۰۶:۳۰",
    speedFactor: 0.95,
    route: tehranToMashhadRoute,
    checkpoints: [
      { name: "تهران (پایانه شرق)", milestonePercent: 0, scheduledTime: "۰۶:۳۰", description: "پایانه باربری شرق تهران" },
      { name: "گرمسار (ایستگاه اول)", milestonePercent: 15, scheduledTime: "۰۸:۰۰", description: "پلیس راه گرمسار" },
      { name: "سمنان (کمربندی)", milestonePercent: 32, scheduledTime: "۱۰:۱۵", description: "توقف رفاهی سمنان" },
      { name: "شاهرود (پایانه کویر)", milestonePercent: 55, scheduledTime: "۱۳:۳۰", description: "سوخت‌گیری و پایش سیستم خنک‌کننده" },
      { name: "سبزوار (بیهق)", milestonePercent: 74, scheduledTime: "۱۷:۰۰", description: "ایستگاه کنترل مدارک پلیس راه" },
      { name: "نیشابور (خیام)", milestonePercent: 88, scheduledTime: "۱۹:۳۰", description: "بازرسی بارنامه و کنترل تاخوگراف" },
      { name: "مشهد (مقصد نهایی)", milestonePercent: 100, scheduledTime: "۲۱:۴۵", description: "تخلیه بار در پایانه مرکزی امام رضا" },
    ],
  },
  {
    id: "v3",
    name: "بنز اکتروس ۱۸۴۴",
    model: "Mercedes-Benz Actros 1844",
    driver: "سهراب مرادی",
    driverPhone: "۰۹۱۴۹۸۷۶۵۴۳",
    plate: "۴۴ - ۶۳۲ د ۲۲",
    color: "#f43f5e",
    accentColor: "#fb7185",
    origin: "تهران",
    destination: "تبریز",
    cargo: "قطعات یدکی خودرو و مکانیکی",
    cargoWeight: "۲۱ تن",
    invoiceNumber: "TBZ-90142",
    issueDate: "۲ شهریور ۱۴۰۴",
    startTime: "۰۷:۰۰",
    speedFactor: 1.05,
    route: tehranToTabrizRoute,
    checkpoints: [
      { name: "تهران (پایانه غرب)", milestonePercent: 0, scheduledTime: "۰۷:۰۰", description: "خروج از پایانه بار غرب" },
      { name: "کرج - هشتگرد", milestonePercent: 12, scheduledTime: "۰۸:۰۰", description: "آزادراه کرج - قزوین" },
      { name: "قزوین (مینودر)", milestonePercent: 28, scheduledTime: "۰۹:۴۵", description: "باسکول پلیس راه قزوین" },
      { name: "زنجان (گاوازنگ)", milestonePercent: 52, scheduledTime: "۱۲:۳۰", description: "توقف استراحت و صرف ناهار" },
      { name: "میانه (پل دختر)", milestonePercent: 72, scheduledTime: "۱۵:۰۰", description: "محور کوهستانی میانه" },
      { name: "بستان‌آباد", milestonePercent: 88, scheduledTime: "۱۷:۱۵", description: "ایستگاه عوارضی آزادراه تبریز" },
      { name: "تبریز (مقصد نهایی)", milestonePercent: 100, scheduledTime: "۱۹:۰۰", description: "شهرک صنعتی و گمرک تبریز" },
    ],
  },
  {
    id: "v4",
    name: "داف XF 530 سوپر اسپیس",
    model: "DAF XF 530 Super Space Cab",
    driver: "مجید کاظمی",
    driverPhone: "۰۹۱۷۱۱۱۲۲۳۳",
    plate: "۵۳ - ۳۴۸ ص ۴۸",
    color: "#f59e0b",
    accentColor: "#fbbf24",
    origin: "اصفهان",
    destination: "بوشهر",
    cargo: "فرآورده‌های پتروشیمی و رزین",
    cargoWeight: "۲۶ تن",
    invoiceNumber: "BSH-44109",
    issueDate: "۲ شهریور ۱۴۰۴",
    startTime: "۰۵:۳۰",
    speedFactor: 0.98,
    route: isfahanToBushehrRoute,
    checkpoints: [
      { name: "اصفهان (مبدا)", milestonePercent: 0, scheduledTime: "۰۵:۳۰", description: "پایانه باربری کاوه اصفهان" },
      { name: "شهرضا", milestonePercent: 14, scheduledTime: "۰۷:۰۰", description: "پلیس راه اصفهان - شیراز" },
      { name: "آباده", milestonePercent: 32, scheduledTime: "۰۹:۳۰", description: "ایستگاه نظارت جاده‌ای" },
      { name: "مرودشت (تخت جمشید)", milestonePercent: 54, scheduledTime: "۱۲:۴۵", description: "توقف کوتاه و سوخت‌گیری" },
      { name: "شیراز (خلیج فارس)", milestonePercent: 64, scheduledTime: "۱۴:۱۵", description: "کمربندی جنوبی شیراز" },
      { name: "کازرون (تنگ چوگان)", milestonePercent: 82, scheduledTime: "۱۷:۰۰", description: "گذر از محور کوهستانی کازرون" },
      { name: "بوشهر (مقصد)", milestonePercent: 100, scheduledTime: "۲۰:۳۰", description: "تخلیه بار در محوطه بندری خلیج فارس" },
    ],
  },
];
