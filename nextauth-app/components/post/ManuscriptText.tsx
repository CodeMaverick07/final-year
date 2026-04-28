"use client";

import { useState } from "react";

type Props = {
  rawOcrText?: string | null;
  reconstructedText?: string | null;
};

export function ManuscriptText({ rawOcrText, reconstructedText }: Props) {
  const [activeTab, setActiveTab] = useState<"reconstructed" | "raw">(
    reconstructedText ? "reconstructed" : "raw"
  );
  const [copied, setCopied] = useState(false);

  if (!rawOcrText && !reconstructedText) return null;

  const currentText =
    activeTab === "reconstructed" ? reconstructedText : rawOcrText;

  function handleCopy() {
    navigator.clipboard.writeText(currentText ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="manuscript-text">
      <div className="manuscript-header">
        <h3 className="font-heading text-lg font-semibold text-text-primary">
          📜 Manuscript Text
        </h3>
        <div className="tab-bar">
          {reconstructedText && (
            <button
              className={`tab-btn ${activeTab === "reconstructed" ? "active" : ""}`}
              onClick={() => setActiveTab("reconstructed")}
            >
              ✨ Reconstructed
            </button>
          )}
          {rawOcrText && (
            <button
              className={`tab-btn ${activeTab === "raw" ? "active" : ""}`}
              onClick={() => setActiveTab("raw")}
            >
              Raw Extract
            </button>
          )}
        </div>
      </div>
      <div className="manuscript-body">
        <pre className="ocr-text">{currentText}</pre>
      </div>
      <button className="copy-btn" onClick={handleCopy}>
        {copied ? "✓ Copied!" : "📋 Copy text"}
      </button>
    </div>
  );
}
