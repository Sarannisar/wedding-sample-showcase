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
