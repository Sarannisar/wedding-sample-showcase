import { S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId, eventId, storageKey, originalFilename } = req.body || {};

    if (!uploadId || !storageKey) {
      return res.status(400).json({ error: 'Missing uploadId or storageKey' });
    }

    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2BucketName = process.env.R2_BUCKET_NAME;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
    const cleanFilename = (originalFilename || storageKey.split('/').pop() || 'memory').replace(/[^a-zA-Z0-9._-]/g, '_');

    // Archive folder structure in R2:
    // archive/{eventId}/{date}/{time}_{cleanFilename}
    const archiveKey = `archive/${eventId || 'general'}/${dateStr}/${timeStr}_${cleanFilename}`;

    // 1. Move object in Cloudflare R2 (Copy to archive folder, then delete original)
    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName) {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });

      try {
        await s3Client.send(
          new CopyObjectCommand({
            Bucket: r2BucketName,
            CopySource: `${r2BucketName}/${encodeURI(storageKey)}`,
            Key: archiveKey,
          })
        );

        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: r2BucketName,
            Key: storageKey,
          })
        );
      } catch (r2Err) {
        console.warn('R2 archive move warning:', r2Err);
      }
    }

    // 2. Permanently delete record from Supabase memory_uploads
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/memory_uploads?id=eq.${encodeURIComponent(uploadId)}`, {
          method: 'DELETE',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });
      } catch (dbErr) {
        console.warn('Supabase delete error:', dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      archiveKey,
      message: 'Memory permanently deleted from dashboard and archived in R2.',
    });
  } catch (err: any) {
    console.error('Error during permanent deletion & R2 archive:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
