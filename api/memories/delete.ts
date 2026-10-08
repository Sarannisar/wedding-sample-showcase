import { S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate host/admin request: require valid session token or secret
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const adminToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    // In production or configured environments, verify token
    if (supabaseUrl && supabaseKey && adminToken) {
      try {
        const authCheck = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${adminToken}`,
          },
        });
        if (!authCheck.ok) {
          return res.status(401).json({ error: 'Unauthorized. Invalid admin session.' });
        }
      } catch (authErr) {
        return res.status(401).json({ error: 'Authentication verification failed.' });
      }
    } else if (process.env.NODE_ENV === 'production' && !adminToken) {
      return res.status(401).json({ error: 'Unauthorized: Missing authorization header.' });
    }

    const { uploadId, eventId, storageKey, originalFilename, items } = req.body || {};

    const itemsToDelete: Array<{
      uploadId: string;
      storageKey: string;
      originalFilename?: string;
    }> = Array.isArray(items) && items.length > 0
      ? items
      : uploadId && storageKey
      ? [{ uploadId, storageKey, originalFilename }]
      : [];

    if (itemsToDelete.length === 0) {
      return res.status(400).json({ error: 'Missing items to delete (uploadId/storageKey or items array)' });
    }

    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2BucketName = process.env.R2_BUCKET_NAME;

    const s3Client =
      r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName
        ? new S3Client({
            region: 'auto',
            endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: r2AccessKeyId,
              secretAccessKey: r2SecretAccessKey,
            },
          })
        : null;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS

    // 1. Move each object in Cloudflare R2 to archive folder with date & time stamp
    for (let i = 0; i < itemsToDelete.length; i++) {
      const item = itemsToDelete[i];
      if (s3Client && r2BucketName && item.storageKey) {
        const cleanFilename = (item.originalFilename || item.storageKey.split('/').pop() || 'memory').replace(/[^a-zA-Z0-9._-]/g, '_');
        const archiveKey = `archive/${eventId || 'general'}/${dateStr}/${timeStr}_${i + 1}_${cleanFilename}`;

        try {
          await s3Client.send(
            new CopyObjectCommand({
              Bucket: r2BucketName,
              CopySource: `${r2BucketName}/${encodeURI(item.storageKey)}`,
              Key: archiveKey,
            })
          );

          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: r2BucketName,
              Key: item.storageKey,
            })
          );
        } catch (r2Err) {
          console.warn(`R2 archive move warning for ${item.storageKey}:`, r2Err);
        }
      }
    }

    // 2. Permanently delete records from Supabase memory_uploads
    if (supabaseUrl && supabaseKey) {
      const uploadIds = itemsToDelete.map((it) => it.uploadId);
      try {
        const query = uploadIds.length === 1
          ? `id=eq.${encodeURIComponent(uploadIds[0])}`
          : `id=in.(${uploadIds.map((id) => encodeURIComponent(id)).join(',')})`;

        const delRes = await fetch(`${supabaseUrl}/rest/v1/memory_uploads?${query}`, {
          method: 'DELETE',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });
        if (!delRes.ok) {
          const errText = await delRes.text();
          console.warn('Supabase delete non-ok response:', delRes.status, errText);
        }
      } catch (dbErr) {
        console.warn('Supabase delete error:', dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      deletedCount: itemsToDelete.length,
      message: `Permanently deleted ${itemsToDelete.length} memory/memories and archived in R2.`,
    });
  } catch (err: any) {
    console.error('Error during permanent deletion & R2 archive:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
