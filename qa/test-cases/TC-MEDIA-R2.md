# Test Suite: Cloudflare R2 & Guest Media Pipeline

## Suite ID: `TS-MEDIA-R2`
* **Target Components**: [presign-upload.ts](file:///d:/new_invite/api/memories/presign-upload.ts), [complete-upload.ts](file:///d:/new_invite/api/memories/complete-upload.ts), [archive.ts](file:///d:/new_invite/api/memories/archive.ts), [GuestMemoriesPage.tsx](file:///d:/new_invite/src/pages/GuestMemoriesPage.tsx), [memoriesUploadManager.ts](file:///d:/new_invite/src/lib/memoriesUploadManager.ts)
* **Assigned Agents**: `AGENT-06` (Media Upload), `AGENT-07` (Gallery), `AGENT-11` (Storage R2), `AGENT-18` (Data Integrity)

---

### TC-MEDIA-001: Signed URL Presigning & Validation
* **Preconditions**: Cloudflare R2 bucket credentials present in environment variables.
* **Execution**:
  1. Dispatch `POST /api/memories/presign-upload` with:
     ```json
     {
       "eventId": "safiyya-ilyas",
       "filename": "wedding_photo.jpg",
       "mimeType": "image/jpeg",
       "fileSize": 4500000,
       "guestName": "Amina"
     }
     ```
  2. Inspect response status and payload.
* **Expected Result**:
  * Response returns HTTP 200 with `uploadUrl` (presigned AWS S3 / R2 PUT URL with 900s expiration), `storageKey`, and `uploadId`.
  * Initial row created in Supabase `memory_uploads` with `status: 'pending'`.

---

### TC-MEDIA-002: Unsupported MIME Type Rejection
* **Preconditions**: Guest attempts uploading unauthorized file extension.
* **Execution**:
  1. Dispatch `POST /api/memories/presign-upload` with `mimeType: "application/x-msdownload"`.
* **Expected Result**:
  * Response returns HTTP 400 with descriptive error: `File type "application/x-msdownload" is not supported.`
  * No presigned URL generated; no invalid database rows created.

---

### TC-MEDIA-003: Direct S3/R2 Binary PUT and Completion
* **Preconditions**: Valid presigned URL obtained from TC-MEDIA-001.
* **Execution**:
  1. Send direct binary HTTP `PUT` to `uploadUrl` with matching headers (`Content-Type: image/jpeg`, `Content-Length: 4500000`).
  2. Verify HTTP 200 response from Cloudflare R2 storage edge.
  3. Dispatch `POST /api/memories/complete-upload` with `{ uploadId, storageKey, eventId }`.
* **Expected Result**:
  * R2 object exists at `events/safiyya-ilyas/originals/<uuid>.jpg`.
  * Database row status transitions from `pending` to `completed` and `is_visible=true`.

---

### TC-MEDIA-004: Bulk Archive ZIP Generation
* **Preconditions**: Event contains multiple uploaded memories.
* **Execution**:
  1. Request `GET /api/memories/archive?eventId=safiyya-ilyas`.
* **Expected Result**:
  * HTTP 200 response with `Content-Type: application/zip`.
  * Streamed zip contains valid images without corruption.
