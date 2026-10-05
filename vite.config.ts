import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const urlStr = req.url || '';

        // Intercept /api/memories requests so Vite does not treat them as frontend source files
        if (urlStr.startsWith('/api/memories/media-url')) {
          try {
            const parsed = new URL(urlStr, 'http://localhost:5173');
            const key = parsed.searchParams.get('key');
            const download = parsed.searchParams.get('download') === 'true';
            const filename = parsed.searchParams.get('filename') || (key ? key.split('/').pop() : 'memory');

            const r2AccountId = process.env.R2_ACCOUNT_ID;
            const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
            const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
            const r2BucketName = process.env.R2_BUCKET_NAME;
            const publicDomain = process.env.R2_PUBLIC_DOMAIN;

            if (publicDomain && !download && key) {
              const cleanDomain = publicDomain.replace(/\/+$/, '');
              res.writeHead(302, { Location: `${cleanDomain}/${encodeURI(key)}` });
              return res.end();
            }

            if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName && key) {
              const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
              const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

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
                  ? `attachment; filename="${encodeURIComponent(filename || 'memory')}"`
                  : undefined,
              });

              const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 1800 });
              res.writeHead(302, { Location: signedUrl });
              return res.end();
            }

            // Fallback SVG preview placeholder for local development
            res.writeHead(200, {
              'Content-Type': 'image/svg+xml',
              'Cache-Control': 'no-cache',
            });
            const safeName = (filename || 'Memory').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return res.end(
              `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
                <rect width="600" height="600" fill="#fff2f6"/>
                <circle cx="300" cy="270" r="80" fill="#f7c1d0"/>
                <path d="M260 270 L300 230 L340 270 M300 230 L300 320" stroke="#b05570" stroke-width="8" stroke-linecap="round" fill="none"/>
                <text x="300" y="400" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#4a3038">${safeName}</text>
                <text x="300" y="435" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#b05570">Wedding Memory</text>
              </svg>`
            );
          } catch (err: any) {
            console.error('API dev middleware error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
          }
        }

        // Intercept /api/memories/archive
        if (urlStr.startsWith('/api/memories/archive')) {
          try {
            const parsed = new URL(urlStr, 'http://localhost:5173');
            const eventId = parsed.searchParams.get('eventId');
            const getPartsOnly = parsed.searchParams.get('action') === 'parts';

            if (getPartsOnly) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(
                JSON.stringify({
                  totalFiles: 0,
                  totalParts: 0,
                  parts: [],
                })
              );
            }
          } catch {
            // pass
          }
        }

        // Intercept /api/memories/delete
        if (urlStr.startsWith('/api/memories/delete') && req.method === 'POST') {
          try {
            let bodyData = '';
            for await (const chunk of req) {
              bodyData += chunk;
            }
            const body = bodyData ? JSON.parse(bodyData) : {};
            const { uploadId, eventId, storageKey, originalFilename } = body;

            if (!uploadId || !storageKey) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: 'Missing uploadId or storageKey' }));
            }

            const r2AccountId = process.env.R2_ACCOUNT_ID;
            const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
            const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
            const r2BucketName = process.env.R2_BUCKET_NAME;

            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
            const cleanFilename = (originalFilename || storageKey.split('/').pop() || 'memory').replace(/[^a-zA-Z0-9._-]/g, '_');
            const archiveKey = `archive/${eventId || 'general'}/${dateStr}/${timeStr}_${cleanFilename}`;

            // 1. Move in R2
            if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName) {
              const { S3Client, CopyObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
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
                console.warn('Dev R2 move warning:', r2Err);
              }
            }

            // 2. Delete in Supabase
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
                console.warn('Dev Supabase delete error:', dbErr);
              }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              success: true,
              archiveKey,
              message: 'Memory permanently deleted and archived in R2',
            }));
          } catch (err: any) {
            console.error('API dev delete middleware error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Populate process.env with loaded values so dev middleware can access R2 credentials
  Object.assign(process.env, env);

  return {
    envPrefix: ['VITE_', 'HOST_'],
    plugins: [react(), apiDevMiddleware()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-framer': ['framer-motion'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-icons': ['lucide-react', 'canvas-confetti', 'sonner'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      port: 5173,
      host: true,
      watch: {
        ignored: ['**/*.mp4', '**/scratch/**', '**/*.log'],
      },
    },
  };
});
