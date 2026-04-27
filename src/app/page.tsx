"use client";

import Image from "next/image";
import { useAuthContext } from "@/components/ui/AuthProvider";
import { usePlants } from "@/hooks/usePlants";
import PlantGrid from "@/components/plants/PlantGrid";
import { signInWithGoogle } from "@/lib/auth";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { plants, loading: plantsLoading, water } = usePlants(user?.uid ?? null);

  if (authLoading) return <LoadingSpinner />;
  if (!user) return <SignInPrompt />;
  if (plantsLoading) return <LoadingSpinner />;

  const overdueCount = plants.filter(
    (p) => Date.now() - p.lastWatered > p.wateringFrequencyDays * 86_400_000
  ).length;

  return (
    <div>
      {overdueCount > 0 && (
        <p className="mb-5 text-sm text-terra font-medium">
          {overdueCount} {overdueCount === 1 ? "plant needs" : "plants need"} water today
        </p>
      )}
      {overdueCount === 0 && plants.length > 0 && (
        <p className="mb-5 text-sm text-taupe">All plants are happy</p>
      )}

      <PlantGrid plants={plants} onWater={water} />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-moss border-t-transparent" />
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Image
          src="/logomark-moss.svg"
          alt="Demeter"
          width={52}
          height={43}
          className="mb-5"
        />
      <h1 className="font-display text-5xl font-semibold text-ink mb-3">Demeter</h1>
      <p className="text-taupe mb-8 max-w-xs text-sm leading-relaxed">
        Track watering schedules, identify your plants with AI, and keep your
        collection thriving.
      </p>
      <button
        onClick={() => signInWithGoogle()}
        className="rounded-full bg-moss px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Sign in with Google
      </button>
    </div>
  );
}
