import { VideoIntelligenceServiceClient, protos } from "@google-cloud/video-intelligence";

const client = new VideoIntelligenceServiceClient();
// Uses GOOGLE_APPLICATION_CREDENTIALS automatically — same service account as Vision API

type Feature = protos.google.cloud.videointelligence.v1.Feature;

/**
 * Extracts manuscript text visible in video frames + transcribes any spoken narration.
 * Accepts a public S3 URL. Returns merged text that feeds into runGeminiReconstruction.
 */
export async function extractVideoContent(videoUrl: string): Promise<string> {
  const [operation] = await client.annotateVideo({
    inputUri: videoUrl,
    features: [
      "TEXT_DETECTION" as unknown as Feature,
      "SPEECH_TRANSCRIPTION" as unknown as Feature,
    ],
    videoContext: {
      speechTranscriptionConfig: {
        languageCode: "hi-IN",
        // Cast to any to avoid strict type checking if the type definition is outdated or incomplete
        // regarding alternativeLanguageCodes, which IS supported by the underlying API.
        alternativeLanguageCodes: ["en-IN", "sa"], 
        enableAutomaticPunctuation: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    },
  });

  // This blocks until the async GCP job completes (~30s–3min depending on video length)
  const [result] = await operation.promise();

  const annotationResults = result.annotationResults?.[0];

  // ── Visible text from manuscript pages/frames ──────────────────────────────
  const visibleTextSegments: string[] = [];
  for (const textAnnotation of annotationResults?.textAnnotations ?? []) {
    if (textAnnotation.text) {
      visibleTextSegments.push(textAnnotation.text);
    }
  }
  // Deduplicate — same text often detected across multiple frames
  const visibleText = Array.from(new Set(visibleTextSegments)).join("\n");

  // ── Spoken narration from audio track ─────────────────────────────────────
  const narrationSegments: string[] = [];
  for (const transcription of annotationResults?.speechTranscriptions ?? []) {
    const bestAlternative = transcription.alternatives?.[0];
    if (bestAlternative?.transcript) {
      narrationSegments.push(bestAlternative.transcript);
    }
  }
  const narration = narrationSegments.join(" ");

  // ── Merge both into a single text blob ────────────────────────────────────
  const parts: string[] = [];
  if (visibleText.trim()) {
    parts.push(`--- Manuscript Text (Visible in Video) ---\n${visibleText.trim()}`);
  }
  if (narration.trim()) {
    parts.push(`--- Narration (Audio Track) ---\n${narration.trim()}`);
  }

  if (parts.length === 0) throw new Error("No text or speech detected in video");

  return parts.join("\n\n");
}
