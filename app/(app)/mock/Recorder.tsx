"use client";

/**
 * Browser MediaRecorder wrapper: press-to-record, live waveform reacting to
 * the user's mic input via AnalyserNode (BUILD_PROMPT signature interaction —
 * "a live waveform reacting to the user's voice"). Falls back to a text
 * textarea when getUserMedia is unavailable/denied (never a dead end).
 */
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button, Textarea } from "@/components/ui";

export function Recorder({
  onSubmitAudio,
  onSubmitText,
  disabled,
}: {
  onSubmitAudio: (blob: Blob) => void;
  onSubmitText: (text: string) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "recording" | "recorded" | "denied" | "text">("idle");
  const [levels, setLevels] = useState<number[]>(Array(24).fill(0.08));
  const [seconds, setSeconds] = useState(0);
  const [text, setText] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    return () => {
      stopTracks();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }

  async function start() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMode("text");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setMode("recorded");
      };
      mediaRef.current = mr;
      mr.start();
      setMode("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      visualize(stream);
    } catch {
      setMode("denied");
    }
  }

  function visualize(stream: MediaStream) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bars = Array.from({ length: 24 }, (_, i) => {
        const v = data[Math.floor((i / 24) * data.length)] / 255;
        return Math.max(0.08, v);
      });
      setLevels(bars);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  function stop() {
    mediaRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopTracks();
  }

  function submit() {
    if (blobRef.current) onSubmitAudio(blobRef.current);
  }

  function reset() {
    blobRef.current = null;
    setMode("idle");
    setSeconds(0);
  }

  if (mode === "text" || mode === "denied") {
    return (
      <div className="space-y-3">
        {mode === "denied" && (
          <p className="text-xs text-[var(--color-muted)]">
            Microphone unavailable — type your answer instead.
          </p>
        )}
        <Textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your answer as if you were saying it out loud…"
          autoFocus
        />
        <Button onClick={() => onSubmitText(text)} disabled={disabled || text.trim().length < 10} size="lg" className="w-full">
          Submit answer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-4">
      <div className="flex h-16 items-end gap-1" aria-hidden>
        {levels.map((v, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-[var(--color-navy)] transition-all duration-75"
            style={{ height: `${8 + v * 56}px`, opacity: mode === "recording" ? 0.85 : 0.25 }}
          />
        ))}
      </div>

      {mode === "idle" && (
        <Button onClick={start} disabled={disabled} size="lg" className="mt-6">
          <Mic className="h-4 w-4" aria-hidden /> Start answer
        </Button>
      )}

      {mode === "recording" && (
        <>
          <p className="tnum mt-3 text-sm text-[var(--color-muted)]">{fmt(seconds)}</p>
          <Button onClick={stop} variant="brass" size="lg" className="mt-3">
            <Square className="h-4 w-4" aria-hidden /> Stop
          </Button>
        </>
      )}

      {mode === "recorded" && (
        <div className="mt-4 flex items-center gap-3">
          <Button variant="ghost" onClick={reset}>
            Re-record
          </Button>
          <Button onClick={submit} disabled={disabled} size="lg">
            Submit answer
          </Button>
        </div>
      )}

      <button
        onClick={() => setMode("text")}
        className="mt-4 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-navy)] hover:underline"
      >
        Type instead
      </button>
    </div>
  );
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
