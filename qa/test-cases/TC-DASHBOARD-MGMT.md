# Test Suite: Host Dashboard & Invitee Management

## Suite ID: `TS-DASHBOARD-MGMT`
* **Target Components**: [DashboardPage.tsx](file:///d:/new_invite/src/pages/DashboardPage.tsx), [AllInviteesTab.tsx](file:///d:/new_invite/src/components/dashboard/AllInviteesTab.tsx), [OverviewTab.tsx](file:///d:/new_invite/src/components/dashboard/OverviewTab.tsx), [MemoriesTab.tsx](file:///d:/new_invite/src/components/dashboard/MemoriesTab.tsx)
* **Assigned Agents**: `AGENT-03` (Host Dashboard), `AGENT-12` (Authentication/RBAC), `AGENT-08` (Functional QA)

---

### TC-DASH-001: Passcode Authentication & Route Guard
* **Preconditions**: User has no active dashboard token.
* **Execution**:
  1. Navigate to `/dashboard`.
  2. Observe DashboardLogin modal prompt.
  3. Enter incorrect passcode: `999999`. Verify rejected toast notification.
  4. Enter correct event passcode configured in weddingConfig.
* **Expected Result**: Dashboard unlocks; overview tab displays real-time statistics; token persists in local storage across browser refresh.

---

### TC-DASH-002: Invitee CSV Import & Sanitization
* **Preconditions**: Host has CSV file containing invitees with varying phone formats.
* **Execution**:
  1. Open "Add / Import" tab.
  2. Upload CSV fixture with 5 entries.
  3. Verify phone numbers are automatically cleaned to international E.164 standard.
  4. Verify unique URL slugs are automatically generated from guest names.
  5. Confirm import into database.
* **Expected Result**: 5 new records inserted into Supabase `invitees` table with unique slugs.

---

### TC-DASH-003: Memories Moderation & Toggle Visibility
* **Preconditions**: Uploaded photo exists in `memory_uploads`.
* **Execution**:
  1. Open "Memories" tab in dashboard.
  2. Locate target uploaded image card.
  3. Toggle "Hide / Make Private".
  4. Refresh guest gallery `/memories/safiyya-ilyas`.
* **Expected Result**: Hidden image is removed from guest gallery; dashboard clearly flags image as private/hidden.
