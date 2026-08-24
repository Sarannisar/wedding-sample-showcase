export const EVENT = {
  type: "Wedding Ceremony",
  hosts: "Mr. and Mrs. Ilyas",
  honoree1: "Sharrafuth Najiullah",
  honoree2: "Safiyya Ilyas",
  connector: "and",
  openingArabic: "بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ",
  openingTranslation:
    "In the Name of Almighty Allah, The Most Gracious, The Most Merciful",
  body: "extend their warm greetings and have the pleasure of inviting you and your family to grace the wedding ceremony of their daughter",
  culturalArabic: "إِنْ شَاءَ اللَّهُ",
  culturalLatin: "Insha Allah",
  blessing:
    "May Almighty Allah bless this marriage with love, happiness, understanding, good health, and endless prosperity",
  closingWord: "Ameen",
  closingScript: "آمِيْن",
  dateISO: "2026-12-12T12:30:00+05:30",
  dateShort: "12 Dec 2026",
  events: [
    {
      label: "Wedding Ceremony",
      day: "Saturday, 12th December 2026",
      time: "12:30 PM onwards",
      venue: "Glen Reception Hall",
      address: "325 Attidiya Rd, Dehiwala-Mount Lavinia",
      maps: "https://maps.app.goo.gl/edSeLip4NdWWpk4X9",
    },
    {
      label: "Nikkah & Reception",
      day: "Saturday, 12th December 2026",
      time: "12:30 PM onwards",
      venue: "Glen Reception Hall",
      address: "325 Attidiya Rd, Dehiwala-Mount Lavinia",
      maps: "https://maps.app.goo.gl/edSeLip4NdWWpk4X9",
    },
  ],
};

export function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function inviteUrl(slug: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/invite/${slug}`;
}

export function whatsappMessage(name: string, slug: string) {
  return `Assalamu Alaikum ${name}! The family of Mr. and Mrs. Ilyas cordially invite you to their daughters' Wedding Ceremony on Saturday 12th December 2026 at Glen Reception Hall from 12:30pm onwards. View your personal invitation here: ${inviteUrl(slug)}`;
}
