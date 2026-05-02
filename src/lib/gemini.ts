import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import type { GeminiPlantIdentification, GeminiHealthCheckIn } from "@/types/plant";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const IDENTIFY_PROMPT = `You are a houseplant expert. Analyze these photos of a houseplant and respond with a JSON object (no markdown, just raw JSON) with exactly these fields:
{
  "commonName": "string",
  "scientificName": "string",
  "wateringFrequencyDays": number,
  "lightRequirement": "string (e.g. bright indirect, low light, full sun)",
  "humidityNotes": "string",
  "careNotes": "string (general care advice for this species)",
  "healthNotes": "string (any visible health concerns in these specific photos, or 'Looks healthy' if none)",
  "seasonalCare": {
    "spring": "string or null (care changes in spring, e.g. 'Begin fertilizing monthly; increase watering to every 7 days'. null if no change needed)",
    "summer": "string or null",
    "fall":   "string or null",
    "winter": "string or null"
  }
}
For seasonalCare, use null for any season where care does not meaningfully change from the baseline. Many low-maintenance plants will have mostly null values.`;

export async function identifyPlant(
  photoBase64s: string[]
): Promise<GeminiPlantIdentification> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const parts: Part[] = [
    { text: IDENTIFY_PROMPT },
    ...photoBase64s.map((b64) => ({
      inlineData: { mimeType: "image/jpeg" as const, data: b64 },
    })),
  ];

  const result = await model.generateContent(parts);
  const raw = result.response.text().trim();
  // Gemini sometimes wraps JSON in markdown fences despite instructions
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(text) as GeminiPlantIdentification;
}

export async function checkInPlant(
  photoBase64s: string[],
  plantContext: { commonName: string; scientificName: string; previousHealthNotes: string }
): Promise<GeminiHealthCheckIn> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a houseplant expert doing a health check-in on a ${plantContext.commonName} (${plantContext.scientificName}).

Previous observation: ${plantContext.previousHealthNotes}

Please analyze these new photos and respond with a JSON object (no markdown, just raw JSON):
{
  "healthNotes": "string (describe what you observe — leaf colour and texture, soil condition, overall vitality, any new concerns or improvements since last check)",
  "healthStatus": "healthy" or "concern",
  "bestPhotoIndex": number (0-based index of the photo that would make the best cover photo — best framing, clearest view of the whole plant, good lighting)
}
Use "concern" if you see yellowing, wilting, pests, root issues, or any other problem that warrants attention. Use "healthy" if the plant looks good.`;

  const parts: Part[] = [
    { text: prompt },
    ...photoBase64s.map((b64) => ({
      inlineData: { mimeType: "image/jpeg" as const, data: b64 },
    })),
  ];

  const result = await model.generateContent(parts);
  const raw = result.response.text().trim();
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(text) as GeminiHealthCheckIn;
}

export async function askAboutPlant(
  question: string,
  plantContext: string,
  recentPhotoUrl?: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemContext = `You are a helpful houseplant expert. The user is asking about their specific plant. Here is what we know about it:\n\n${plantContext}\n\nAnswer helpfully and concisely.`;

  const parts: Part[] = recentPhotoUrl
    ? [
        { text: systemContext },
        { text: question },
      ]
    : [{ text: `${systemContext}\n\nQuestion: ${question}` }];

  const result = await model.generateContent(parts);
  return result.response.text();
}
