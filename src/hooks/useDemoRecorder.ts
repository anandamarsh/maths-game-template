// src/hooks/useDemoRecorder.ts — Records a demo video of autopilot gameplay with intro slides

import { useCallback, useRef, useState } from "react";

export type RecordingPhase = "idle" | "requesting" | "intro" | "playing" | "stopping";

interface UseDemoRecorderReturn {
  /** Current phase of the recording flow */
  recordingPhase: RecordingPhase;
  /** Start the recording flow (requests tab capture, then shows intro) */
  startRecording: () => void;
  /** Called when intro slides finish — starts autopilot gameplay */
  onIntroComplete: () => void;
  /** Stop recording and download the video */
  stopRecording: () => void;
  /** Whether recording is active (intro or playing) */
  isRecording: boolean;
}

export function useDemoRecorder(callbacks: {
  onStartPlaying: () => void;
  ensureUnmuted: () => void;
}): UseDemoRecorderReturn {
  const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    if (recordingPhase !== "idle") return;
    setRecordingPhase("requesting");

    try {
      // Request tab capture with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
        // @ts-expect-error — preferCurrentTab is a newer Chrome API
        preferCurrentTab: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Use VP9+Opus for good quality, fall back to VP8
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5_000_000, // 5 Mbps for good quality
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        downloadBlob(blob);
        cleanup();
      };

      // If user stops sharing via browser UI
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
        setRecordingPhase("idle");
      });

      recorderRef.current = recorder;
      recorder.start(1000); // collect data every second

      // Ensure game audio is on for the recording
      callbacks.ensureUnmuted();

      // Show intro slides
      setRecordingPhase("intro");
    } catch (err) {
      console.error("Demo recording failed:", err);
      setRecordingPhase("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingPhase]);

  const onIntroComplete = useCallback(() => {
    setRecordingPhase("playing");
    callbacks.onStartPlaying();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      setRecordingPhase("stopping");
      recorderRef.current.stop();
    } else {
      cleanup();
      setRecordingPhase("idle");
    }
  }, []);

  function cleanup() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setRecordingPhase("idle");
  }

  function downloadBlob(blob: Blob) {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:.]/g, "-");
    const fileName = `ripple-touch-demo-${stamp}.webm`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return {
    recordingPhase,
    startRecording,
    onIntroComplete,
    stopRecording,
    isRecording: recordingPhase === "intro" || recordingPhase === "playing",
  };
}
