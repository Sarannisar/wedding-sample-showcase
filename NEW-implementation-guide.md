# Wedding Invitation App — Improvement Implementation Guide (for Antigravity)

Project: React 18 + Vite 5 + TypeScript + Tailwind CSS v3 + Framer Motion + GSAP + Supabase.
Routes: `/invite/:slug` (guest), `/dashboard` (host, no auth yet).

How to use this document in Antigravity:
1. Open the repo in Antigravity and let the agent index it (Cascade / Agent panel).
2. Work **one task at a time**. Paste the "Prompt for Antigravity" block of a single task into the agent, attach the files listed under "Files to touch" with `@file`, and let it plan → apply → review the diff.
3. After each task run `bunx tsgo --noEmit && bun run build:dev`, then reload the preview and click through the affected screen before starting the next task.
4. Commit after every green task so you can revert a single change cleanly.

Rules to give the agent once, at the start of the session (paste as a "rule" or in `.agentrules`):

```
- Never hardcode colors. Use the existing tokens in src/index.css / tailwind.config.js
  (accent #e08aa3, secondary #f7c1d0, bg #fffafc, text #4a3038, muted #b592a0).
- Never edit src/integrations/supabase/client.ts, previewAuthStorage.ts, types.ts, .env,
  or supabase/config.toml.
- Keep guest-facing copy in src/config/weddingConfig.ts, not inline in components.
- Every new public table needs GRANTs + RLS policies in the same migration.
- Respect prefers-reduced-motion in every new animation.
- TypeScript strict: no `any`, no non-null assertions on network data.
```

---

## Phase 0 — Bugs and hygiene (do these first)

### 0.1 Fix the invalid DOM prop warning
Symptom: console logs `React does not recognize the '%s' prop on a DOM element`.
Cause: a camelCase prop (usually `fetchPriority`, or a Framer Motion prop) is spread onto a plain DOM node.

Files to touch: any component rendering `<img>`/`<video>` with spread props — start with `src/components/invitation/*`, `src/components/opening/*`.

Prompt for Antigravity:
```
Find every place where props are spread onto a native DOM element (<img>, <video>, <div>)
in src/. Identify the invalid camelCase prop causing React's "does not recognize the prop"
warning. Fix it by using the correct lowercase attribute (fetchpriority) or by destructuring
the prop out before spreading. Do not change behaviour. Show me the console before/after.
```
Verify: reload `/invite/<slug>`, console must be clean.

### 0.2 Remove the invalid video preload
`index.html` line ~29 preloads an mp4 with `as="video"`, which Chrome ignores and warns about.

Prompt:
```
In index.html, remove the <link rel="preload" as="video"> tag. Instead, on the component
that renders that video, set preload="metadata" and add a poster image
(/assets/invite_card_bg_poster.webp). Keep the image preloads as-is.
```

### 0.3 Kill dead code and dead assets
Prompt:
```
Scan src/ for unused exports, unused components (e.g. anything referencing a removed
VideoSection), and unused imports. Also list files in public/assets that are never referenced
in code. Delete the unused source code; only LIST the unused assets, do not delete them.
```

### 0.4 Error boundaries actually wired
Prompt:
```
src/components/common/ErrorBoundary.tsx exists. Verify it wraps (a) the whole app in
src/App.tsx and (b) each of the invitation sections in InvitationSuite.tsx individually,
so one failing section shows a small pastel "This section couldn't load" card instead of
blanking the invitation. Add a "Reload" button in the fallback.
```

---

## Phase 1 — Invitation (guest side)

### 1.1 Remember RSVP state on the device
Goal: reopening the link shows "You're attending — 3 guests. Change response?" instead of restarting the 3-step flow.

Files: `src/components/invitation/RsvpSection.tsx`, `src/lib/supabase.ts`.

Prompt:
```
In RsvpSection, when the invitee record already has rsvp !== 'pending' (from the DB) OR
localStorage key `rsvp_<slug>` exists, skip the 3-step flow and render a confirmation card:
the chosen status, guest count, and a subtle "Change my response" text button that re-enters
the flow at step 1 pre-filled. Write localStorage on successful submit. DB value always wins
over localStorage on conflict.
```

### 1.2 Optimistic submit + error recovery
Prompt:
```
Make RSVP submission optimistic: disable the button, show an inline spinner in the button,
render the success card immediately, and if the Supabase call rejects, roll back to the form,
keep the user's selections, and show an inline error with a Retry button. Add a 10s timeout.
Do not use window.alert.
```

### 1.3 Toast system (sonner)
Prompt:
```
Install sonner. Mount <Toaster position="top-center" richColors /> once in src/App.tsx,
themed with the pastel palette (rounded-2xl, border #f7c1d0, bg #fffafc, text #4a3038).
Replace all silent success/failure paths in RsvpSection, DashboardPage, AllInviteesTab,
AddImportTab, csvHelper and calendar.ts with toast.success / toast.error calls.
Keep messages short and warm, e.g. "Your RSVP is saved 💗".
```
Run: `bun add sonner`.

### 1.4 Section-level scroll reveal polish
Prompt:
```
Audit every section in InvitationSuite for Framer Motion useInView reveals. Standardise on
one shared hook src/lib/useReveal.ts: { opacity 0->1, y 24->0, duration 0.7,
ease [0.22,1,0.36,1], margin '-80px', once: true } and disable transforms entirely under
prefers-reduced-motion. Refactor sections to use it instead of ad-hoc variants.
```

### 1.5 Countdown at zero + past-date state
Prompt:
```
CountdownSection: when the target date has passed, replace the timer with a celebratory card
("Today is the day" on the event day, "Thank you for celebrating with us" after). Add
aria-live="polite" and pluralisation. Verify by temporarily overriding the date, then revert.
```

### 1.6 Share / save invite
Prompt:
```
Add a small footer action row to the invitation: "Save invitation" (uses navigator.share when
available, otherwise copies the URL and toasts) and the existing Add to Calendar. No WhatsApp
share section — the user removed that deliberately, do not re-add it.
```

### 1.7 Performance for mobile data
Prompt:
```
Code-split the dashboard away from the guest bundle: React.lazy + Suspense on DashboardPage
in the router, with a pastel skeleton fallback. Also lazy-load framer-motion-heavy dashboard
charts. Target: guest route initial JS under 300 kB gzipped. Report before/after bundle sizes
from `bun run build:dev`.
```

### 1.8 Accessibility pass
Prompt:
```
Accessibility audit of the invitation: every interactive element must be a real <button>/<a>
with an accessible name; the scratch card needs a keyboard-accessible "Reveal date" fallback;
the music toggle needs aria-pressed; focus-visible rings everywhere; heading order is a single
h1 then h2s; decorative images get alt="". Fix everything you find.
```

---

## Phase 2 — Dashboard (host side)

### 2.1 Skeleton loading states
Prompt:
```
Replace the single spinner in DashboardPage with skeleton UI: stat-card skeletons on Overview
and 6 shimmering row skeletons in AllInviteesTab. Reuse the ShimmerSweep component styling.
```

### 2.2 Stat hierarchy on Overview
Prompt:
```
Restructure OverviewTab: make Attending, Total Headcount and Pending large primary cards
(bigger number, accent border) in a 3-col grid, and demote the rest to a compact secondary row.
Keep the donut chart to the right on desktop, stacked on mobile.
```

### 2.3 Interactive donut chart
Prompt:
```
Add hover tooltips to the RSVP donut (segment label + count + percentage) and make clicking a
segment navigate to the All Invitees tab with the matching status filter applied. Lift the
active filter into DashboardPage state so both tabs share it.
```

### 2.4 Empty states
Prompt:
```
Add empty states: Overview with 0 invitees shows a friendly pastel card with a floral glyph
and a "Add your first guest" button that switches to the Add & Import tab; All Invitees with
0 search results shows "No guests match '<query>'" plus a Clear search button.
```

### 2.5 Mobile card-stack table
Prompt:
```
AllInviteesTab: below md, replace the horizontally scrolling table with a stack of cards —
name + status pill on the first line, phone and guest count on the second, and an actions
overflow menu (Copy link, WhatsApp, Mark sent, Edit, Delete). Keep the table for md and up.
Selection checkboxes must work in both layouts.
```

### 2.6 Sorting, pagination, and sticky bulk bar
Prompt:
```
Add column sorting (name, status, guest count, responded_at, shared_at) with a persisted sort
preference in localStorage, and paginate at 25 rows with a "Load more" button. When rows are
selected, show a sticky bottom bar with the count and the bulk actions instead of inline
buttons.
```

### 2.7 Undo destructive actions
Prompt:
```
Delete should be optimistic with a 6-second "Guest removed — Undo" toast that restores the row
(and cancels the Supabase delete if undone). Same pattern for bulk delete.
```

### 2.8 Duplicate detection on import
Prompt:
```
In AddImportTab CSV import, detect duplicates by normalised phone and by slug before inserting.
Show a preview table of parsed rows with per-row status (New / Duplicate / Invalid phone) and
let the host deselect rows before confirming the import. Report a summary toast afterwards.
```

### 2.9 Realtime updates
Prompt:
```
Subscribe to Supabase realtime changes on the invitees table in DashboardPage and merge
inserts/updates/deletes into local state so RSVPs appear live without refresh. Clean up the
channel on unmount. Guard against duplicate rows from the optimistic paths.
```

---

## Phase 3 — Backend and data

### 3.1 Verify RLS and grants
Prompt:
```
Read the current schema for public.invitees and any events table. Confirm RLS is enabled and
that policies plus GRANTs exist for the roles the app actually uses. The 406/403 responses in
the console suggest a missing policy or grant — find the failing request in the network panel,
identify the table and operation, and write a migration that fixes it. Include GRANT
statements in the same migration.
```

### 3.2 Analytics events
Prompt:
```
Ensure logInviteeEvent records 'opened', 'rsvp_submitted', 'calendar_added' and 'maps_opened'.
Surface per-guest "last opened" and an "Opened but not responded" count on the Overview tab.
```

---

## Phase 4 — Authentication (do this last, as planned)

Do not implement yet. When ready:
```
Add Lovable Cloud email+password auth gating /dashboard only. Roles live in a separate
user_roles table with a security-definer has_role() function — never a role column on
profiles. The guest route /invite/:slug must stay fully public.
```

---

## Verification checklist (run after every phase)

```bash
bunx tsgo --noEmit
bun run build:dev
```

Manual pass:
- `/invite/<real-slug>` — loader → ribbon unties → doors open → music starts → scroll to bottom, no layout jump, no console errors.
- `/invite/<bad-slug>` — privacy card renders.
- `/dashboard` — add a guest, import a CSV, edit inline, mark sent, delete + undo, export CSV.
- Mobile viewport (390×844) and desktop (1280×900).
- Toggle "Reduce motion" in OS settings and reload — animations must degrade, not break.

## Suggested order

Phase 0 → 1.3 (toasts, unblocks everything) → 1.1, 1.2 → 2.1, 2.2, 2.4 → 2.5 → 2.6, 2.7 → 1.7 → 2.8, 2.9 → 3.x → 1.4, 1.5, 1.6, 1.8 → Phase 4.
