"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthContext } from "@/components/ui/AuthProvider";
import { useUserPrefs } from "@/hooks/useUserPrefs";
import { updateUserPrefs } from "@/lib/userPrefs";
import type { Hemisphere } from "@/types/plant";

const HEMISPHERE_LABELS: Record<Hemisphere, string> = {
  northern: "Northern hemisphere",
  southern: "Southern hemisphere",
  tropical: "Tropical / near equator",
};

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuthContext();
  const prefs = useUserPrefs(user?.uid ?? null);

  const [photoCheckIns, setPhotoCheckIns] = useState(true);
  const [seasonalReminders, setSeasonalReminders] = useState(true);
  const [hemisphere, setHemisphere] = useState<Hemisphere>("northern");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync local state once prefs load
  useEffect(() => {
    if (!prefs.loading) {
      setPhotoCheckIns(prefs.photoCheckInsEnabled);
      setSeasonalReminders(prefs.seasonalRemindersEnabled);
      setHemisphere(prefs.hemisphere);
    }
  }, [prefs.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    await updateUserPrefs(user.uid, {
      photoCheckInsEnabled: photoCheckIns,
      seasonalRemindersEnabled: seasonalReminders,
      hemisphere,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (authLoading || prefs.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-moss border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-center text-sm text-taupe py-16">
        Sign in to manage your settings.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-16 max-w-lg">
      <Link href="/" className="text-sm text-taupe hover:text-ink transition-colors">
        ← Back
      </Link>

      <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>

      {/* Tile reminders section */}
      <section className="rounded-2xl bg-parchment border border-sand p-4 flex flex-col gap-4">
        <p className="text-sm font-medium text-ink">Tile reminders</p>

        <ToggleRow
          label="Health check-in reminders"
          description="Show a 📷 badge on tiles when it's time to photograph a plant for a Gemini health review."
          checked={photoCheckIns}
          onChange={setPhotoCheckIns}
        />

        <ToggleRow
          label="Seasonal care tips"
          description="Show a 🌿 badge on tiles when a plant has care advice for the current season."
          checked={seasonalReminders}
          onChange={setSeasonalReminders}
        />
      </section>

      {/* Hemisphere */}
      <section className="rounded-2xl bg-parchment border border-sand p-4 flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Your location</p>
          <p className="text-xs text-taupe mt-0.5">
            Used to determine which season you're in. Auto-detected from your
            timezone but you can correct it here.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {(["northern", "southern", "tropical"] as Hemisphere[]).map((h) => (
            <label key={h} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="hemisphere"
                value={h}
                checked={hemisphere === h}
                onChange={() => setHemisphere(h)}
                className="accent-moss w-4 h-4"
              />
              <span className="text-sm text-ink">{HEMISPHERE_LABELS[h]}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded-full bg-moss px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm text-ink">{label}</p>
        <p className="text-xs text-taupe mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 flex-shrink-0 h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-moss" : "bg-sand"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}
