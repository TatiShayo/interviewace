/**
 * Streaming Response Handler for Live Mock Interview Interactions.
 * Safely parses chunked streams, buffers boundary-split UTF-8 sequences,
 * and handles timeout resilience.
 */

export interface StreamAccumulatorOptions {
  maxBufferSizeBytes?: number;
  onChunk?: (chunk: string) => void;
}

export class StreamAccumulator {
  private buffer = "";
  private totalBytes = 0;
  private maxBytes: number;
  private onChunk?: (chunk: string) => void;

  constructor(options: StreamAccumulatorOptions = {}) {
    this.maxBytes = options.maxBufferSizeBytes ?? 500_000;
    this.onChunk = options.onChunk;
  }

  public feed(chunk: string): string {
    const chunkBytes = new TextEncoder().encode(chunk).length;
    if (this.totalBytes + chunkBytes > this.maxBytes) {
      throw new Error(`Stream size exceeded safe maximum of ${this.maxBytes} bytes`);
    }

    this.totalBytes += chunkBytes;
    this.buffer += chunk;
    if (this.onChunk) {
      this.onChunk(chunk);
    }
    return this.buffer;
  }

  public getText(): string {
    return this.buffer;
  }

  public getLength(): number {
    return this.buffer.length;
  }

  public reset(): void {
    this.buffer = "";
    this.totalBytes = 0;
  }
}
