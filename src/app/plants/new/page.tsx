"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthContext } from "@/components/ui/AuthProvider";
import { addPlant } from "@/lib/plants";
import { storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import type { GeminiPlantIdentification } from "@/types/plant";

function compressImage(dataUrl: string, maxWidth = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale  = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

type Step = "upload" | "confirm";

export default function NewPlantPage() {
  const { user } = useAuthContext();
  const router   = useRouter();

  const [step, setStep]             = useState<Step>("upload");
  const [photos, setPhotos]         = useState<string[]>([]);
  const [identifying, setIdentifying] = useState(false);
  const [identified, setIdentified] = useState<GeminiPlantIdentification | null>(null);
  const [nickname, setNickname]     = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
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
      const res  = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: base64s }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Identification failed");
      setIdentified(data as GeminiPlantIdentification);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not identify plant. Please try again.");
    } finally {
      setIdentifying(false);
    }
  }

  async function save() {
    if (!identified || !user) return;
    setSaving(true);
    setError(null);
    try {
      let coverPhotoUrl = "";
      if (photos[0]) {
        const compressed  = await compressImage(photos[0]);
        const storageRef  = ref(storage, `plants/${user.uid}/${Date.now()}_cover.jpg`);
        await uploadString(storageRef, compressed, "data_url");
        coverPhotoUrl = await getDownloadURL(storageRef);
      }

      await addPlant({
        userId:               user.uid,
        commonName:           identified.commonName,
        scientificName:       identified.scientificName,
        nickname:             nickname.trim() || null,
        coverPhotoUrl,
        wateringFrequencyDays: identified.wateringFrequencyDays,
        lightRequirement:     identified.lightRequirement,
        humidityNotes:        identified.humidityNotes,
        careNotes:            `${identified.careNotes}\n\nHealth notes: ${identified.healthNotes}`,
        status:               "active",
      });

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save plant. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink mb-6">Add a plant</h1>

      {/* ── Upload step ── */}
      {step === "upload" && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-taupe leading-relaxed">
            Upload 1–4 photos for best identification — include a full shot, close-up of leaves, and the pot.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {photos.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-sand">
                <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-white text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
            {photos.length < 4 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-taupe/50 flex flex-col items-center justify-center text-taupe hover:border-moss hover:text-moss transition-colors"
              >
                <span className="text-2xl leading-none">+</span>
                <span className="text-xs mt-1.5">Add photo</span>
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

          {error && <p className="text-sm text-terra">{error}</p>}

          <button
            onClick={identify}
            disabled={photos.length === 0 || identifying}
            className="w-full rounded-full bg-moss py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {identifying ? "Identifying…" : "Identify plant"}
          </button>
        </div>
      )}

      {/* ── Confirm step ── */}
      {step === "confirm" && identified && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl bg-parchment border border-sand p-5 flex flex-col gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">{identified.commonName}</h2>
              <p className="font-display text-sm italic text-taupe">{identified.scientificName}</p>
            </div>

            <Field label="Watering" value={`Every ${identified.wateringFrequencyDays} days`} />
            <Field label="Light"    value={identified.lightRequirement} />
            <Field label="Humidity" value={identified.humidityNotes} />
            <Field label="Care notes" value={identified.careNotes} />
            {identified.healthNotes && identified.healthNotes !== "Looks healthy" && (
              <Field label="Health observations" value={identified.healthNotes} highlight />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-taupe mb-1.5">
              Nickname (optional)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={`e.g. "Living room fern"`}
              className="w-full rounded-xl border border-sand bg-cream px-3 py-2.5 text-sm placeholder:text-taupe focus:outline-none focus:ring-2 focus:ring-moss/30"
            />
          </div>

          {error && <p className="text-sm text-terra">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => { setStep("upload"); setIdentified(null); }}
              className="flex-1 rounded-full border border-taupe py-3 text-sm font-medium text-ink hover:bg-sand transition-colors"
            >
              Re-take photos
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-full bg-moss py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
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
      <p className="text-xs font-medium uppercase tracking-wider text-taupe">{label}</p>
      <p className={`text-sm mt-0.5 leading-snug ${highlight ? "text-terra" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
