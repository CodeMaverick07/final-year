"use client";

import { useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme-preference";

function resolveTheme(preference: ThemePreference) {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolveTheme(preference);
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const pref: ThemePreference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    setPreference(pref);
    applyTheme(pref);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if ((localStorage.getItem(STORAGE_KEY) ?? "system") === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  function handleChange(next: ThemePreference) {
    setPreference(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  const baseButton =
    "rounded-md px-2 py-1 text-xs transition-colors";
  const active = "bg-accent text-bg";
  const inactive =
    "text-text-muted hover:bg-bg hover:text-text-primary";

  if (compact) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-1">
        <div className="grid grid-cols-3 gap-1">
          {(["light", "dark", "system"] as ThemePreference[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleChange(option)}
              className={`${baseButton} ${
                preference === option ? active : inactive
              }`}
              aria-label={`Use ${option} theme`}
            >
              {option[0]!.toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-1">
      <div className="grid grid-cols-3 gap-1">
        {(["light", "dark", "system"] as ThemePreference[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleChange(option)}
            className={`${baseButton} ${
              preference === option ? active : inactive
            }`}
            aria-label={`Use ${option} theme`}
          >
            {option[0]!.toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
