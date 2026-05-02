import type { Hemisphere, Season, SeasonalAck, SeasonalCare } from "@/types/plant";

// Meteorological season boundaries (month is 1-based)
const NORTHERN_SEASONS: [Season, number, number][] = [
  ["spring", 3, 5],
  ["summer", 6, 8],
  ["fall",   9, 11],
];
// winter = everything else

export function getCurrentSeason(hemisphere: Hemisphere): Season {
  const month = new Date().getMonth() + 1; // 1–12

  if (hemisphere === "southern") {
    // Invert: northern spring → southern fall, etc.
    const mirrored = getMirroredSeason(month);
    return mirrored;
  }

  // Northern and tropical both use standard calendar
  return getNorthernSeason(month);
}

function getNorthernSeason(month: number): Season {
  for (const [season, start, end] of NORTHERN_SEASONS) {
    if (month >= start && month <= end) return season;
  }
  return "winter";
}

function getMirroredSeason(month: number): Season {
  const northern = getNorthernSeason(month);
  const mirror: Record<Season, Season> = {
    spring: "fall",
    fall:   "spring",
    summer: "winter",
    winter: "summer",
  };
  return mirror[northern];
}

/** Infer the user's hemisphere from their browser timezone. Defaults to northern. */
export function inferHemisphere(): Hemisphere {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const southernPrefixes = [
      "Australia/",
      "Pacific/Auckland",
      "Pacific/Chatham",
      "America/Argentina",
      "America/Sao_Paulo",
      "America/Santiago",
      "America/Lima",
      "America/Bogota",
      "Africa/Johannesburg",
      "Africa/Harare",
      "Africa/Maputo",
    ];
    if (southernPrefixes.some((p) => tz.startsWith(p) || tz === p)) {
      return "southern";
    }
    const tropicalZones = [
      "Africa/Nairobi",
      "Africa/Kampala",
      "Africa/Dar_es_Salaam",
      "Asia/Jakarta",
      "Asia/Singapore",
      "Asia/Colombo",
    ];
    if (tropicalZones.includes(tz)) return "tropical";
  } catch {
    // ignore — browser doesn't support Intl
  }
  return "northern";
}

/** Compute when the next health check-in is due based on plant state. */
export function computeNextHealthCheckIn(opts: {
  createdAt: number;
  healthStatus: "healthy" | "concern" | "unknown";
  lastHealthCheckIn: number | null;
}): number {
  const base = opts.lastHealthCheckIn ?? opts.createdAt;
  const daysSinceCreated = (Date.now() - opts.createdAt) / 86_400_000;

  let intervalDays: number;
  if (opts.healthStatus === "concern") {
    intervalDays = 30; // follow up quickly after a concern
  } else if (daysSinceCreated < 60) {
    intervalDays = 30; // new plants need closer attention
  } else {
    intervalDays = 90; // established healthy plant
  }

  return base + intervalDays * 86_400_000;
}

/** Returns true if the seasonal badge should show for this plant. */
export function isSeasonalNoteDue(
  seasonalCare: SeasonalCare | null,
  lastSeasonalAck: SeasonalAck | null,
  hemisphere: Hemisphere
): boolean {
  if (!seasonalCare) return false;

  const currentSeason = getCurrentSeason(hemisphere);
  const currentYear = new Date().getFullYear();
  const careNote = seasonalCare[currentSeason];

  if (!careNote) return false; // no special care this season

  // Badge clears once the user views the note (ack stored per season+year)
  if (
    lastSeasonalAck &&
    lastSeasonalAck.season === currentSeason &&
    lastSeasonalAck.year === currentYear
  ) {
    return false;
  }

  return true;
}

/** Returns true if the health check-in badge should show. */
export function isHealthCheckInDue(plant: {
  nextHealthCheckIn: number;
}): boolean {
  return Date.now() >= plant.nextHealthCheckIn;
}
