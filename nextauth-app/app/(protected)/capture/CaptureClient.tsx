"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import imageCompression from "browser-image-compression";
import { initiateUpload, finalizeUpload } from "@/app/actions/upload";
import VisibilityToggle from "@/components/upload/VisibilityToggle";
import TagInput from "@/components/upload/TagInput";

type CaptureMode = "single" | "multiple";
type Step = "mode_select" | "capture" | "review" | "metadata" | "uploading";

interface CapturedPhoto {
  dataUrl: string;
  blob: Blob;
}

export function CaptureClient({ userId }: { userId: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("mode_select");
  const [mode, setMode] = useState<CaptureMode>("single");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // Metadata state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Camera lifecycle ────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : "Could not access camera. Please check your device."
      );
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (step === "capture") startCamera();
    return () => { if (step === "capture") stopCamera(); };
  }, [step, startCamera, stopCamera]);

  // Restart camera when facingMode changes
  useEffect(() => {
    if (step === "capture") startCamera();
  }, [facingMode]);

  // ── Capture photo ───────────────────────────────────────────────────────────

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Convert to blob for upload
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    // Compress if large
    const compressedBlob = await imageCompression(blob as File, {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    });

    const photo: CapturedPhoto = { dataUrl, blob: compressedBlob };

    if (mode === "single") {
      setPhotos([photo]);
      stopCamera();
      setStep("review");
    } else {
      // Multiple mode — add to array, stay on capture step
      setPhotos((prev) => [...prev, photo]);
    }
  }, [mode, stopCamera]);

  // ── Retake / navigation ─────────────────────────────────────────────────────

  const retakePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setStep("capture");
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // When in multiple mode, user clicks "Done Capturing" button
  const finishCapturing = useCallback(() => {
    stopCamera();
    setStep("review");
  }, [stopCamera]);

  // ── PDF generation (multiple mode only) ────────────────────────────────────

  const generatePdf = useCallback(async (): Promise<File> => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < photos.length; i++) {
      if (i > 0) pdf.addPage();
      // Fit image to A4 maintaining aspect ratio
      const img = new Image();
      img.src = photos[i].dataUrl;
      await new Promise((r) => { img.onload = r; });

      const imgRatio = img.width / img.height;
      const pageRatio = pageWidth / pageHeight;
      let drawW = pageWidth, drawH = pageHeight;

      if (imgRatio > pageRatio) {
        drawH = pageWidth / imgRatio;
      } else {
        drawW = pageHeight * imgRatio;
      }

      const x = (pageWidth - drawW) / 2;
      const y = (pageHeight - drawH) / 2;

      pdf.addImage(photos[i].dataUrl, "JPEG", x, y, drawW, drawH);
    }

    const pdfBlob = pdf.output("blob");
    return new File([pdfBlob], `capture-${Date.now()}.pdf`, { type: "application/pdf" });
  }, [photos]);

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!title.trim()) return;
    setStep("uploading");
    setUploadProgress(0);

    try {
      let fileToUpload: File;
      let fileMeta: { name: string; type: string; size: number };

      if (mode === "single") {
        fileToUpload = new File([photos[0].blob], `capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
      } else {
        fileToUpload = await generatePdf();
      }

      fileMeta = { name: fileToUpload.name, type: fileToUpload.type, size: fileToUpload.size };

      // Initiate upload — get presigned URL
      const { postId, uploads } = await initiateUpload({
        title,
        subtitle,
        isPublic,
        tags,
        files: [fileMeta],
      });

      setUploadProgress(30);

      // Upload directly to S3
      await fetch(uploads[0].presignedUrl, {
        method: "PUT",
        body: fileToUpload,
        headers: { "Content-Type": fileToUpload.type },
      });

      setUploadProgress(80);

      // Finalize — trigger OCR pipeline
      await finalizeUpload(postId);

      setUploadProgress(100);
      router.push(`/post/${postId}`);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed");
      setStep("metadata");
    }
  }, [title, subtitle, isPublic, tags, mode, photos, generatePdf, router]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="capture-container">

      {/* ── Step 1: Mode Select ── */}
      {step === "mode_select" && (
        <div className="capture-step">
          <h1 className="capture-title">Capture Manuscript</h1>
          <p className="capture-subtitle">How would you like to capture?</p>
          <div className="capture-mode-grid">
            <button
              className="capture-mode-card"
              onClick={() => { setMode("single"); setStep("capture"); }}
            >
              <span className="mode-icon">📷</span>
              <span className="mode-label">Single Photo</span>
              <span className="mode-desc">Capture one page or image</span>
            </button>
            <button
              className="capture-mode-card"
              onClick={() => { setMode("multiple"); setStep("capture"); }}
            >
              <span className="mode-icon">📚</span>
              <span className="mode-label">Multiple Pages</span>
              <span className="mode-desc">Capture multiple pages — saved as PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Capture ── */}
      {step === "capture" && (
        <div className="capture-step capture-step--camera">
          {cameraError ? (
            <div className="camera-error">
              <p>{cameraError}</p>
              <button onClick={startCamera} className="btn-accent">Retry</button>
            </div>
          ) : (
            <>
              <div className="viewfinder">
                <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />
                {/* Manuscript alignment guide overlay */}
                <div className="capture-guide">
                  <div className="guide-corner guide-corner--tl" />
                  <div className="guide-corner guide-corner--tr" />
                  <div className="guide-corner guide-corner--bl" />
                  <div className="guide-corner guide-corner--br" />
                </div>
                {mode === "multiple" && (
                  <div className="photo-count-badge">{photos.length} captured</div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="capture-controls">
                <button
                  className="flip-camera-btn"
                  onClick={() => setFacingMode((f) => f === "environment" ? "user" : "environment")}
                  title="Flip camera"
                >
                  🔄
                </button>
                <button className="shutter-btn" onClick={capturePhoto} />
                {mode === "multiple" && photos.length > 0 && (
                  <button className="done-capture-btn" onClick={finishCapturing}>
                    Done ({photos.length})
                  </button>
                )}
                {mode === "single" && (
                  <button className="cancel-btn" onClick={() => { stopCamera(); setStep("mode_select"); }}>
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === "review" && (
        <div className="capture-step">
          <h2 className="capture-title">
            {mode === "single" ? "Review Photo" : `Review ${photos.length} Pages`}
          </h2>
          {mode === "single" ? (
            <div className="review-single">
              <img src={photos[0]?.dataUrl} alt="Captured" className="review-image" />
              <div className="review-actions">
                <button className="btn-outline" onClick={() => { setPhotos([]); setStep("capture"); }}>
                  Retake
                </button>
                <button className="btn-accent" onClick={() => setStep("metadata")}>
                  Use This Photo →
                </button>
              </div>
            </div>
          ) : (
            <div className="review-multiple">
              <div className="photo-strip">
                {photos.map((p, i) => (
                  <div key={i} className="photo-strip-item">
                    <span className="page-number">{i + 1}</span>
                    <img src={p.dataUrl} alt={`Page ${i + 1}`} className="strip-thumb" />
                    <button className="remove-photo-btn" onClick={() => removePhoto(i)}>✕</button>
                  </div>
                ))}
                <button className="add-more-btn" onClick={() => setStep("capture")}>
                  + Add More
                </button>
              </div>
              <p className="pdf-notice">📄 These {photos.length} pages will be combined into a single PDF</p>
              <div className="review-actions">
                <button className="btn-outline" onClick={() => { setPhotos([]); setStep("capture"); }}>
                  Start Over
                </button>
                <button
                  className="btn-accent"
                  onClick={() => setStep("metadata")}
                  disabled={photos.length === 0}
                >
                  Continue ({photos.length} pages) →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Metadata ── */}
      {step === "metadata" && (
        <div className="capture-step capture-step--metadata">
          <h2 className="capture-title">Post Details</h2>
          {uploadError && <p className="error-msg">{uploadError}</p>}
          <div className="metadata-form">
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name this manuscript..."
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="A brief description..."
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Tags</label>
              <TagInput tags={tags} onChange={setTags} />
            </div>
            <div className="form-group">
              <label>Visibility</label>
              <VisibilityToggle isPublic={isPublic} onChange={setIsPublic} />
            </div>
            <div className="metadata-actions">
              <button className="btn-outline" onClick={() => setStep("review")}>← Back</button>
              <button
                className="btn-accent"
                onClick={handleUpload}
                disabled={!title.trim()}
              >
                Upload & Digitize →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 5: Uploading ── */}
      {step === "uploading" && (
        <div className="capture-step capture-step--uploading">
          <div className="upload-spinner" />
          <h2>Uploading...</h2>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="upload-hint">
            {uploadProgress < 50 ? "Preparing upload..." :
             uploadProgress < 80 ? "Uploading to S3..." :
             "Queueing OCR pipeline..."}
          </p>
        </div>
      )}

    </div>
  );
}
