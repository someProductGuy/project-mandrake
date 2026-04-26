"use client";

import Link from "next/link";
import { useAuthContext } from "@/components/ui/AuthProvider";
import { usePlants } from "@/hooks/usePlants";
import PlantGrid from "@/components/plants/PlantGrid";
import { signInWithGoogle } from "@/lib/auth";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { plants, loading: plantsLoading, water } = usePlants(user?.uid ?? null);

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <SignInPrompt />;
  }

  if (plantsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Plants</h1>
        <Link
          href="/plants/new"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          + Add plant
        </Link>
      </div>
      <PlantGrid plants={plants} onWater={water} />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="text-6xl mb-6">🪴</span>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Demeter</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        Track watering schedules, identify your plants with AI, and keep your
        collection thriving.
      </p>
      <button
        onClick={() => signInWithGoogle()}
        className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 transition-colors"
      >
        Sign in with Google
      </button>
    </div>
  );
}
