# Invitation Bloom

BUILD

Build a complete, full-stack personalized digital invitation web app using React (Vite), Tailwind CSS, Framer Motion for animations, and Supabase as the backend database. The app has two parts: a beautiful guest-facing invitation page unique per invitee, and an internal host dashboard. Every guest gets a unique URL like /invite/their-name-slug where their name appears personalized throughout. The host manages all invitees, views RSVPs, and shares via WhatsApp from a dashboard at /dashboard.

The app must include:

- A full-screen animated loader screen before the invitation reveals

- A live countdown timer to the event date

- An animated background canvas matching the chosen theme

- Floating ambient elements falling or drifting across the full page

- All page sections animate in via scroll reveal using Framer Motion useInView

- Two event cards, each tapping to open Google Maps

- A 3-step RSVP flow with guest count selector

- A one-tap WhatsApp share button on the invitation page

- A dashboard with Overview, All Invitees, and Add and Import tabs

- CSV bulk import for invitees

- No login required for the dashboard

---

CONTENT

Event type: Wedding Ceremony

Primary hosts: Mr. and Mrs. Ilyas

Honoree 1 name: Sharrafuth Najiullah

Honoree 2 name: Safiyya Ilyas

Connecting word between honorees: and

Opening line: بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ

Opening line translation: In the Name of Almighty Allah, The Most Gracious, The Most Merciful

Invitation body text: extend their warm greetings and have the pleasure of inviting you and your family to grace the wedding ceremony of their daughter

Cultural phrase below honoree names: إِنْ شَاءَ اللَّهُ with Insha Allah below it in small italic

Event 1 label: Wedding Ceremony

Event 1 day and date: Saturday, 12th December 2026

Event 1 time:  12:30 PM onwards

Event 1 venue name: Glen Reception Hall

Event 1 venue address: 325 Attidiya Rd, Dehiwala-Mount Lavinia

Event 1 Google Maps URL: https://maps.app.goo.gl/edSeLip4NdWWpk4X9

Closing blessing: May Almighty Allah bless this marriage with love, happiness, understanding, good health, and endless prosperity

Cultural closing word: Ameen 

Cultural closing in script: آمِيْن 

WhatsApp message template: Assalamu Alaikum GUEST_NAME! The family of Mr. and Mrs. Ilyas cordially invite you to their daughters' Wedding Ceremony on Saturday 12th December 2026 at Glen Reception Hall from 12:30pm onwards. View your personal invitation here: GUEST_LINK

---

STYLE

Theme name: Soft Floral

Page background color: #fdf9f5

Primary accent color: #b05570

Secondary accent color: #e8a4b4

Card surface color: #ffffff

Text primary color: #2d1a22

Text muted color: #9a7080

Display font for names and headings: Playfair Display

Body font for paragraphs: Lora 

Label font for caps and small text: Josefin Sans

Script font for ampersand and decorative text: Great Vibes

Arabic font: Amiri

Animated background type: Eight large soft watercolor blobs drifting slowly, very low opacity, pastel rose and peach colors

Floating element type: Rose petals in pink and blush, falling from the top with slight horizontal drift

Number of floating elements: 28

Loader animation type: A rose SVG that draws itself petal by petal using Framer Motion pathLength from 0 to 1, with staggered delays per petal

Loader background color: #fdf9f5

Card style: White or parchment surface, 1px border in accent color at 20 percent opacity, inset 10px inner border at 0.5px in accent color at 12 percent opacity, four CSS corner brackets using before and after pseudo elements in accent color at 18px length and 1.5px weight, shimmer sweep animation using a gradient moving left to right over 7 seconds.

Scroll reveal: Every section fades in from y 28 to 0 with opacity 0 to 1, duration 0.8 seconds, easing cubic-bezier 0.22 1 0.36 1, triggered once using Framer Motion useInView with margin minus 60px.

Hover on event cards: translateY minus 4px with box shadow increase, duration 0.3 seconds.

Countdown style: Display font, weight 300, clamp 40px to 64px, primary accent color, tabular-nums, text shadow glow in accent color at 25 percent opacity.

Hero stagger: Each element enters 0.25 seconds after the previous one, from y 20 to 0 with opacity 0 to 1.

---

DASHBOARD

Route: /dashboard. No authentication required.

Header bar: Event name and honoree names on the left, event date on the right. Background uses a dark version of the theme color.

Three tabs: Overview, All Invitees, Add and Import.

Overview tab:

Stat cards in a responsive grid showing Total Invited, Attending, Declined, Pending, and Total Guest Count. Each card has a small uppercase label and a large number. Green for attending, red for declined, amber for pending, accent color for total guests.

Response rate bar below the cards: a horizontal bar split into green, red, and amber segments with percentages. Animate the width on mount.

Recent responses list below that: last 8 who responded, showing name, timestamp, and RSVP status.

All Invitees tab:

Search input that filters the table live by name or slug.

Filter pills for All, Pending, Attending, Declined.

Table with columns: Name, Invitation Link, RSVP status, Guest count, Response date, Actions.

Actions per row: WA button in WhatsApp green that opens a personalized WhatsApp message, View button that opens their invitation in a new tab, Copy button that copies the link, Delete button with a confirmation prompt.

Row count shown below the table.

Add and Import tab:

Left panel: single invitee form with Name input required and WhatsApp number optional. Create Invitation button. On success show the generated link with a Copy button.

Right panel: CSV upload area with dashed border. Accepts files with columns name and phone. Shows import progress. Shows sample CSV format in a code block.

---

SHARING AND RSVP

Unique invitation URLs follow the pattern /invite/slug where slug is the guest name lowercased with spaces replaced by hyphens and special characters removed. Duplicate names get a number suffix like mohammed-2.

RSVP has three states. State one shows two buttons: Yes with a positive emoji and No with a graceful emoji. State two for Yes shows a guest count selector from 1 to 20 with minus and plus buttons, plus Back and Confirm buttons. State two for No shows a confirmation message with Back and Confirm. State three shows a warm thank you for attending or a graceful message for declined. On confirm, update Supabase with rsvp status, guest count, and responded_at timestamp. No page reload.

WhatsApp share button is full width, WhatsApp green gradient, with inline SVG logo. On click it builds the personalized message using the guest name and slug, then opens https://wa.me/?text= with the message URL encoded.

Supabase table to create before connecting:

create table invitees (

  id uuid primary key default gen_random_uuid(),

  name text not null,

  slug text not null unique,

  phone text,

  rsvp text not null default pending check (rsvp in (pending, attending, declined)),

  guest_count integer not null default 0,

  responded_at timestamptz,

  created_at timestamptz not null default now()

);

create index on invitees(slug);

create index on invitees(rsvp);

Environment variables:

VITE_SUPABASE_URL = https://jrzdhsteifzkgvmwkdwt.supabase.co/

VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyemRoc3RlaWZ6a2d2bXdrZHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NDc3MDgsImV4cCI6MjEwMzEyMzcwOH0.Vvto2WEGO86feOQUsZDqRwTK9_qbRINwIKJGLGSRJmM

Use react-router-dom v6. Route / redirects to /dashboard. Route /invite/:slug is the invitation page. Route * shows a themed 404 page.

Mobile first. Every layout works from 360px width upward. Use clamp for all display font sizes. No form tags anywhere. All interactions use onClick handlers.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e1158e6b-4797-4d26-93ce-37e2b5b1f709).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
