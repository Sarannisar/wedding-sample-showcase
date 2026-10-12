// Serves rich link-preview metadata for a personalised invitation, then
// forwards real visitors to the invitation page.

const DEFAULT_ORIGIN = "https://whisper-rsvp.lovable.app";
const BRIDE = "Aaliyah";
const GROOM = "Farhan";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeOrigin(raw: string | null): string {
  if (!raw) return DEFAULT_ORIGIN;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.hostname !== "localhost") return DEFAULT_ORIGIN;
    return u.origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = (url.searchParams.get("s") || url.searchParams.get("slug") || "").trim();
  const origin = safeOrigin(url.searchParams.get("o"));

  let guestName = "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (slug && supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/invitees?slug=eq.${encodeURIComponent(slug)}&select=name&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ name?: string }>;
        if (rows?.[0]?.name) guestName = String(rows[0].name).trim();
      }
    } catch (_err) {
      // Non-fatal — fall back to the generic preview
    }
  }

  const title = guestName
    ? `Invitation for ${guestName} — ${BRIDE} & ${GROOM}`
    : `${BRIDE} & ${GROOM} — Wedding Invitation`;

  const description = guestName
    ? `${guestName}, you are cordially invited to the wedding ceremony of ${BRIDE} & ${GROOM}.`
    : `You are cordially invited to the wedding ceremony of ${BRIDE} & ${GROOM}.`;

  const inviteUrl = slug ? `${origin}/invite/${encodeURIComponent(slug)}` : `${origin}/invite`;
  const imageUrl = `${origin}/assets/invite_card_bg_poster.webp`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(inviteUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${BRIDE} &amp; ${GROOM}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:alt" content="${BRIDE} &amp; ${GROOM} wedding invitation" />
  <meta property="og:url" content="${escapeHtml(inviteUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <meta http-equiv="refresh" content="0; url=${escapeHtml(inviteUrl)}" />
  <script>window.location.replace(${JSON.stringify(inviteUrl)});</script>
</head>
<body style="font-family: Georgia, serif; background:#fffafc; color:#4a3038; padding:2rem; text-align:center;">
  <h1 style="font-weight:600;">${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <p><a href="${escapeHtml(inviteUrl)}" style="color:#b05570;">Open your invitation</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
});
