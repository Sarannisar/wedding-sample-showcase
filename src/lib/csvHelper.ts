import { Invitee } from './types';

export interface CsvInviteeRow {
  name: string;
  phone?: string;
}

export function parseCsvContent(text: string): CsvInviteeRow[] {
  const lines = text.split(/\r\n|\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const nameIndex = headers.findIndex((h) => h.includes('name'));
  const phoneIndex = headers.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('whatsapp'));

  if (nameIndex === -1) return [];

  const rows: CsvInviteeRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const name = cols[nameIndex];
    if (name) {
      const phone = phoneIndex !== -1 ? cols[phoneIndex] : undefined;
      rows.push({ name, phone });
    }
  }

  return rows;
}

export const SAMPLE_CSV_CONTENT = `name,phone
Mohammed & Family,+94 77 123 4567
Amina Farook,+94 71 987 6543
Dr. Tariq Rizvi,+94 77 444 8888
Uncle Farook,+94 76 555 1234`;

export function exportInviteesToCsv(invitees: Invitee[]): void {
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['name', 'phone', 'slug', 'link', 'rsvp', 'guest_count', 'responded_at', 'shared_at'];
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const lines = [header.join(',')];

  for (const i of invitees) {
    lines.push(
      [
        i.name,
        i.phone || '',
        i.slug,
        `${origin}/invite/${i.slug}`,
        i.rsvp,
        i.rsvp === 'attending' ? i.guest_count : 0,
        i.responded_at || '',
        i.shared_at || '',
      ]
        .map(escape)
        .join(',')
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invitees-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
