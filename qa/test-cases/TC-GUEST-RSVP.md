# Test Suite: Guest Invitation & RSVP Flows

## Suite ID: `TS-GUEST-RSVP`
* **Target Components**: [GuestInvitePage.tsx](file:///d:/new_invite/src/pages/GuestInvitePage.tsx), [RsvpSection.tsx](file:///d:/new_invite/src/components/invitation/RsvpSection.tsx), [OpeningExperience.tsx](file:///d:/new_invite/src/components/opening/OpeningExperience.tsx)
* **Assigned Agents**: `AGENT-02` (Guest User), `AGENT-04` (RSVP Agent), `AGENT-13` (Mobile Responsive)

---

### TC-RSVP-001: Mobile Envelope Opening and Personalized Welcome
* **Preconditions**: Test invitee exists with slug `amina-khalid` and personalized greeting `Amina Khalid`.
* **Execution**:
  1. Open viewport at 390x844 (iPhone 14).
  2. Load `/invite/amina-khalid`.
  3. Verify architectural portal / envelope seal appears with couple's monogram.
  4. Tap the envelope seal / portal button.
  5. Verify smooth reveal transition to HeroSection and personalized greeting text.
* **Expected Result**: Greeting displays "Dear Amina Khalid", background audio prompt is non-intrusive, and scratch card section mounts cleanly.

---

### TC-RSVP-002: RSVP Confirmation (Attending with +1)
* **Preconditions**: Invitee `amina-khalid` has status `pending` and `max_guests=2`.
* **Execution**:
  1. Scroll to RSVP section.
  2. Select "Attending".
  3. Increment additional guests counter from 0 to 1.
  4. Enter celebratory wish: "Wishing you both endless happiness!".
  5. Click "Confirm RSVP".
* **Expected Result**:
  * Sonner toast confirms attendance.
  * Confetti animation triggers.
  * Invitee row in Supabase updates to `attending=true`, `additional_guests=1`.
  * Dashboard counter reflects +2 attendees in real-time.

---

### TC-RSVP-003: RSVP Decline Flow
* **Preconditions**: Invitee `tariq-mansoor` has status `pending`.
* **Execution**:
  1. Load `/invite/tariq-mansoor`.
  2. Scroll to RSVP section.
  3. Select "Regretfully Decline".
  4. Additional guests counter is hidden or locked to 0.
  5. Submit response.
* **Expected Result**: Record updates to `attending=false`. Dashboard reflects declined count increment without errors.

---

### TC-RSVP-004: Returning Guest State Persistence
* **Preconditions**: Invitee previously confirmed attendance.
* **Execution**:
  1. Reload `/invite/amina-khalid` or open in a fresh browser session.
  2. Skip/complete opening reveal.
  3. Observe RSVP section.
* **Expected Result**: Shows current state as "Attending (2 Guests)", with option to edit response before deadline.
