"use client";

import { useState, useEffect } from "react";
import { subscribePlants, logWatering, removePlant } from "@/lib/plants";
import type { Plant } from "@/types/plant";

export function usePlants(userId: string | null) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPlants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribePlants(userId, (results) => {
      setPlants(results);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  async function water(plantId: string) {
    await logWatering(plantId);
    const now = Date.now();
    setPlants((prev) =>
      prev.map((p) => (p.id === plantId ? { ...p, lastWatered: now } : p))
    );
  }

  async function remove(plantId: string) {
    await removePlant(plantId);
    setPlants((prev) => prev.filter((p) => p.id !== plantId));
  }

  function addOptimistic(plant: Plant) {
    setPlants((prev) => [plant, ...prev]);
  }

  return { plants, loading, water, remove, addOptimistic };
}
