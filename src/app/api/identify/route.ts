import { NextRequest, NextResponse } from "next/server";
import { identifyPlant } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { photos } = (await req.json()) as { photos: string[] };

  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: "No photos provided" }, { status: 400 });
  }

  const result = await identifyPlant(photos);
  return NextResponse.json(result);
}
