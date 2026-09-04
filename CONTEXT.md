# CONTEXT.md — Ubiquitous Domain Language (InterviewAce)

## Core Entities
- **InterviewSession**: An active or completed candidate mock interview containing timed question prompts.
- **QuestionToken**: An atomic credit entitling a candidate to receive an AI interviewer prompt and critique.
- **StreamingResponseAccumulator**: In-memory buffer grouping streaming LLM text tokens into coherent linguistic clauses.
- **RubricScorecard**: Structured evaluation assessing candidate communication, technical correctness, and pacing.

## Domain Invariants
- Free-tier accounts may never exceed 5 question tokens per session.
- Audio blobs must never be stored to permanent disk or cloud storage.
- An interview session cannot be graded until all active question tokens are settled or expired.

## Forbidden Terminology
- Do not call the AI interviewer an "agent"; use "SimulatedInterviewer".
- Do not call questions "prompts"; use "QuestionPrompt".
