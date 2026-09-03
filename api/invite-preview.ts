export const config = {
  runtime: 'edge',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || '';
  const origin = `${url.protocol}//${url.host}`;

  let guestName = '';

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (slug && supabaseUrl && supabaseKey) {
    try {
      const apiUrl = `${supabaseUrl}/rest/v1/invitees?slug=eq.${encodeURIComponent(slug)}&select=name&limit=1`;
      const res = await fetch(apiUrl, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      if (res.ok) {
        const rows = (await res.json()) as Array<{ name?: string }>;
        if (rows && rows.length > 0 && rows[0].name) {
          guestName = rows[0].name.trim();
        }
      }
    } catch {
      // Non-fatal, fall back to generic details
    }
  }

  const title = guestName
    ? `Invitation for ${guestName} — Safiyya & Sharrafuth`
    : `Safiyya & Sharrafuth — Wedding Invitation`;

  const description = guestName
    ? `${guestName}, you are cordially invited to the wedding ceremony of Safiyya & Sharrafuth.`
    : `You are cordially invited to the wedding ceremony of Safiyya Illyas and Sharrafuth Najiullah.`;

  const inviteUrl = slug ? `${origin}/invite/${encodeURIComponent(slug)}` : origin;
  const imageUrl = `${origin}/assets/invite_card_bg_poster.webp`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${inviteUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:alt" content="Safiyya &amp; Sharrafuth Wedding Celebration" />
  <meta property="og:url" content="${inviteUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta http-equiv="refresh" content="0; url=${inviteUrl}" />
</head>
<body style="font-family: sans-serif; background: #fffafc; color: #4a3038; padding: 2rem; text-align: center;">
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <p><a href="${inviteUrl}">Click here to view your wedding invitation</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
