import type { VercelRequest, VercelResponse } from '@vercel/node';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || '').trim();
const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || '').trim();
const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || '').trim();

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  const missing = [];
  if (!R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
  if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
  if (!R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
  if (!R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');

  console.error('Missing R2 environment variables:', missing.join(', '));
  // We can't return response here easily because it's outside the handler. 
  // But we can throw an error inside the handler check.
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID || 'undefined'}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check for env vars inside the handler to return proper error
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    const missing = [];
    if (!R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
    if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
    if (!R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
    if (!R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');
    return res.status(500).json({ error: `Server Configuration Error: Missing environment variables: ${missing.join(', ')}` });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { html, css } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content missing' });
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      // @ts-ignore
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 1123,
      height: 794,
      deviceScaleFactor: 2
    });

    // Set content and include CSS
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            ${css || ''}
            body { 
              margin: 0; 
              padding: 0;
              -webkit-print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.emulateMediaType('print');

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true, // Force use of CSS @page size
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      }
    });

    const fileName = `proposal-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: pdf,
      ContentType: 'application/pdf',
    });

    await s3.send(uploadCommand);

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
    }), { expiresIn: 3600 });

    res.status(200).json({ url: signedUrl });

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
