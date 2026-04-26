"use client";

import { useEffect, useState } from "react";

interface WateringBarProps {
  lastWatered: number;
  frequencyDays: number;
}

function getBarState(fill: number): { color: string; label: string } {
  if (fill > 0.5) return { color: "bg-green-500", label: "Good" };
  if (fill > 0.2) return { color: "bg-yellow-400", label: "Soon" };
  if (fill > 0) return { color: "bg-orange-500", label: "Soon" };
  return { color: "bg-red-500", label: "Water now" };
}

export default function WateringBar({ lastWatered, frequencyDays }: WateringBarProps) {
  const [fill, setFill] = useState(1);

  useEffect(() => {
    function compute() {
      const now = Date.now();
      const intervalMs = frequencyDays * 24 * 60 * 60 * 1000;
      const elapsed = now - lastWatered;
      setFill(Math.max(0, 1 - elapsed / intervalMs));
    }

    compute();
    // update every minute
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [lastWatered, frequencyDays]);

  const { color, label } = getBarState(fill);
  const pct = Math.round(fill * 100);

  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {fill <= 0 ? (
          <span className="font-semibold text-red-500">Water now</span>
        ) : (
          label
        )}
      </p>
    </div>
  );
}
