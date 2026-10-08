import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  try {
    const key = req.query.key as string;
    const download = req.query.download === 'true';
    const filename = req.query.filename as string;

    if (!key) {
      return res.status(400).json({ error: 'Missing storage key' });
    }

    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2BucketName = process.env.R2_BUCKET_NAME;
    const publicDomain = process.env.R2_PUBLIC_DOMAIN || process.env.VITE_R2_PUBLIC_DOMAIN;
    const isDebug = req.query.debug === 'true' || req.query.debug === '1';

    if (isDebug) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Debug mode disabled in production' });
      }
      return res.status(200).json({
        configured: Boolean(r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName),
        hasAccountId: Boolean(r2AccountId),
        hasAccessKeyId: Boolean(r2AccessKeyId),
        hasSecretAccessKey: Boolean(r2SecretAccessKey),
        hasBucketName: Boolean(r2BucketName),
        publicDomainConfigured: Boolean(publicDomain),
        key,
      });
    }

    // Set CORS headers so image tags and video players can fetch/render freely
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');

    // If public domain is provided and download is not requested as attachment
    if (publicDomain && !download) {
      const cleanDomain = publicDomain.replace(/\/+$/, '');
      return res.redirect(302, `${cleanDomain}/${encodeURI(key)}`);
    }

    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName) {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });

      // For downloads, redirect directly to signed download URL
      if (download) {
        const getCommand = new GetObjectCommand({
          Bucket: r2BucketName,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename || key.split('/').pop() || 'memory')}"`,
        });
        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 1800 });
        return res.redirect(302, signedUrl);
      }

      // For gallery image/video display, stream the object directly to the browser
      // This eliminates redirect failures, cross-origin <img> blocking, and signed URL domain restrictions
      try {
        const getCommand = new GetObjectCommand({
          Bucket: r2BucketName,
          Key: key,
        });

        const s3Response = await s3Client.send(getCommand);

        if (s3Response.ContentType) {
          res.setHeader('Content-Type', s3Response.ContentType);
        } else {
          // Detect type by extension
          const lowerKey = key.toLowerCase();
          if (lowerKey.endsWith('.jpg') || lowerKey.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
          else if (lowerKey.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
          else if (lowerKey.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
          else if (lowerKey.endsWith('.mp4')) res.setHeader('Content-Type', 'video/mp4');
          else if (lowerKey.endsWith('.mov')) res.setHeader('Content-Type', 'video/quicktime');
        }

        if (s3Response.ContentLength) {
          res.setHeader('Content-Length', s3Response.ContentLength.toString());
        }

        if (s3Response.ETag) {
          res.setHeader('ETag', s3Response.ETag);
        }

        if (s3Response.Body) {
          // Pipe readable stream to response
          const stream = s3Response.Body as any;
          if (typeof stream.pipe === 'function') {
            return stream.pipe(res);
          } else if (typeof stream.transformToByteArray === 'function') {
            const bytes = await stream.transformToByteArray();
            return res.status(200).send(Buffer.from(bytes));
          }
        }

        // Fallback to signed URL redirect if stream could not be piped
        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 1800 });
        return res.redirect(302, signedUrl);
      } catch (streamErr) {
        console.warn('Direct stream error, falling back to signed URL redirect:', streamErr);
        const getCommand = new GetObjectCommand({
          Bucket: r2BucketName,
          Key: key,
        });
        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 1800 });
        return res.redirect(302, signedUrl);
      }
    }

    // Fallback placeholder/empty
    return res.status(404).json({ error: 'Storage provider not configured' });
  } catch (err: any) {
    console.error('Error generating media URL:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
