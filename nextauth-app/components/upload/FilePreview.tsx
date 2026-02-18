"use client";

type FilePreviewProps = {
  file: File;
  onRemove: () => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getMediaBadge(type: string) {
  if (type === "application/pdf" || type === "application/x-pdf") {
    return { label: "PDF", color: "bg-amber-500/10 text-amber-400" };
  }
  if (type.startsWith("image/")) return { label: "IMAGE", color: "bg-green-500/10 text-green-400" };
  if (type.startsWith("audio/")) return { label: "AUDIO", color: "bg-blue-500/10 text-blue-400" };
  if (type.startsWith("video/")) return { label: "VIDEO", color: "bg-purple-500/10 text-purple-400" };
  return { label: "FILE", color: "bg-zinc-500/10 text-zinc-400" };
}

export default function FilePreview({ file, onRemove }: FilePreviewProps) {
  const badge = getMediaBadge(file.type);
  const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-3">
      {/* Thumbnail */}
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg">
        {previewUrl ? (
          <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
        ) : file.type === "application/pdf" || file.type === "application/x-pdf" ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.5">
            <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
            <path d="M14 2v6h6" />
            <path d="M8 14h8M8 18h6" />
          </svg>
        ) : file.type.startsWith("audio/") ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.5">
            <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.5">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
            <line x1="17" y1="17" x2="22" y2="17" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-text-muted">{formatBytes(file.size)}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-border hover:text-like-red"
        aria-label="Remove file"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
