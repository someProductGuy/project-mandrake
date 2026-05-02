import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Hemisphere, User } from "@/types/plant";

export type UserPrefs = Pick<
  User,
  "photoCheckInsEnabled" | "seasonalRemindersEnabled" | "hemisphere"
>;

const DEFAULT_PREFS: UserPrefs = {
  photoCheckInsEnabled: true,
  seasonalRemindersEnabled: true,
  hemisphere: "northern",
};

export async function getUserPrefs(uid: string): Promise<UserPrefs> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return DEFAULT_PREFS;
  const data = snap.data();
  return {
    photoCheckInsEnabled: (data.photoCheckInsEnabled as boolean) ?? true,
    seasonalRemindersEnabled: (data.seasonalRemindersEnabled as boolean) ?? true,
    hemisphere: (data.hemisphere as Hemisphere) ?? "northern",
  };
}

export async function updateUserPrefs(
  uid: string,
  prefs: Partial<UserPrefs>
): Promise<void> {
  await updateDoc(doc(db, "users", uid), prefs);
}
