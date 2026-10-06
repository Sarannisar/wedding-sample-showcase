# Design Improvement Backlog & Implementation Roadmap

**System**: Wedding E-Invite & Host Dashboard (`safiyya-ilyas-invite`)  
**Curator**: `AGENT-23` (Graphic Designer & Art Director)  
**Date**: 2026-10-06  
**Status**: Ready for Future Design & Remediation Sprints  

---

## 1. CRITICAL DESIGN FIXES (Must Fix for Accessibility & Legibility)

| Item ID | Target Area | File Reference | Action Required | Complexity |
|---|---|---|---|:---:|
| `CRIT-DES-01` | Contrast | `src/components/invitation/EventCardSection.tsx` | Darken overline subtitles (`#e79db0` -> `#b05570`) to guarantee WCAG AA 4.5:1 contrast on mobile screens under direct sunlight. | LOW |
| `CRIT-DES-02` | Contrast | `src/components/invitation/DateScratchCard.tsx` | Darken unrevealed button text (`#e79db0` -> `#b05570`) and tap prompt for elderly readability. | LOW |
| `CRIT-DES-03` | Fonts | `index.html` | Remove unused `Great+Vibes` font import to avoid wasted mobile bandwidth and ensure consistent script font rendering. | LOW |

---

## 2. HIGH-PRIORITY DESIGN IMPROVEMENTS (High Perceived Value)

| Item ID | Target Area | File Reference | Action Required | Complexity |
|---|---|---|---|:---:|
| `HIGH-DES-01` | Typographic System | `tailwind.config.js`, `src/config/weddingConfig.ts` | Enforce a strict 4-font hierarchy: `Playfair Display` (Titles), `Lora` (Body/Quotes), `Amiri` (Arabic), `Josefin Sans` (Technical Labels). | LOW |
| `HIGH-DES-02` | Layout Flow | `src/components/invitation/InvitationSuite.tsx` | Eliminate "card-stack fatigue" by letting `HeroSection` and `ClosingSection` breathe directly on the canvas without heavy borders. | MEDIUM |
| `HIGH-DES-03` | RSVP Buttons | `src/components/invitation/RsvpSection.tsx` | Distinct visual hierarchy between "Yes, with joy" (accented rose-gold glow) and "Regretfully no" (subtle understated border). | LOW |
| `HIGH-DES-04` | Dashboard Header | `src/components/dashboard/OverviewTab.tsx` | Consolidate 5 action buttons ("Send All", "Print", "Seating CSV", etc.) into a cohesive "Actions & Export ▾" dropdown to eliminate visual clutter. | MEDIUM |

---

## 3. MEDIUM-PRIORITY POLISH (Refinements & Delight)

| Item ID | Target Area | File Reference | Action Required | Complexity |
|---|---|---|---|:---:|
| `MED-DES-01` | Scratch Foil Realism | `src/components/invitation/DateScratchCard.tsx` | Add dynamic specular light reflection to the gold foil canvas for heightened metallic realism. | MEDIUM |
| `MED-DES-02` | Memories Dropzone | `src/pages/GuestMemoriesPage.tsx` | Replace generic cloud upload icon with an artistic floral camera or guestbook illustration; soften technical copy. | LOW |
| `MED-DES-03` | RSVP Success Climax | `src/components/invitation/RsvpSection.tsx` | Add an animated wax seal / couple monogram confirmation stamp upon RSVP submission. | MEDIUM |
| `MED-DES-04` | Table Row Rhythm | `src/components/dashboard/invitees/InviteesDesktopTable.tsx` | Add subtle alternating row tinting (`#fffafc` / `#ffffff`) and expand cell padding for greater editorial elegance. | LOW |

---

## 4. OPTIONAL PREMIUM FEATURES (Luxury Enhancements)

| Item ID | Target Area | Concept | Impact | Complexity |
|---|---|---|:---:|:---:|
| `PREM-DES-01` | Audio Visualizer | Replace the simple pulsing music note with an organic animated petal wave or subtle sound ring that ripples with the nasheed. | High Emotional Delight | MEDIUM |
| `PREM-DES-02` | Dark Mode Candlelight | A toggle for evening guests: shifts the palette to a rich nocturnal burgundy/indigo (#1a0d14) with warm amber glowing candles. | Exceptional Luxury | HIGH |
| `PREM-DES-03` | Virtual Wax Seal Break | An interactive physical wax seal at the envelope opening that cracks apart with tactile haptic feedback on mobile tap. | Premium Sensation | MEDIUM |
| `PREM-DES-04` | Live Projector Frame | On `/memories/:eventSlug/live`, add an ornate gold baroque or Islamic arabesque picture frame border around full-screen photos. | Stunning Venue Showcase | LOW |

---

## 5. FUTURE DESIGN EXPERIMENTS (Post-Event Roadmap)

1. **Bespoke Theme Switcher**: Enable host to switch between "Rose & Pearl", "Emerald & Gold", and "Royal Midnight" colorways via the dashboard settings modal.
2. **Dynamic Envelope Liners**: Allow custom watercolor inner-flap floral patterns during the door portal reveal animation.
3. **Personalized WhatsApp Preview Image**: Generate a custom OpenGraph banner with the guest's actual name inscribed in calligraphy.
