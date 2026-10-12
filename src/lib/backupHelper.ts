import { Invitee } from './types';
import { weddingConfig } from '@/config/weddingConfig';
import { notify } from './notify';

export interface WeddingBackupFile {
  app: string;
  version: string;
  exportedAt: string;
  metadata: {
    event: string;
    couple: string;
    venue: string;
    date: string;
  };
  stats: {
    totalInvited: number;
    attending: number;
    declined: number;
    pending: number;
    totalHeadcount: number;
  };
  invitees: Invitee[];
}

/**
 * Downloads a complete, structured JSON snapshot of the wedding database.
 */
export function exportDatabaseSnapshot(invitees: Invitee[]): void {
  try {
    const attendingList = invitees.filter((i) => i.rsvp === 'attending');
    const declinedList = invitees.filter((i) => i.rsvp === 'declined');
    const pendingList = invitees.filter((i) => i.rsvp === 'pending');
    const totalHeadcount = attendingList.reduce((sum, i) => sum + (i.guest_count || 1), 0);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const backupData: WeddingBackupFile = {
      app: `${weddingConfig.defaultEventSlug}-wedding`,
      version: '1.0',
      exportedAt: now.toISOString(),
      metadata: {
        event: weddingConfig.event.label,
        couple: `${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}`,
        venue: weddingConfig.event.venue.name,
        date: weddingConfig.event.dayAndDate,
      },
      stats: {
        totalInvited: invitees.length,
        attending: attendingList.length,
        declined: declinedList.length,
        pending: pendingList.length,
        totalHeadcount,
      },
      invitees,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wedding_database_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify.success(`Database backup downloaded (${invitees.length} guests)! 🛡️`);
  } catch (err) {
    console.error('Failed to export backup:', err);
    notify.error('Could not export database backup.');
  }
}

/**
 * Validates and extracts invitee records from an uploaded backup JSON file.
 */
export function validateBackupJson(jsonString: string): {
  success: boolean;
  invitees?: Invitee[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'File is not a valid JSON object.' };
    }

    // Support both raw array of invitees and structured backup files
    const rawList = Array.isArray(parsed) ? parsed : parsed.invitees;

    if (!Array.isArray(rawList)) {
      return { success: false, error: 'Backup file does not contain an invitees list.' };
    }

    // Basic schema check
    const validInvitees: Invitee[] = [];
    for (const item of rawList) {
      if (!item.name || !item.slug) {
        continue;
      }
      validInvitees.push({
        id: item.id || crypto.randomUUID(),
        name: String(item.name).trim(),
        slug: String(item.slug).trim(),
        phone: item.phone ? String(item.phone).trim() : null,
        rsvp: item.rsvp === 'attending' || item.rsvp === 'declined' ? item.rsvp : 'pending',
        guest_count: Number(item.guest_count) || 1,
        notes: item.notes ? String(item.notes).trim() : null,
        responded_at: item.responded_at || null,
        shared_at: item.shared_at || null,
        opened_at: item.opened_at || null,
        created_at: item.created_at || new Date().toISOString(),
      });
    }

    if (validInvitees.length === 0) {
      return { success: false, error: 'No valid guest records found in this backup.' };
    }

    return { success: true, invitees: validInvitees };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Invalid JSON syntax.' };
  }
}
