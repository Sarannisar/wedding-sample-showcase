# E-Invite & Event Dashboard — Multi-Agent QA & Audit System

Welcome to the QA and Audit Agent System for the wedding/event invitation and host dashboard platform.

## 1. System Overview

This audit system is structured around 22 specialized audit agents, standardized test cases, and rigorous test data sets. Each agent focuses on a distinct slice of the product lifecycle: guest invitation experience, host administration, media pipelines (Supabase + Cloudflare R2), security, data integrity, and performance.

### Operating Philosophy
```text
OBSERVE → TEST → VERIFY → DOCUMENT
(Never assume, never fabricate results, never claim success without evidence)
```

---

## 2. Agent Inventory (`/qa/agents/`)

The 22 specialist agents operate under strict domain boundaries:

| # | Agent File | Role / Domain | Scope |
|---|---|---|---|
| 01 | `01-einvite-product-owner.md` | Product Owner & Domain | End-to-end invitation & event lifecycle coherence |
| 02 | `02-guest-user.md` | Guest User Experience | Mobile open, QR entry, personalized greeting, RSVP flow |
| 03 | `03-host-dashboard.md` | Host Administration | Invitee management, real-time stats, search, filtering |
| 04 | `04-rsvp-agent.md` | RSVP Subsystem | State transitions, attending/declined, counts, race conditions |
| 05 | `05-event-management.md` | Event Configuration | Event dates, venue, map, details propagation |
| 06 | `06-media-upload.md` | Media Pipeline & Ingestion | S3/R2 direct signed uploads, chunking, retry, MIME validation |
| 07 | `07-gallery-agent.md` | Guest & Host Gallery | Media rendering, lightbox, lazy loading, live wedding display |
| 08 | `08-functional-qa.md` | Functional QA & CRUD | Systematic CRUD validation, boundary checking, error states |
| 09 | `09-security-privacy.md` | Security & Privacy | RLS audit, secret isolation, cross-tenant isolation, tokens |
| 10 | `10-supabase-database.md` | Supabase Database | Migrations, foreign keys, triggers, RPCs, index integrity |
| 11 | `11-storage-r2-agent.md` | Cloudflare R2 Storage | Bucket policies, presigned URLs, S3 client lifecycle, orphan cleanup |
| 12 | `12-authentication-rbac.md` | Authentication & RBAC | Admin passcode/JWT, guest token access, session persistence |
| 13 | `13-mobile-responsive.md` | Mobile & Responsive | iOS Safari, Android Chrome, notch handling, touch targets |
| 14 | `14-ux-accessibility.md` | UX & Accessibility | WCAG contrast, screen readers, animations, cognitive friction |
| 15 | `15-integration-agent.md` | Third-Party Integrations | WhatsApp share, Google/Apple Calendar (.ics), QR codes |
| 16 | `16-performance-agent.md` | Performance & Web Vitals | Bundle size, LCP, CLS, query latencies, image optimization |
| 17 | `17-scalability-agent.md` | Scalability & Load | High concurrency RSVP spikes, concurrent photo uploads, limits |
| 18 | `18-data-integrity.md` | Data Integrity & Consistency | Cross-table consistency (R2 objects vs Supabase rows) |
| 19 | `19-developer-agent.md` | Developer Remediation | Root-cause analysis, minimal diff bug fixing, test verification |
| 20 | `20-regression-agent.md` | Regression Testing | Post-remediation verification across all critical user journeys |
| 21 | `21-product-architect.md` | Architecture Review | System design, separation of concerns, deployment viability |
| 22 | `22-qa-orchestrator.md` | Audit Coordination | Work distribution, deduplication, severity ranking, reporting |

---

## 3. Directory Structure

```text
qa/
├── README.md               # Main overview and operational manual
├── agents/                 # 22 Specialist agent definitions
│   ├── 01-einvite-product-owner.md
│   ├── 02-guest-user.md
│   ├── ...
│   └── 22-qa-orchestrator.md
├── test-cases/             # Executable test cases categorized by module
│   ├── TC-GUEST-RSVP.md
│   ├── TC-MEDIA-R2.md
│   ├── TC-DASHBOARD-MGMT.md
│   └── TC-SECURITY-RLS.md
├── test-data/              # Test fixtures and representative personas
│   ├── invitees.json
│   ├── media-fixtures.json
│   └── events.json
└── reports/                # Audit findings and regression sign-offs
```

---

## 4. Standard Finding Template

Every finding documented in audit cycles must strictly follow this format:

```text
ID: FIND-<MODULE>-<NUMBER>
QA CYCLE: <Cycle Number or Name>
DATE: <YYYY-MM-DD>
AGENT: <Agent Name>
ROLE: <Agent Role>
FEATURE: <Feature Name>
SCENARIO: <Tested Scenario>
PRECONDITIONS: <Initial State>
STEPS TO REPRODUCE:
1. Step 1
2. Step 2
EXPECTED RESULT: <What should happen>
ACTUAL RESULT: <What actually happened>
STATUS: <OPEN | IN_PROGRESS | RESOLVED | VERIFIED | BLOCKED>
SEVERITY: <CRITICAL | HIGH | MEDIUM | LOW>
CLASSIFICATION: <BUG | SECURITY ISSUE | DATA INTEGRITY ISSUE | MISSING REQUIREMENT | UX ISSUE | PERFORMANCE ISSUE | SCALABILITY RISK | ARCHITECTURAL CONCERN>
EVIDENCE: <Code reference, log output, or exact reproduction output>
RECOMMENDATION: <Proposed solution>
AFFECTED COMPONENTS: <List of files/endpoints>
DEPENDENCIES: <Related tickets or blocks>
```

---

## 5. Audit Execution Cycle

1. **Reconnaissance**: Orchestrator verifies environment variables, build outputs, and active endpoints.
2. **Specialist Dispatch**: Agents execute scenarios corresponding to their respective domain specifications.
3. **Evidence Collection**: Discovered issues are cataloged with reproducible traces and exact file locations.
4. **Architect Assessment**: Findings are prioritized by severity (Must Fix Now, Should Fix Soon, Future Improvement).
5. **Developer Remediation**: Minimal targeted fixes applied with regression protections.
6. **Regression Verification**: Independent sign-off by `20-regression-agent.md` before closing.
