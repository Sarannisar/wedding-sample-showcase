export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId, eventId, width, height, duration, checksum, status: clientStatus } = req.body || {};

    if (!uploadId) {
      return res.status(400).json({ error: 'Missing uploadId' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ success: true, message: 'Local simulation completed' });
    }

    // Determine status (use passed status or query event moderation)
    let nextStatus = clientStatus === 'pending' || clientStatus === 'ready' ? clientStatus : 'ready';
    if (!clientStatus && eventId) {
      try {
        const evRes = await fetch(
          `${supabaseUrl}/rest/v1/wedding_events?id=eq.${encodeURIComponent(eventId)}&select=moderation_enabled&limit=1`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        if (evRes.ok) {
          const events = (await evRes.json()) as any[];
          if (events && events[0]?.moderation_enabled) {
            nextStatus = 'pending';
          }
        }
      } catch (err) {
        console.warn('Could not check event moderation setting:', err);
      }
    }

    const updatePayload: Record<string, any> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };

    if (width) updatePayload.width = width;
    if (height) updatePayload.height = height;
    if (duration) updatePayload.duration = duration;
    if (checksum) updatePayload.checksum = checksum;

    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/memory_uploads?id=eq.${encodeURIComponent(uploadId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      return res.status(400).json({ error: 'Failed to update upload status', details: errText });
    }

    const updated = await patchRes.json();
    return res.status(200).json({ success: true, upload: updated?.[0] || null });
  } catch (err: any) {
    console.error('Error completing memory upload:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
