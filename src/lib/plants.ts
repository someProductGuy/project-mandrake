import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Plant, CareLog, HealthStatus, SeasonalCare, SeasonalAck, Season } from "@/types/plant";
import { computeNextHealthCheckIn } from "./seasons";

function toPlant(id: string, data: Record<string, unknown>): Plant {
  const createdAt = (data.createdAt as Timestamp)?.toMillis() ?? Date.now();
  const lastHealthCheckIn =
    data.lastHealthCheckIn != null
      ? (data.lastHealthCheckIn as Timestamp)?.toMillis?.() ??
        (data.lastHealthCheckIn as number)
      : null;
  const healthStatus: HealthStatus =
    (data.healthStatus as HealthStatus) ?? "unknown";

  // Compute nextHealthCheckIn if not stored (e.g. pre-feature plants)
  const storedNext =
    data.nextHealthCheckIn != null
      ? (data.nextHealthCheckIn as Timestamp)?.toMillis?.() ??
        (data.nextHealthCheckIn as number)
      : null;
  const nextHealthCheckIn =
    storedNext ??
    computeNextHealthCheckIn({ createdAt, healthStatus, lastHealthCheckIn });

  return {
    id,
    userId: data.userId as string,
    commonName: data.commonName as string,
    scientificName: data.scientificName as string,
    nickname: (data.nickname as string | null) ?? null,
    coverPhotoUrl: (data.coverPhotoUrl as string) ?? "",
    wateringFrequencyDays: data.wateringFrequencyDays as number,
    lastWatered: (data.lastWatered as Timestamp)?.toMillis() ?? Date.now(),
    lightRequirement: data.lightRequirement as string,
    humidityNotes: data.humidityNotes as string,
    careNotes: data.careNotes as string,
    healthNotes: (data.healthNotes as string) ?? "",
    status: (data.status as Plant["status"]) ?? "active",
    createdAt,
    healthStatus,
    lastHealthCheckIn,
    nextHealthCheckIn,
    seasonalCare: (data.seasonalCare as SeasonalCare) ?? null,
    lastSeasonalAck: (data.lastSeasonalAck as SeasonalAck) ?? null,
  };
}

export async function getUserPlants(userId: string): Promise<Plant[]> {
  const q = query(
    collection(db, "plants"),
    where("userId", "==", userId),
    where("status", "==", "active"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlant(d.id, d.data() as Record<string, unknown>));
}

export function subscribePlants(
  userId: string,
  onUpdate: (plants: Plant[]) => void
): () => void {
  const q = query(
    collection(db, "plants"),
    where("userId", "==", userId),
    where("status", "==", "active"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => toPlant(d.id, d.data() as Record<string, unknown>)));
  }, (err) => {
    console.error("[subscribePlants] Firestore error — composite index may be missing:", err);
  });
}

export async function getPlant(plantId: string): Promise<Plant | null> {
  const snap = await getDoc(doc(db, "plants", plantId));
  if (!snap.exists()) return null;
  return toPlant(snap.id, snap.data() as Record<string, unknown>);
}

export async function addPlant(
  plant: Omit<Plant, "id" | "createdAt" | "lastWatered">
): Promise<string> {
  const ref = await addDoc(collection(db, "plants"), {
    ...plant,
    lastWatered: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function logWatering(plantId: string): Promise<void> {
  const now = serverTimestamp();
  await Promise.all([
    updateDoc(doc(db, "plants", plantId), { lastWatered: now }),
    addDoc(collection(db, "plants", plantId, "careLogs"), {
      action: "watered",
      timestamp: now,
      photoUrl: null,
      note: null,
    }),
  ]);
}

export async function removePlant(plantId: string): Promise<void> {
  await updateDoc(doc(db, "plants", plantId), { status: "inactive" });
}

export async function getCareLogs(plantId: string): Promise<CareLog[]> {
  const q = query(
    collection(db, "plants", plantId, "careLogs"),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      action: data.action,
      timestamp: (data.timestamp as Timestamp)?.toMillis() ?? Date.now(),
      photoUrl: data.photoUrl ?? null,
      note: data.note ?? null,
    };
  });
}

export async function addCareLog(
  plantId: string,
  log: Omit<CareLog, "id" | "timestamp">
): Promise<void> {
  await addDoc(collection(db, "plants", plantId, "careLogs"), {
    ...log,
    timestamp: serverTimestamp(),
  });
}

/**
 * Record a completed health check-in. Updates healthNotes, healthStatus,
 * lastHealthCheckIn, and recomputes nextHealthCheckIn.
 */
export async function updateHealthCheckIn(
  plantId: string,
  opts: {
    healthNotes: string;
    healthStatus: HealthStatus;
    photoUrl: string | null;
    createdAt: number; // needed to compute next interval
  }
): Promise<void> {
  const now = Date.now();
  const nextHealthCheckIn = computeNextHealthCheckIn({
    createdAt: opts.createdAt,
    healthStatus: opts.healthStatus,
    lastHealthCheckIn: now,
  });

  await Promise.all([
    updateDoc(doc(db, "plants", plantId), {
      healthNotes: opts.healthNotes,
      healthStatus: opts.healthStatus,
      lastHealthCheckIn: serverTimestamp(),
      nextHealthCheckIn,
    }),
    addDoc(collection(db, "plants", plantId, "careLogs"), {
      action: "photo",
      timestamp: serverTimestamp(),
      photoUrl: opts.photoUrl,
      note: `Health check-in: ${opts.healthNotes}`,
    }),
  ]);
}

/**
 * Acknowledge that the user has seen the seasonal care note for the
 * current season, dismissing the badge until next season.
 */
export async function ackSeasonalNote(
  plantId: string,
  season: Season
): Promise<void> {
  await updateDoc(doc(db, "plants", plantId), {
    lastSeasonalAck: { season, year: new Date().getFullYear() },
  });
}
