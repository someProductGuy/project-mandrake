"use client";

import { useEffect, useState } from "react";

interface WateringBarProps {
  lastWatered: number;
  frequencyDays: number;
}

function barColor(fill: number): string {
  if (fill > 0.3) return "bg-leaf";
  if (fill > 0)   return "bg-gold";
  return "bg-terra";
}

export default function WateringBar({ lastWatered, frequencyDays }: WateringBarProps) {
  const [fill, setFill]         = useState(1);
  const [daysLeft, setDaysLeft] = useState(frequencyDays);

  useEffect(() => {
    function compute() {
      const now        = Date.now();
      const intervalMs = frequencyDays * 86_400_000;
      const remaining  = lastWatered + intervalMs - now;
      setFill(Math.max(0, remaining / intervalMs));
      setDaysLeft(Math.ceil(remaining / 86_400_000));
    }
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [lastWatered, frequencyDays]);

  const isOverdue = daysLeft <= 0;
  const pct       = Math.round(fill * 100);

  return (
    <div className="w-full">
      {/* Track */}
      <div className="h-1 w-full rounded-full bg-sand overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor(fill)}`}
          style={{ width: `${isOverdue ? 4 : pct}%` }}
        />
      </div>
      {/* Label */}
      <p className="mt-1 text-xs">
        {isOverdue ? (
          <span className="text-terra font-medium">Overdue</span>
        ) : (
          <span className="text-taupe">{daysLeft}d</span>
        )}
      </p>
    </div>
  );
}
