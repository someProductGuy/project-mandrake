export type PlantStatus = "active" | "inactive";

export type CareLogAction =
  | "watered"
  | "fertilized"
  | "repotted"
  | "photo"
  | "note";

export type HealthStatus = "healthy" | "concern" | "unknown";

export type Hemisphere = "northern" | "southern" | "tropical";

export type Season = "spring" | "summer" | "fall" | "winter";

export interface SeasonalCare {
  spring: string | null;
  summer: string | null;
  fall: string | null;
  winter: string | null;
}

export interface SeasonalAck {
  season: Season;
  year: number;
}

export interface Plant {
  id: string;
  userId: string;
  commonName: string;
  scientificName: string;
  nickname: string | null;
  coverPhotoUrl: string;
  wateringFrequencyDays: number;
  lastWatered: number; // unix ms timestamp
  lightRequirement: string;
  humidityNotes: string;
  careNotes: string;
  healthNotes: string;
  status: PlantStatus;
  createdAt: number;
  // Health check-in
  healthStatus: HealthStatus;
  lastHealthCheckIn: number | null; // unix ms timestamp
  nextHealthCheckIn: number;        // unix ms timestamp
  // Seasonal care
  seasonalCare: SeasonalCare | null;
  lastSeasonalAck: SeasonalAck | null;
}

export interface CareLog {
  id: string;
  action: CareLogAction;
  timestamp: number;
  photoUrl: string | null;
  note: string | null;
}

export interface User {
  id: string;
  email: string;
  fcmToken: string | null;
  notificationsEnabled: boolean;
  photoCheckInsEnabled: boolean;
  seasonalRemindersEnabled: boolean;
  hemisphere: Hemisphere;
}

export interface GeminiPlantIdentification {
  commonName: string;
  scientificName: string;
  wateringFrequencyDays: number;
  lightRequirement: string;
  humidityNotes: string;
  careNotes: string;
  healthNotes: string;
  seasonalCare: SeasonalCare | null;
}

export interface GeminiHealthCheckIn {
  healthNotes: string;
  healthStatus: "healthy" | "concern";
}
