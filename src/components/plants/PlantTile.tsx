"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Plant } from "@/types/plant";
import WateringBar from "./WateringBar";

interface PlantTileProps {
  plant: Plant;
  onWater: (id: string) => Promise<void>;
}

export default function PlantTile({ plant, onWater }: PlantTileProps) {
  const [watering, setWatering] = useState(false);

  async function handleWater(e: React.MouseEvent) {
    e.preventDefault(); // don't navigate to detail
    if (watering) return;
    setWatering(true);
    await onWater(plant.id);
    setWatering(false);
  }

  const displayName = plant.nickname ?? plant.commonName;
  const isOverdue =
    Date.now() - plant.lastWatered > plant.wateringFrequencyDays * 86_400_000;

  return (
    <Link
      href={`/plants/${plant.id}`}
      className={`relative flex flex-col rounded-2xl overflow-hidden shadow-sm border transition-shadow hover:shadow-md ${
        isOverdue ? "border-red-300 ring-1 ring-red-300" : "border-gray-200"
      } bg-white`}
    >
      {/* Cover photo */}
      <div className="relative aspect-square w-full bg-gray-100">
        {plant.coverPhotoUrl ? (
          <Image
            src={plant.coverPhotoUrl}
            alt={displayName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">
            🪴
          </div>
        )}

        {/* Water button */}
        <button
          onClick={handleWater}
          disabled={watering}
          aria-label={`Water ${displayName}`}
          className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-transform active:scale-90 disabled:opacity-50"
        >
          <span className={`text-xl ${watering ? "animate-pulse" : ""}`}>
            💧
          </span>
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-3">
        <div>
          <p className="font-semibold text-gray-900 leading-tight truncate">
            {displayName}
          </p>
          {plant.nickname && (
            <p className="text-xs text-gray-500 italic truncate">
              {plant.commonName}
            </p>
          )}
        </div>
        <WateringBar
          lastWatered={plant.lastWatered}
          frequencyDays={plant.wateringFrequencyDays}
        />
      </div>
    </Link>
  );
}
