"use client";

type UploadProgressProps = {
  files: { name: string; progress: number; done: boolean; error?: string }[];
  phase?: "uploading" | "finalizing";
};

export default function UploadProgress({ files, phase = "uploading" }: UploadProgressProps) {
  const allDone = files.every((f) => f.done);
  const overallProgress = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
    : 0;
  const title = phase === "finalizing"
    ? "Preparing post..."
    : allDone
      ? "Upload complete!"
      : "Uploading...";

  return (
    <div className="space-y-3">
      {/* Overall */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-text-primary">
          {title}
        </span>
        <span className="text-text-muted">{phase === "finalizing" ? "Finalizing" : `${overallProgress}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className="upload-progress-fill h-full rounded-full"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Per-file */}
      <div className="space-y-2">
        {files.map((file, index) => (
          <div key={`${file.name}-${index}`} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-text-muted">{file.name}</p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    file.error ? "bg-like-red" : "upload-progress-fill"
                  }`}
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            </div>
            {file.done && !file.error && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {file.error && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4574A" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
