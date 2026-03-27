/**
 * Lightweight User-Agent parsing for admin-facing displays (activity logs, sessions).
 * No external dependency; heuristics only — not a substitute for server-side bot detection.
 */

export type ParsedUserAgent = {
  /** e.g. "Chrome 145" */
  browser: string;
  /** e.g. "Windows 10 / 11 (64-bit)", "macOS 14.2", "Linux", "iOS 17.2", "Android 14" */
  os: string;
  /** e.g. Desktop, iPhone, iPad, Mobile (Android/other phones), Tablet */
  device: string;
  /** One-line label for compact UI */
  summary: string;
};

function pickBrowser(ua: string): { name: string; version: string } {
  const v = (re: RegExp) => {
    const m = ua.match(re);
    return m?.[1] ?? "";
  };
  if (/Edg(?:e|A|iOS)?\/[\d.]+/i.test(ua)) {
    return { name: "Edge", version: v(/Edg(?:e|A|iOS)?\/([\d.]+)/i) };
  }
  if (/OPR\/[\d.]+|Opera\/[\d.]+/i.test(ua)) {
    return { name: "Opera", version: v(/(?:OPR|Opera)\/([\d.]+)/i) };
  }
  if (/SamsungBrowser\/[\d.]+/i.test(ua)) {
    return { name: "Samsung Internet", version: v(/SamsungBrowser\/([\d.]+)/i) };
  }
  if (/Firefox\/[\d.]+/i.test(ua)) {
    return { name: "Firefox", version: v(/Firefox\/([\d.]+)/i) };
  }
  if (/Chrome\/[\d.]+/i.test(ua) && !/Edg/i.test(ua)) {
    return { name: "Chrome", version: v(/Chrome\/([\d.]+)/i) };
  }
  if (/CriOS\/[\d.]+/i.test(ua)) {
    return { name: "Chrome (iOS)", version: v(/CriOS\/([\d.]+)/i) };
  }
  if (/Version\/[\d.]+.*Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    return { name: "Safari", version: v(/Version\/([\d.]+)/i) };
  }
  if (/Safari\/[\d.]+/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)) {
    return { name: "Safari", version: "" };
  }
  return { name: "Unknown browser", version: "" };
}

function pickOs(ua: string): string {
  let arch = "";
  if (/Win64|x64|WOW64|amd64/i.test(ua)) arch = "64-bit";
  else if (/Win32|i686/i.test(ua) && /Windows/i.test(ua)) arch = "32-bit";
  else if (/arm64|aarch64/i.test(ua)) arch = "ARM64";

  // ChromeOS / Chromebook (Chromium UA contains CrOS)
  const cros = ua.match(/CrOS\s+[\w]+\s+([\d.]+)/i);
  if (cros) {
    return `Chrome OS ${cros[1]}`;
  }
  if (/CrOS/i.test(ua)) return "Chrome OS";

  const android = ua.match(/Android\s+([\d.]+)/i);
  if (android) {
    const a = arch ? `Android ${android[1]} (${arch})` : `Android ${android[1]}`;
    return a;
  }

  // iPhone / iPad / iPod: "CPU iPhone OS 17_2 like Mac OS X" or "CPU OS 3_2" (older iPad)
  const ios =
    ua.match(/CPU (?:iPhone )?OS ([\d_]+)/i) || ua.match(/CPU OS ([\d_]+)/i);
  if (ios || /iPhone|iPad|iPod/i.test(ua)) {
    const ver = ios ? ios[1].replaceAll("_", ".") : "";
    const dev = /iPad/i.test(ua) ? "iPadOS" : "iOS";
    return ver ? `${dev} ${ver}` : dev;
  }

  const winNt = ua.match(/Windows NT ([\d.]+)/i);
  if (winNt) {
    const map: Record<string, string> = {
      "10.0": "Windows 10 / 11",
      "6.3": "Windows 8.1",
      "6.2": "Windows 8",
      "6.1": "Windows 7",
      "6.0": "Windows Vista",
      "5.1": "Windows XP",
    };
    const label = map[winNt[1]] ?? `Windows NT ${winNt[1]}`;
    return arch ? `${label} (${arch})` : label;
  }
  if (/Windows/i.test(ua)) return arch ? `Windows (${arch})` : "Windows";

  const mac = ua.match(/Mac OS X ([\d_]+)/i);
  if (mac) {
    const ver = mac[1].replaceAll("_", ".");
    return `macOS ${ver}`;
  }
  if (/Macintosh|Mac OS/i.test(ua)) return "macOS";

  if (/Linux/i.test(ua) && !/Android/i.test(ua)) {
    return arch ? `Linux (${arch})` : "Linux";
  }

  if (/FreeBSD/i.test(ua)) return "FreeBSD";
  if (/OpenBSD/i.test(ua)) return "OpenBSD";

  return "Unknown OS";
}

function pickDevice(ua: string): string {
  if (/iPad/i.test(ua) && !/iPhone/i.test(ua)) return "iPad";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPod/i.test(ua)) return "iPod";
  if (/Android/i.test(ua)) {
    // Phone UAs usually include "Mobile"; many tablets omit it
    return /Mobile/i.test(ua) ? "Mobile" : "Tablet";
  }
  if (/Tablet/i.test(ua) && !/Windows PC/i.test(ua)) return "Tablet";
  if (/Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "Mobile";
  return "Desktop";
}

/**
 * Returns null when the string is empty or whitespace.
 */
export function parseUserAgentDetails(ua: string | null | undefined): ParsedUserAgent | null {
  const s = typeof ua === "string" ? ua.trim() : "";
  if (!s) return null;

  const { name, version } = pickBrowser(s);
  const browser = version ? `${name} ${version.split(".").slice(0, 3).join(".")}` : name;
  const os = pickOs(s);
  const device = pickDevice(s);
  const summary = `${browser} · ${os} · ${device}`;

  return { browser, os, device, summary };
}

/** Short single-line label for tight spaces (e.g. session list). */
export function formatUserAgentSummary(ua: string | null | undefined): string {
  const p = parseUserAgentDetails(ua);
  return p?.summary ?? "Unknown device";
}
