"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Plant, Hemisphere } from "@/types/plant";
import WateringBar from "./WateringBar";
import { isHealthCheckInDue, isSeasonalNoteDue } from "@/lib/seasons";

interface PlantTileProps {
  plant: Plant;
  onWater: (id: string) => Promise<void>;
  hemisphere: Hemisphere;
  photoCheckInsEnabled: boolean;
  seasonalRemindersEnabled: boolean;
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

/** Camera icon for health check-in badge */
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4z" />
      <path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 14.5A5.5 5.5 0 1 1 12 6.5a5.5 5.5 0 0 1 0 11z" />
    </svg>
  );
}

export default function PlantTile({
  plant,
  onWater,
  hemisphere,
  photoCheckInsEnabled,
  seasonalRemindersEnabled,
}: PlantTileProps) {
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

  const showCheckIn =
    photoCheckInsEnabled && isHealthCheckInDue(plant);

  const showSeasonal =
    seasonalRemindersEnabled &&
    isSeasonalNoteDue(plant.seasonalCare, plant.lastSeasonalAck, hemisphere);

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

        {/* Indicator badges — top-right corner */}
        {(showCheckIn || showSeasonal) && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            {showCheckIn && (
              <span
                title="Health check-in due"
                className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 border border-amber-300 shadow-sm"
              >
                <CameraIcon className="w-3.5 h-3.5 text-amber-600" />
              </span>
            )}
            {showSeasonal && (
              <span
                title="Seasonal care tip"
                className="flex items-center justify-center w-7 h-7 rounded-full bg-moss/10 border border-moss/30 shadow-sm text-sm leading-none"
              >
                🌿
              </span>
            )}
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
