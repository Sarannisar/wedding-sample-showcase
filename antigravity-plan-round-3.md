# Antigravity Implementation Plan — Round 3

Project: Safiyya & Sharrafuth wedding invitation (React 18 + Vite 5 + TypeScript + Tailwind v3 + Framer Motion + GSAP + Supabase/Lovable Cloud).

Scope: functional items **1–6**, then visual/UX items **7–11**.
Do them **in order**. After each phase run `bunx tsgo --noEmit` and `bun run build:dev`, and smoke-test `/dashboard` and `/invite/<slug>`.

Global rules for the agent:
- Do **not** edit `src/integrations/supabase/client.ts`, `previewAuthStorage.ts`, `types.ts`, `.env`, or `supabase/config.toml`.
- No hardcoded color utilities (`text-white`, `bg-[#...]`) in new markup unless the file already does it — match the surrounding file's existing convention (this codebase uses literal pastel hexes like `#e08aa3`, `#fffafc`, `#4a3038`; stay consistent).
- All user feedback goes through the existing `notify` helper (`src/lib/notify.ts`), never `alert()`.
- Every new DB column needs a migration **with GRANTs** (see Phase 0).

---

## Phase 0 — Schema prerequisites (do first)

Two of the later items need columns/tables that don't exist yet.

Run one migration containing:

```sql
-- Reminder tracking (item 4)
ALTER TABLE public.invitees
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shared_at timestamptz,   -- if not already present
  ADD COLUMN IF NOT EXISTS first_opened_at timestamptz; -- item 3 deadline anchor

-- invitee_events already exists with public policies; ensure grants are present
GRANT SELECT, INSERT ON public.invitee_events TO anon, authenticated;
GRANT ALL ON public.invitee_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitees TO anon, authenticated;
GRANT ALL ON public.invitees TO service_role;
```

Then extend `Invitee` in `src/lib/types.ts`:

```ts
reminded_at?: string | null;
reminder_count?: number;
first_opened_at?: string | null;
```

Add `'reminded'` to `InviteeEventType`.

---

## Item 1 — RSVP must never silently fall back to localStorage

**File:** `src/lib/supabase.ts` (`updateRsvp`, ~lines 450–530), `src/components/invitation/RsvpSection.tsx`.

### Problem
`updateRsvp` returns `true` after writing to `localStorage` even when the Supabase call errored. The guest sees a success screen; the host never receives the RSVP.

### Change

1. Change the signature to return a result object instead of `boolean`:

```ts
export type RsvpWriteResult =
  | { ok: true; source: 'remote' }
  | { ok: false; reason: 'offline' | 'network' | 'rejected' | 'not-configured'; message: string };
```

2. New control flow in `updateRsvp`:
   - If `!isSupabaseConfigured || !supabase` → **still** write the local mirror (dev-only mode) but return `{ ok: true, source: 'remote' }` **only** when `import.meta.env.DEV`; in production return `{ ok: false, reason: 'not-configured', ... }`.
   - If `!navigator.onLine` → return `{ ok: false, reason: 'offline', message: 'You appear to be offline.' }` immediately, no local write.
   - Attempt the `update ... .eq('slug', slug).select()`; on `error` → `{ ok: false, reason: 'rejected', message: error.message }`.
   - On zero rows matched keep the existing insert-fallback, but if the insert also errors → `{ ok: false, reason: 'rejected' }`.
   - On success: write the local mirror as a **cache only** (so the guest sees their answer on reload), log the `responded` event, return `{ ok: true, source: 'remote' }`.
   - Wrap in try/catch → `{ ok: false, reason: 'network' }`.

3. **Delete** the tail block that creates/updates the local guest and returns `true`. Local writes now only happen on the success path.

4. `RsvpSection.tsx`:
   - Await the new result. On `ok: false`, do **not** advance to the confirmation step. Set `submitError` to `result.message` and show the existing Retry affordance.
   - Add an offline-aware retry: on `window.addEventListener('online')` while `submitError` is set, show a toast "Back online — tap Retry to send your RSVP."
   - Keep an outbox: persist the pending payload to `localStorage` under `wedding_rsvp_pending_<slug>`, and on mount, if a pending payload exists and the browser is online, auto-retry once and clear it on success. Never treat the outbox as a confirmed RSVP in the UI — show "Not sent yet" styling until the remote write succeeds.

5. Update all other call sites of `updateRsvp` for the new return type.

### Verify
- Throttle to offline in DevTools, submit an RSVP → error state, no success screen.
- Go online, tap Retry → success screen, row visible in the dashboard after refresh.

---

## Item 2 — Refetch-after-failure so the dashboard shows truth

**Files:** `src/lib/supabase.ts` (`updateInvitee`, `deleteInvitee`, `deleteBulkInvitees`, `markInviteeShared`, `markBulkInviteesShared`), `src/pages/DashboardPage.tsx`, `src/components/dashboard/AllInviteesTab.tsx`.

### Change
1. Apply the same rule as item 1 in each mutation: **only** touch the local mirror after the remote call succeeds. On failure return `false`/`null` without mutating local state.
2. In `DashboardPage.tsx`, centralise a `refreshInvitees()` that re-runs `fetchInvitees()` and replaces state.
3. Wrap every optimistic mutation handler in the dashboard as:

```ts
const prev = invitees;
setInvitees(optimisticNext);
const ok = await mutate(...);
if (!ok) {
  setInvitees(prev);              // instant rollback
  notify.error('Could not save. Refreshing from the server…');
  await refreshInvitees();        // then reconcile with truth
}
```

4. Add a lightweight `lastSyncedAt` timestamp in the dashboard header ("Synced 12s ago") updated by `refreshInvitees()`, so a stale table is visible at a glance.

### Verify
Block requests to the backend in DevTools, rename a guest → row snaps back and a toast appears.

---

## Item 3 — RSVP deadline / lock (with the "late invite" rule)

**Files:** `src/config/weddingConfig.ts`, new `src/lib/rsvpDeadline.ts`, `src/components/invitation/RsvpSection.tsx`, `src/lib/supabase.ts`, `src/components/dashboard/*`.

### Business rule (exactly as requested)
Let `EVENT = weddingConfig.event.targetDate` (2026-12-12T12:30+05:30).

- `STANDARD_DEADLINE = EVENT − 7 days` (2026-12-05T12:30+05:30)
- `LATE_DEADLINE     = EVENT − 1 day`  (2026-12-11T12:30+05:30)

For a given invitee, take `anchor = first_opened_at` (the first time they opened their invite; fall back to `created_at`, then to "now" for a brand-new visitor).

```
if (anchor <  STANDARD_DEADLINE)  effectiveDeadline = STANDARD_DEADLINE
else                              effectiveDeadline = LATE_DEADLINE
```

i.e. guests who open the invite **before** the 1-week mark can change their RSVP until the 1-week mark; guests who first receive/open it **inside the final week** get until one day before the wedding. The deadline is never later than `LATE_DEADLINE` and never earlier than the standard one.

### Implementation

1. `weddingConfig.ts` — add:

```ts
rsvp: {
  standardCutoffDaysBefore: 7,
  lateCutoffDaysBefore: 1,
  lockedMessage: 'RSVP is now closed. Please contact the family directly for any changes.',
}
```

2. New `src/lib/rsvpDeadline.ts`:

```ts
export interface RsvpWindow {
  deadline: Date;
  isLate: boolean;      // guest fell into the final-week bucket
  isOpen: boolean;
  hoursRemaining: number;
}
export function getRsvpWindow(anchorIso?: string | null, now = new Date()): RsvpWindow
```
Pure function, no side effects, fully unit-testable. Compute from `weddingConfig.event.targetDate` and the two offsets. Treat an absent anchor as `now`.

3. **Persist the anchor.** In `src/pages/GuestInvitePage.tsx`, inside the existing "log opened event once per session" block, also call a new
`ensureFirstOpenedAt(inviteeId)` in `supabase.ts` that does
`update invitees set first_opened_at = now() where id = ? and first_opened_at is null`.
Fire-and-forget (`void`), never block render.

4. `RsvpSection.tsx`:
   - Compute `const window = getRsvpWindow(invitee?.first_opened_at ?? invitee?.created_at)`.
   - If `!window.isOpen` → render a **read-only summary card** instead of the 3-step flow: their recorded answer, guest count, note, plus `lockedMessage` and a WhatsApp link to Illyas (`0772257533`) for changes. Match the existing card styling (rounded-3xl, `bg-white/95`, `border-[#e08aa3]/30`, floral divider).
   - If open and `hoursRemaining <= 72` → show a soft urgency pill above the flow: `Please respond by {formatted deadline}` in `#b05570`.
   - Recompute on an interval of 60s so an open tab locks itself at the boundary.

5. **Server-side guard.** In `updateRsvp`, re-derive the window from the fetched row before writing; if closed, return `{ ok: false, reason: 'rejected', message: lockedMessage }`. (Client-only locks are cosmetic.)

6. **Dashboard.** Show the effective deadline per guest as a small muted caption in the invitee detail, and add an Overview stat "Locked / still open" counts.

### Verify
Temporarily set `targetDate` a few days out and confirm: early-anchor guest locks at −7d; a guest whose `first_opened_at` is inside the final week can still respond until −1d; both are read-only after their deadline.

---

## Item 4 — "Remind pending" bulk WhatsApp flow

**Files:** `src/config/weddingConfig.ts`, `src/lib/supabase.ts`, `src/components/dashboard/AllInviteesTab.tsx`, `src/components/dashboard/OverviewTab.tsx`.

### Change

1. Add a second template to `weddingConfig.whatsapp`:

```ts
reminderTemplate:
  "Assalamu Alaikum GUEST_NAME\n\nA gentle reminder about Safiyya & Sharrafuth's Wedding Ceremony on Saturday 12th December 2026 at Glen Reception Hall, 12:30pm onwards.\n\nWe would love to know if you can join us — please confirm here: GUEST_LINK",
```

2. `supabase.ts` — add `markInviteeReminded(id)` and `markBulkInviteesReminded(ids)`, mirroring the existing `markInviteeShared` pair: set `reminded_at = now()`, increment `reminder_count`, log an `invitee_events` row of type `reminded`. Same "remote first, local mirror only on success" rule from item 2.

3. `AllInviteesTab.tsx`:
   - Extract the existing `getWhatsAppMessage` into `buildWhatsAppMessage(invitee, template)` so both templates share the placeholder replacement.
   - Add a toolbar button **"Remind pending"** next to the existing bulk actions. It selects `rsvp === 'pending' && shared_at != null` (never remind someone who was never sent the invite).
   - Reminder queue modal: reuse the existing WhatsApp-queue modal pattern. Show `Sending 3 of 12`, guest name, `Open WhatsApp` (uses `reminderTemplate`), `Skip`, and `Copy text`. On each open, call `markInviteeReminded`.
   - Guard: skip guests with `reminded_at` within the last 48h and show them as "Recently reminded — skipped", with an override checkbox.
   - Guard: skip guests whose RSVP window is closed (item 3).
   - Add a `Reminders` column (count + relative time) and make it sortable.

4. `OverviewTab.tsx`: add a "Pending & sent" stat card with a **Remind all** shortcut that deep-links to the All Invitees tab with the reminder queue pre-opened.

### Verify
With ≥3 pending, sent guests: the queue opens, each `Open WhatsApp` opens `wa.me` with the reminder copy, and the `Reminders` column increments.

---

## Item 5 — Manual-add duplicate detection: name **and** phone must both match

**File:** `src/components/dashboard/AddImportTab.tsx` (`isSameContact`, ~line 43; `handleSingleSubmit`, ~line 88).

### Problem
`isSameContact` currently returns `true` when the names match and **both phones are empty** — so two different "Ahmed" entries without numbers collide.

### Change
Rewrite the matcher so a duplicate requires **both** a name match **and** a non-empty phone match:

```ts
function isSameContact(nameA, phoneA, nameB, phoneB): boolean {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a || a !== b) return false;

  const da = normalizeDigits(phoneA);
  const db = normalizeDigits(phoneB);
  if (!da || !db) return false;            // no phone on either side => NOT a duplicate
  return last9(da) === last9(db);          // tolerate +94 / 0 prefixes
}
```

Helpers:
- `normalizeName` → trim, lowercase, collapse internal whitespace, strip punctuation/diacritics (`.normalize('NFD').replace(/\p{Diacritic}/gu,'')`).
- `last9(d)` → `d.slice(-9)` so `0772257533`, `+94772257533` and `94772257533` all match.

Apply the **same** rule to the CSV staging path: replace the `fileKey = name::digits` Set lookups with the shared matcher semantics — build the key only when a phone exists (`name::last9`), and rows without a phone are **always** `new`, never `duplicate`. Extract both into `src/lib/contactMatch.ts` so the single-add form and CSV import can't drift apart.

Soft signal instead of a hard block: when the **name** matches but the phone differs (or is missing), don't open the duplicate modal — show an inline amber hint under the name field: `Someone named "Ahmed" already exists (0771234567). Add anyway?` with the submit button still enabled.

### Verify
- Add "Ahmed" with no phone twice → both created.
- Add "Ahmed" + `0771111111`, then "ahmed" + `+94771111111` → duplicate modal.
- Add "Ahmed" + `0771111111`, then "Ahmed" + `0772222222` → created, with the amber hint shown.

---

## Item 6 — Per-guest activity timeline

**Files:** new `src/components/dashboard/InviteeTimeline.tsx`, `src/lib/supabase.ts`, `src/lib/utils.ts`, `src/components/dashboard/AllInviteesTab.tsx`.

### Change

1. `supabase.ts` — add:

```ts
export async function fetchInviteeEvents(inviteeId: string): Promise<InviteeEvent[]>
export async function fetchLatestEventsMap(): Promise<Record<string, { lastOpenedAt?: string; openCount: number; lastSentAt?: string; respondedAt?: string }>>
```
The map version does one query — `select invitee_id, type, created_at from invitee_events order by created_at desc` — and reduces client-side, so the table doesn't fire N requests.

2. `src/lib/utils.ts` — add `formatRelativeTime(iso)` → `"2h ago"`, `"3d ago"`, `"just now"` (use `Intl.RelativeTimeFormat`).

3. Table: add an **Activity** column showing `Opened 2h ago · 3×`, or a muted `Never opened` in `#b592a0`. Make it sortable by `lastOpenedAt` so ignored guests bubble up.

4. `InviteeTimeline.tsx` — a vertical timeline rendered inside the existing expanded/detail row:
   - Nodes for `created` → `sent` → `opened` (grouped, "opened 3 times, last 2h ago") → `reminded` → `responded`.
   - Small pastel dot + connecting `1px` line in `#e08aa3/30`, icons from `lucide-react` (`UserPlus`, `Send`, `Eye`, `BellRing`, `CheckCircle2`).
   - Framer Motion staggered fade-in (`0.04s` per node), skipped when `prefers-reduced-motion`.
   - Empty state: "No activity recorded yet."
   - Lazy: only fetch the full event list when the row is expanded.

5. Add a derived "Ignored" filter chip: `sent_at != null && never opened && > 48h since sent`.

### Verify
Open an invite link in an incognito window, then check the dashboard: the Activity column shows "Opened just now" and the timeline lists the event.

---

# Visual / UX upgrades

## Item 7 — Dashboard Overview desktop layout

**File:** `src/components/dashboard/OverviewTab.tsx`.

- Restructure to a 12-column grid at `lg`: hero stat band (Attending / Headcount / Pending) spanning full width with larger type (`text-4xl` numbers, `font-display`), then a two-column row — donut chart (`lg:col-span-5`) beside Recent Responses (`lg:col-span-7`) — so nothing sits below the fold on a 1440×900 screen.
- Make the donut interactive: clicking a segment navigates to All Invitees with that status filter applied (lift the filter into `DashboardPage` state or a query param).
- Add a compact "Response velocity" sparkline (responses per day for the last 14 days, derived from `responded_at`) under the donut.
- Secondary stats (Not sent, Reminders sent, Locked) become a slim 4-up strip of small cards, not full-height boxes.
- Add skeleton placeholders that match this exact grid so there's no load flash; remove any "Polling 15s" badge copy in favour of "Synced {relative}".

## Item 8 — Invitee table → card stack on mobile

**File:** `src/components/dashboard/AllInviteesTab.tsx`.

- Below `sm`, hide the `<table>` (`hidden sm:table`) and render a `sm:hidden` list of cards: name + RSVP pill on the first line, phone + guest count on the second, activity caption on the third, and a right-aligned action row (WhatsApp / Copy / Edit / Delete) as icon buttons ≥44px touch targets.
- Selection checkbox in the card's top-left; the existing bulk toolbar becomes a sticky bottom bar on mobile showing `3 selected` + actions.
- Keep sorting/pagination controls above the list; collapse the sort control into a single `<select>` on mobile.
- Both renderings must read from the same `visibleInvitees` memo — do not duplicate filtering logic.

## Item 9 — Make the door open in real 3D

**Files:** `src/components/opening/ArchitecturalPortal.tsx`, `src/index.css`.

- Put `perspective: 1400px` on the door container (the CSS utilities already exist but are unused) and `transform-style: preserve-3d` on each half.
- Left half: `transformOrigin: 'left center'`, animate `rotateY: 0 → -78deg` plus a small `x` translate; right half mirrored (`right center`, `+78deg`).
- Ease `[0.65, 0, 0.35, 1]`, duration ~1.4s, staggered by 0.05s so the halves aren't robotically identical.
- Add a `filter: brightness()` ramp (1 → 0.82) on the inner face during the swing to fake light falloff, and a soft radial "light spill" div behind the doors that fades in as they open.
- Respect `prefers-reduced-motion`: fall back to the current 2D slide/fade.
- Keep the existing ribbon-untie timing as the trigger; the rotation should start only after the bow completes.

## Item 10 — Offline banner must not shift the page

**File:** `src/pages/GuestInvitePage.tsx`.

- Remove the conditional `pt-10` on the root element.
- Render the banner as a fixed, centred pill: `fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] rounded-full px-4 py-2 shadow-lg`, amber background, `WifiOff` icon, with a Framer Motion `y: 20 → 0` fade.
- Auto-dismiss the "back online" state with a green pill for 2.5s, then unmount.
- Apply the same treatment on `/dashboard` if it has an equivalent banner.

## Item 11 — WatercolorBackground pause behaviour

**File:** `src/components/ambient/WatercolorBackground.tsx`.

- Never pass `animate: undefined` — that freezes the blobs mid-transform and snaps on resume.
- Instead: keep a stable `animate` target and set `transition={{ duration: paused ? 0 : N, repeat: paused ? 0 : Infinity }}`, or drive it with `useAnimationControls()` and call `controls.stop()` / `controls.start(...)` on visibility change.
- When `prefersReducedMotion`, render the blobs at their resting position with no animation at all (not a frozen mid-frame).
- Do the same audit for `AmbientPetals.tsx` so both ambient layers pause and resume identically.

---

## Final checklist

- [ ] `bunx tsgo --noEmit` clean
- [ ] `bun run build:dev` succeeds
- [ ] Browser console clean on `/invite/<slug>` and `/dashboard`
- [ ] RSVP fails loudly when offline; succeeds and appears in the dashboard when online
- [ ] Deadline rule verified for both the early-open and late-open guest
- [ ] Reminder queue sends the reminder template and records `reminded_at`
- [ ] Duplicate detection only fires on name **+** phone match
- [ ] Timeline shows opens/sends/responses per guest
- [ ] Overview fills the desktop viewport; invitee list is a card stack on mobile
- [ ] Door swings in 3D; reduced-motion fallback intact
- [ ] Offline pill causes no layout shift
