export interface WeddingConfig {
  event: {
    type: string;
    label: string;
    dayAndDate: string;
    hijriDate?: string;
    time: string;
    targetDate: string; // ISO date string for live countdown
    venue: {
      name: string;
      address: string;
      mapsUrl: string;
    };
  };
  hosts: {
    primary: string;
    relationText: string;
  };
  couple: {
    groom: string;
    bride: string;
    brideFullName?: string;
    groomFullName?: string;
    groomParents?: string;
    connector: string;
    monogram: string;
  };
  cultural: {
    bismillah: {
      arabic: string;
      translation: string;
    };
    inshaAllah: {
      arabic: string;
      transliteration: string;
    };
    closing: {
      arabicDua: string;
      blessing: string;
      ameenWord: string;
      ameenArabic: string;
    };
  };
  whatsapp: {
    messageTemplate: string; // contains GUEST_NAME and GUEST_LINK placeholders
    reminderTemplate?: string;
  };
  rsvp?: {
    standardCutoffDaysBefore: number;
    lateCutoffDaysBefore: number;
    lockedMessage: string;
  };
  admin: {
    email: string;
    name: string;
    defaultSessionDays: number;
    rememberMeSessionDays: number;
    whatsappNotificationNumber?: string;
  };
  theme: {
    name: string;
    bg: string;
    primary: string;
    secondary: string;
    surface: string;
    text: string;
    muted: string;
  };
}

export const weddingConfig: WeddingConfig = {
  event: {
    type: 'Wedding Ceremony',
    label: 'Wedding Ceremony',
    dayAndDate: 'Saturday, 12th December 2026',
    hijriDate: '٣ رَجَب ١٤٤٨',
    time: '12:30 PM onwards',
    targetDate: '2026-12-12T12:30:00+05:30',
    venue: {
      name: 'Glen Reception Hall',
      address: '325 Attidiya Rd, Dehiwala-Mount Lavinia',
      mapsUrl: 'https://maps.app.goo.gl/edSeLip4NdWWpk4X9',
    },
  },
  hosts: {
    primary: 'Mr. and Mrs. Illyas',
    relationText:
      'With great joy and blessings, the family of Mr. and Mrs. Illyas request the pleasure of your company at the wedding ceremony of their beloved daughter',
  },
  couple: {
    bride: 'Safiyya',
    groom: 'Sharrafuth',
    brideFullName: 'Safiyya Illyas',
    groomFullName: 'Sharrafuth Najiullah',
    groomParents: 'Mr. and Mrs. Najiullah',
    connector: 'with',
    monogram: 'S & S',
  },
  cultural: {
    bismillah: {
      arabic: 'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ',
      translation: 'In the Name of Almighty Allah, The Most Gracious, The Most Merciful',
    },
    inshaAllah: {
      arabic: 'إِنْ شَاءَ اللَّهُ',
      transliteration: 'Insha Allah',
    },
    closing: {
      arabicDua: 'بَارَكَ اللهُ لَكُماَ وَبَارَكَ عَلَيْكُماَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ',
      blessing:
        'May Allah bless everything for you two, shower His blessings upon the two of you, and may He bring you together in goodness',
      ameenWord: 'Ameen',
      ameenArabic: 'آمِيْن',
    },
  },


  whatsapp: {
    messageTemplate:
      "Assalamu Alaikum GUEST_NAME\n\nThe family of Mr. and Mrs. Illyas cordially invite you to their daughter Safiyya's Wedding Ceremony on Saturday 12th December 2026 at Glen Reception Hall from 12:30pm onwards.\n\nView your personal invitation here: GUEST_LINK",
    reminderTemplate:
      "Assalamu Alaikum GUEST_NAME\n\nA gentle reminder about Safiyya & Sharrafuth's Wedding Ceremony on Saturday 12th December 2026 at Glen Reception Hall, 12:30pm onwards.\n\nWe would love to know if you can join us — please confirm here: GUEST_LINK",
  },
  rsvp: {
    standardCutoffDaysBefore: 7,
    lateCutoffDaysBefore: 1,
    lockedMessage: 'RSVP is now closed. Please contact the family directly for any changes.',
  },
  admin: {
    email: 'safiyya@mywedding.com',
    name: 'Safiyya',
    defaultSessionDays: 5,
    rememberMeSessionDays: 30,
    whatsappNotificationNumber: import.meta.env.VITE_HOST_WHATSAPP_NUMBER || '+94772257533',
  },
  theme: {
    name: 'Baby Pink Pastel',
    bg: '#fffafc',
    primary: '#e08aa3',
    secondary: '#f7c1d0',
    surface: '#ffffff',
    text: '#4a3038',
    muted: '#7a4d5d',
  },
};
