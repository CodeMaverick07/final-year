"use client";

import { useEffect, useState } from "react";

// Poll the post's OCR status every 3s while PROCESSING or RECONSTRUCTING
export function OcrStatusBanner({
  postId,
  initialStatus,
}: {
  postId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (status === "DONE" || status === "FAILED") return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/posts/${postId}/ocr-status`);
      const data = await res.json();
      setStatus(data.ocrStatus);
      if (data.ocrStatus === "DONE" || data.ocrStatus === "FAILED") {
        clearInterval(interval);
        // Reload to get fresh server-rendered OCR text
        window.location.reload();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, postId]);

  const messages: Record<string, string> = {
    PENDING: "⏳ Queued for processing...",
    PROCESSING: "🔍 Extracting text from manuscript...",
    RECONSTRUCTING: "✨ Reconstructing text with AI...",
    DONE: "",
    FAILED: "❌ Processing failed.",
  };

  if (status === "DONE") return null;

  return (
    <div className="ocr-status-banner" data-status={status}>
      <span className="status-dot" />
      {messages[status] ?? "Processing..."}
    </div>
  );
}
