"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { initiateUpload, finalizeUpload } from "@/app/actions/upload";
import VisibilityToggle from "@/components/upload/VisibilityToggle";
import TagInput from "@/components/upload/TagInput";

type RecordMode = "audio" | "video";
type Step = "mode_select" | "recording" | "review" | "metadata" | "uploading";
type RecordState = "idle" | "recording" | "paused" | "stopped";

export function RecordClient({ userId }: { userId: string }) {
  const router = useRouter();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const [step, setStep] = useState<Step>("mode_select");
  const [mode, setMode] = useState<RecordMode>("audio");
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [audioBars, setAudioBars] = useState<number[]>(new Array(32).fill(0));

  // Metadata
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Timer ───────────────────────────────────────────────────────────────────

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ── Audio visualizer ────────────────────────────────────────────────────────

  const startVisualizer = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.current = analyser;

    const draw = () => {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      setAudioBars(Array.from(data).slice(0, 32).map((v) => v / 255));
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  const stopVisualizer = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
  }, []);

  // ── Start recording ─────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setRecordError(null);
    chunksRef.current = [];
    setElapsed(0);

    try {
      const constraints = mode === "audio"
        ? { audio: true }
        : { audio: true, video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (mode === "video" && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      if (mode === "audio") {
        startVisualizer(stream);
      }

      const mimeType = mode === "audio"
        ? (MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/mp4")
        : (MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/mp4");

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        stopVisualizer();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setStep("review");
      };

      recorder.start(250);
      setRecordState("recording");

      // Start timer
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    } catch (err: any) {
      setRecordError(
        err.name === "NotAllowedError"
          ? `${mode === "audio" ? "Microphone" : "Camera/Microphone"} permission denied.`
          : `Could not access ${mode === "audio" ? "microphone" : "camera"}.`
      );
    }
  }, [mode, startVisualizer, stopVisualizer]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordState("stopped");
  }, []);

  const resetRecording = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordState("idle");
    setElapsed(0);
    setStep("recording");
    startRecording();
  }, [recordedUrl, startRecording]);

  // Auto-start recording when entering the recording step
  useEffect(() => {
    if (step === "recording" && recordState === "idle") {
      startRecording();
    }
  }, [step, recordState, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      stopVisualizer();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, []);

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!title.trim() || !recordedBlob) return;
    setStep("uploading");
    setUploadProgress(0);

    try {
      const ext = mode === "audio" ? "webm" : "webm";
      const mimeType = recordedBlob.type;
      const fileName = `recording-${Date.now()}.${ext}`;
      const file = new File([recordedBlob], fileName, { type: mimeType });

      const { postId, uploads } = await initiateUpload({
        title,
        subtitle,
        isPublic,
        tags,
        files: [{ name: fileName, type: mimeType, size: file.size }],
      });

      setUploadProgress(30);

      await fetch(uploads[0].presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": mimeType },
      });

      setUploadProgress(80);
      await finalizeUpload(postId);
      setUploadProgress(100);

      router.push(`/post/${postId}`);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed");
      setStep("metadata");
    }
  }, [title, subtitle, isPublic, tags, mode, recordedBlob, router]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="record-container">

      {/* ── Step 1: Mode Select ── */}
      {step === "mode_select" && (
        <div className="record-step">
          <h1 className="record-title">Record</h1>
          <p className="record-subtitle">What would you like to record?</p>
          <div className="record-mode-grid">
            <button
              className="record-mode-card"
              onClick={() => { setMode("audio"); setStep("recording"); }}
            >
              <span className="mode-icon">🎙️</span>
              <span className="mode-label">Audio</span>
              <span className="mode-desc">Record a reading or oral commentary</span>
            </button>
            <button
              className="record-mode-card"
              onClick={() => { setMode("video"); setStep("recording"); }}
            >
              <span className="mode-icon">🎥</span>
              <span className="mode-label">Video</span>
              <span className="mode-desc">Film a manuscript with narration</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Recording ── */}
      {step === "recording" && (
        <div className="record-step record-step--active">
          {recordError ? (
            <div className="record-error">
              <p>{recordError}</p>
              <button onClick={() => { setRecordState("idle"); startRecording(); }} className="btn-accent">Retry</button>
            </div>
          ) : (
            <>
              {mode === "video" && (
                <div className="video-preview-wrapper">
                  <video ref={videoPreviewRef} autoPlay playsInline muted className="video-preview" />
                </div>
              )}

              {mode === "audio" && (
                <div className="audio-visualizer">
                  {audioBars.map((h, i) => (
                    <div
                      key={i}
                      className="audio-bar"
                      style={{ transform: `scaleY(${Math.max(0.05, h)})` }}
                    />
                  ))}
                </div>
              )}

              <div className="record-timer">{formatTime(elapsed)}</div>

              {recordState === "recording" && (
                <div className="record-indicator">
                  <span className="rec-dot" />
                  REC
                </div>
              )}

              <div className="record-controls">
                {recordState === "recording" && (
                  <button className="stop-btn" onClick={stopRecording}>
                    ⏹ Stop
                  </button>
                )}
                <button
                  className="cancel-record-btn"
                  onClick={() => {
                    streamRef.current?.getTracks().forEach((t) => t.stop());
                    if (timerRef.current) clearInterval(timerRef.current);
                    stopVisualizer();
                    setRecordState("idle");
                    setStep("mode_select");
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === "review" && recordedUrl && (
        <div className="record-step">
          <h2 className="record-title">Review Recording</h2>
          <p className="record-meta">{formatTime(elapsed)} recorded</p>

          {mode === "audio" ? (
            <audio controls src={recordedUrl} className="audio-player" />
          ) : (
            <video controls src={recordedUrl} className="video-player" />
          )}

          <div className="review-actions">
            <button className="btn-outline" onClick={resetRecording}>⟳ Re-record</button>
            <button className="btn-accent" onClick={() => setStep("metadata")}>
              Use This Recording →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Metadata ── */}
      {step === "metadata" && (
        <div className="record-step record-step--metadata">
          <h2 className="record-title">Post Details</h2>
          {uploadError && <p className="error-msg">{uploadError}</p>}
          <div className="metadata-form">
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name this recording..."
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="What is being discussed or read?"
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
                Upload & Process →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 5: Uploading ── */}
      {step === "uploading" && (
        <div className="record-step record-step--uploading">
          <div className="upload-spinner" />
          <h2>Uploading Recording...</h2>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="upload-hint">
            {uploadProgress < 50 ? "Preparing upload..." :
             uploadProgress < 80 ? "Uploading to S3..." :
             "Queueing transcription pipeline..."}
          </p>
        </div>
      )}

    </div>
  );
}
