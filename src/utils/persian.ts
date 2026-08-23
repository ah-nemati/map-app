/**
 * Persian (Farsi) Numerals and Date Localization Utilities
 */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/**
 * Converts standard ASCII digits (0-9) to Persian digits (۰-۹)
 */
export function toPersianDigits(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[parseInt(digit, 10)]);
}

/**
 * Formats a number using Persian numerals and optional thousand separators
 */
export function formatPersianNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat("fa-IR", options).format(value);
  } catch {
    return toPersianDigits(value);
  }
}

/**
 * Formats a Date object into Persian (Solar Hijri / Jalali) Date string
 * Example: "۲ شهریور ۱۴۰۴" or "یکشنبه ۲ شهریور ۱۴۰۴"
 */
export function formatPersianDate(
  dateInput: Date | number | string = new Date(),
  includeWeekday = false
): string {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "تاریخ نامعتبر";

  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      weekday: includeWeekday ? "long" : undefined,
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return toPersianDigits(date.toISOString().split("T")[0]);
  }
}

/**
 * Formats a Date into standard Persian Date & Time
 * Example: "یکشنبه، ۲ شهریور ۱۴۰۴ - ۱۴:۲۵:۱۰"
 */
export function formatPersianDateTime(
  dateInput: Date | number | string = new Date()
): string {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "زمان نامعتبر";

  try {
    const formattedDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);

    const formattedTime = new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);

    return `${formattedDate} - ${formattedTime}`;
  } catch {
    return toPersianDigits(date.toLocaleTimeString());
  }
}

/**
 * Formats time in HH:mm or HH:mm:ss format with Persian digits
 */
export function formatPersianTime(
  dateInput: Date | number | string = new Date(),
  includeSeconds = true
): string {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "--:--";

  try {
    return new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12: false,
    }).format(date);
  } catch {
    const hours = toPersianDigits(String(date.getHours()).padStart(2, "0"));
    const minutes = toPersianDigits(String(date.getMinutes()).padStart(2, "0"));
    return `${hours}:${minutes}`;
  }
}

/**
 * Converts seconds into human-readable Persian duration with Persian digits
 */
export function formatDurationFa(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return "در مقصد";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${toPersianDigits(hours)} ساعت و ${toPersianDigits(minutes)} دقیقه`;
  }
  return `${toPersianDigits(minutes)} دقیقه`;
}
