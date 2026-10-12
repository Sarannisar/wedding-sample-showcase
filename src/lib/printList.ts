import { Invitee } from './types';
import { weddingConfig } from '@/config/weddingConfig';
import { LatestEventsSummary } from './supabase';
import { formatTimeAgo, formatRelativeTime } from './utils';

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function printGuestList(invitees: Invitee[], filter: 'all' | 'attending' = 'all'): void {
  const list =
    filter === 'attending' ? invitees.filter((i) => i.rsvp === 'attending') : invitees;

  const totalGuests = list.reduce(
    (acc, i) => acc + (i.rsvp === 'attending' ? i.guest_count || 1 : 0),
    0
  );
  const attendingCount = list.filter((i) => i.rsvp === 'attending').length;
  const declinedCount = list.filter((i) => i.rsvp === 'declined').length;
  const pendingCount = list.filter((i) => i.rsvp === 'pending').length;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the guest list.');
    return;
  }

  const rowsHtml = list
    .map(
      (guest, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; width: 40px;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">
        ${escapeHtml(guest.name)}
        ${guest.phone ? `<div style="font-size: 11px; color: #6b7280; font-weight: normal;">${escapeHtml(guest.phone)}</div>` : ''}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; ${
          guest.rsvp === 'attending'
            ? 'background: #dcfce7; color: #166534;'
            : guest.rsvp === 'declined'
            ? 'background: #fee2e2; color: #991b1b;'
            : 'background: #fef3c7; color: #92400e;'
        }">
          ${guest.rsvp}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">
        ${guest.rsvp === 'attending' ? guest.guest_count || 1 : '-'}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #4b5563;">
        ${guest.notes ? escapeHtml(guest.notes) : '<span style="color: #9ca3af; font-style: italic;">None</span>'}
      </td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Guest List & Seating — ${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1f2937;
          background: #fff;
          margin: 0;
          padding: 20px;
          font-size: 13px;
          line-height: 1.4;
        }
        .header {
          text-align: center;
          margin-bottom: 24px;
          border-bottom: 2px solid #e08aa3;
          padding-bottom: 16px;
        }
        .header h1 {
          font-size: 24px;
          margin: 0 0 6px 0;
          color: #b05570;
        }
        .header p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-box {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
          background: #fafafa;
        }
        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .stat-val {
          font-size: 18px;
          font-weight: bold;
          color: #111827;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        th {
          background-color: #f3f4f6;
          color: #374151;
          font-weight: 600;
          text-align: left;
          padding: 10px 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #d1d5db;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}</h1>
        <p>${weddingConfig.event.label} • ${weddingConfig.event.dayAndDate} • ${weddingConfig.event.venue.name}</p>
        <p style="margin-top: 4px; font-weight: 600; color: #4b5563;">
          ${filter === 'attending' ? 'Attending Guests & Seating Chart' : 'Complete Guest List'}
        </p>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">Total Entries</div>
          <div class="stat-val">${list.length}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Attending Parties</div>
          <div class="stat-val" style="color: #166534;">${attendingCount}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Total Headcount</div>
          <div class="stat-val" style="color: #b05570;">${totalGuests}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Declined / Pending</div>
          <div class="stat-val" style="color: #92400e;">${declinedCount} / ${pendingCount}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: center;">#</th>
            <th>Guest Name</th>
            <th style="text-align: center;">Status</th>
            <th style="text-align: center;">Party Size</th>
            <th>Dietary / Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        Generated on ${new Date().toLocaleDateString()} • ${weddingConfig.couple.bride} & ${weddingConfig.couple.groom} Wedding Invitation Dashboard
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Generates and prints a comprehensive Day-Of Reception Roster for ushers and coordinators,
 * complete with check-in tick boxes, dietary badges, touchpoint history, and venue info.
 */
export function printDayOfCoordinatorSheet(
  invitees: Invitee[],
  eventsMap: Record<string, LatestEventsSummary> = {}
): void {
  // Sort attending first, then alphabetical by name
  const sorted = [...invitees].sort((a, b) => {
    if (a.rsvp === 'attending' && b.rsvp !== 'attending') return -1;
    if (a.rsvp !== 'attending' && b.rsvp === 'attending') return 1;
    return a.name.localeCompare(b.name);
  });

  const totalAttendingGuests = sorted.reduce(
    (acc, i) => acc + (i.rsvp === 'attending' ? i.guest_count || 1 : 0),
    0
  );
  const attendingParties = sorted.filter((i) => i.rsvp === 'attending').length;
  const withNotesCount = sorted.filter((i) => Boolean(i.notes && i.notes.trim())).length;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open the day-of sheet.');
    return;
  }

  const rowsHtml = sorted
    .map((guest, idx) => {
      const summary = eventsMap[guest.id];
      const historyItems: string[] = [];

      if (guest.shared_at) historyItems.push(`Sent ${formatTimeAgo(guest.shared_at)}`);
      if (summary?.openCount || guest.opened_at) {
        historyItems.push(`Opened ${summary?.openCount || 1}×`);
      }
      if (guest.responded_at) {
        historyItems.push(`RSVP'd ${formatRelativeTime(guest.responded_at)}`);
      }
      if (guest.reminded_at) {
        historyItems.push(`Reminded ${guest.reminder_count || 1}×`);
      }

      const historyLine = historyItems.join(' · ');

      return `
    <tr style="page-break-inside: avoid;">
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; width: 44px;">
        <div style="width: 18px; height: 18px; border: 2px solid #4a3038; border-radius: 4px; margin: 0 auto;"></div>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #6b7280; width: 32px;">
        ${idx + 1}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 700; font-size: 13px; color: #111827;">${escapeHtml(guest.name)}</div>
        <div style="font-size: 10px; color: #6b7280; font-family: monospace;">${escapeHtml(guest.phone || 'No phone recorded')}</div>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; width: 85px;">
        <span style="
          display: inline-block;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: ${guest.rsvp === 'attending' ? '#ecfdf5' : guest.rsvp === 'declined' ? '#fff1f2' : '#fef3c7'};
          color: ${guest.rsvp === 'attending' ? '#047857' : guest.rsvp === 'declined' ? '#be123c' : '#b45309'};
          border: 1px solid ${guest.rsvp === 'attending' ? '#a7f3d0' : guest.rsvp === 'declined' ? '#fecdd3' : '#fde68a'};
        ">
          ${escapeHtml(guest.rsvp)}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 700; font-size: 13px; color: #b05570; width: 50px;">
        ${guest.rsvp === 'attending' ? guest.guest_count || 1 : '—'}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; max-width: 220px;">
        ${
          guest.notes && guest.notes.trim()
            ? `<div style="font-size: 11px; color: #7c2d12; background: #fff7ed; border: 1px solid #fed7aa; padding: 4px 6px; border-radius: 6px; line-height: 1.3;">
                <strong>Note:</strong> ${escapeHtml(guest.notes)}
               </div>`
            : '<span style="color: #9ca3af; font-size: 11px;">None</span>'
        }
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; line-height: 1.4; max-width: 170px;">
        ${historyLine || '<span style="color: #9ca3af;">—</span>'}
      </td>
    </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Day-Of Usher & Coordinator Roster — ${escapeHtml(weddingConfig.couple.bride)} & ${escapeHtml(weddingConfig.couple.groom)}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #1f2937;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #b05570;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .header-title h1 {
          margin: 0 0 4px 0;
          font-size: 22px;
          color: #4a3038;
          font-family: Georgia, serif;
        }
        .header-title p {
          margin: 0;
          font-size: 12px;
          color: #6b7280;
        }
        .venue-badge {
          text-align: right;
          font-size: 11px;
          color: #4a3038;
        }
        .venue-badge strong {
          font-size: 12px;
          display: block;
          color: #b05570;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .stat-card {
          background: #fffafc;
          border: 1px solid #f9cbd7;
          border-radius: 8px;
          padding: 8px 12px;
          text-align: center;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 800;
          color: #b05570;
        }
        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          font-weight: 600;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th {
          background: #fff5f8;
          color: #4a3038;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 10px;
          padding: 8px;
          border-top: 1px solid #f9cbd7;
          border-bottom: 2px solid #b05570;
          text-align: left;
        }
        tr:nth-child(even) {
          background: #fdfafb;
        }
        .footer {
          margin-top: 24px;
          text-align: center;
          font-size: 10px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 12px;
        }
        @media print {
          body {
            padding: 0;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 8mm;
          }
          .no-print {
            display: none !important;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-title">
          <h1>Day-Of Reception & Usher Roster</h1>
          <p>${escapeHtml(weddingConfig.couple.bride)} &amp; ${escapeHtml(weddingConfig.couple.groom)} • ${escapeHtml(weddingConfig.event.dayAndDate)}</p>
        </div>
        <div class="venue-badge">
          <strong>${escapeHtml(weddingConfig.event.venue.name)}</strong>
          <span>${escapeHtml(weddingConfig.event.venue.address)} • ${escapeHtml(weddingConfig.event.time)}</span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${attendingParties}</div>
          <div class="stat-label">Attending Parties</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalAttendingGuests}</div>
          <div class="stat-label">Confirmed Seats</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${withNotesCount}</div>
          <div class="stat-label">Dietary / Special Notes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${sorted.length}</div>
          <div class="stat-label">Total On Roster</div>
        </div>
      </div>

      <div style="margin-bottom: 8px; font-size: 11px; color: #6b7280; font-style: italic;">
        Instructions for Ushers: Tick the arrival box [✓] upon welcoming each party. Check dietary notes before seating.
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 44px;">Check</th>
            <th style="text-align: center; width: 32px;">#</th>
            <th>Guest Name / Contact</th>
            <th style="text-align: center; width: 85px;">RSVP</th>
            <th style="text-align: center; width: 50px;">Seats</th>
            <th>Dietary / Notes</th>
            <th>Touchpoint History</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        Generated on ${new Date().toLocaleString()} • Wedding Coordinator Day-Of Sheet
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

