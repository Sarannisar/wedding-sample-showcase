import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import archiver from 'archiver';
import { Readable } from 'stream';

export const config = {
  runtime: 'nodejs',
};

const FILES_PER_PART = 50;

export default async function handler(req: any, res: any) {
  try {
    const eventId = req.query.eventId as string;
    const part = parseInt((req.query.part as string) || '1', 10);
    const getPartsOnly = req.query.action === 'parts';

    if (!eventId) {
      return res.status(400).json({ error: 'Missing eventId' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    // Fetch active memories
    const dbRes = await fetch(
      `${supabaseUrl}/rest/v1/memory_uploads?event_id=eq.${encodeURIComponent(eventId)}&is_deleted=eq.false&status=in.(ready,uploaded)&order=uploaded_at.asc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!dbRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch event memories' });
    }

    const uploads = (await dbRes.json()) as any[];
    if (uploads.length === 0) {
      return res.status(404).json({ error: 'No memories available for download' });
    }

    // Split into parts
    const totalParts = Math.ceil(uploads.length / FILES_PER_PART);

    if (getPartsOnly) {
      const partsInfo = [];
      for (let p = 1; p <= totalParts; p++) {
        const slice = uploads.slice((p - 1) * FILES_PER_PART, p * FILES_PER_PART);
        const partBytes = slice.reduce((sum, u) => sum + (Number(u.file_size) || 0), 0);
        partsInfo.push({
          part: p,
          totalParts,
          fileCount: slice.length,
          totalBytes: partBytes,
          downloadUrl: `/api/memories/archive?eventId=${encodeURIComponent(eventId)}&part=${p}`,
          filename: `Wedding-Memories-Part-${String(p).padStart(2, '0')}.zip`,
        });
      }

      return res.status(200).json({
        totalFiles: uploads.length,
        totalParts,
        parts: partsInfo,
      });
    }

    // Stream requested part as ZIP
    const targetSlice = uploads.slice((part - 1) * FILES_PER_PART, part * FILES_PER_PART);
    const archiveName = `Wedding-Memories-Part-${String(part).padStart(2, '0')}.zip`;

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${archiveName}"`,
    });

    const archive = archiver('zip', {
      zlib: { level: 4 },
    });

    archive.on('error', (err: any) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // Setup R2 client
    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2BucketName = process.env.R2_BUCKET_NAME;

    let s3Client: S3Client | null = null;
    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName) {
      s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });
    }

    const seenNames = new Set<string>();

    for (let i = 0; i < targetSlice.length; i++) {
      const item = targetSlice[i];
      let entryName = item.original_filename || `memory_${i + 1}`;
      if (item.guest_name) {
        const cleanGuest = item.guest_name.replace(/[^a-zA-Z0-9_-]/g, '_');
        entryName = `${cleanGuest}_${entryName}`;
      }

      // Avoid filename collision
      if (seenNames.has(entryName)) {
        entryName = `${i + 1}_${entryName}`;
      }
      seenNames.add(entryName);

      try {
        if (s3Client && r2BucketName) {
          const getCmd = new GetObjectCommand({
            Bucket: r2BucketName,
            Key: item.storage_key,
          });
          const obj = await s3Client.send(getCmd);
          if (obj.Body) {
            archive.append(obj.Body as Readable, { name: entryName });
          }
        } else {
          // If no R2 in dev, append a text placeholder
          archive.append(
            Buffer.from(`Placeholder for memory: ${item.original_filename}\nStorage Key: ${item.storage_key}`),
            { name: `${entryName}.txt` }
          );
        }
      } catch (err) {
        console.warn(`Could not fetch object ${item.storage_key} for archive:`, err);
      }
    }

    await archive.finalize();
  } catch (err: any) {
    console.error('Error generating archive:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
}
