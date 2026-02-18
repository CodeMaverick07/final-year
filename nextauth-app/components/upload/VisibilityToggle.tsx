"use client";

type VisibilityToggleProps = {
  isPublic: boolean;
  onChange: (isPublic: boolean) => void;
};

export default function VisibilityToggle({ isPublic, onChange }: VisibilityToggleProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-surface p-4">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all ${
          isPublic
            ? "bg-accent/10 text-accent ring-1 ring-accent/30"
            : "text-text-muted hover:text-text-primary"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        Public
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all ${
          !isPublic
            ? "bg-accent/10 text-accent ring-1 ring-accent/30"
            : "text-text-muted hover:text-text-primary"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Private
      </button>
    </div>
  );
}
