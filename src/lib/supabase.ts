import { createClient } from '@supabase/supabase-js';
import { Invitee, RsvpStatus } from './types';
import { generateSlug, formatPhoneNumber } from './utils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'your project URL' &&
    supabaseAnonKey !== 'your anon key'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial sample invitees for immediate interactive testing & fallback
const INITIAL_INVITEES: Invitee[] = [
  {
    id: '1',
    name: 'Mohammed & Family',
    slug: 'mohammed-and-family',
    phone: '+94 77 123 4567',
    rsvp: 'attending',
    guest_count: 4,
    notes: 'Warmest congratulations to Safiyya & Sharrafuth!',
    responded_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: '2',
    name: 'Amina Farook',
    slug: 'amina-farook',
    phone: '+94 71 987 6543',
    rsvp: 'attending',
    guest_count: 2,
    notes: null,
    responded_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: '3',
    name: 'Zameer & Shazna',
    slug: 'zameer-and-shazna',
    phone: '+94 76 555 1234',
    rsvp: 'declined',
    guest_count: 0,
    notes: 'Sending heartfelt duas from abroad.',
    responded_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '4',
    name: 'Dr. Tariq Rizvi',
    slug: 'dr-tariq-rizvi',
    phone: '+94 77 444 8888',
    rsvp: 'pending',
    guest_count: 0,
    notes: null,
    responded_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: '5',
    name: 'Honored Guest',
    slug: 'guest',
    phone: null,
    rsvp: 'pending',
    guest_count: 0,
    notes: null,
    responded_at: null,
    created_at: new Date().toISOString(),
  },
];

const STORAGE_KEY = 'wedding_invitees_store_v1';

function getLocalInvitees(): Invitee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_INVITEES));
      return INITIAL_INVITEES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_INVITEES;
  }
}

function saveLocalInvitees(invitees: Invitee[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invitees));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

export async function fetchInvitees(): Promise<Invitee[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('invitees')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) return data as Invitee[];
    } catch (err) {
      console.warn('Supabase fetch failed, using local store:', err);
    }
  }
  return getLocalInvitees();
}

export async function fetchInviteeBySlug(slug: string): Promise<Invitee | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('invitees')
        .select('*')
        .eq('slug', slug)
        .single();
      if (!error && data) return data as Invitee;
    } catch (err) {
      console.warn('Supabase slug fetch failed, checking local store:', err);
    }
  }
  const local = getLocalInvitees();
  const found = local.find((i) => i.slug.toLowerCase() === slug.toLowerCase());
  return found || null;
}

export async function createInvitee(name: string, phone?: string | null): Promise<Invitee> {
  const local = getLocalInvitees();
  const existingSlugs = local.map((i) => i.slug);
  const slug = generateSlug(name, existingSlugs);

  const newInvitee: Invitee = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`,
    name: name.trim(),
    slug,
    phone: formatPhoneNumber(phone),
    rsvp: 'pending',
    guest_count: 0,
    notes: null,
    responded_at: null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('invitees')
        .insert([{
          name: newInvitee.name,
          slug: newInvitee.slug,
          phone: newInvitee.phone,
          rsvp: 'pending',
          guest_count: 0,
        }])
        .select()
        .single();
      if (!error && data) {
        local.unshift(data as Invitee);
        saveLocalInvitees(local);
        return data as Invitee;
      }
    } catch (err) {
      console.warn('Supabase insert failed, saving to local store:', err);
    }
  }

  local.unshift(newInvitee);
  saveLocalInvitees(local);
  return newInvitee;
}

export async function updateRsvp(
  slug: string,
  rsvp: RsvpStatus,
  guestCount: number,
  notes?: string
): Promise<boolean> {
  const respondedAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('invitees')
        .update({
          rsvp,
          guest_count: rsvp === 'attending' ? guestCount : 0,
          notes: notes || null,
          responded_at: respondedAt,
        })
        .eq('slug', slug);
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase RSVP update failed, updating local store:', err);
    }
  }

  const local = getLocalInvitees();
  const index = local.findIndex((i) => i.slug.toLowerCase() === slug.toLowerCase());
  if (index !== -1) {
    local[index] = {
      ...local[index],
      rsvp,
      guest_count: rsvp === 'attending' ? guestCount : 0,
      notes: notes || local[index].notes || null,
      responded_at: respondedAt,
    };
    saveLocalInvitees(local);
    return true;
  }
  return false;
}

export async function markInviteeShared(id: string): Promise<string> {
  const sharedAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('invitees').update({ shared_at: sharedAt }).eq('id', id);
    } catch (err) {
      console.warn('Supabase shared_at update failed, using local store:', err);
    }
  }

  const local = getLocalInvitees();
  const index = local.findIndex((i) => i.id === id);
  if (index !== -1) {
    local[index] = { ...local[index], shared_at: sharedAt };
    saveLocalInvitees(local);
  }
  return sharedAt;
}

export async function deleteInvitee(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('invitees').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete failed:', err);
    }
  }
  const local = getLocalInvitees();
  const filtered = local.filter((i) => i.id !== id);
  saveLocalInvitees(filtered);
  return true;
}
