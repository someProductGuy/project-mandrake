"use client";

import Image from "next/image";
import Link from "next/link";
import type { Plant } from "@/types/plant";
import PlantTile from "./PlantTile";

interface PlantGridProps {
  plants: Plant[];
  onWater: (id: string) => Promise<void>;
}

export default function PlantGrid({ plants, onWater }: PlantGridProps) {
  if (plants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <Image
          src="/logomark-moss.svg"
          alt=""
          width={64}
          height={53}
          className="mb-6 opacity-10 select-none"
          aria-hidden
        />
        <p className="text-sm text-taupe max-w-[220px] leading-relaxed">
          Your plants will appear here. Add one to get started.
        </p>
        <Link
          href="/plants/new"
          className="mt-6 rounded-full bg-moss px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          + Add your first plant
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {plants.map((plant) => (
        <PlantTile key={plant.id} plant={plant} onWater={onWater} />
      ))}
    </div>
  );
}
