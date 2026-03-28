const express = require('express');
const qrcode = require('qrcode');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const qrPath = path.join(__dirname, 'public', 'qr.png');

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
app.use(express.static(path.join(__dirname, 'public')));

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

app.listen(PORT, '0.0.0.0', async () => {
  const localIP = getLocalIP();
  const url = `http://${localIP}:${PORT}`;

  try {
    await writeQrCode(url);
  } catch (error) {
    console.error('Failed to write QR code:', error);
  }

  console.log(`LocalSync Captions available at ${url}`);
  console.log(`Speaker controls: ${url}/speaker.html`);

  qrcode.toString(url, { type: 'terminal', small: true }, (error, output) => {
    if (error) {
      console.error('Failed to print QR code:', error);
      return;
    }

    console.log(output);
  });
});