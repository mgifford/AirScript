'use strict';

const request = require('supertest');
const {
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
} = require('./server');

// ── escapeHtml ──────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  test('returns an empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  test('returns plain text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  test('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('escapes less-than signs', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  test('escapes greater-than signs', () => {
    expect(escapeHtml('3 > 2')).toBe('3 &gt; 2');
  });

  test('escapes double quotes', () => {
    expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;');
  });

  test('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  test('escapes a full XSS payload', () => {
    const xss = '<img src=x onerror="alert(\'xss\')">';
    const escaped = escapeHtml(xss);
    expect(escaped).not.toContain('<img');
    expect(escaped).not.toContain('"');
    expect(escaped).toContain('&lt;img');
    expect(escaped).toContain('&quot;');
  });

  test('coerces non-string input via String()', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
    expect(escapeHtml(true)).toBe('true');
  });

  test('escapes multiple occurrences in one string', () => {
    expect(escapeHtml('a & b & c')).toBe('a &amp; b &amp; c');
  });
});

// ── formatCaptionMarkup ──────────────────────────────────────────────────────

describe('formatCaptionMarkup', () => {
  test('wraps text in the caption div', () => {
    const markup = formatCaptionMarkup('Hello');
    expect(markup).toContain('<div id="display"');
    expect(markup).toContain('Hello');
  });

  test('HTML-escapes the caption text', () => {
    const markup = formatCaptionMarkup('<b>bold</b>');
    expect(markup).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(markup).not.toContain('<b>');
  });

  test('falls back to "Waiting for speaker…" for empty string', () => {
    expect(formatCaptionMarkup('')).toContain('Waiting for speaker...');
  });

  test('falls back to "Waiting for speaker…" for null', () => {
    expect(formatCaptionMarkup(null)).toContain('Waiting for speaker...');
  });

  test('includes the fade-in CSS class', () => {
    expect(formatCaptionMarkup('hi')).toContain('fade-in');
  });
});

// ── formatSlideMarkup ────────────────────────────────────────────────────────

describe('formatSlideMarkup', () => {
  test('wraps html in the slide-display div', () => {
    const markup = formatSlideMarkup('<section>Slide 1</section>');
    expect(markup).toContain('<div id="slide-display"');
    expect(markup).toContain('<section>Slide 1</section>');
  });

  test('includes the fade-in CSS class', () => {
    expect(formatSlideMarkup('<p>test</p>')).toContain('fade-in');
  });

  test('falls back to the current state.slideHtml for falsy input', () => {
    const markup = formatSlideMarkup('');
    expect(markup).toContain(state.slideHtml);
  });
});

// ── sendSseEvent ─────────────────────────────────────────────────────────────

describe('sendSseEvent', () => {
  test('writes the correct SSE format to the response object', () => {
    const chunks = [];
    const fakeRes = { write: (chunk) => chunks.push(chunk) };

    sendSseEvent(fakeRes, 'caption-update', '<div>Hello</div>');

    expect(chunks[0]).toBe('event: caption-update\n');
    expect(chunks[1]).toBe('data: <div>Hello</div>\n\n');
  });

  test('uses the provided event name verbatim', () => {
    const chunks = [];
    const fakeRes = { write: (chunk) => chunks.push(chunk) };

    sendSseEvent(fakeRes, 'slide-change', '<p/>');
    expect(chunks[0]).toContain('slide-change');
  });
});

// ── broadcast ────────────────────────────────────────────────────────────────

describe('broadcast', () => {
  afterEach(() => clients.clear());

  test('sends to all connected clients', () => {
    const written1 = [];
    const written2 = [];
    clients.add({ write: (c) => written1.push(c) });
    clients.add({ write: (c) => written2.push(c) });

    broadcast('caption-update', '<div>hi</div>');

    expect(written1.join('')).toContain('caption-update');
    expect(written2.join('')).toContain('caption-update');
  });

  test('sends nothing when no clients are connected', () => {
    expect(() => broadcast('caption-update', 'text')).not.toThrow();
  });

  test('sends to exactly the clients in the set', () => {
    const received = [];
    const client = { write: (c) => received.push(c) };
    clients.add(client);

    broadcast('test-event', 'payload');
    expect(received.length).toBe(2); // event line + data line
  });
});

// ── pickExternalIPv4 ──────────────────────────────────────────────────────────

describe('pickExternalIPv4', () => {
  test('returns null for undefined entries', () => {
    expect(pickExternalIPv4(undefined)).toBeNull();
  });

  test('returns null for an empty array', () => {
    expect(pickExternalIPv4([])).toBeNull();
  });

  test('skips internal (loopback) addresses', () => {
    const entries = [{ family: 'IPv4', address: '127.0.0.1', internal: true }];
    expect(pickExternalIPv4(entries)).toBeNull();
  });

  test('skips IPv6 entries', () => {
    const entries = [{ family: 'IPv6', address: '::1', internal: false }];
    expect(pickExternalIPv4(entries)).toBeNull();
  });

  test('returns the first external IPv4 address', () => {
    const entries = [
      { family: 'IPv4', address: '127.0.0.1', internal: true },
      { family: 'IPv4', address: '192.168.1.5', internal: false }
    ];
    expect(pickExternalIPv4(entries)).toBe('192.168.1.5');
  });

  test('returns the first match when multiple external IPs are present', () => {
    const entries = [
      { family: 'IPv4', address: '10.0.0.1', internal: false },
      { family: 'IPv4', address: '10.0.0.2', internal: false }
    ];
    expect(pickExternalIPv4(entries)).toBe('10.0.0.1');
  });
});

// ── getLocalIP ───────────────────────────────────────────────────────────────

describe('getLocalIP', () => {
  test('returns a non-empty string', () => {
    const ip = getLocalIP();
    expect(typeof ip).toBe('string');
    expect(ip.length).toBeGreaterThan(0);
  });

  test('returns "localhost" or a valid IP-like string', () => {
    const ip = getLocalIP();
    const isLocalhost = ip === 'localhost';
    const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(ip);
    expect(isLocalhost || isIp).toBe(true);
  });
});

// ── HTTP routes ───────────────────────────────────────────────────────────────

describe('GET /status', () => {
  beforeEach(() => {
    state.caption = 'Waiting for speaker...';
    state.slideHtml = '<section class="slide-placeholder">Slides are not live yet.</section>';
    clients.clear();
  });

  test('returns 200 with JSON', async () => {
    const res = await request(app).get('/status');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  test('includes clients count, caption, and hasSlides fields', async () => {
    const res = await request(app).get('/status');
    expect(res.body).toHaveProperty('clients');
    expect(res.body).toHaveProperty('caption');
    expect(res.body).toHaveProperty('hasSlides');
  });

  test('reflects the current state caption', async () => {
    state.caption = 'Test caption';
    const res = await request(app).get('/status');
    expect(res.body.caption).toBe('Test caption');
  });

  test('hasSlides is false when no slides are set', async () => {
    const res = await request(app).get('/status');
    expect(res.body.hasSlides).toBe(false);
  });

  test('hasSlides is true when slides have been set', async () => {
    state.slideHtml = '<section>My Slide</section>';
    const res = await request(app).get('/status');
    expect(res.body.hasSlides).toBe(true);
  });

  test('clients count reflects connected clients', async () => {
    const fakeClient = { write: () => {} };
    clients.add(fakeClient);
    const res = await request(app).get('/status');
    expect(res.body.clients).toBe(1);
    clients.delete(fakeClient);
  });
});

describe('POST /update', () => {
  beforeEach(() => {
    state.caption = 'Waiting for speaker...';
    clients.clear();
  });

  test('returns 200', async () => {
    const res = await request(app).post('/update').send({ text: 'Hello' });
    expect(res.status).toBe(200);
  });

  test('updates state.caption with the provided text', async () => {
    await request(app).post('/update').send({ text: 'New caption' });
    expect(state.caption).toBe('New caption');
  });

  test('trims whitespace from the provided text', async () => {
    await request(app).post('/update').send({ text: '  padded  ' });
    expect(state.caption).toBe('padded');
  });

  test('resets to fallback when text is empty', async () => {
    await request(app).post('/update').send({ text: '' });
    expect(state.caption).toBe('Waiting for speaker...');
  });

  test('resets to fallback when text field is missing', async () => {
    await request(app).post('/update').send({});
    expect(state.caption).toBe('Waiting for speaker...');
  });

  test('resets to fallback when text is whitespace-only', async () => {
    await request(app).post('/update').send({ text: '   ' });
    expect(state.caption).toBe('Waiting for speaker...');
  });

  test('broadcasts the caption-update event to clients', async () => {
    const events = [];
    clients.add({ write: (c) => events.push(c) });

    await request(app).post('/update').send({ text: 'broadcast me' });

    const combined = events.join('');
    expect(combined).toContain('caption-update');
    expect(combined).toContain('broadcast me');
  });

  test('ignores non-string text values', async () => {
    await request(app).post('/update').send({ text: 42 });
    expect(state.caption).toBe('Waiting for speaker...');
  });
});

describe('POST /slides', () => {
  beforeEach(() => {
    state.slideHtml = '<section class="slide-placeholder">Slides are not live yet.</section>';
    clients.clear();
  });

  test('returns 200', async () => {
    const res = await request(app).post('/slides').send({ html: '<section>S1</section>' });
    expect(res.status).toBe(200);
  });

  test('updates state.slideHtml with the provided html', async () => {
    await request(app).post('/slides').send({ html: '<section>Slide A</section>' });
    expect(state.slideHtml).toBe('<section>Slide A</section>');
  });

  test('resets to placeholder when html is empty', async () => {
    await request(app).post('/slides').send({ html: '' });
    expect(state.slideHtml).toContain('Slides are not live yet');
  });

  test('resets to placeholder when html field is missing', async () => {
    await request(app).post('/slides').send({});
    expect(state.slideHtml).toContain('Slides are not live yet');
  });

  test('trims whitespace from html', async () => {
    await request(app).post('/slides').send({ html: '  <p>hi</p>  ' });
    expect(state.slideHtml).toBe('<p>hi</p>');
  });

  test('broadcasts the slide-change event to clients', async () => {
    const events = [];
    clients.add({ write: (c) => events.push(c) });

    await request(app).post('/slides').send({ html: '<section>live</section>' });

    const combined = events.join('');
    expect(combined).toContain('slide-change');
    expect(combined).toContain('live');
  });
});

describe('CORS middleware', () => {
  test('sets Access-Control-Allow-Origin to *', async () => {
    const res = await request(app).get('/status');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  test('OPTIONS preflight returns 204', async () => {
    const res = await request(app)
      .options('/update')
      .set('Origin', 'https://example.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(204);
  });

  test('OPTIONS preflight includes allowed methods', async () => {
    const res = await request(app).options('/update');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
  });
});

describe('GET /stream', () => {
  test('sets content-type to text/event-stream and tracks the client', (done) => {
    const http = require('http');
    const srv = app.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      const req = http.get(`http://127.0.0.1:${port}/stream`, (res) => {
        expect(res.headers['content-type']).toMatch(/text\/event-stream/);
        expect(res.headers['cache-control']).toMatch(/no-cache/);
        // At least one client should be registered while the connection is open
        expect(clients.size).toBeGreaterThan(0);
        req.destroy();
        srv.close(done);
      });
    });
  });
});

describe('Request body size limit', () => {
  test('rejects payloads larger than 32 kb with 413', async () => {
    const bigText = 'x'.repeat(33 * 1024);
    const res = await request(app)
      .post('/update')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ text: bigText }));
    expect(res.status).toBe(413);
  });
});
