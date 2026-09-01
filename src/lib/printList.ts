import { Invitee } from './types';
import { weddingConfig } from '@/config/weddingConfig';

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
        ${guest.name}
        ${guest.phone ? `<div style="font-size: 11px; color: #6b7280; font-weight: normal;">${guest.phone}</div>` : ''}
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
        ${guest.notes || '<span style="color: #9ca3af; font-style: italic;">None</span>'}
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
        Generated on ${new Date().toLocaleDateString()} • Safiyya & Sharrafuth Wedding Invitation Dashboard
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
