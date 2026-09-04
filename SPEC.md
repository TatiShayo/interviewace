# SPEC 001: Real-Time Audio Interview Streaming & Atomic Quota System

## Problem Statement
Job candidates preparing for interviews need realistic, real-time conversational pacing with zero lag, while the platform must protect against free-tier quota bypass.

## Solution
A streaming interview pipeline that pairs clause-based token buffering with atomic database token decrements and automated PII-sanitized rubrics.

## User Stories
1. As a candidate, I want the AI interviewer to speak with natural cadence, so that the simulation feels like a genuine human interview.
2. As a candidate, I want instant feedback on my answers, so that I can improve before my real interview.
3. As a free-tier user, I want transparent visibility into my remaining questions, so that I understand my plan limits.
4. As a candidate, I want my voice recordings deleted immediately, so that my personal privacy is respected.

## Implementation Decisions
- Implement `StreamingResponseAccumulator` in `lib/ai/streaming-handler.ts`.
- Track token claims through database RPC function `claim_interview_question_token`.
- Enforce strict rubric scoring categories: Technical, Behavioral, Conciseness.

## Testing Decisions
- Seam: `tests/streaming-response-handler.test.ts`.
- Verify clause aggregation, chunk sequencing, and backpressure handling.
