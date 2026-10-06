# Full Audit Findings Report — Cycle 01

**Date**: 2026-10-06  
**Auditor**: Multi-Agent QA System (Agents 01–22)  
**System**: Wedding E-Invite & Host Dashboard (`safiyya-ilyas-invite`)  
**Methodology**: `OBSERVE → TEST → VERIFY → DOCUMENT`

---

## Executive Summary

The application exhibits high visual refinement, elegant Framer Motion animations, thoughtful offline resilience with localStorage outboxes, and functional Cloudflare R2 presigning. However, strict technical audit across the 22 specialist perspectives identified critical architectural vulnerabilities, security boundary gaps, and database synchronization risks that must be addressed before production event deployment.

---

## Findings Index

| ID | Module / Feature | Agent | Classification | Severity | Status |
|---|---|---|---|---|---|
| `FIND-09-001` | Supabase RLS Public Read Table Exposure | 09-Security | SECURITY ISSUE | HIGH | OPEN |
| `FIND-04-001` | Arbitrary Invitee Insertion in updateRsvp | 04-RSVP | DATA INTEGRITY | HIGH | OPEN |
| `FIND-05-001` | Hardcoded Slug Discrepancy Across Pages | 05-Event Mgmt | BUG | HIGH | OPEN |
| `FIND-11-001` | Unauthenticated Media Deletion Endpoint | 11-Storage R2 | SECURITY ISSUE | CRITICAL | OPEN |
| `FIND-06-001` | Presign Upload Lacks Event Existence Check | 06-Media Upload | SECURITY / INTEGRITY | MEDIUM | OPEN |
| `FIND-14-001` | Audio Autoplay and Audio Button Missing Labels | 14-Accessibility | UX / A11Y | MEDIUM | OPEN |
| `FIND-16-001` | Vendor JS Bundle Exceeds 200KB Without Compression | 16-Performance | PERFORMANCE | LOW | OPEN |

---

## Detailed Finding Reports

### FIND-09-001: Supabase RLS Allows Full Public Enumeration of Invitees Table
* **ID**: `FIND-09-001`
* **QA CYCLE**: Cycle 01
* **DATE**: 2026-10-06
* **AGENT**: 09-security-privacy
* **ROLE**: Security & Privacy Auditor
* **FEATURE**: Invitee Database Access & Row Level Security
* **SCENARIO**: Anonymous client querying `/rest/v1/invitees`
* **PRECONDITIONS**: Supabase anon key configured in `.env`
* **STEPS TO REPRODUCE**:
  1. Make an HTTP GET request to `https://<supabase-url>/rest/v1/invitees?select=*` using the public anon key.
  2. Inspect response data.
* **EXPECTED RESULT**: Anonymous access to bulk invitees should be forbidden; guests should only read their own row matching their specific invitation slug.
* **ACTUAL RESULT**: The table returns all guest records including names, phone numbers, RSVP statuses, and slugs (HTTP 200).
* **EVIDENCE**:
  ```sql
  -- Migration 20260908040000_dashboard_auth_rls.sql lines 25-29:
  create policy "Public read invitees"
    on public.invitees
    for select
    to anon
    using (true);
  ```
  Verified via Node test query: returned 3 live test records with phone numbers and private slugs.
* **STATUS**: OPEN
* **SEVERITY**: HIGH
* **RECOMMENDATION**: Restrict anon SELECT policy so that an anon query must specify a matching slug or query via an RPC function, or protect phone numbers and unshared private guest metadata from blanket scans.
* **AFFECTED COMPONENTS**: `supabase/migrations/20260908040000_dashboard_auth_rls.sql`, `src/lib/supabase.ts`

---

### FIND-04-001: Arbitrary Invitee Creation via updateRsvp Fallback Insert
* **ID**: `FIND-04-001`
* **QA CYCLE**: Cycle 01
* **DATE**: 2026-10-06
* **AGENT**: 04-rsvp-agent
* **ROLE**: RSVP Specialist
* **FEATURE**: RSVP Update State Machine
* **SCENARIO**: Submitting an RSVP for an unrecognized slug
* **PRECONDITIONS**: Guest opens invalid or fabricated slug
* **STEPS TO REPRODUCE**:
  1. Call `updateRsvp("unauthorized-slug-123", "attending", 10, "hello", "Hacker")`.
  2. Observe lines 559–579 in `src/lib/supabase.ts`.
* **EXPECTED RESULT**: If an invitee record does not exist in the database, the server should return an error and reject the submission.
* **ACTUAL RESULT**: `updateRsvp` executes a fallback `insert` creating a brand-new row in the `invitees` table with arbitrary data.
* **EVIDENCE**:
  ```typescript
  // src/lib/supabase.ts:559-572
  const { data: inserted, error: insertError } = await supabase
    .from('invitees')
    .insert([
      {
        name: fallbackName || slug,
        slug,
        rsvp,
        guest_count: rsvp === 'attending' ? guestCount : 0,
        notes: notes || null,
        responded_at: respondedAt,
      },
    ])
    .select();
  ```
* **STATUS**: OPEN
* **SEVERITY**: HIGH
* **RECOMMENDATION**: Remove fallback insert for unauthenticated/unregistered slugs or guard it with host confirmation.
* **AFFECTED COMPONENTS**: `src/lib/supabase.ts`

---

### FIND-05-001: Hardcoded Slug Discrepancy Across Event Pages
* **ID**: `FIND-05-001`
* **QA CYCLE**: Cycle 01
* **DATE**: 2026-10-06
* **AGENT**: 05-event-management
* **ROLE**: Event Configuration Manager
* **FEATURE**: Event Slug Routing & Multi-Page Consistency
* **SCENARIO**: Transitioning between Dashboard, Live Display, and Memories
* **PRECONDITIONS**: Default wedding event seeded in database
* **STEPS TO REPRODUCE**:
  1. Inspect `src/pages/DashboardPage.tsx` line 160: fetches `fetchWeddingEvent('safiyya-sharrafuth')`.
  2. Inspect `supabase/migrations/20261005_wedding_memories.sql` line 191: seeded slug is `safiyya-sharrafuth`.
  3. Inspect `src/components/dashboard/OverviewTab.tsx` or QR modal: some links point to `/memories/safiyya-ilyas` or default configs.
* **EXPECTED RESULT**: All components should derive the default event slug from a single source of truth in `weddingConfig.ts`.
* **ACTUAL RESULT**: Multiple components contain disparate hardcoded slug strings (`safiyya-sharrafuth` vs `safiyya-ilyas`), risking 404s when loading gallery or live displays.
* **EVIDENCE**:
  ```typescript
  // DashboardPage.tsx:160:
  void fetchWeddingEvent('safiyya-sharrafuth').then(setWeddingEvent);
  // GuestMemoriesPage.tsx:53:
  const data = await fetchWeddingEvent(eventSlug || 'safiyya-sharrafuth');
  ```
* **STATUS**: OPEN
* **SEVERITY**: HIGH
* **RECOMMENDATION**: Export `defaultEventSlug` in `weddingConfig.ts` and reference it everywhere uniformly.
* **AFFECTED COMPONENTS**: `src/config/weddingConfig.ts`, `src/pages/DashboardPage.tsx`, `src/pages/GuestMemoriesPage.tsx`

---

### FIND-11-001: Unauthenticated Media Deletion Endpoint
* **ID**: `FIND-11-001`
* **QA CYCLE**: Cycle 01
* **DATE**: 2026-10-06
* **AGENT**: 11-storage-r2-agent & 09-security-privacy
* **ROLE**: Cloudflare R2 Storage & Security Auditor
* **FEATURE**: Media Deletion Serverless API
* **SCENARIO**: Sending POST request to `/api/memories/delete`
* **PRECONDITIONS**: Media exists in Cloudflare R2 and Supabase
* **STEPS TO REPRODUCE**:
  1. Inspect `api/memories/delete.ts`.
  2. Notice that the handler verifies `req.method === 'POST'` and checks parameters `uploadId` and `storageKey`, but does NOT verify admin authentication, authorization header, or session cookie.
  3. Any client knowing or enumerating an `uploadId` and `storageKey` can invoke `/api/memories/delete` and purge media.
* **EXPECTED RESULT**: `/api/memories/delete` must authenticate the caller as the verified host/admin before deleting R2 objects or database records.
* **ACTUAL RESULT**: Endpoint is publicly accessible with no authentication check.
* **EVIDENCE**:
  ```typescript
  // api/memories/delete.ts lines 12-25
  const { uploadId, eventId, storageKey, originalFilename, items } = req.body || {};
  // Proceeds directly to S3Client DeleteObjectCommand and Supabase DELETE with service role!
  ```
* **STATUS**: OPEN
* **SEVERITY**: CRITICAL
* **RECOMMENDATION**: Require valid admin authorization token in the `Authorization` header of `/api/memories/delete` and verify it against Supabase Auth before processing deletion.
* **AFFECTED COMPONENTS**: `api/memories/delete.ts`

---

### FIND-06-001: Presign Upload Does Not Verify Event Existence
* **ID**: `FIND-06-001`
* **QA CYCLE**: Cycle 01
* **DATE**: 2026-10-06
* **AGENT**: 06-media-upload
* **ROLE**: Media Pipeline Specialist
* **FEATURE**: S3/R2 Presigned Upload API
* **SCENARIO**: Requesting presigned URL with non-existent `eventId`
* **PRECONDITIONS**: Serverless endpoint deployed
* **STEPS TO REPRODUCE**:
  1. POST to `/api/memories/presign-upload` with `eventId: "fake-event-uuid-999"`.
  2. The endpoint checks only `if (!eventId || !filename || !mimeType || !fileSize)`.
  3. It generates an S3 PUT URL for `events/fake-event-uuid-999/originals/<uuid>.jpg` and attempts inserting into `memory_uploads`.
* **EXPECTED RESULT**: Presign endpoint should verify that `wedding_events` contains `fake-event-uuid-999` and that `upload_enabled == true` before vending signed storage credentials.
* **ACTUAL RESULT**: Presigned upload URL is generated regardless of whether the event exists or allows uploads.
* **EVIDENCE**:
  ```typescript
  // api/memories/presign-upload.ts lines 54-69
  // No validation check against wedding_events table prior to generating signed URL
  ```
* **STATUS**: OPEN
* **SEVERITY**: MEDIUM
* **RECOMMENDATION**: Query `wedding_events` for `id = eventId AND upload_enabled = true` before calling `getSignedUrl()`.
* **AFFECTED COMPONENTS**: `api/memories/presign-upload.ts`

---

### FIND-14-001: Background Music Toggle Lacks Accessible ARIA Labels
* **ID**: `FIND-14-001`
* **QA CYCLE**: Cycle 01
* **DATE**: 2026-10-06
* **AGENT**: 14-ux-accessibility
* **ROLE**: UX & Accessibility Specialist
* **FEATURE**: Audio Experience
* **SCENARIO**: Screen reader navigating background music widget
* **PRECONDITIONS**: Invitation page loaded
* **STEPS TO REPRODUCE**:
  1. Inspect `src/components/audio/BackgroundMusic.tsx`.
  2. Check button attributes for assistive tech.
* **EXPECTED RESULT**: Button element includes descriptive `aria-label="Play background music"` and `aria-pressed`.
* **ACTUAL RESULT**: Interactive audio button lacks dynamic `aria-label` and `aria-pressed` state attributes.
* **STATUS**: OPEN
* **SEVERITY**: MEDIUM
* **RECOMMENDATION**: Add `aria-label={isPlaying ? "Mute music" : "Play music"}` and `aria-pressed={isPlaying}`.
* **AFFECTED COMPONENTS**: `src/components/audio/BackgroundMusic.tsx`

---

### FIND-16-001: Supabase & React Bundles Trigger Vite Chunk Size Warning
* **ID**: `FIND-16-001`
* **QA CYCLE**: Cycle 01
* **DATE**: 2026-10-06
* **AGENT**: 16-performance-agent
* **ROLE**: Performance Specialist
* **FEATURE**: Client Bundle Splitting
* **SCENARIO**: Production build execution
* **PRECONDITIONS**: Running `npm run build`
* **STEPS TO REPRODUCE**:
  1. Inspect build logs: `dist/assets/DashboardPage-CmOyxgTx.js` is 216KB, `dist/assets/vendor-supabase-CSIM0fnT.js` is 219KB.
* **EXPECTED RESULT**: Bundles split into modular chunks below 150KB for rapid mobile 3G hydration.
* **ACTUAL RESULT**: Chunks are moderately large for mobile network constraints, though acceptable with gzip (47KB–57KB).
* **STATUS**: OPEN
* **SEVERITY**: LOW
* **RECOMMENDATION**: Further tune manualChunks in `vite.config.ts` or enable lazy loading of dashboard sub-tabs (MemoriesTab, AddImportTab).
* **AFFECTED COMPONENTS**: `vite.config.ts`
