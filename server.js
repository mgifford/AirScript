const express = require('express');
const https = require('https');
const { spawnSync } = require('child_process');
const qrcode = require('qrcode');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const selfsigned = require('selfsigned');

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const SHOULD_OPEN_BROWSER = process.env.OPEN_BROWSER !== '0';
const BROWSER_PREFERENCE = process.env.BROWSER || '';
const qrPath = path.join(__dirname, 'docs', 'demo', 'qr.png');
const certDir = path.join(__dirname, '.local-ssl');
const certKeyPath = path.join(certDir, 'server-key.pem');
const certPemPath = path.join(certDir, 'server-cert.pem');
const certMetaPath = path.join(certDir, 'server-meta.json');

const state = {
  caption: 'Waiting for speaker...',
  slideHtml: '<section class="slide-placeholder">Slides are not live yet.</section>'
};

const clients = new Set();

app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});
app.use(express.static(path.join(__dirname, 'docs')));

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCaptionMarkup(text) {
  const safeText = escapeHtml(text || '');
  return `<div id="display" class="caption-text fade-in">${safeText || 'Waiting for speaker...'}</div>`;
}

function formatSlideMarkup(html) {
  return `<div id="slide-display" class="slide-frame fade-in">${html || state.slideHtml}</div>`;
}

function sendSseEvent(response, eventName, html) {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${html}\n\n`);
}

function broadcast(eventName, html) {
  for (const client of clients) {
    sendSseEvent(client, eventName, html);
  }
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const preferred = ['en0', 'en1'];

  for (const device of preferred) {
    const candidate = pickExternalIPv4(interfaces[device]);
    if (candidate) {
      return candidate;
    }
  }

  for (const entries of Object.values(interfaces)) {
    const candidate = pickExternalIPv4(entries);
    if (candidate) {
      return candidate;
    }
  }

  return 'localhost';
}

function pickExternalIPv4(entries) {
  if (!entries) {
    return null;
  }

  for (const entry of entries) {
    if (entry && entry.family === 'IPv4' && !entry.internal) {
      return entry.address;
    }
  }

  return null;
}

async function writeQrCode(url) {
  await fs.mkdir(path.dirname(qrPath), { recursive: true });
  await qrcode.toFile(qrPath, url, {
    color: {
      dark: '#0f172a',
      light: '#f8fafc'
    },
    margin: 1,
    width: 512
  });
}

async function ensureHttpsCredentials(localIP) {
  await fs.mkdir(certDir, { recursive: true });

  try {
    const [key, cert, rawMeta] = await Promise.all([
      fs.readFile(certKeyPath, 'utf8'),
      fs.readFile(certPemPath, 'utf8'),
      fs.readFile(certMetaPath, 'utf8')
    ]);
    const meta = JSON.parse(rawMeta);

    if (Array.isArray(meta.altIPs) && meta.altIPs.includes(localIP)) {
      return { key, cert, reused: true };
    }
  } catch (error) {
    // Regenerate below when files are missing or stale.
  }

  const attributes = [{ name: 'commonName', value: 'LocalSync Captions Local HTTPS' }];
  const altIPs = ['127.0.0.1'];
  if (localIP && localIP !== 'localhost' && !altIPs.includes(localIP)) {
    altIPs.push(localIP);
  }

  const pems = await selfsigned.generate(attributes, {
    algorithm: 'sha256',
    days: 30,
    keySize: 2048,
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 2, value: os.hostname() },
          ...altIPs.map((ip) => ({ type: 7, ip }))
        ]
      }
    ]
  });

  await Promise.all([
    fs.writeFile(certKeyPath, pems.private, 'utf8'),
    fs.writeFile(certPemPath, pems.cert, 'utf8'),
    fs.writeFile(certMetaPath, JSON.stringify({ altIPs }, null, 2), 'utf8')
  ]);

  return { key: pems.private, cert: pems.cert, reused: false };
}

function openBrowser(url) {
  if (process.platform === 'darwin') {
    const candidates = [BROWSER_PREFERENCE, 'Google Chrome', 'Microsoft Edge'].filter(Boolean);

    for (const appName of candidates) {
      const result = spawnSync('open', ['-a', appName, url], { stdio: 'ignore' });
      if (!result.error && result.status === 0) {
        return appName;
      }
    }

    const fallback = spawnSync('open', [url], { stdio: 'ignore' });
    if (!fallback.error && fallback.status === 0) {
      return 'default browser';
    }

    throw fallback.error || new Error('open command failed');
  }

  if (process.platform === 'win32') {
    const result = spawnSync('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
    if (!result.error && result.status === 0) {
      return 'default browser';
    }

    throw result.error || new Error('start command failed');
  }

  const result = spawnSync('xdg-open', [url], { stdio: 'ignore' });
  if (!result.error && result.status === 0) {
    return 'default browser';
  }

  throw result.error || new Error('xdg-open failed');
}

app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.add(res);
  sendSseEvent(res, 'caption-update', formatCaptionMarkup(state.caption));
  sendSseEvent(res, 'slide-change', formatSlideMarkup(state.slideHtml));

  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

app.post('/update', (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  state.caption = text || 'Waiting for speaker...';
  broadcast('caption-update', formatCaptionMarkup(state.caption));
  res.sendStatus(200);
});

app.post('/slides', (req, res) => {
  const html = typeof req.body?.html === 'string' ? req.body.html.trim() : '';
  state.slideHtml = html || '<section class="slide-placeholder">Slides are not live yet.</section>';
  broadcast('slide-change', formatSlideMarkup(state.slideHtml));
  res.sendStatus(200);
});

app.get('/status', (req, res) => {
  res.json({
    clients: clients.size,
    caption: state.caption,
    hasSlides: !state.slideHtml.includes('Slides are not live yet')
  });
});

async function start() {
  const localIP = getLocalIP();
  const credentials = await ensureHttpsCredentials(localIP);
  const url = `https://${localIP}:${PORT}`;
  const demoUrl = `${url}/demo/`;
  const speakerUrl = `${demoUrl}speaker.html`;

  const server = https.createServer({ key: credentials.key, cert: credentials.cert }, app);

  server.listen(PORT, '0.0.0.0', async () => {
    try {
      await writeQrCode(demoUrl);
    } catch (error) {
      console.error('Failed to write QR code:', error);
    }

    console.log(`LocalSync Captions available at ${demoUrl}`);
    console.log(`Speaker controls: ${speakerUrl}`);
    console.log(credentials.reused
      ? 'Reusing existing self-signed certificate from .local-ssl/.'
      : 'Generated a new self-signed certificate in .local-ssl/.');
    console.log('Chrome/Edge may show a certificate warning the first time. Accept the self-signed certificate on this device before starting captions.');

    if (SHOULD_OPEN_BROWSER) {
      try {
        const openedWith = openBrowser(speakerUrl);
        console.log(`Opened speaker page in ${openedWith}: ${speakerUrl}`);
      } catch (error) {
        console.warn(`Unable to open browser automatically: ${error.message}`);
      }
    } else {
      console.log('Automatic browser launch disabled because OPEN_BROWSER=0.');
    }

    qrcode.toString(demoUrl, { type: 'terminal', small: true }, (error, output) => {
      if (error) {
        console.error('Failed to print QR code:', error);
        return;
      }

      console.log(output);
    });
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  app,
  state,
  clients,
  escapeHtml,
  formatCaptionMarkup,
  formatSlideMarkup,
  sendSseEvent,
  broadcast,
  getLocalIP,
  pickExternalIPv4
};