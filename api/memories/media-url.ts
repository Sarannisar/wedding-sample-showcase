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
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;

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
      });

      const getCommand = new GetObjectCommand({
        Bucket: r2BucketName,
        Key: key,
        ResponseContentDisposition: download
          ? `attachment; filename="${encodeURIComponent(filename || key.split('/').pop() || 'memory')}"`
          : undefined,
      });

      const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 1800 });
      return res.redirect(302, signedUrl);
    }

    // Fallback placeholder/empty
    return res.status(404).json({ error: 'Storage provider not configured' });
  } catch (err: any) {
    console.error('Error generating media URL:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
