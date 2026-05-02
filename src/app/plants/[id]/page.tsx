"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getPlant,
  getCareLogs,
  logWatering,
  removePlant,
  addCareLog,
  updateHealthCheckIn,
  ackSeasonalNote,
} from "@/lib/plants";
import { storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { useAuthContext } from "@/components/ui/AuthProvider";
import { useUserPrefs } from "@/hooks/useUserPrefs";
import WateringBar from "@/components/plants/WateringBar";
import {
  getCurrentSeason,
  isHealthCheckInDue,
  isSeasonalNoteDue,
} from "@/lib/seasons";
import type { Plant, CareLog } from "@/types/plant";

export default function PlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();
  const router = useRouter();
  const prefs = useUserPrefs(user?.uid ?? null);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const [watering, setWatering] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Check-in flow state
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    healthNotes: string;
    healthStatus: "healthy" | "concern";
  } | null>(null);

  const photoRef = useRef<HTMLInputElement>(null);
  const checkInPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getPlant(id), getCareLogs(id)]).then(([p, l]) => {
      setPlant(p);
      setLogs(l);
      setLoading(false);
    });
  }, [id]);

  // Ack seasonal note as soon as the page loads and badge is active
  useEffect(() => {
    if (!plant || prefs.loading) return;
    if (
      prefs.seasonalRemindersEnabled &&
      isSeasonalNoteDue(plant.seasonalCare, plant.lastSeasonalAck, prefs.hemisphere)
    ) {
      const season = getCurrentSeason(prefs.hemisphere);
      ackSeasonalNote(plant.id, season).then(() => {
        setPlant((p) =>
          p
            ? {
                ...p,
                lastSeasonalAck: { season, year: new Date().getFullYear() },
              }
            : p
        );
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plant?.id, prefs.loading]);

  async function handleWater() {
    if (!plant || watering) return;
    setWatering(true);
    await logWatering(plant.id);
    const now = Date.now();
    setPlant((p) => (p ? { ...p, lastWatered: now } : p));
    setLogs((prev) => [
      { id: Date.now().toString(), action: "watered", timestamp: now, photoUrl: null, note: null },
      ...prev,
    ]);
    setWatering(false);
  }

  async function handleRemove() {
    if (!plant || !confirm(`Remove "${plant.nickname ?? plant.commonName}" from your collection?`)) return;
    setRemoving(true);
    await removePlant(plant.id);
    router.push("/");
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !plant) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const storageRef = ref(storage, `plants/${user.uid}/${plant.id}/${Date.now()}.jpg`);
      await uploadString(storageRef, dataUrl, "data_url");
      const url = await getDownloadURL(storageRef);
      await addCareLog(plant.id, { action: "photo", photoUrl: url, note: null });
      setLogs((prev) => [
        { id: Date.now().toString(), action: "photo", timestamp: Date.now(), photoUrl: url, note: null },
        ...prev,
      ]);
    };
    reader.readAsDataURL(file);
  }

  async function handleCheckInPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !plant) return;
    setCheckingIn(true);
    setCheckInResult(null);

    try {
      // Upload photos and collect base64 strings for Gemini
      const base64s: string[] = [];
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const b64 = await fileToBase64(file);
        base64s.push(b64.split(",")[1]); // strip data: prefix

        const storageRef = ref(storage, `plants/${user.uid}/${plant.id}/checkin-${Date.now()}.jpg`);
        await uploadString(storageRef, b64, "data_url");
        uploadedUrls.push(await getDownloadURL(storageRef));
      }

      // Call check-in API
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: base64s,
          commonName: plant.commonName,
          scientificName: plant.scientificName,
          previousHealthNotes: plant.healthNotes,
        }),
      });
      const data = (await res.json()) as { healthNotes: string; healthStatus: "healthy" | "concern" };

      // Persist to Firestore
      await updateHealthCheckIn(plant.id, {
        healthNotes: data.healthNotes,
        healthStatus: data.healthStatus,
        photoUrl: uploadedUrls[0] ?? null,
        createdAt: plant.createdAt,
      });

      const now = Date.now();
      setPlant((p) =>
        p
          ? { ...p, healthNotes: data.healthNotes, healthStatus: data.healthStatus, lastHealthCheckIn: now }
          : p
      );
      setCheckInResult(data);

      // Add photos to log display
      uploadedUrls.forEach((url) => {
        setLogs((prev) => [
          { id: Date.now().toString(), action: "photo", timestamp: Date.now(), photoUrl: url, note: null },
          ...prev,
        ]);
      });
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!plant || !question.trim() || asking) return;
    setAsking(true);
    setAnswer(null);

    const plantContext = `
Common name: ${plant.commonName}
Scientific name: ${plant.scientificName}
${plant.nickname ? `Nickname: ${plant.nickname}` : ""}
Watering: every ${plant.wateringFrequencyDays} days
Light: ${plant.lightRequirement}
Humidity: ${plant.humidityNotes}
Care notes: ${plant.careNotes}
    `.trim();

    const recentPhoto = logs.find((l) => l.photoUrl)?.photoUrl;

    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, plantContext, recentPhotoBase64: recentPhoto ?? undefined }),
    });
    const data = await res.json();
    setAnswer(data.answer);
    setAsking(false);
  }

  if (loading || !plant) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-moss border-t-transparent" />
      </div>
    );
  }

  const displayName = plant.nickname ?? plant.commonName;
  const checkInDue = prefs.photoCheckInsEnabled && isHealthCheckInDue(plant);
  const currentSeason = getCurrentSeason(prefs.hemisphere);
  const seasonalNote = plant.seasonalCare?.[currentSeason] ?? null;
  // Seasonal card shows if feature is on AND there's a note for this season
  const showSeasonalCard = prefs.seasonalRemindersEnabled && Boolean(seasonalNote);

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* Back */}
      <Link href="/" className="text-sm text-taupe hover:text-ink transition-colors">
        ← Back
      </Link>

      {/* Cover photo */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-sand">
        {plant.coverPhotoUrl ? (
          <Image src={plant.coverPhotoUrl} alt={displayName} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl opacity-20 select-none">🪴</div>
        )}
      </div>

      {/* Name */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink leading-tight">{displayName}</h1>
        {plant.nickname && (
          <p className="font-display text-base italic text-taupe">{plant.commonName}</p>
        )}
        <p className="font-display text-sm italic text-taupe/70">{plant.scientificName}</p>
      </div>

      {/* ── Seasonal care card ── */}
      {showSeasonalCard && (
        <div className="rounded-2xl bg-moss/5 border border-moss/20 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🌿</span>
            <p className="text-sm font-medium text-ink capitalize">{currentSeason} care tip</p>
          </div>
          <p className="text-sm text-ink/80 leading-snug">{seasonalNote}</p>
        </div>
      )}

      {/* ── Health check-in card ── */}
      {checkInDue && !checkInResult && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📷</span>
            <p className="text-sm font-medium text-ink">Time for a health check-in</p>
          </div>

          {/* Photo guidance */}
          <div className="flex flex-col gap-1 text-sm text-ink/70">
            <p className="font-medium text-ink/80 text-xs uppercase tracking-wider mb-0.5">
              Suggested angles
            </p>
            <p>• Full plant shot</p>
            <p>• Close-up of leaves (top and underside)</p>
            <p>• Soil and pot</p>
            {plant.healthStatus === "concern" && plant.healthNotes && (
              <p className="mt-1 text-amber-700 italic">
                Last time: {plant.healthNotes}
              </p>
            )}
          </div>

          <input
            ref={checkInPhotoRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={handleCheckInPhotoUpload}
          />
          <button
            onClick={() => checkInPhotoRef.current?.click()}
            disabled={checkingIn}
            className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {checkingIn ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analysing…
              </>
            ) : (
              "Take check-in photos"
            )}
          </button>
        </div>
      )}

      {/* Check-in result */}
      {checkInResult && (
        <div
          className={`rounded-2xl border p-4 flex flex-col gap-2 ${
            checkInResult.healthStatus === "concern"
              ? "bg-terra/5 border-terra/20"
              : "bg-moss/5 border-moss/20"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{checkInResult.healthStatus === "concern" ? "⚠️" : "✅"}</span>
            <p className="text-sm font-medium text-ink">
              {checkInResult.healthStatus === "concern" ? "Some concerns noted" : "Looking healthy!"}
            </p>
          </div>
          <p className="text-sm text-ink/80 leading-snug">{checkInResult.healthNotes}</p>
        </div>
      )}

      {/* Watering card */}
      <div className="rounded-2xl bg-parchment border border-sand p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Watering</p>
          <span className="text-xs text-taupe">Every {plant.wateringFrequencyDays} days</span>
        </div>
        <WateringBar lastWatered={plant.lastWatered} frequencyDays={plant.wateringFrequencyDays} />
        <button
          onClick={handleWater}
          disabled={watering}
          className="w-full rounded-xl bg-moss/10 border border-moss/20 py-2.5 text-sm font-medium text-moss hover:bg-moss/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          <span>💧</span>
          {watering ? "Logging…" : "Mark as watered"}
        </button>
      </div>

      {/* Care info */}
      <div className="rounded-2xl bg-parchment border border-sand p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-ink">Care info</p>
        <InfoRow label="Light"    value={plant.lightRequirement} />
        <InfoRow label="Humidity" value={plant.humidityNotes} />
        <InfoRow label="Notes"    value={plant.careNotes} />
        {plant.healthNotes && (
          <InfoRow label="Observations" value={plant.healthNotes} />
        )}
      </div>

      {/* Ask Gemini */}
      <div className="rounded-2xl bg-parchment border border-sand p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-ink">Ask about this plant</p>
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Why are the leaves yellowing?"
            className="flex-1 rounded-xl border border-sand bg-cream px-3 py-2 text-sm placeholder:text-taupe focus:outline-none focus:ring-2 focus:ring-moss/30"
          />
          <button
            type="submit"
            disabled={asking || !question.trim()}
            className="rounded-xl bg-moss px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {asking ? "…" : "Ask"}
          </button>
        </form>
        {answer && (
          <div className="rounded-xl bg-leaf/10 border border-leaf/20 p-3 text-sm text-ink whitespace-pre-wrap leading-relaxed">
            {answer}
          </div>
        )}
      </div>

      {/* Photo log */}
      <div className="rounded-2xl bg-parchment border border-sand p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Photo log</p>
          <button
            onClick={() => photoRef.current?.click()}
            className="text-xs text-moss hover:opacity-75 font-medium transition-opacity"
          >
            + Add photo
          </button>
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoUpload}
        />
        {logs.filter((l) => l.photoUrl).length === 0 ? (
          <p className="text-sm text-taupe">No photos yet</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {logs
              .filter((l) => l.photoUrl)
              .map((l) => (
                <div key={l.id} className="relative aspect-square rounded-xl overflow-hidden bg-sand">
                  <Image src={l.photoUrl!} alt="Plant photo" fill className="object-cover" />
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Care history */}
      <div className="rounded-2xl bg-parchment border border-sand p-4 flex flex-col gap-2">
        <p className="text-sm font-medium text-ink mb-1">Care history</p>
        {logs.length === 0 ? (
          <p className="text-sm text-taupe">No history yet</p>
        ) : (
          logs.slice(0, 10).map((l) => (
            <div key={l.id} className="flex items-center gap-3 text-sm">
              <span className="text-base">{actionEmoji(l.action)}</span>
              <span className="capitalize text-ink">{l.action}</span>
              <span className="ml-auto text-xs text-taupe">
                {new Date(l.timestamp).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Remove */}
      <button
        onClick={handleRemove}
        disabled={removing}
        className="text-sm text-terra/70 hover:text-terra text-center py-2 transition-colors"
      >
        {removing ? "Removing…" : "Remove from collection"}
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-taupe">{label}</p>
      <p className="text-sm text-ink mt-0.5 leading-snug">{value}</p>
    </div>
  );
}

function actionEmoji(action: CareLog["action"]) {
  const map: Record<CareLog["action"], string> = {
    watered:    "💧",
    fertilized: "🌱",
    repotted:   "🪴",
    photo:      "📷",
    note:       "📝",
  };
  return map[action] ?? "•";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
