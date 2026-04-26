"use client";

import type { Plant } from "@/types/plant";
import PlantTile from "./PlantTile";

interface PlantGridProps {
  plants: Plant[];
  onWater: (id: string) => Promise<void>;
}

export default function PlantGrid({ plants, onWater }: PlantGridProps) {
  if (plants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <span className="text-5xl mb-4">🪴</span>
        <p className="text-lg font-medium">No plants yet</p>
        <p className="text-sm">Add your first plant to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {plants.map((plant) => (
        <PlantTile key={plant.id} plant={plant} onWater={onWater} />
      ))}
    </div>
  );
}
