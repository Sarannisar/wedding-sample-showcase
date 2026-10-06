import { createClient } from '@supabase/supabase-js';
import { Invitee, InviteeEvent, InviteeEventType, RsvpStatus } from './types';
import { generateSlug, formatPhoneNumber } from './utils';
import { getRsvpWindow } from './rsvpDeadline';
import { weddingConfig } from '@/config/weddingConfig';

export type RsvpWriteResult =
  | { ok: true; source: 'remote' }
  | { ok: false; reason: 'offline' | 'network' | 'rejected' | 'not-configured'; message: string };

export interface LatestEventsSummary {
  lastOpenedAt?: string;
  openCount: number;
  lastSentAt?: string;
  respondedAt?: string;
  lastRemindedAt?: string;
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
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
const EVENTS_STORAGE_KEY = 'wedding_invitee_events_store_v1';

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

function getLocalEvents(): InviteeEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalEvents(events: InviteeEvent[]): void {
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('Failed to save events to localStorage', err);
  }
}

// -------------------------------------------------------------
// Activity Event Trail
// -------------------------------------------------------------

export async function logInviteeEvent(
  inviteeId: string,
  type: InviteeEventType | string
): Promise<void> {
  const newEvent: InviteeEvent = {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    invitee_id: inviteeId,
    type: type as InviteeEventType,
    created_at: new Date().toISOString(),
  };

  // Always save locally
  const localEvents = getLocalEvents();
  localEvents.unshift(newEvent);
  saveLocalEvents(localEvents);

  // If opened, record opened_at timestamp in local store
  if (type === 'opened') {
    const localInvitees = getLocalInvitees();
    const idx = localInvitees.findIndex((i) => i.id === inviteeId);
    if (idx >= 0) {
      localInvitees[idx].opened_at = newEvent.created_at;
      saveLocalInvitees(localInvitees);
    }
  }

  // Sync to Supabase in background (fire-and-forget)
  if (isSupabaseConfigured && supabase) {
    try {
      supabase
        .from('invitee_events')
        .insert([
          {
            invitee_id: inviteeId,
            type,
            created_at: newEvent.created_at,
          },
        ])
        .then(({ error }) => {
          if (error) {
            console.warn('Background event log warning (table may be pending migration):', error.message);
          }
        });

      if (type === 'opened') {
        supabase
          .from('invitees')
          .update({ opened_at: newEvent.created_at })
          .eq('id', inviteeId)
          .then(({ error }) => {
            if (error) {
              console.warn('Could not update opened_at timestamp:', error.message);
            }
          });
      }
    } catch (err) {
      console.warn('Failed to log event to Supabase:', err);
    }
  }
}

export async function fetchInviteeEvents(inviteeId: string): Promise<InviteeEvent[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('invitee_events')
        .select('*')
        .eq('invitee_id', inviteeId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as InviteeEvent[];
      }
    } catch (err) {
      console.warn('Failed to fetch events from Supabase:', err);
    }
  }

  const localEvents = getLocalEvents();
  return localEvents.filter((ev) => ev.invitee_id === inviteeId);
}

// -------------------------------------------------------------
// Invitee CRUD
// -------------------------------------------------------------

export async function fetchInvitees(): Promise<Invitee[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('invitees')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) return data as Invitee[];
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
      phone: formatPhoneNumber(row.phone) || null,
      rsvp: 'pending',
      guest_count: 0,
      notes: null,
      responded_at: null,
      shared_at: null,
      created_at: new Date().toISOString(),
    };

    newInvitees.push(item);
    dbPayloads.push({
      name: item.name,
      slug: item.slug,
      phone: item.phone || null,
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

      if (error) {
        console.error('Supabase bulk insert error:', error);
        throw error;
      }
      if (data && data.length > 0) {
        const local = getLocalInvitees();
        saveLocalInvitees([...data, ...local]);
        for (const guest of data) {
          logInviteeEvent(guest.id, 'created');
        }
        return data as Invitee[];
      }
      return [];
    } catch (err) {
      console.error('Supabase bulk insert failed:', err);
      throw err;
    }
  }

  const local = getLocalInvitees();
  const updatedLocal = [...newInvitees, ...local];
  saveLocalInvitees(updatedLocal);
  for (const guest of newInvitees) {
    logInviteeEvent(guest.id, 'created');
  }
  return newInvitees;
}

export async function createInvitee(name: string, phone?: string | null): Promise<Invitee> {
  const existingSlugs = (await fetchInvitees()).map((i) => i.slug);
  const slug = generateSlug(name, existingSlugs);

  const newInvitee: Invitee = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`,
    name: name.trim(),
    slug,
    phone: formatPhoneNumber(phone) || null,
    rsvp: 'pending',
    guest_count: 0,
    notes: null,
    responded_at: null,
    shared_at: null,
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
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      if (data) {
        const created = data as Invitee;
        const local = getLocalInvitees();
        local.unshift(created);
        saveLocalInvitees(local);
        logInviteeEvent(created.id, 'created');
        return created;
      }
      throw new Error('Failed to create invitee');
    } catch (err) {
      console.error('Supabase insert failed:', err);
      throw err;
    }
  }

  const local = getLocalInvitees();
  local.unshift(newInvitee);
  saveLocalInvitees(local);
  logInviteeEvent(newInvitee.id, 'created');
  return newInvitee;
}

export async function restoreInvitee(invitee: Invitee): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('invitees').insert([
        {
          id: invitee.id,
          name: invitee.name,
          slug: invitee.slug,
          phone: invitee.phone,
          rsvp: invitee.rsvp,
          guest_count: invitee.guest_count,
          notes: invitee.notes,
          responded_at: invitee.responded_at,
          shared_at: invitee.shared_at,
          created_at: invitee.created_at,
        },
      ]);
      if (error) {
        console.error('Supabase restore error:', error);
        return false;
      }
      const local = getLocalInvitees();
      const existing = local.find((i) => i.id === invitee.id);
      if (!existing) {
        local.unshift(invitee);
        saveLocalInvitees(local);
      }
      return true;
    } catch (err) {
      console.error('Supabase restore failed:', err);
      return false;
    }
  }

  const local = getLocalInvitees();
  const existing = local.find((i) => i.id === invitee.id);
  if (!existing) {
    local.unshift(invitee);
    saveLocalInvitees(local);
  }
  return true;
}

export async function restoreBulkInvitees(restoredList: Invitee[]): Promise<boolean> {
  if (!restoredList || restoredList.length === 0) return true;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('invitees').insert(
        restoredList.map((invitee) => ({
          id: invitee.id,
          name: invitee.name,
          slug: invitee.slug,
          phone: invitee.phone,
          rsvp: invitee.rsvp,
          guest_count: invitee.guest_count,
          notes: invitee.notes,
          responded_at: invitee.responded_at,
          shared_at: invitee.shared_at,
          created_at: invitee.created_at,
        }))
      );
      if (error) {
        console.error('Supabase bulk restore error:', error);
        return false;
      }
      const local = getLocalInvitees();
      const existingIds = new Set(local.map((i) => i.id));
      const toAdd = restoredList.filter((i) => !existingIds.has(i.id));
      saveLocalInvitees([...toAdd, ...local]);
      return true;
    } catch (err) {
      console.error('Supabase bulk restore failed:', err);
      return false;
    }
  }

  const local = getLocalInvitees();
  const existingIds = new Set(local.map((i) => i.id));
  const toAdd = restoredList.filter((i) => !existingIds.has(i.id));
  saveLocalInvitees([...toAdd, ...local]);
  return true;
}

export async function updateRsvp(
  slug: string,
  rsvp: RsvpStatus,
  guestCount: number,
  notes?: string,
  fallbackName?: string
): Promise<RsvpWriteResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      ok: false,
      reason: 'offline',
      message: 'You appear to be offline. Please reconnect to submit your RSVP.',
    };
  }

  const respondedAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Fetch current invitee state to verify deadline window
      let existing: { id: string; first_opened_at?: string | null; created_at?: string | null } | null = null;
      const { data: existingRows, error: fetchErr } = await supabase
        .from('invitees')
        .select('id, first_opened_at, created_at')
        .eq('slug', slug)
        .limit(1);

      if (!fetchErr && existingRows && existingRows.length > 0) {
        existing = existingRows[0];
      } else if (fetchErr && (fetchErr.code === '42703' || fetchErr.message?.includes('first_opened_at'))) {
        // Fallback gracefully if database table is missing the first_opened_at column
        const { data: fallbackRows } = await supabase
          .from('invitees')
          .select('id, created_at')
          .eq('slug', slug)
          .limit(1);
        if (fallbackRows && fallbackRows.length > 0) {
          existing = { ...fallbackRows[0], first_opened_at: null };
        }
      } else if (fetchErr) {
        return {
          ok: false,
          reason: 'rejected',
          message: fetchErr.message || 'Failed to verify invite details.',
        };
      }

      const anchor = existing ? existing.first_opened_at || existing.created_at : null;
      const window = getRsvpWindow(anchor);
      if (!window.isOpen) {
        return {
          ok: false,
          reason: 'rejected',
          message:
            weddingConfig.rsvp?.lockedMessage ||
            'RSVP is now closed. Please contact the family directly for any changes.',
        };
      }

      // 2. Perform remote update
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

      if (error) {
        return {
          ok: false,
          reason: 'rejected',
          message: error.message || 'Could not update RSVP on server.',
        };
      }

      if (data && data.length > 0) {
        const updatedRow = data[0] as Invitee;
        const local = getLocalInvitees();
        const index = local.findIndex((i) => i.slug.toLowerCase() === slug.toLowerCase());
        if (index !== -1) {
          local[index] = { ...local[index], ...updatedRow };
          saveLocalInvitees(local);
        } else {
          local.unshift(updatedRow);
          saveLocalInvitees(local);
        }
        logInviteeEvent(updatedRow.id, 'responded');
        return { ok: true, source: 'remote' };
      }

      // If the row was not found in Supabase, reject rather than creating an unauthorized record
      return {
        ok: false,
        reason: 'rejected',
        message: 'Invitation record not found. Please verify your invitation link.',
      };
    } catch (err: any) {
      console.error('Supabase RSVP update failed:', err);
      return {
        ok: false,
        reason: 'network',
        message: err?.message || 'Network error occurred while submitting RSVP.',
      };
    }
  }

  // If Supabase is NOT configured: write local mirror only in DEV mode
  if (import.meta.env.DEV) {
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
      logInviteeEvent(local[index].id, 'responded');
    } else {
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
      logInviteeEvent(newGuest.id, 'responded');
    }
    return { ok: true, source: 'remote' };
  }

  return {
    ok: false,
    reason: 'not-configured',
    message: 'Database connection is not configured.',
  };
}

export async function markInviteeShared(id: string): Promise<string | null> {
  const sharedAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('invitees').update({ shared_at: sharedAt }).eq('id', id);
      if (error) {
        console.error('Supabase shared_at update failed:', error);
        return null;
      }
    } catch (err) {
      console.error('Supabase shared_at update failed:', err);
      return null;
    }
  }

  const local = getLocalInvitees();
  const index = local.findIndex((i) => i.id === id);
  if (index !== -1) {
    local[index] = { ...local[index], shared_at: sharedAt };
    saveLocalInvitees(local);
  }
  logInviteeEvent(id, 'sent');
  return sharedAt;
}

export async function markBulkInviteesShared(ids: string[]): Promise<string | null> {
  if (!ids || ids.length === 0) return null;
  const sharedAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('invitees').update({ shared_at: sharedAt }).in('id', ids);
      if (error) {
        console.error('Supabase bulk shared_at update failed:', error);
        return null;
      }
    } catch (err) {
      console.error('Supabase bulk shared_at update failed:', err);
      return null;
    }
  }

  const local = getLocalInvitees();
  const idSet = new Set(ids);
  let changed = false;
  for (const item of local) {
    if (idSet.has(item.id)) {
      item.shared_at = sharedAt;
      changed = true;
      logInviteeEvent(item.id, 'sent');
    }
  }
  if (changed) {
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
      if (error) {
        console.error('Supabase update invitee error:', error);
        return false;
      }
      const local = getLocalInvitees();
      const index = local.findIndex((i) => i.id === id);
      if (index !== -1) {
        local[index] = { ...local[index], ...cleaned };
        saveLocalInvitees(local);
      }
      return true;
    } catch (err) {
      console.error('Supabase update invitee failed:', err);
      return false;
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
      if (error) {
        console.error('Supabase delete error:', error);
        return false;
      }
      const local = getLocalInvitees();
      const filtered = local.filter((i) => i.id !== id);
      saveLocalInvitees(filtered);
      return true;
    } catch (err) {
      console.error('Supabase delete failed:', err);
      return false;
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
      if (error) {
        console.error('Supabase bulk delete error:', error);
        return false;
      }
      const local = getLocalInvitees();
      const filtered = local.filter((i) => !ids.includes(i.id));
      saveLocalInvitees(filtered);
      return true;
    } catch (err) {
      console.error('Supabase bulk delete failed:', err);
      return false;
    }
  }

  const local = getLocalInvitees();
  const filtered = local.filter((i) => !ids.includes(i.id));
  saveLocalInvitees(filtered);
  return true;
}

export async function ensureFirstOpenedAt(inviteeId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('invitees')
        .update({ first_opened_at: nowIso })
        .eq('id', inviteeId)
        .is('first_opened_at', null);
    } catch {
      // Non-fatal fire-and-forget
    }
  }
  const local = getLocalInvitees();
  const index = local.findIndex((i) => i.id === inviteeId);
  if (index !== -1 && !local[index].first_opened_at) {
    local[index].first_opened_at = nowIso;
    saveLocalInvitees(local);
  }
}

export async function markInviteeReminded(id: string): Promise<boolean> {
  const remindedAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: current } = await supabase
        .from('invitees')
        .select('reminder_count')
        .eq('id', id)
        .maybeSingle();

      const nextCount = ((current as any)?.reminder_count || 0) + 1;
      const { error } = await supabase
        .from('invitees')
        .update({ reminded_at: remindedAt, reminder_count: nextCount })
        .eq('id', id);

      if (error) {
        console.warn('Supabase markInviteeReminded warning (columns may be pending migration):', error.message);
      }
    } catch (err) {
      console.warn('Supabase markInviteeReminded non-fatal catch:', err);
    }
  }

  const local = getLocalInvitees();
  const index = local.findIndex((i) => i.id === id);
  if (index !== -1) {
    local[index].reminded_at = remindedAt;
    local[index].reminder_count = (local[index].reminder_count || 0) + 1;
    saveLocalInvitees(local);
  }
  logInviteeEvent(id, 'reminded');
  return true;
}

export async function markBulkInviteesReminded(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  let allOk = true;
  for (const id of ids) {
    const ok = await markInviteeReminded(id);
    if (!ok) allOk = false;
  }
  return allOk;
}

export async function fetchLatestEventsMap(): Promise<Record<string, LatestEventsSummary>> {
  const map: Record<string, LatestEventsSummary> = {};

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('invitee_events')
        .select('invitee_id, type, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        for (const row of data) {
          if (!map[row.invitee_id]) {
            map[row.invitee_id] = { openCount: 0 };
          }
          const item = map[row.invitee_id];
          if (row.type === 'opened') {
            item.openCount++;
            if (!item.lastOpenedAt) item.lastOpenedAt = row.created_at;
          } else if (row.type === 'sent' && !item.lastSentAt) {
            item.lastSentAt = row.created_at;
          } else if (row.type === 'responded' && !item.respondedAt) {
            item.respondedAt = row.created_at;
          } else if (row.type === 'reminded' && !item.lastRemindedAt) {
            item.lastRemindedAt = row.created_at;
          }
        }
        return map;
      }
    } catch (err) {
      console.error('Supabase fetchLatestEventsMap failed:', err);
    }
  }

  const localEvents = getLocalEvents();
  for (const row of localEvents) {
    if (!map[row.invitee_id]) {
      map[row.invitee_id] = { openCount: 0 };
    }
    const item = map[row.invitee_id];
    if (row.type === 'opened') {
      item.openCount++;
      if (!item.lastOpenedAt) item.lastOpenedAt = row.created_at;
    } else if (row.type === 'sent' && !item.lastSentAt) {
      item.lastSentAt = row.created_at;
    } else if (row.type === 'responded' && !item.respondedAt) {
      item.respondedAt = row.created_at;
    } else if (row.type === 'reminded' && !item.lastRemindedAt) {
      item.lastRemindedAt = row.created_at;
    }
  }
  return map;
}
