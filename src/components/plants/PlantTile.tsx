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

/** Teardrop water-drop icon */
function DropIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2C8.13 6.55 5 10.48 5 14a7 7 0 0 0 14 0c0-3.52-3.13-7.45-7-12z" />
    </svg>
  );
}

export default function PlantTile({ plant, onWater }: PlantTileProps) {
  const [watering, setWatering] = useState(false);

  async function handleWater(e: React.MouseEvent) {
    e.preventDefault();
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
      className="relative flex flex-col rounded-2xl overflow-hidden border border-sand transition-shadow hover:shadow-md bg-parchment"
    >
      {/* ── Cover photo ── */}
      <div className="relative aspect-[4/5] w-full bg-sand">
        {plant.coverPhotoUrl ? (
          <Image
            src={plant.coverPhotoUrl}
            alt={displayName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(0,0,0,0.035) 8px, rgba(0,0,0,0.035) 9px)",
            }}
          />
        )}

        {/* "WATER NOW" badge */}
        {isOverdue && (
          <div className="absolute top-2 left-2">
            <span className="rounded-full bg-terra px-2.5 py-0.5 text-white text-[10px] font-medium uppercase tracking-widest">
              Water now
            </span>
          </div>
        )}

        {/* Water-drop button */}
        <button
          onClick={handleWater}
          disabled={watering}
          aria-label={`Water ${displayName}`}
          className={`
            absolute bottom-2 right-2
            flex h-10 w-10 items-center justify-center rounded-full shadow-md
            transition-transform active:scale-90 disabled:opacity-50
            ${isOverdue ? "bg-terra text-white" : "bg-moss text-white"}
            ${watering ? "animate-pulse" : ""}
          `}
        >
          <DropIcon className="w-5 h-5" />
        </button>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col gap-1.5 p-3">
        <p className="font-display text-lg font-medium text-ink leading-tight truncate">
          {displayName}
        </p>
        <WateringBar
          lastWatered={plant.lastWatered}
          frequencyDays={plant.wateringFrequencyDays}
        />
      </div>
    </Link>
  );
}
