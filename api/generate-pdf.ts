import type { VercelRequest, VercelResponse } from '@vercel/node';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    await page.setViewport({ width: 1123, height: 794 });

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
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=proposal.pdf');
    res.end(pdf);

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
