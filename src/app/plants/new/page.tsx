"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthContext } from "@/components/ui/AuthProvider";
import { addPlant } from "@/lib/plants";
import { storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import type { GeminiPlantIdentification } from "@/types/plant";

type Step = "upload" | "confirm";

export default function NewPlantPage() {
  const { user } = useAuthContext();
  const router = useRouter();

  const [step, setStep] = useState<Step>("upload");
  const [photos, setPhotos] = useState<string[]>([]); // base64 data URLs
  const [identifying, setIdentifying] = useState(false);
  const [identified, setIdentified] = useState<GeminiPlantIdentification | null>(null);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    const readers = files.map(
      (f) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(f);
        })
    );
    Promise.all(readers).then((results) => {
      setPhotos((prev) => [...prev, ...results].slice(0, 4));
    });
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function identify() {
    if (photos.length === 0) return;
    setIdentifying(true);
    setError(null);
    try {
      const base64s = photos.map((p) => p.split(",")[1]);
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: base64s }),
      });
      if (!res.ok) throw new Error("Identification failed");
      const data: GeminiPlantIdentification = await res.json();
      setIdentified(data);
      setStep("confirm");
    } catch {
      setError("Could not identify plant. Please try again.");
    } finally {
      setIdentifying(false);
    }
  }

  async function save() {
    if (!identified || !user) return;
    setSaving(true);
    setError(null);
    try {
      // upload cover photo to Firebase Storage
      let coverPhotoUrl = "";
      if (photos[0]) {
        const storageRef = ref(
          storage,
          `plants/${user.uid}/${Date.now()}_cover.jpg`
        );
        await uploadString(storageRef, photos[0], "data_url");
        coverPhotoUrl = await getDownloadURL(storageRef);
      }

      const plantId = await addPlant({
        userId: user.uid,
        commonName: identified.commonName,
        scientificName: identified.scientificName,
        nickname: nickname.trim() || null,
        coverPhotoUrl,
        wateringFrequencyDays: identified.wateringFrequencyDays,
        lightRequirement: identified.lightRequirement,
        humidityNotes: identified.humidityNotes,
        careNotes: `${identified.careNotes}\n\nHealth notes: ${identified.healthNotes}`,
        status: "active",
      });

      router.push(`/plants/${plantId}`);
    } catch {
      setError("Could not save plant. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add a new plant</h1>

      {step === "upload" && (
        <div className="flex flex-col gap-6">
          <p className="text-gray-600 text-sm">
            Upload 1–4 photos for best identification. Include a full shot, close-up of leaves, and the pot.
          </p>

          {/* Photo grid */}
          <div className="grid grid-cols-2 gap-3">
            {photos.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
            {photos.length < 4 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-green-400 hover:text-green-500 transition-colors"
              >
                <span className="text-2xl">+</span>
                <span className="text-xs mt-1">Add photo</span>
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={onFilesSelected}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={identify}
            disabled={photos.length === 0 || identifying}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {identifying ? "Identifying…" : "Identify plant"}
          </button>
        </div>
      )}

      {step === "confirm" && identified && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{identified.commonName}</h2>
              <p className="text-sm text-gray-500 italic">{identified.scientificName}</p>
            </div>

            <Field label="Watering" value={`Every ${identified.wateringFrequencyDays} days`} />
            <Field label="Light" value={identified.lightRequirement} />
            <Field label="Humidity" value={identified.humidityNotes} />
            <Field label="Care notes" value={identified.careNotes} />
            {identified.healthNotes && identified.healthNotes !== "Looks healthy" && (
              <Field label="Health observations" value={identified.healthNotes} highlight />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nickname (optional)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={`e.g. "Living room fern"`}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => { setStep("upload"); setIdentified(null); }}
              className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Re-take photos
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Add to my plants"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-sm mt-0.5 ${highlight ? "text-orange-600" : "text-gray-700"}`}>
        {value}
      </p>
    </div>
  );
}
