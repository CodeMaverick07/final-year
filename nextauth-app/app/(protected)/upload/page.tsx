"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DropZone from "@/components/upload/DropZone";
import FilePreview from "@/components/upload/FilePreview";
import UploadProgress from "@/components/upload/UploadProgress";
import VisibilityToggle from "@/components/upload/VisibilityToggle";
import TagInput from "@/components/upload/TagInput";
import { initiateUpload, finalizeUpload } from "@/app/actions/upload";
import { toast } from "react-hot-toast";

type UploadFileProgress = {
  name: string;
  progress: number;
  done: boolean;
  error?: string;
};

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "finalizing">("uploading");
  const [fileProgress, setFileProgress] = useState<UploadFileProgress[]>([]);

  async function finalizeWithTimeout(postId: string, timeoutMs = 20000) {
    return Promise.race([
      finalizeUpload(postId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Finalize upload timed out")), timeoutMs)
      ),
    ]);
  }

  function navigateToPost(postId: string) {
    const href = `/post/${postId}`;
    router.replace(href);
    // Fallback to hard navigation if client-side transition stalls.
    setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname !== href) {
        window.location.assign(href);
      }
    }, 1500);
  }

  function handleFilesSelected(newFiles: File[]) {
    setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (files.length === 0) {
      toast.error("At least one file is required");
      return;
    }

    setIsUploading(true);
    setUploadPhase("uploading");
    setFileProgress(files.map((f) => ({ name: f.name, progress: 0, done: false })));

    let createdPostId: string | null = null;
    let uploadedToS3 = false;

    try {
      const result = await initiateUpload({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        isPublic,
        tags,
        files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      });
      createdPostId = result.postId;

      // Upload each file to S3 using presigned URLs
      await Promise.all(
        result.uploads.map(async (upload, index) => {
          try {
            const xhr = new XMLHttpRequest();

            // Track progress
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                setFileProgress((prev) =>
                  prev.map((fp, i) => (i === index ? { ...fp, progress: percent } : fp))
                );
              }
            };

            await new Promise<void>((resolve, reject) => {
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  setFileProgress((prev) =>
                    prev.map((fp, i) => (i === index ? { ...fp, progress: 100, done: true } : fp))
                  );
                  resolve();
                } else {
                  reject(new Error(`Upload failed: ${xhr.status}`));
                }
              };
              xhr.onerror = () => reject(new Error("Upload failed"));
              xhr.open("PUT", upload.presignedUrl);
              xhr.setRequestHeader("Content-Type", upload.contentType || files[index].type || "application/octet-stream");
              xhr.send(files[index]);
            });
          } catch (err) {
            setFileProgress((prev) =>
              prev.map((fp, i) =>
                i === index ? { ...fp, error: "Failed", done: true } : fp
              )
            );
            throw err;
          }
        })
      );
      uploadedToS3 = true;

      setUploadPhase("finalizing");
      toast.success("Manuscript uploaded successfully!");
      // Finalize post + enqueue OCR
      await finalizeWithTimeout(result.postId);
      setIsUploading(false);
      navigateToPost(result.postId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed. Please try again.";
      if (uploadedToS3 && createdPostId) {
        toast.error(`Upload finished, but queue setup failed: ${message}. Opening post...`);
        setIsUploading(false);
        navigateToPost(createdPostId);
        return;
      }
      toast.error(message);
      setIsUploading(false);
      setUploadPhase("uploading");
    }
  }

  return (
    <div className="min-h-screen bg-bg pt-16 md:pt-20">
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-text-primary">
            Upload Manuscript
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Share your manuscripts with the community
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            step === 1 ? "bg-accent text-bg" : "bg-accent/20 text-accent"
          }`}>
            1
          </div>
          <div className={`h-px w-12 ${step === 2 ? "bg-accent" : "bg-border"}`} />
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            step === 2 ? "bg-accent text-bg" : "bg-border text-text-muted"
          }`}>
            2
          </div>
        </div>

        {/* Step 1: Metadata */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Title <span className="text-like-red">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name your manuscript"
                className="h-11 w-full rounded-lg border border-border bg-bg-surface px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Subtitle
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="A short tagline (optional)"
                className="h-11 w-full rounded-lg border border-border bg-bg-surface px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                About the Manuscript
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the manuscript, its history, significance..."
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Tags
              </label>
              <TagInput tags={tags} onChange={setTags} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Visibility
              </label>
              <VisibilityToggle isPublic={isPublic} onChange={setIsPublic} />
            </div>

            <button
              onClick={() => {
                if (!title.trim()) {
                  toast.error("Title is required");
                  return;
                }
                setStep(2);
              }}
              className="h-11 w-full rounded-lg bg-accent font-medium text-bg transition-all hover:bg-accent/90"
            >
              Continue to Upload
            </button>
          </div>
        )}

        {/* Step 2: File Upload */}
        {step === 2 && (
          <div className="space-y-5">
            <button
              onClick={() => setStep(1)}
              disabled={isUploading}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to details
            </button>

            {!isUploading && (
              <>
                <DropZone onFilesSelected={handleFilesSelected} />

                {files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-text-primary">
                      {files.length} file{files.length !== 1 ? "s" : ""} selected
                    </p>
                    {files.map((file, i) => (
                      <FilePreview key={`${file.name}-${i}`} file={file} onRemove={() => removeFile(i)} />
                    ))}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={files.length === 0}
                  className="h-11 w-full rounded-lg bg-accent font-medium text-bg transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Upload Manuscript
                </button>
              </>
            )}

            {isUploading && <UploadProgress files={fileProgress} phase={uploadPhase} />}
          </div>
        )}
      </div>
    </div>
  );
}
