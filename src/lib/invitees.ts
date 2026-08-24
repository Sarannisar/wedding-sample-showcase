import { supabase } from "@/integrations/supabase/client";
import { slugify } from "./event";

export type Invitee = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  rsvp: "pending" | "attending" | "declined";
  guest_count: number;
  responded_at: string | null;
  created_at: string;
};

export async function listInvitees(): Promise<Invitee[]> {
  const { data, error } = await supabase
    .from("invitees")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invitee[];
}

export async function getInviteeBySlug(slug: string): Promise<Invitee | null> {
  const { data, error } = await supabase
    .from("invitees")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Invitee) ?? null;
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || "guest";
  const { data } = await supabase
    .from("invitees")
    .select("slug")
    .like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function createInvitee(name: string, phone?: string) {
  const slug = await uniqueSlug(name);
  const { data, error } = await supabase
    .from("invitees")
    .insert({ name: name.trim(), slug, phone: phone?.trim() || null })
    .select()
    .single();
  if (error) throw error;
  return data as Invitee;
}

export async function deleteInvitee(id: string) {
  const { error } = await supabase.from("invitees").delete().eq("id", id);
  if (error) throw error;
}

export async function respond(
  id: string,
  rsvp: "attending" | "declined",
  guestCount: number,
) {
  const { error } = await supabase
    .from("invitees")
    .update({
      rsvp,
      guest_count: guestCount,
      responded_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
