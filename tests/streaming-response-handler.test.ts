import { describe, it, expect, vi } from "vitest";
import { StreamAccumulator } from "../lib/ai/streaming-handler";

describe("Streaming Response Handler & Buffer Boundaries", () => {
  it("accumulates progressive stream chunks correctly", () => {
    const chunkSpy = vi.fn();
    const accumulator = new StreamAccumulator({ onChunk: chunkSpy });

    accumulator.feed("Tell me ");
    accumulator.feed("about a time ");
    accumulator.feed("you resolved a conflict.");

    expect(chunkSpy).toHaveBeenCalledTimes(3);
    expect(accumulator.getText()).toBe("Tell me about a time you resolved a conflict.");
    expect(accumulator.getLength()).toBe("Tell me about a time you resolved a conflict.".length);
  });

  it("enforces maximum stream buffer size to prevent memory DOS", () => {
    const smallAccumulator = new StreamAccumulator({ maxBufferSizeBytes: 50 });
    smallAccumulator.feed("Short response");

    expect(() => {
      smallAccumulator.feed("A very long chunk that will exceed the fifty byte ceiling limit easily");
    }).toThrow(/Stream size exceeded safe maximum/);
  });

  it("resets internal state properly between interview questions", () => {
    const accumulator = new StreamAccumulator();
    accumulator.feed("Question 1 answer");
    expect(accumulator.getLength()).toBeGreaterThan(0);

    accumulator.reset();
    expect(accumulator.getLength()).toBe(0);
    expect(accumulator.getText()).toBe("");
  });
});
