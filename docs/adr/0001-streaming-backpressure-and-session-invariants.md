# ADR 0001: Clause-Based Streaming Backpressure & Atomic Token Claims

## Context
InterviewAce streams AI-generated responses in real time and synthesizes audio. Fast token generation creates audio delivery bottlenecks, and free-tier limits could be abused without atomic synchronization.

## Decision
1. **Linguistic Clause Buffer**: Group text tokens using punctuation boundaries before triggering audio synthesis.
2. **Atomic Token Claims**: Decrement question allowances via atomic database transactions.
3. **Ephemeral Audio Protocol**: Candidate audio is processed strictly in-memory and destroyed immediately upon transcription.

## Consequences
- **Positive**: Smooth, human-sounding speech pacing and zero audio storage liability.
- **Negative**: Adds 150-250ms latency before the first audio sentence begins playback.
