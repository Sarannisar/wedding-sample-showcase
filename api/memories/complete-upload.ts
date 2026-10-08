import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

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

    // 1. Fetch current upload record to get storage_key
    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/memory_uploads?id=eq.${encodeURIComponent(uploadId)}&select=id,storage_key,status&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!existingRes.ok) {
      return res.status(404).json({ error: 'Memory upload record not found' });
    }

    const existingRows = (await existingRes.json()) as any[];
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ error: 'Memory upload record not found' });
    }

    const uploadRecord = existingRows[0];

    // 2. Verify object exists in Cloudflare R2 before marking completed
    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2BucketName = process.env.R2_BUCKET_NAME;

    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName && uploadRecord.storage_key) {
      try {
        const s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: r2AccessKeyId,
            secretAccessKey: r2SecretAccessKey,
          },
        });

        await s3Client.send(
          new HeadObjectCommand({
            Bucket: r2BucketName,
            Key: uploadRecord.storage_key,
          })
        );
      } catch (s3Err: any) {
        return res.status(400).json({
          error: 'Uploaded media object was not found in storage. Upload incomplete or corrupted.',
        });
      }
    }

    // 3. Determine status (use passed status or query event moderation)
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
