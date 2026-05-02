"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Hemisphere } from "@/types/plant";

export interface UserPrefsState {
  photoCheckInsEnabled: boolean;
  seasonalRemindersEnabled: boolean;
  hemisphere: Hemisphere;
  loading: boolean;
}

const DEFAULTS: Omit<UserPrefsState, "loading"> = {
  photoCheckInsEnabled: true,
  seasonalRemindersEnabled: true,
  hemisphere: "northern",
};

export function useUserPrefs(uid: string | null): UserPrefsState {
  const [state, setState] = useState<UserPrefsState>({ ...DEFAULTS, loading: true });

  useEffect(() => {
    if (!uid) {
      setState({ ...DEFAULTS, loading: false });
      return;
    }

    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (!snap.exists()) {
        setState({ ...DEFAULTS, loading: false });
        return;
      }
      const data = snap.data();
      setState({
        photoCheckInsEnabled: (data.photoCheckInsEnabled as boolean) ?? true,
        seasonalRemindersEnabled: (data.seasonalRemindersEnabled as boolean) ?? true,
        hemisphere: (data.hemisphere as Hemisphere) ?? "northern",
        loading: false,
      });
    });

    return unsub;
  }, [uid]);

  return state;
}
