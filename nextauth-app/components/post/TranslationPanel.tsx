"use client";

import { useState, useTransition } from "react";
import { requestTranslation } from "@/app/actions/translation";

type Props = {
  postId: string;
  initialStatus: string;
  initialHindi?: string | null;
  initialEnglish?: string | null;
};

export function TranslationPanel({
  postId,
  initialStatus,
  initialHindi,
  initialEnglish,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [hindi, setHindi] = useState(initialHindi);
  const [english, setEnglish] = useState(initialEnglish);
  const [activeTab, setActiveTab] = useState<"hindi" | "english">("english");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleTranslate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await requestTranslation(postId);
        if ("error" in result) {
          setError(result.error as string);
          return;
        }
        setHindi(result.hindi ?? null);
        setEnglish(result.english ?? null);
        setStatus("DONE");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Translation failed");
      }
    });
  }

  // ── Already translated ────────────────────────────────────────────────────
  if (status === "DONE" && (hindi || english)) {
    return (
      <div className="translation-panel">
        <div className="translation-header">
          <h3 className="font-heading text-lg font-semibold text-text-primary">
            🌐 Translations
          </h3>
          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === "english" ? "active" : ""}`}
              onClick={() => setActiveTab("english")}
            >
              English
            </button>
            <button
              className={`tab-btn ${activeTab === "hindi" ? "active" : ""}`}
              onClick={() => setActiveTab("hindi")}
            >
              हिंदी
            </button>
          </div>
        </div>
        <div className="translation-content">
          <pre className="ocr-text">
            {activeTab === "english" ? english : hindi}
          </pre>
        </div>
      </div>
    );
  }

  // ── Not yet translated ────────────────────────────────────────────────────
  return (
    <div className="translation-panel translation-panel--empty">
      <h3 className="font-heading text-lg font-semibold text-text-primary">
        🌐 Translations
      </h3>
      <p className="mt-2 text-sm text-text-muted">
        Translate this manuscript into Hindi and English using AI.
      </p>
      {error && (
        <p className="mt-2 text-sm text-like-red">{error}</p>
      )}
      <button
        onClick={handleTranslate}
        disabled={isPending}
        className="translate-btn mt-4"
      >
        {isPending ? (
          <>
            <span className="spinner" />
            Translating both languages...
          </>
        ) : (
          "🌐 Translate Manuscript"
        )}
      </button>
      <p className="translation-note">
        One click translates to both Hindi and English simultaneously. Results
        are cached — no repeated API calls.
      </p>
    </div>
  );
}
