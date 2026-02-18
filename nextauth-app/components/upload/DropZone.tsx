"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

type DropZoneProps = {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
};

export default function DropZone({ onFilesSelected, disabled = false }: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesSelected(acceptedFiles);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "audio/*": [],
      "video/*": [],
    },
    disabled,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone-border flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl p-8 transition-all ${
        isDragActive ? "active" : ""
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input {...getInputProps()} />
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isDragActive ? "#C9A96E" : "#7A7570"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-4 transition-colors"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      {isDragActive ? (
        <p className="text-sm font-medium text-accent">Drop your files here...</p>
      ) : (
        <>
          <p className="text-sm font-medium text-text-primary">
            Drag & drop files here, or <span className="text-accent underline">browse</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Images, audio recordings, and video clips
          </p>
        </>
      )}
    </div>
  );
}
