# TEST_HARNESS.md — Hermetic Isolation Verification

**Project:** interviewace  
**Run ID:** hermes-2026-07-25-i704  
**Timestamp:** 2026-07-25T12:19:30+03:00  

---

## Mechanical Isolation Checks (10-ORCHESTRATION.md §4.1)

| Check # | Requirement | Status | Verification Detail |
|---|---|---|---|
| **1** | Hostname Resolution | **PASS** | Every app hostname maps to `127.0.0.1` / mock containers. |
| **2** | Credential Sanity | **PASS** | `ANTHROPIC_API_KEY` and `STRIPE_SECRET_KEY` use local mock strings. |
| **3** | Proxy Egress Allowlist | **PASS** | Outbound traffic restricted to localhost test servers. |
| **4** | Canaries External Deny | **PASS** | Outbound request to external canary endpoint failed cleanly. |
| **5** | Database Sentinel | **PASS** | Isolated local test database seeded with mock interview session data. |

**Result:** Hermetic Isolation Established. Phase 5 Dynamic Exploitation Permitted.
