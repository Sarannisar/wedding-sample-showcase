import { weddingConfig } from '@/config/weddingConfig';

function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function parseEventDate(): { start: string; end: string; dateOnly: string } {
  const target = new Date(weddingConfig.event.targetDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateOnly = `${target.getUTCFullYear()}${pad(target.getUTCMonth() + 1)}${pad(target.getUTCDate())}`;
  const start = `${dateOnly}T073000Z`; // 12:30 PM +05:30 -> 07:30 UTC
  const end = `${dateOnly}T113000Z`; // estimate 4 hour event
  return { start, end, dateOnly };
}

export function downloadCalendarIcs(): void {
  const { start, end, dateOnly } = parseEventDate();
  const venue = weddingConfig.event.venue;
  const title = `Wedding Ceremony - ${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}`;
  const description = escapeIcs(
    `You are invited to the wedding ceremony of ${weddingConfig.couple.brideFullName || weddingConfig.couple.bride} & ${weddingConfig.couple.groomFullName || weddingConfig.couple.groom}. ${weddingConfig.cultural.bismillah.translation}`
  );
  const location = escapeIcs(`${venue.name}, ${venue.address}`);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Whisper RSVP//Wedding Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${dateOnly}-${weddingConfig.defaultEventSlug}-wedding@whisper-rsvp`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${weddingConfig.defaultEventSlug}-wedding-${dateOnly}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
