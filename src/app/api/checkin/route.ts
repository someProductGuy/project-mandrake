import { NextRequest, NextResponse } from "next/server";
import { checkInPlant } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { photos, commonName, scientificName, previousHealthNotes } =
    (await req.json()) as {
      photos: string[];
      commonName: string;
      scientificName: string;
      previousHealthNotes: string;
    };

  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: "No photos provided" }, { status: 400 });
  }

  try {
    const result = await checkInPlant(photos, {
      commonName,
      scientificName,
      previousHealthNotes,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[checkin] Gemini error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
