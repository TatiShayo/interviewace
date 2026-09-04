# TICKETS — InterviewAce AI Streaming Pipeline

## [TICKET-001] Clause-Based Streaming Token Accumulator
- **Blocked by**: None
- **Delivers**: Linguistic boundary parser that buffers tokens into natural sentence fragments for audio synthesis.
- **Verification**: `tests/streaming-response-handler.test.ts`

## [TICKET-002] Atomic Session Question Token Decrementer
- **Blocked by**: TICKET-001
- **Delivers**: Concurrency-safe quota claiming for Free (5) and Pro (unlimited) sessions.
- **Verification**: Concurrent execution tests asserting no double-claim anomalies.

## [TICKET-003] Ephemeral Audio Pipeline & PII Scrubbing
- **Blocked by**: TICKET-002
- **Delivers**: In-memory audio transcription buffer with zero disk persistence.
- **Verification**: Automated scan verifying no audio artifacts persist in temp storage.
