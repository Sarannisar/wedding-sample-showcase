# 🌸 Safiyya & Sharrafuth — Wedding Invitation & Host Dashboard

A bespoke, production-ready, full-stack digital wedding invitation platform and administrative management suite built for **Safiyya & Sharrafuth's Wedding Ceremony** on **Saturday, 12th December 2026** at **Glen Reception Hall, Dehiwala**.

Built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, **Framer Motion**, and **Supabase** (PostgreSQL, Row-Level Security, and Edge Functions).

---

## Table of Contents
1. [Platform Architecture & Overview](#platform-architecture--overview)
2. [The Guest Invitation Experience (`/invite/:slug`)](#the-guest-invitation-experience-inviteslug)
   - [Interactive Gate & Double-Door Opening](#1-interactive-gate--double-door-opening)
   - [Personalized Hero & Islamic Calligraphy](#2-personalized-hero--islamic-calligraphy)
   - [Live Countdown Clock](#3-live-countdown-clock)
   - [Event & Venue Details with Google Maps](#4-event--venue-details-with-google-maps)
   - [Smart 3-Step RSVP Engine](#5-smart-3-step-rsvp-engine)
   - [1-Tap WhatsApp Host RSVP Nudge](#6-1-tap-whatsapp-host-rsvp-nudge)
   - [RSVP Deadline & Lock Protection](#7-rsvp-deadline--lock-protection)
   - [PWA Offline Support & Audio Nasheed Player](#8-pwa-offline-support--audio-nasheed-player)
3. [The Host Administrative Dashboard (`/dashboard`)](#the-host-administrative-dashboard-dashboard)
   - [Bridal Authentication & Security](#1-bridal-authentication--security)
   - [Overview & Analytics Tab](#2-overview--analytics-tab)
   - [All Invitees Management Center](#3-all-invitees-management-center)
   - [Printable Day-Of Reception & Usher Roster](#4-printable-day-of-reception--usher-roster)
   - [Add & CSV Bulk Import Tab](#5-add--csv-bulk-import-tab)
4. [Configuration & Environment Variables](#configuration--environment-variables)
5. [Local Development & Deployment Commands](#local-development--deployment-commands)

---

## Platform Architecture & Overview

The platform is divided into two distinct, interconnected systems:

```
                                  ┌───────────────────────────────┐
                                  │   Supabase Cloud Database    │
                                  │   (PostgreSQL + Auth + RLS)   │
                                  └──────────────┬────────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        │                                                 │
                        ▼                                                 ▼
        ┌──────────────────────────────┐                  ┌──────────────────────────────┐
        │   Guest Invitation Client    │                  │  Host Administrative Portal  │
        │      `/invite/:slug`         │                  │         `/dashboard`         │
        ├──────────────────────────────┤                  ├──────────────────────────────┤
        │ • Double-door 3D animation   │                  │ • Password-only Bridal Auth  │
        │ • Personalized name & audio  │                  │ • Live Attendance Donut      │
        │ • 3-Step RSVP + Confetti     │                  │ • 14-Day Response Sparkline  │
        │ • 1-Tap WhatsApp Host Nudge  │                  │ • Modular Guest List Table   │
        │ • Add to Calendar & Maps     │                  │ • Day-Of Usher Check-in Sheet│
        │ • Installable PWA cache      │                  │ • CSV Bulk Import & Export   │
        └──────────────────────────────┘                  └──────────────────────────────┘
```

---

## The Guest Invitation Experience (`/invite/:slug`)

Every invited guest receives a personalized, shareable URL formatted as `https://<domain>/invite/<guest-slug>` (e.g., `/invite/dr-farhan-family`).

### 1. Interactive Gate & Double-Door Opening
- **Visual Presentation**: When a guest opens their link, they are welcomed by an ornate royal palace gate featuring high-resolution doors (`fancy_door_left.webp` & `fancy_door_right.webp`) adorned with golden door handle crests.
- **Micro-Interaction**: Clicking or tapping the handle unlatches the gate with a smooth 3D swing opening animation powered by Framer Motion, revealing the invitation card underneath with a soft golden bloom.
- **Audio Nasheed Accompaniment**: Unlatching the gate smoothly starts the traditional wedding background instrumental/nasheed, with a persistent sound control button in the top corner allowing guests to mute or adjust playback anytime.

### 2. Personalized Hero & Islamic Calligraphy
- **Sacred Invocations**: Features authentic Arabic calligraphic rendering of *Bismillahir Rahmanir Raheem* (بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ) with its English translation.
- **Personalized Guest Salutation**: The guest's exact name is dynamically injected into the invitation text (e.g., *"Dear Dr. Farhan & Family, the family of Mr. and Mrs. Ilyas cordially invite you..."*).
- **Couple Presentation**: Features the names **Safiyya Ilyas & Sharrafuth Najiullah** set in elegant typography with cultural inscriptions (*Insha Allah* / إِنْ شَاءَ اللَّهُ).

### 3. Live Countdown Clock
- Real-time countdown clock displaying remaining **Days**, **Hours**, **Minutes**, and **Seconds** until Saturday, 12th December 2026, 12:30 PM.
- Automatically updates in real time and transforms into a celebration banner once the event commences.

### 4. Event & Venue Details with Google Maps
- **Ceremony Card**:
  - **Date**: Saturday, 12th December 2026 (٣ رَجَب ١٤٤٨)
  - **Time**: 12:30 PM onwards
  - **Venue**: Glen Reception Hall, 325 Attidiya Rd, Dehiwala-Mount Lavinia
- **One-Tap Actions**:
  - **Get Directions**: Opens Google Maps directly pinned to Glen Reception Hall with coordinates.
  - **Add to Calendar**: Generates an `.ics` calendar invite compatible with Apple Calendar, Google Calendar, and Microsoft Outlook.

### 5. Smart 3-Step RSVP Engine
An intuitive multi-step form built into a 3D perspective card:
1. **Step 1 — Attendance Choice**: Guest chooses between **"Joyfully Accept"** (Emerald) or **"Regretfully Decline"** (Rose).
2. **Step 2 — Party Size & Dietary Notes**:
   - If attending, a circular stepper (`-` / `+`) allows selecting the confirmed party headcount (1 to 10 guests).
   - A multi-line text input lets guests submit special dietary requirements (e.g., vegetarian, allergies) or personal congratulations/du'as to the bride and groom.
3. **Step 3 — Celebration & Confetti**:
   - Submitting the RSVP triggers an instant colorful confetti cannon burst (`canvas-confetti`).
   - The card transitions to a confirmation state summarizing confirmed party size and notes.
   - An **"Edit Response"** button allows guests to adjust their response if their plans change before the deadline.

### 6. 1-Tap WhatsApp Host RSVP Nudge
- Immediately upon completing their RSVP, guests see a dedicated card:
  > **Quick Update for Host (Safiyya)**
  > `[ Send Confirmation to Host on WhatsApp ]`
- **How It Works**:
  - Tapping this button opens WhatsApp directly addressed to the host's phone number (`HOST_WHATSAPP_NUMBER`).
  - Pre-fills a beautifully formatted Islamic confirmation message with the guest's name, attendance decision, confirmed seats, and notes.
  - **Zero Server Setup**: Works seamlessly on mobile and desktop without requiring any external email delivery service or webhook infrastructure.

### 7. RSVP Deadline & Lock Protection
- Governed by [`src/lib/rsvpDeadline.ts`](file:///d:/new_invite/src/lib/rsvpDeadline.ts).
- Standard invitations have a cutoff of **7 days before the ceremony**; late invitations have a cutoff of **1 day before**.
- **Lock Guard**: If a guest has submitted custom dietary notes or the cutoff deadline passes, the status is automatically locked to prevent accidental modifications, displaying a friendly prompt advising them to contact the family directly.

### 8. PWA Offline Support & Audio Nasheed Player
- Installable on iOS and Android devices as a standalone Progressive Web App.
- Uses Service Worker caching (`public/sw.js` v3) to precache images, fonts, and stylesheets so guests can revisit their invitation even with intermittent connectivity.
- Accompanied by high-resolution multi-size icons (192px, 512px, Apple touch icon).

---

## The Host Administrative Dashboard (`/dashboard`)

The host dashboard allows the bride and family to oversee RSVPs, manage invitees, coordinate reminders, and print day-of check-in sheets.

### 1. Bridal Authentication & Security
- **Access Route**: `/dashboard`
- **Password-Only Login**: Designed specifically for the bride (**Safiyya**). She never has to type her email on mobile or desktop — `safiyya@mywedding.com` is automatically used.
- **Press-and-Hold Reveal**: To prevent shoulder-surfing, the password reveal button only reveals the password while actively being held down, automatically re-masking when released.
- **Flexible Session Management**:
  - **Default**: Session is remembered for **5 days** before requiring re-entry.
  - **Remember Me**: Checking "Remember Me" extends session persistence to **30 days**.
- **Alternative Login**: A subtle *"login with different email?"* toggle allows co-hosts or developers to authenticate with other admin credentials.
- **Row-Level Security (RLS)**: Enforced directly at the PostgreSQL database layer, preventing unauthenticated read or write access to the invitee database.

---

### 2. Overview & Analytics Tab

Provides an executive summary of wedding attendance and response velocity:

1. **Hero KPI Cards**:
   - **Attending Parties**: Total number of confirmed invitations with percentage progress bar.
   - **Total Headcount**: Sum total of confirmed seats across all attending parties.
   - **Declined & Pending**: Exact counts of declined responses and pending outstanding invitations.
   - **Sent Invitations & Reminders**: Total links sent via WhatsApp and total reminders delivered.
2. **Interactive Attendance Donut Chart**:
   - An SVG-rendered breakdown of Attending vs. Declined vs. Pending guests with animated segment hover states.
3. **14-Day RSVP Velocity Sparkline**:
   - Tracks response volume per day over the previous two weeks to monitor response trends.
4. **Recent Response Activity Feed**:
   - Live timeline of the last 8 responses received with guest name, status, and relative time (e.g., *"2 hours ago"*).
5. **Guest Notes & Dietary Summary**:
   - Automatically collates all dietary requirements and personal notes submitted by guests into a dedicated, searchable section for the caterer.
6. **Top Action Bar**:
   - **Print All**: Opens a printable master PDF guest list.
   - **Print Attending**: Generates a clean list of attending guests.
   - **Seating CSV**: Downloads a CSV file with party sizes and guest names for seating chart planning.
   - **Day-Of Sheet**: Launches the comprehensive Reception & Usher Check-in Sheet.

---

### 3. All Invitees Management Center

The centerpiece of guest management, refactored into modular subcomponents in `src/components/dashboard/invitees/`:

#### A. Invitees Toolbar ([`InviteesToolbar.tsx`](file:///d:/new_invite/src/components/dashboard/invitees/InviteesToolbar.tsx))
- **Live Search**: Instant real-time filtering by guest name, phone number (`+94...`), or invitation URL slug.
- **Real-Time Chip Filters with Dynamic Count Badges**:
  - `All`: Total guest list count.
  - `Attending`: Confirmed parties.
  - `Declined`: Parties unable to attend.
  - `Pending`: Unanswered invitations.
  - `Opened (Unresponded)`: Guests who opened their link but haven't submitted an RSVP.
  - `Not Sent`: Guests who haven't received their WhatsApp invite link yet.
  - `Ignored (48h+)`: Invitations sent over 48 hours ago that haven't been opened.
- **Mobile Sort Dropdown**: Quick sorting by Name (A-Z), RSVP status, Headcount, Activity, Sent Date, or Responded Date.
- **Toolbar Action Buttons**:
  - **Remind Pending**: Initiates a guided reminder flow for pending guests.
  - **Export CSV**: Downloads the currently filtered list as a CSV spreadsheet.
  - **Day-Of Sheet**: Opens the reception roster for the currently filtered selection.

#### B. Batch Action Bar ([`BatchActionBar.tsx`](file:///d:/new_invite/src/components/dashboard/invitees/BatchActionBar.tsx))
- Appears whenever one or more guests are selected (sticky on mobile).
- **Select All Filtered**: Allows selecting all matching guests across pagination pages with 1 click.
- **Bulk Mark Sent**: Marks all selected guests as sent in one action.
- **Bulk Delete**: Safely removes selected guests with a **5-second undo toast**.
- **WhatsApp Sequential Queue**:
  - Automatically loads selected guests into a queue.
  - Opens each guest's WhatsApp message one-by-one.
  - Click **"Open & Next"** to advance through the list seamlessly without losing your place.

#### C. Desktop Table & Mobile Cards ([`InviteesDesktopTable.tsx`](file:///d:/new_invite/src/components/dashboard/invitees/InviteesDesktopTable.tsx) & [`InviteesMobileList.tsx`](file:///d:/new_invite/src/components/dashboard/invitees/InviteesMobileList.tsx))
- **Inline Editing**: Click the pencil icon to edit any guest's name or phone number directly without opening a separate page.
- **RSVP Status Override**: Dropdown to change RSVP status. If custom notes exist, the status is lock-protected with a badge. Changing to "Attending" prompts for confirmed headcount.
- **Activity & Open Tracking**: Displays how many times the guest opened their invitation and when it was last viewed.
- **Expandable Activity Timeline**: Clicking on the activity badge unfolds the [`InviteeTimeline.tsx`](file:///d:/new_invite/src/components/dashboard/InviteeTimeline.tsx) showing exact timestamps for creation, sharing, opens, and RSVP submissions.
- **Direct Row Actions**:
  - `WA`: Launches WhatsApp with pre-filled personal invitation message.
  - `Copy Message`: Copies formatted WhatsApp invitation text to clipboard.
  - `Copy Link`: Copies the short link `/invite/:slug`.
  - `External Link`: Opens the guest's personalized invitation in a new tab.
  - `Delete`: Prompts for confirmation with 5-second undo grace period.

#### D. Pagination Controls ([`InviteesPagination.tsx`](file:///d:/new_invite/src/components/dashboard/invitees/InviteesPagination.tsx))
- Choose between **25**, **50**, **100**, or **All** items per page.
- Previous / Next buttons with page counter and summary of currently visible items.

#### E. Confirmation & Reminder Modals ([`InviteesModals.tsx`](file:///d:/new_invite/src/components/dashboard/invitees/InviteesModals.tsx))
- **RSVP Change Modal**: Confirms manual overrides and lets you specify the party size.
- **Single & Bulk Delete Modals**: Displays preview cards of affected invitees and guarantees a 5-second undo window.
- **Reminder Queue Modal**:
  - Displays guest details, reminder count, and preview of the reminder message.
  - **48-Hour Throttle Guard**: Alerts you if the guest was reminded recently, with an override checkbox if you wish to send anyway.
  - Actions: **Copy Text**, **Skip**, or **Open WhatsApp**.

---

### 4. Printable Day-Of Reception & Usher Roster

Accessible via the **"Day-Of Sheet"** button on the Overview Tab and the Invitees Toolbar:
- **Arrival Checkboxes**: Physical `[ ]` check-in boxes designed for ushers with clipboards to tick off guests as they arrive at the venue.
- **Dietary & Special Notes**: Highlighted in soft amber boxes so ushers and table coordinators immediately see catering requirements before seating guests.
- **Touchpoint History**: Summarizes when the invitation was sent, how many times it was opened, when they RSVP'd, and reminder counts.
- **Header & Venue Banner**: Displays bride & groom names, event date, venue address, and coordinator KPI metrics (Attending Parties, Confirmed Seats, Dietary Notes Count, Total on Roster).
- **Print Optimization**: Automatically formats for standard **A4 portrait** printing (`@media print` rules eliminate UI buttons, ensure crisp borders, and prevent table row splitting across pages).

---

### 5. Add & CSV Bulk Import Tab

- **Add Single Guest**:
  - Form fields: Full Name, Phone Number (e.g. `+9477...`), Expected Party Size.
  - URL slug is automatically generated in real-time from the name (e.g., *"Uncle Nizar & Family"* ➔ `uncle-nizar-family`).
- **CSV Bulk Import**:
  - Upload any `.csv` file containing names and phone numbers.
  - Interactive column mapping interface (maps your spreadsheet headers to `Name` and `Phone`).
  - Real-time preview with validation and duplicate detection against existing guests.
  - 1-click batch import directly into Supabase.

---

## Configuration & Environment Variables

All ceremony details, cultural texts, and templates are centrally organized in [`src/config/weddingConfig.ts`](file:///d:/new_invite/src/config/weddingConfig.ts).

### Environment Variables (`.env`)

| Variable | Description | Example |
|---|---|---|
| `HOST_WHATSAPP_NUMBER` | Host phone number for 1-tap WhatsApp RSVP confirmations | `"+966551467155"` |
| `VITE_SUPABASE_URL` | Supabase Project API URL | `"https://xxxx.supabase.co"` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Public Anonymous API Key | `"eyJhbGciOi..."` |
| `VITE_SUPABASE_PROJECT_ID` | Supabase Project Identifier | `"siqtgmsxrwhnlfpvybhw"` |
| `VITE_SUPABASE_PUBLISHABLE_KEY`| Supabase Publishable Key | `"sb_publishable_..."` |

### Customizing Ceremony Content ([`src/config/weddingConfig.ts`](file:///d:/new_invite/src/config/weddingConfig.ts))

To modify ceremony dates, couple names, venue, or WhatsApp messages, simply update the configuration object:

```typescript
export const weddingConfig: WeddingConfig = {
  couple: {
    bride: 'Safiyya',
    groom: 'Sharrafuth',
    brideFull: 'Safiyya Ilyas',
    groomFull: 'Sharrafuth Najiullah',
  },
  event: {
    type: 'Wedding Ceremony',
    label: 'Wedding Ceremony',
    dayAndDate: 'Saturday, 12th December 2026',
    hijriDate: '٣ رَجَب ١٤٨',
    time: '12:30 PM onwards',
    targetDate: '2026-12-12T12:30:00+05:30',
    venue: {
      name: 'Glen Reception Hall',
      address: '325 Attidiya Rd, Dehiwala-Mount Lavinia',
      mapsUrl: 'https://maps.app.goo.gl/edSeLip4NdWWpk4X9',
    },
  },
  admin: {
    email: 'safiyya@mywedding.com',
    name: 'Safiyya',
    defaultSessionDays: 5,
    rememberMeSessionDays: 30,
    whatsappNotificationNumber: import.meta.env.HOST_WHATSAPP_NUMBER || '+94772257533',
  },
  whatsapp: {
    messageTemplate: "Assalamu Alaikum GUEST_NAME\n\nThe family of Mr. and Mrs. Ilyas cordially invite you...",
    reminderTemplate: "Assalamu Alaikum GUEST_NAME\n\nA gentle reminder about Safiyya & Sharrafuth's Wedding Ceremony...",
  },
};
```

---

## Local Development & Deployment Commands

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/Sarannisar/invitation-bloom.git
cd invitation-bloom

# Install dependencies
npm install
```

### Running Locally
```bash
# Start Vite development server
npm run dev
```
The application will be available at `http://localhost:5173/`.
- Guest Invitation Preview: `http://localhost:5173/invite/<slug>`
- Host Administrative Dashboard: `http://localhost:5173/dashboard`

### Type Checking & Production Build
```bash
# Verify TypeScript compile without emitting files
npx tsc --noEmit

# Build production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```

---

## License & Credits

Designed and customized with elegance for **Safiyya & Sharrafuth's Wedding**. All rights reserved © 2026.
