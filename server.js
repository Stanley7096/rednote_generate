const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

let browserPromise;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserPromise;
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function isValidHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: 'ready' });
});

app.get('/api/extract', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string' || !isValidHttpUrl(url)) {
    res.status(400).json({ ok: false, error: 'Invalid url' });
    return;
  }

  let context;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const data = await page.evaluate(() => {
      const pickMeta = (name) => {
        const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        return el ? el.getAttribute('content') : '';
      };

      const title =
        pickMeta('og:title') ||
        pickMeta('twitter:title') ||
        document.title ||
        '';

      const description =
        pickMeta('og:description') ||
        pickMeta('description') ||
        pickMeta('twitter:description') ||
        '';

      const textFromContent = () => {
        const candidates = [
          document.querySelector('article'),
          document.querySelector('main'),
          document.querySelector('[role="main"]'),
          document.body
        ].filter(Boolean);

        const raw = candidates.map((el) => el.innerText || '').join('\n');
        return raw;
      };

      const rawText = [description, textFromContent()].filter(Boolean).join('\n');

      const images = new Set();
      const ogImage = pickMeta('og:image');
      if (ogImage) images.add(ogImage);

      document.querySelectorAll('img').forEach((img) => {
        const src = img.currentSrc || img.src || '';
        if (!src) return;
        if (!src.startsWith('http')) return;
        if (src.endsWith('.svg')) return;
        images.add(src);
      });

      return {
        title,
        text: rawText,
        images: Array.from(images)
      };
    });

    const text = cleanText(data.text);
    const images = (data.images || []).filter(Boolean).slice(0, 12);

    res.json({
      ok: true,
      title: cleanText(data.title),
      text,
      images,
      sourceUrl: url
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'Extraction failed' });
  } finally {
    if (context) {
      await context.close();
    }
  }
});

app.get('/api/image', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string' || !isValidHttpUrl(url)) {
    res.status(400).json({ ok: false, error: 'Invalid url' });
    return;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      res.status(502).json({ ok: false, error: `Image fetch failed: ${response.status}` });
      return;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'Image proxy failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
  process.exit(0);
});
