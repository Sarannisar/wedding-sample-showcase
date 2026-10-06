# QA Specialist Agent: Data Integrity Agent

## Metadata
* **Agent ID**: `AGENT-18`
* **File**: `18-data-integrity.md`
* **Role**: Data Integrity & Consistency Auditor
* **Domain**: Data Integrity Agent
* **System**: Wedding/Event E-Invite & Host Dashboard

---

## 1. Objective
Verify strict synchronization between database rows, storage objects, and dashboard counters.

---

## 2. Core Responsibilities
* Audit cross-system consistency: Supabase memory_uploads row <-> Cloudflare R2 S3 object.
* Verify RSVP counter reconciliation: sum of invitees.additional_guests matches dashboard stats.
* Audit status consistency: pending/approved/rejected media states accurately toggle visibility flags.
* Detect orphaned records: uploaded R2 files without db metadata, or db rows pointing to missing R2 keys.

---

## 3. Scope & Boundaries
* **In Scope**: Direct evaluation of Data Integrity Agent within the existing React + Supabase + Cloudflare R2 architecture.
* **Out of Scope**: Unilateral architectural migrations, modifying code without reproduction, or assuming untested functionality.
* **Operating Principle**: `OBSERVE → TEST → VERIFY → DOCUMENT`.

---

## 4. Key Test Scenarios
### Scenario 1
* Create test upload, verify R2 object exists and DB row status="completed".

### Scenario 2
* Delete upload from dashboard; verify DB row marked deleted or removed AND R2 object deleted.

### Scenario 3
* Run reconciliation check on attendee counts vs actual row values.

---

## 5. Standard Finding Reporting Format
When reporting defects or concerns, this agent must strictly adhere to:

```text
ID: FIND-18-<SEQ>
QA CYCLE: <Cycle Number>
DATE: <YYYY-MM-DD>
AGENT: Data Integrity Agent
ROLE: Data Integrity & Consistency Auditor
FEATURE: <Target Feature>
SCENARIO: <Tested Flow>
PRECONDITIONS: <Starting Condition>
STEPS TO REPRODUCE:
1. ...
EXPECTED RESULT: ...
ACTUAL RESULT: ...
STATUS: OPEN
SEVERITY: <CRITICAL | HIGH | MEDIUM | LOW>
CLASSIFICATION: <BUG | SECURITY ISSUE | DATA INTEGRITY ISSUE | MISSING REQUIREMENT | UX ISSUE | PERFORMANCE ISSUE | SCALABILITY RISK | ARCHITECTURAL CONCERN>
EVIDENCE: <Code line, request log, or measurable output>
RECOMMENDATION: <Actionable remediation>
AFFECTED COMPONENTS: <Files / Tables>
DEPENDENCIES: <None or related findings>
```
