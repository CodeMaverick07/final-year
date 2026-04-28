"use client";

import { useEffect, useState } from "react";

type StatusData = {
  ocrStatus: string;
  job?: {
    status: string;
    attempts: number;
    maxAttempts: number;
    nextRetryAt?: string;
  } | null;
};

export function OcrStatusBanner({ postId, initialStatus }: { postId: string; initialStatus: string }) {
  const [data, setData] = useState<StatusData>({ ocrStatus: initialStatus });

  useEffect(() => {
    const status = data.ocrStatus;
    if (status === "DONE" || status === "FAILED") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/ocr-status`);
        if (!res.ok) return;

        const body = await res.text();
        if (!body) return;

        const json = JSON.parse(body) as StatusData;
        setData(json);
        if (json.ocrStatus === "DONE" || json.ocrStatus === "FAILED") {
          clearInterval(interval);
          if (json.ocrStatus === "DONE") window.location.reload();
        }
      } catch {
        // Ignore transient polling/parse errors and retry on next interval tick.
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [data.ocrStatus, postId]);

  if (data.ocrStatus === "DONE") return null;

  const { job } = data;
  const isWaitingForCron = data.ocrStatus === "PENDING" || job?.status === "PENDING";
  const isRetrying = !!job && job.attempts > 1;

  const getMessage = () => {
    if (data.ocrStatus === "FAILED") return "❌ Processing failed after multiple attempts.";
    if (data.ocrStatus === "RECONSTRUCTING") return "✨ AI is reconstructing the manuscript text...";
    if (data.ocrStatus === "PROCESSING") return "🔍 Extracting text from manuscript...";
    if (isRetrying) return `⟳ Retrying... (attempt ${job!.attempts}/${job!.maxAttempts})`;
    if (isWaitingForCron) return "⏳ Queued for processing — this happens in the background.";
    return "⏳ Processing...";
  };

  return (
    <div className="ocr-status-banner" data-status={data.ocrStatus}>
      <span className="status-dot" />
      <span>{getMessage()}</span>
      {isWaitingForCron && (
        <span className="banner-hint">You can close this page — we&apos;ll keep processing.</span>
      )}
    </div>
  );
}
