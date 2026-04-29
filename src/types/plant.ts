export type PlantStatus = "active" | "inactive";

export type CareLogAction =
  | "watered"
  | "fertilized"
  | "repotted"
  | "photo"
  | "note";

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
}

export interface GeminiPlantIdentification {
  commonName: string;
  scientificName: string;
  wateringFrequencyDays: number;
  lightRequirement: string;
  humidityNotes: string;
  careNotes: string;
  healthNotes: string;
}
