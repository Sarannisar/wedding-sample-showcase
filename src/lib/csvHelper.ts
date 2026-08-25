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
