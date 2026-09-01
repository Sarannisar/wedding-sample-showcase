# Implementation Plan — Invitation & Dashboard Upgrades

Scope: improvements 1, 2, 3, 5, 6, 8, 10, 11, 12, 13, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30.
Excluded by request: 4 (video), 7 (Google Calendar link), 9 (scratch memory), 14 (auth), 19 (WhatsApp templates).

Order is deliberate: foundations first (toasts, errors, data), then dashboard, then invitation polish, then performance.

---

## Phase 0 — Foundations

### Step 1 — Toast system (#28)
- `bun add sonner`.
- Mount `<Toaster richColors position="top-center" />` once in `src/App.tsx`, styled with the pastel tokens (`#e08aa3` accent, `#fffafc` surface).
- Create `src/lib/notify.ts` wrapping `toast.success / error / info` so call sites never import sonner directly.
- Replace every silent success/failure path: RSVP submit, add invitee, bulk import, delete, mark sent, CSV export, copy link.

### Step 2 — Error boundaries (#29)
- Create `src/components/common/ErrorBoundary.tsx` (class component, `componentDidCatch`, logs to console).
- Fallback UI: soft floral card with "Something went wrong" + Reload button, matching theme.
- Wrap the guest route subtree and the dashboard route subtree separately in `src/App.tsx` so one crash never blanks the other.

### Step 3 — Backend schema for activity trail (#20)
Single migration:
- `create table public.invitee_events (id uuid pk default gen_random_uuid(), invitee_id uuid references public.invitees(id) on delete cascade, type text not null check (type in ('created','sent','opened','responded')), created_at timestamptz default now())`.
- `GRANT SELECT, INSERT ON public.invitee_events TO anon, authenticated; GRANT ALL TO service_role;`
- Enable RLS; policies: insert allowed for anon (page-open logging), select allowed for anon/authenticated (dashboard has no auth yet).
- Index on `(invitee_id, created_at desc)`.

---

## Phase 1 — Data layer

### Step 4 — Harden `src/lib/supabase.ts`
- Every helper returns `{ data, error }` instead of swallowing failures, so callers can toast.
- Add `logInviteeEvent(inviteeId, type)`; fire-and-forget, never blocks UI.
- Add `fetchInviteeEvents(inviteeId)` for the activity trail.
- Add `softDeleteInvitee` / `restoreInvitee` pair used by undo (keep the row in memory, re-insert on undo — simplest given no `deleted_at` column).

### Step 5 — Realtime connection status (#22)
- In `DashboardPage`, capture channel status from `.subscribe((status) => ...)` into state: `connecting | live | offline`.
- On `CHANNEL_ERROR`/`TIMED_OUT`, fall back to the 15s polling interval and set `offline`.
- Render a small status dot + label next to the refresh button (green = live, amber = polling, red = offline).

---

## Phase 2 — Dashboard functional

### Step 6 — Undo delete (#15)
- On single or bulk delete: optimistic removal from state, then `notify` toast with an "Undo" action lasting 5s.
- Keep the removed rows in a ref; Undo re-inserts them via `createInvitee` preserving slug/rsvp/notes; timeout finalizes the DB delete.

### Step 7 — CSV import preview diff (#16)
- In `AddImportTab`, parse the file into a staged list before writing.
- Classify each row: `new`, `duplicate` (slug or normalized name/phone already present), `invalid` (empty name, malformed phone).
- Show a review table with counts, per-row badges, and checkboxes to skip rows; "Import N guests" commits only the selected new rows.
- Toast the outcome summary.

### Step 8 — Sorting + pagination (#17)
- `AllInviteesTab`: sortable headers (name, rsvp, guest count, responded date, sent date) with an arrow indicator; sort state in `useState`.
- Client-side pagination, 25 rows/page, with page-size selector (25/50/100) and "Showing X–Y of Z".
- Select-all applies to the filtered set, not just the visible page (state it explicitly in the UI).

### Step 9 — Filter chips (#18)
- Chip row above the table: All, Attending, Declined, Pending, Not sent — each showing a live count.
- Chips combine with the existing deferred search; clearing shows a "Clear filters" pill.

### Step 10 — Activity trail (#20)
- Log `opened` from `GuestInvitePage` on first mount per slug (guard with `sessionStorage` so a reload doesn't spam).
- Log `sent` in `markInviteeShared`, `responded` in the RSVP submit path, `created` on invitee creation.
- Expandable row detail in `AllInviteesTab` renders a vertical timeline of events with relative timestamps.
- Add an "Opened" column/badge so the host can see who has viewed but not replied.

### Step 11 — Printable guest list / seating export (#21)
- New `src/lib/printList.ts` producing a print-optimized HTML view (attending list, guest counts, total headcount, notes).
- "Print / Save as PDF" button on Overview opens it in a new window and calls `window.print()`.
- Add a `print.css` block: hide chrome, black-on-white, page-break-inside avoid on rows.
- Also export a seating-count CSV (name, party size) alongside the existing full CSV export.

---

## Phase 3 — Dashboard visual

### Step 12 — Stat card context (#23)
- Extend `StatCard` with optional `subtext` and `progress` props.
- Overview shows "12 of 40 responded · 30%" with a thin progress bar under each relevant stat.

### Step 13 — Table readability + mobile cards (#24)
- Zebra striping on odd rows, sticky header (`sticky top-0 bg-[#fffafc]/95 backdrop-blur`), generous row height.
- Below `md`: render each invitee as a stacked card (name + status badge, phone, actions row) instead of a horizontally scrolling table.

### Step 14 — Notes tooltip (#25)
- Truncated notes get a shadcn `Tooltip` (and tap-to-expand on touch) showing the full text.

### Step 15 — Empty states (#26)
- First-run Overview: illustration-free floral card, "No guests yet", CTA button jumping to Add & Import.
- Empty filtered table: "No guests match these filters" + Clear filters.
- Empty CSV preview: format hint with a sample row.

### Step 16 — Skeletons (#27)
- Replace the single spinner with skeleton stat cards and 6 skeleton table rows using a shimmer animation already available in the theme.

---

## Phase 4 — Invitation functional

### Step 17 — RSVP persistence on device (#1)
- Persist `{ slug, rsvp, guestCount, respondedAt }` to `localStorage` on success, and hydrate from the fetched invitee record when it exists (DB wins over local).
- If already responded, `RsvpSection` opens in a summary state: "You're attending — 3 guests" with a "Change response" link that reopens the 3-step flow.

### Step 18 — RSVP feedback + error handling (#2)
- Submit button enters a pending state (spinner, disabled).
- Success → confirmation animation + toast; failure → error toast, keep form data, offer Retry.
- No silent failure paths remain.

### Step 19 — Unknown slug handling (#3)
- Remove the invented fallback invitee in `GuestInvitePage`.
- Missing slug → graceful "This invitation link isn't valid" card with the couple's names and the host contact numbers; no RSVP form.
- `/invite` with no slug → generic invitation with the RSVP form hidden.

### Step 20 — Music polish (#5)
- Fade volume in over ~1.5s on start and fade out on toggle-off (interval-based ramp).
- Persist the mute choice in `localStorage`; respect it on next visit.
- If `play()` rejects (autoplay blocked), surface a subtle pulsing "Tap for music" pill near the toggle; dismiss on first successful play.

### Step 21 — Countdown states (#6)
- `CountdownSection` gains three extra states: "It's today, Insha Allah", "Happening now" (during the event window), and "Thank you for celebrating with us" after it ends.
- Stop the interval once the event has passed.

### Step 22 — Loading / offline gate (#8)
- Preload the door and crest images before the opening sequence starts; show the floral loader until they resolve or a 4s timeout elapses.
- `navigator.onLine` listener → offline banner ("You're offline — RSVP will fail"), disable RSVP submit while offline.

---

## Phase 5 — Invitation visual

### Step 23 — Section rhythm (#10)
- Alternate card max-widths and slight horizontal offsets between sections.
- Insert a small floral/ornamental SVG divider between major sections; vary the scroll-reveal direction (left/right/up) per section.

### Step 24 — Fluid typography (#11)
- Hero names, section headers, and Arabic blessing switch to `clamp()` sizing.
- Reduce tracking on very small screens so long names don't wrap awkwardly.

### Step 25 — Accessibility pass (#12)
- Add `focus-visible` ring tokens to all interactive elements (scroll guide, music toggle, RSVP buttons, scratch card, map/calendar buttons).
- `prefers-reduced-motion` coverage for glow tracer, scroll guide, petals, ribbon untie — replace with instant states.
- ARIA labels for the scratch card and the countdown live region.

### Step 26 — Animation battery guard (#13)
- Central `useAmbientActive()` hook: pauses petals, watercolor drift, and glow when `document.hidden`, when the user prefers reduced motion, or on low-core devices (`navigator.hardwareConcurrency <= 4` → reduce petal count).
- Cancel `requestAnimationFrame` loops on pause instead of running them invisibly.

---

## Phase 6 — Performance

### Step 27 — Code splitting (#30)
- `React.lazy` + `Suspense` for `DashboardPage`, and lazy-load heavy invitation sections below the fold.
- Manual Rollup chunks for `framer-motion` and the Supabase client.
- Target: guest route initial JS well under 300 kB gzipped; re-check the Vite chunk warning after the split.

---

## Verification checklist
- `bunx tsgo --noEmit` and `bun run build:dev` clean.
- Playwright pass at 1280×1800: door sequence → invitation → RSVP submit (success and forced failure) → repeat visit shows summary state.
- Dashboard pass: import 50-row CSV with duplicates, sort, paginate, filter chips, delete + undo, print view, offline realtime dot.
- Mobile viewport check (390×844) for table cards and typography.
- Lighthouse on the guest route after code splitting.

## Suggested sequencing
1. Phase 0 + Phase 1 (one pass — everything else depends on it)
2. Phase 2 + Phase 3 (dashboard complete)
3. Phase 4 + Phase 5 (invitation complete)
4. Phase 6 (performance, last)
5. Auth (deferred, your call)
