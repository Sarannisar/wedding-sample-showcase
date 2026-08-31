import { Invitee } from './types';

export interface CsvInviteeRow {
  name: string;
  phone?: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  const delimiter = !line.includes(',') && (line.includes('\t') || line.includes(';'))
    ? (line.includes('\t') ? '\t' : ';')
    : ',';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((c) => c.replace(/^["']|["']$/g, '').trim());
}

function isPhoneLike(val: string): boolean {
  if (!val) return false;
  const cleaned = val.replace(/[\s\-().+]/g, '');
  return cleaned.length >= 6 && /^\d+$/.test(cleaned);
}

function checkHeaderRow(cols: string[]): { isHeader: boolean; nameIndex: number; phoneIndex: number } {
  if (cols.length === 0) return { isHeader: false, nameIndex: 0, phoneIndex: -1 };

  const lower = cols.map((c) => c.toLowerCase().trim());

  let nameIndex = lower.findIndex(
    (h) =>
      h === 'name' ||
      h === 'names' ||
      h === 'guest' ||
      h === 'guest name' ||
      h === 'guest_name' ||
      h === 'invitee' ||
      h === 'invitee name' ||
      h === 'full name' ||
      h.includes('name')
  );
  let phoneIndex = lower.findIndex(
    (h) =>
      h === 'phone' ||
      h === 'mobile' ||
      h === 'whatsapp' ||
      h === 'contact' ||
      h === 'tel' ||
      h === 'telephone' ||
      h === 'cell' ||
      h.includes('phone') ||
      h.includes('mobile') ||
      h.includes('whatsapp')
  );

  if (nameIndex !== -1 || phoneIndex !== -1) {
    if (nameIndex === -1) {
      nameIndex = lower.findIndex((_, idx) => idx !== phoneIndex);
      if (nameIndex === -1) nameIndex = 0;
    }
    return { isHeader: true, nameIndex, phoneIndex };
  }

  return { isHeader: false, nameIndex: 0, phoneIndex: -1 };
}

export function parseCsvContent(text: string): CsvInviteeRow[] {
  if (!text || !text.trim()) return [];

  const rawLines = text
    .split(/\r\n|\n/)
    .map((l) => l.trim())
    .filter((l) => Boolean(l) && !l.startsWith('#'));

  if (rawLines.length === 0) return [];

  const parsedLines = rawLines.map(parseCsvLine).filter((cols) => cols.some(Boolean));
  if (parsedLines.length === 0) return [];

  const firstRow = parsedLines[0];
  const { isHeader, nameIndex: headerNameIdx, phoneIndex: headerPhoneIdx } = checkHeaderRow(firstRow);

  const startIdx = isHeader ? 1 : 0;
  const rows: CsvInviteeRow[] = [];

  for (let i = startIdx; i < parsedLines.length; i++) {
    const cols = parsedLines[i];
    if (!cols || cols.length === 0) continue;

    let name = '';
    let phone: string | undefined = undefined;

    if (isHeader) {
      name = cols[headerNameIdx] || '';
      phone = headerPhoneIdx !== -1 ? cols[headerPhoneIdx] : undefined;
    } else {
      // No header: support 1 or 2+ columns flexibly
      if (cols.length === 1) {
        name = cols[0];
      } else if (cols.length >= 2) {
        if (isPhoneLike(cols[0]) && !isPhoneLike(cols[1])) {
          phone = cols[0];
          name = cols[1];
        } else {
          name = cols[0];
          phone = cols[1] || undefined;
        }
      }
    }

    name = name.trim();
    if (name) {
      rows.push({
        name,
        phone: phone ? phone.trim() : undefined,
      });
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
