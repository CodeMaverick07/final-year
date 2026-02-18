"use client";

import { useState, KeyboardEvent } from "react";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

export default function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const tag = raw.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    if (tag && !tags.includes(tag) && tags.length < 10) {
      onChange([...tags, tag]);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const newTags = text.split(/[,\s]+/).filter(Boolean);
    newTags.forEach(addTag);
    setInput("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg p-2.5 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
        >
          #{tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-accent/60 hover:text-accent"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={tags.length === 0 ? "Add tags (press Enter or comma)" : ""}
        className="min-w-[120px] flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
      />
      {tags.length > 0 && (
        <span className="text-xs text-text-muted">{tags.length}/10</span>
      )}
    </div>
  );
}
