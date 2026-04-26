import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Plant, CareLog } from "@/types/plant";

function toPlant(id: string, data: Record<string, unknown>): Plant {
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
    status: (data.status as Plant["status"]) ?? "active",
    createdAt: (data.createdAt as Timestamp)?.toMillis() ?? Date.now(),
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
