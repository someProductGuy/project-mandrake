import { NextRequest, NextResponse } from "next/server";
import { askAboutPlant } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { question, plantContext, recentPhotoBase64 } =
    (await req.json()) as {
      question: string;
      plantContext: string;
      recentPhotoBase64?: string;
    };

  if (!question || !plantContext) {
    return NextResponse.json(
      { error: "question and plantContext are required" },
      { status: 400 }
    );
  }

  const answer = await askAboutPlant(question, plantContext, recentPhotoBase64);
  return NextResponse.json({ answer });
}
