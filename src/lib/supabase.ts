import { createClient } from '@supabase/supabase-js';
import { Invitee, RsvpStatus } from './types';
import { generateSlug, formatPhoneNumber } from './utils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== 'your project URL' &&
    supabaseKey !== 'your anon key'
);

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, k) => headers.set(k, value));
    }
    // New Supabase API keys (sb_publishable_) are API keys, not Bearer JWTs
    if (isNewSupabaseApiKey(key) && headers.get('Authorization') === `Bearer ${key}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', key);
    return fetch(input, { ...init, headers });
  };
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: createSupabaseFetch(supabaseKey),
      },
    })
  : null;

const STORAGE_KEY = 'wedding_invitees_store_v2';

function getLocalInvitees(): Invitee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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
      return (data || []) as Invitee[];
    } catch (err) {
      console.error('Supabase fetch failed:', err);
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
        .maybeSingle();
      if (!error && data) return data as Invitee;
    } catch (err) {
      console.error('Supabase slug fetch failed:', err);
    }
  }
  const local = getLocalInvitees();
  const found = local.find((i) => i.slug.toLowerCase() === slug.toLowerCase());
  return found || null;
}

export async function createBulkInvitees(
  rows: { name: string; phone?: string | null }[]
): Promise<Invitee[]> {
  if (!rows || rows.length === 0) return [];

  const existing = await fetchInvitees();
  const existingSlugs = new Set(existing.map((i) => i.slug.toLowerCase()));

  const newInvitees: Invitee[] = [];
  const dbPayloads: Array<{
    name: string;
    slug: string;
    phone: string | null;
    rsvp: RsvpStatus;
    guest_count: number;
  }> = [];

  for (const row of rows) {
    if (!row.name || !row.name.trim()) continue;
    const cleanName = row.name.trim();

    let baseSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    if (!baseSlug) baseSlug = 'guest';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (existingSlugs.has(uniqueSlug.toLowerCase())) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    existingSlugs.add(uniqueSlug.toLowerCase());

    const item: Invitee = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      slug: uniqueSlug,
      phone: formatPhoneNumber(row.phone),
      rsvp: 'pending',
      guest_count: 0,
      notes: null,
      responded_at: null,
      created_at: new Date().toISOString(),
    };

    newInvitees.push(item);
    dbPayloads.push({
      name: item.name,
      slug: item.slug,
      phone: item.phone,
      rsvp: 'pending',
      guest_count: 0,
    });
  }

  if (isSupabaseConfigured && supabase && dbPayloads.length > 0) {
    try {
      const { data, error } = await supabase
        .from('invitees')
        .insert(dbPayloads)
        .select();

      if (!error && data && data.length > 0) {
        return data as Invitee[];
      }
      if (error) {
        console.error('Supabase bulk insert error:', error);
      }
    } catch (err) {
      console.error('Supabase bulk insert failed:', err);
    }
  }

  const local = getLocalInvitees();
  const updatedLocal = [...newInvitees, ...local];
  saveLocalInvitees(updatedLocal);
  return newInvitees;
}

export async function createInvitee(name: string, phone?: string | null): Promise<Invitee> {
  const existingSlugs = (await fetchInvitees()).map((i) => i.slug);
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
        .insert([
          {
            name: newInvitee.name,
            slug: newInvitee.slug,
            phone: newInvitee.phone,
            rsvp: 'pending',
            guest_count: 0,
          },
        ])
        .select()
        .single();
      if (!error && data) {
        return data as Invitee;
      }
      if (error) console.error('Supabase insert error:', error);
    } catch (err) {
      console.error('Supabase insert failed:', err);
    }
  }

  const local = getLocalInvitees();
  local.unshift(newInvitee);
  saveLocalInvitees(local);
  return newInvitee;
}

export async function updateRsvp(
  slug: string,
  rsvp: RsvpStatus,
  guestCount: number,
  notes?: string,
  fallbackName?: string
): Promise<boolean> {
  const respondedAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('invitees')
        .update({
          rsvp,
          guest_count: rsvp === 'attending' ? guestCount : 0,
          notes: notes || null,
          responded_at: respondedAt,
        })
        .eq('slug', slug)
        .select();

      if (!error && data && data.length > 0) return true;

      // If no row matched in Supabase, create it so the RSVP is not lost
      if (!error && (!data || data.length === 0)) {
        const { error: insertError } = await supabase.from('invitees').insert([
          {
            name: fallbackName || slug,
            slug,
            rsvp,
            guest_count: rsvp === 'attending' ? guestCount : 0,
            notes: notes || null,
            responded_at: respondedAt,
          },
        ]);
        if (!insertError) return true;
      }
      if (error) console.error('Supabase RSVP update error:', error);
    } catch (err) {
      console.error('Supabase RSVP update failed:', err);
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
  } else {
    // If not found in localStorage, create it
    const newGuest: Invitee = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`,
      name: fallbackName || slug,
      slug,
      phone: null,
      rsvp,
      guest_count: rsvp === 'attending' ? guestCount : 0,
      notes: notes || null,
      responded_at: respondedAt,
      created_at: new Date().toISOString(),
    };
    local.unshift(newGuest);
    saveLocalInvitees(local);
    return true;
  }
}

export async function markInviteeShared(id: string): Promise<string> {
  const sharedAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('invitees').update({ shared_at: sharedAt }).eq('id', id);
    } catch (err) {
      console.error('Supabase shared_at update failed:', err);
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

export async function updateInvitee(
  id: string,
  updates: Partial<Pick<Invitee, 'name' | 'phone' | 'notes' | 'rsvp' | 'guest_count' | 'responded_at'>>
): Promise<boolean> {
  const cleaned: Partial<Invitee> = {};
  if (updates.name !== undefined) cleaned.name = updates.name.trim();
  if (updates.phone !== undefined) cleaned.phone = formatPhoneNumber(updates.phone);
  if (updates.notes !== undefined) cleaned.notes = updates.notes?.trim() || null;
  if (updates.rsvp !== undefined) {
    cleaned.rsvp = updates.rsvp;
    if (updates.rsvp === 'pending') {
      cleaned.responded_at = null;
      cleaned.guest_count = 0;
    } else if (updates.responded_at === undefined && !cleaned.responded_at) {
      cleaned.responded_at = new Date().toISOString();
    }
  }
  if (updates.guest_count !== undefined) cleaned.guest_count = updates.guest_count;
  if (updates.responded_at !== undefined) cleaned.responded_at = updates.responded_at;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('invitees').update(cleaned).eq('id', id);
      if (!error) return true;
      console.error('Supabase update invitee error:', error);
    } catch (err) {
      console.error('Supabase update invitee failed:', err);
    }
  }

  const local = getLocalInvitees();
  const index = local.findIndex((i) => i.id === id);
  if (index === -1) return false;

  local[index] = { ...local[index], ...cleaned };
  saveLocalInvitees(local);
  return true;
}

export async function deleteInvitee(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('invitees').delete().eq('id', id);
      if (!error) return true;
      console.error('Supabase delete error:', error);
    } catch (err) {
      console.error('Supabase delete failed:', err);
    }
  }
  const local = getLocalInvitees();
  const filtered = local.filter((i) => i.id !== id);
  saveLocalInvitees(filtered);
  return true;
}

export async function deleteBulkInvitees(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('invitees').delete().in('id', ids);
      if (!error) return true;
      console.error('Supabase bulk delete error:', error);
    } catch (err) {
      console.error('Supabase bulk delete failed:', err);
    }
  }

  const local = getLocalInvitees();
  const filtered = local.filter((i) => !ids.includes(i.id));
  saveLocalInvitees(filtered);
  return true;
}
