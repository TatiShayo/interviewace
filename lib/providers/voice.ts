/**
 * Voice provider: Whisper transcription + TTS via OpenAI REST API.
 * Mock (no OPENAI_API_KEY): canned transcript + generated silent WAV so the
 * full voice-mock loop is testable end-to-end without keys.
 */
import "server-only";
import { env, has } from "@/lib/env";

export interface VoiceProvider {
  transcribe(audio: Buffer, mimeType: string): Promise<string>;
  synthesize(text: string): Promise<{ audio: Buffer; mimeType: string }>;
}

const MOCK_TRANSCRIPT =
  "In my last role I led the migration of our billing system. The situation was that we had two major customers blocked, so I scoped the work down to the three riskiest services, coordinated a team of two engineers, and we shipped the cutover a week early with zero rollbacks. Support tickets dropped about forty percent the following quarter.";

/** Generate a short valid 16-bit PCM WAV of near-silence (audible click-free). */
export function silentWav(seconds = 1.2, sampleRate = 16000): Buffer {
  const numSamples = Math.floor(seconds * sampleRate);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  // faint hum so players show a waveform instead of dead air
  for (let i = 0; i < numSamples; i++) {
    buf.writeInt16LE(Math.round(Math.sin(i / 30) * 120), 44 + i * 2);
  }
  return buf;
}

class OpenAiVoice implements VoiceProvider {
  async transcribe(audio: Buffer, mimeType: string): Promise<string> {
    const form = new FormData();
    const ext = mimeType.includes("wav") ? "wav" : mimeType.includes("mp4") ? "mp4" : "webm";
    form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), `answer.${ext}`);
    form.append("model", "whisper-1");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.openaiApiKey}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`Whisper transcription failed (${res.status})`);
    const json = (await res.json()) as { text?: string };
    return json.text ?? "";
  }

  async synthesize(text: string): Promise<{ audio: Buffer; mimeType: string }> {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "tts-1", voice: "alloy", input: text.slice(0, 4000), response_format: "mp3" }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`TTS failed (${res.status})`);
    return { audio: Buffer.from(await res.arrayBuffer()), mimeType: "audio/mpeg" };
  }
}

class MockVoice implements VoiceProvider {
  async transcribe(): Promise<string> {
    return MOCK_TRANSCRIPT;
  }
  async synthesize(): Promise<{ audio: Buffer; mimeType: string }> {
    return { audio: silentWav(), mimeType: "audio/wav" };
  }
}

let _voice: VoiceProvider | null = null;
export function voice(): VoiceProvider {
  if (!_voice) _voice = has.openai ? new OpenAiVoice() : new MockVoice();
  return _voice;
}
export const isMockVoice = () => !has.openai;
