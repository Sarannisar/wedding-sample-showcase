export type RsvpStatus = 'pending' | 'attending' | 'declined';

export interface Invitee {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  rsvp: RsvpStatus;
  guest_count: number;
  notes?: string | null;
  responded_at?: string | null;
  shared_at?: string | null;
  opened_at?: string | null;
  reminded_at?: string | null;
  reminder_count?: number;
  first_opened_at?: string | null;
  created_at: string;
}

export type InviteeEventType = 'created' | 'sent' | 'opened' | 'responded' | 'reminded';

export interface InviteeEvent {
  id: string;
  invitee_id: string;
  type: InviteeEventType;
  created_at: string;
}

export interface DashboardStats {
  totalInvited: number;
  attending: number;
  declined: number;
  pending: number;
  totalGuestCount: number;
  responseRate: {
    attendingPercent: number;
    declinedPercent: number;
    pendingPercent: number;
  };
}

export interface SupabaseResult<T> {
  data: T | null;
  error: Error | null;
}
