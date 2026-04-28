import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

function getModel() {
  return genAI.getGenerativeModel({
    model: process.env.GOOGLE_GEMINI_MODEL_NAME ?? "gemini-1.5-pro",
  });
}

// ── Reconstruction ────────────────────────────────────────────────────────────

export async function runGeminiReconstruction(rawOcrText: string): Promise<string> {
  const model = getModel();

  const prompt = `You are an expert manuscript scholar and text restoration specialist.

The following text was extracted via OCR from a scanned manuscript. The OCR may contain:
- Missing or garbled characters (especially in damaged areas)
- Incorrect character recognition (e.g., 'l' vs '1', 'O' vs '0')  
- Missing words or line breaks
- Faded or partially illegible sections marked with [?] or gaps

Your task:
1. Reconstruct the most likely intended text using contextual inference
2. Mark any characters you are uncertain about with [?] 
3. Do NOT add content that isn't implied by the surrounding context
4. Preserve the original language, structure, and style
5. Preserve paragraph breaks and section structure
6. Return ONLY the reconstructed text — no commentary, no preamble

--- RAW OCR TEXT START ---
${rawOcrText}
--- RAW OCR TEXT END ---`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ── Translation ───────────────────────────────────────────────────────────────

export async function runGeminiTranslation(
  reconstructedText: string
): Promise<{ hindi: string; english: string }> {
  const model = getModel();

  // Single call — ask for BOTH translations in one structured response
  const prompt = `You are an expert translator specializing in historical manuscripts.

Translate the following manuscript text into BOTH Hindi and English.

Rules:
- Preserve the scholarly tone and historical register of the original
- For archaic or untranslatable terms, provide the original term with a bracketed explanation
- Preserve paragraph structure
- Return your response in this EXACT JSON format (no markdown fences, raw JSON only):

{
  "hindi": "<full Hindi translation here>",
  "english": "<full English translation here>"
}

--- SOURCE TEXT ---
${reconstructedText}
--- END SOURCE TEXT ---`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  // Strip markdown fences if model adds them despite instructions
  const cleaned = raw.replace(/^\`\`\`json\s*/i, "").replace(/\`\`\`\s*$/i, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.hindi || !parsed.english) throw new Error("Missing translation fields");
    return { hindi: parsed.hindi, english: parsed.english };
  } catch {
    // Fallback: try to extract with regex
    const hindiMatch = cleaned.match(/"hindi"\s*:\s*"([\s\S]*?)(?=",\s*"english"|"english"\s*:)/);
    const englishMatch = cleaned.match(/"english"\s*:\s*"([\s\S]*?)(?="}\s*$|$)/);
    return {
      hindi: hindiMatch?.[1]?.replace(/\\n/g, "\n") ?? "Translation unavailable",
      english: englishMatch?.[1]?.replace(/\\n/g, "\n") ?? "Translation unavailable",
    };
  }
}

// ── Audio Transcription ───────────────────────────────────────────────────────

/**
 * Transcribes an audio file (manuscript reading/recitation) using Gemini.
 * Accepts a public S3 URL. Returns raw transcript text only.
 * Feeds into the existing runGeminiReconstruction pipeline.
 */
export async function runGeminiAudioTranscription(audioUrl: string, mimeType: string): Promise<string> {
  const model = getModel();

  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`Failed to fetch audio from S3: ${audioRes.status}`);
  const audioBytes = await audioRes.arrayBuffer();
  const base64Audio = Buffer.from(audioBytes).toString("base64");

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: mimeType, // e.g. "audio/mpeg", "audio/wav", "audio/mp4"
        data: base64Audio,
      },
    },
    {
      text: `You are transcribing an audio recording related to ancient manuscripts.
The speaker may be reading, reciting, or discussing a manuscript in Sanskrit, Hindi, English, or a mix.

Rules:
- Transcribe every spoken word verbatim
- Preserve the original language — do NOT translate
- If multiple languages are mixed, preserve all of them
- Mark inaudible sections as [inaudible]
- Mark unclear words as [?]
- Preserve paragraph breaks when the speaker pauses between sections
- Return ONLY the transcription — no preamble, no commentary, no labels`,
    },
  ]);

  return result.response.text().trim();
}
