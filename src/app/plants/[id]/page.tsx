"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPlant, getCareLogs, logWatering, removePlant, addCareLog } from "@/lib/plants";
import { storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { useAuthContext } from "@/components/ui/AuthProvider";
import WateringBar from "@/components/plants/WateringBar";
import type { Plant, CareLog } from "@/types/plant";

export default function PlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();
  const router = useRouter();

  const [plant, setPlant]   = useState<Plant | null>(null);
  const [logs, setLogs]     = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [asking, setAsking]     = useState(false);
  const [answer, setAnswer]     = useState<string | null>(null);

  const [watering, setWatering] = useState(false);
  const [removing, setRemoving] = useState(false);

  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getPlant(id), getCareLogs(id)]).then(([p, l]) => {
      setPlant(p);
      setLogs(l);
      setLoading(false);
    });
  }, [id]);

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
