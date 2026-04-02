/**
 * @jest-environment jsdom
 */

'use strict';

// ── bootstrap ─────────────────────────────────────────────────────────────────

function loadProviders() {
  delete window.LocalSyncProviders;
  delete window.LocalSyncConfig;
  jest.resetModules();

  // Provide a minimal LocalSyncConfig stub so provider-adapters.js can call
  // window.LocalSyncConfig.publishHeaders()
  window.LocalSyncConfig = {
    publishHeaders: (apiKey) => {
      const h = { 'Content-Type': 'application/json' };
      if (apiKey) h.Authorization = `Bearer ${apiKey}`;
      return h;
    }
  };

  require('./provider-adapters.js');
  return window.LocalSyncProviders;
}

// ── listProviders ─────────────────────────────────────────────────────────────

describe('LocalSyncProviders.listProviders', () => {
  let providers;

  beforeAll(() => {
    providers = loadProviders();
  });

  test('returns an array', () => {
    expect(Array.isArray(providers.listProviders())).toBe(true);
  });

  test('contains at least two entries', () => {
    expect(providers.listProviders().length).toBeGreaterThanOrEqual(2);
  });

  test('each entry has id, label, and details properties', () => {
    for (const p of providers.listProviders()) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('details');
    }
  });

  test('includes the web-speech provider', () => {
    const ids = providers.listProviders().map((p) => p.id);
    expect(ids).toContain('web-speech');
  });

  test('includes the https-json provider', () => {
    const ids = providers.listProviders().map((p) => p.id);
    expect(ids).toContain('https-json');
  });

  test('returns a copy, not a direct reference to the internal array', () => {
    const list1 = providers.listProviders();
    const list2 = providers.listProviders();
    expect(list1).not.toBe(list2);
  });
});

// ── getProviderDefinition ─────────────────────────────────────────────────────

describe('LocalSyncProviders.getProviderDefinition', () => {
  let providers;

  beforeAll(() => {
    providers = loadProviders();
  });

  test('returns the web-speech definition', () => {
    const def = providers.getProviderDefinition('web-speech');
    expect(def.id).toBe('web-speech');
  });

  test('returns the https-json definition', () => {
    const def = providers.getProviderDefinition('https-json');
    expect(def.id).toBe('https-json');
  });

  test('falls back to the first provider for an unknown id', () => {
    const def = providers.getProviderDefinition('unknown-id');
    expect(def).toBeDefined();
    expect(def.id).toBe('web-speech');
  });

  test('falls back for undefined id', () => {
    const def = providers.getProviderDefinition(undefined);
    expect(def).toBeDefined();
  });
});

// ── createProviderSession – web-speech ────────────────────────────────────────

describe('LocalSyncProviders.createProviderSession – web-speech', () => {
  let providers;

  beforeEach(() => {
    // Minimal SpeechRecognition mock
    function MockSpeechRecognition() {
      this.continuous = false;
      this.interimResults = false;
      this.lang = '';
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    }
    MockSpeechRecognition.prototype.start = jest.fn();
    MockSpeechRecognition.prototype.stop = jest.fn();

    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = undefined;

    providers = loadProviders();
  });

  afterEach(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });

  test('throws when SpeechRecognition is not available', () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    // Reload without the mock
    delete window.LocalSyncProviders;
    jest.resetModules();
    window.LocalSyncConfig = { publishHeaders: () => ({}) };
    require('./provider-adapters.js');
    const p = window.LocalSyncProviders;

    expect(() => p.createProviderSession({ provider: 'web-speech' }, {})).toThrow(
      /Web Speech API/
    );
  });

  test('returns an object with start, stop, and destroy methods', () => {
    const session = providers.createProviderSession({ provider: 'web-speech' }, {});
    expect(typeof session.start).toBe('function');
    expect(typeof session.stop).toBe('function');
    expect(typeof session.destroy).toBe('function');
  });

  test('start() delegates to the underlying recognition', () => {
    let recognitionInstance;
    window.SpeechRecognition = function () {
      recognitionInstance = this;
      this.start = jest.fn();
      this.stop = jest.fn();
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    };
    providers = loadProviders();

    const session = providers.createProviderSession({ provider: 'web-speech' }, {});
    session.start();
    expect(recognitionInstance.start).toHaveBeenCalledTimes(1);
  });

  test('stop() delegates to the underlying recognition', () => {
    let recognitionInstance;
    window.SpeechRecognition = function () {
      recognitionInstance = this;
      this.start = jest.fn();
      this.stop = jest.fn();
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    };
    providers = loadProviders();

    const session = providers.createProviderSession({ provider: 'web-speech' }, {});
    session.stop();
    expect(recognitionInstance.stop).toHaveBeenCalledTimes(1);
  });

  test('onstart hook is called when recognition starts', () => {
    let recognitionInstance;
    window.SpeechRecognition = function () {
      recognitionInstance = this;
      this.start = jest.fn();
      this.stop = jest.fn();
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    };
    providers = loadProviders();

    const onStart = jest.fn();
    providers.createProviderSession({ provider: 'web-speech' }, { onStart });
    recognitionInstance.onstart();
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ provider: 'web-speech' }));
  });

  test('onStop hook is called when recognition ends', () => {
    let recognitionInstance;
    window.SpeechRecognition = function () {
      recognitionInstance = this;
      this.start = jest.fn();
      this.stop = jest.fn();
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    };
    providers = loadProviders();

    const onStop = jest.fn();
    providers.createProviderSession({ provider: 'web-speech' }, { onStop });
    recognitionInstance.onend();
    expect(onStop).toHaveBeenCalledWith(expect.objectContaining({ provider: 'web-speech' }));
  });

  test('onError hook is called with an Error on recognition error', () => {
    let recognitionInstance;
    window.SpeechRecognition = function () {
      recognitionInstance = this;
      this.start = jest.fn();
      this.stop = jest.fn();
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    };
    providers = loadProviders();

    const onError = jest.fn();
    providers.createProviderSession({ provider: 'web-speech' }, { onError });
    recognitionInstance.onerror({ error: 'network' });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  test('onCaption hook receives the joined transcript', () => {
    let recognitionInstance;
    window.SpeechRecognition = function () {
      recognitionInstance = this;
      this.start = jest.fn();
      this.stop = jest.fn();
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    };
    providers = loadProviders();

    const onCaption = jest.fn();
    providers.createProviderSession({ provider: 'web-speech' }, { onCaption });

    // Simulate a recognition result event with two results
    recognitionInstance.onresult({
      results: [
        [{ transcript: 'Hello' }],
        [{ transcript: 'world' }]
      ]
    });

    expect(onCaption).toHaveBeenCalledWith('Hello world', expect.any(Object));
  });

  test('destroy() clears recognition event handlers', () => {
    let recognitionInstance;
    window.SpeechRecognition = function () {
      recognitionInstance = this;
      this.start = jest.fn();
      this.stop = jest.fn();
      this.onstart = jest.fn();
      this.onend = jest.fn();
      this.onerror = jest.fn();
      this.onresult = jest.fn();
    };
    providers = loadProviders();

    const session = providers.createProviderSession({ provider: 'web-speech' }, {});
    session.destroy();
    expect(recognitionInstance.onstart).toBeNull();
    expect(recognitionInstance.onend).toBeNull();
    expect(recognitionInstance.onerror).toBeNull();
    expect(recognitionInstance.onresult).toBeNull();
  });
});

// ── createProviderSession – https-json validation ─────────────────────────────

describe('LocalSyncProviders.createProviderSession – https-json validation', () => {
  beforeEach(() => {
    window.SpeechRecognition = function () {
      this.start = jest.fn();
      this.stop = jest.fn();
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    };
  });

  afterEach(() => {
    delete window.SpeechRecognition;
  });

  test('throws when providerEndpoint is absent', () => {
    const providers = loadProviders();
    expect(() =>
      providers.createProviderSession({ provider: 'https-json', providerEndpoint: '' }, {})
    ).toThrow(/endpoint/i);
  });

  test('throws when providerEndpoint is not https://', () => {
    const providers = loadProviders();
    expect(() =>
      providers.createProviderSession(
        { provider: 'https-json', providerEndpoint: 'http://example.com' },
        {}
      )
    ).toThrow(/https:\/\//i);
  });

  test('returns a session object for a valid https endpoint', () => {
    const providers = loadProviders();
    const session = providers.createProviderSession(
      { provider: 'https-json', providerEndpoint: 'https://example.com/api' },
      {}
    );
    expect(typeof session.start).toBe('function');
    expect(typeof session.stop).toBe('function');
    expect(typeof session.destroy).toBe('function');
  });
});

// ── extractRemoteCaption (tested via spy on createHttpsJsonSession internals) ──
// Because extractRemoteCaption is not directly exported we test its observable
// effect: what onCaption receives after a successful remote request.

describe('extractRemoteCaption logic (integration via https-json session)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.SpeechRecognition = function () {
      this.start = jest.fn();
      this.stop = jest.fn();
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete window.SpeechRecognition;
  });

  async function triggerCaptionAndWait(providerResponseField, remoteBody, contentType) {
    const providers = loadProviders();
    const onCaption = jest.fn();

    // Stub global fetch
    const headers = new Map([['content-type', contentType || 'application/json']]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (k) => headers.get(k) || null },
      json: () => Promise.resolve(remoteBody),
      text: () => Promise.resolve(String(remoteBody))
    });

    let recognitionInstance;
    window.SpeechRecognition = function () {
      recognitionInstance = this;
      this.start = jest.fn();
      this.stop = jest.fn();
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    };
    const p = loadProviders();

    p.createProviderSession(
      {
        provider: 'https-json',
        providerEndpoint: 'https://example.com/api',
        providerResponseField: providerResponseField || 'text'
      },
      { onCaption }
    );

    // Trigger web-speech caption which will schedule the remote request
    recognitionInstance.onresult({
      results: [[{ transcript: 'hello world' }]]
    });

    // Advance the debounce timer
    jest.runAllTimers();

    // Let all pending promises resolve
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    return onCaption;
  }

  test('uses the text field from a JSON response', async () => {
    const onCaption = await triggerCaptionAndWait('text', { text: 'refined caption' });
    expect(onCaption).toHaveBeenCalledWith('refined caption', expect.any(Object));
  });

  test('traverses nested dot-notation responseField paths', async () => {
    const onCaption = await triggerCaptionAndWait(
      'result.caption',
      { result: { caption: 'nested value' } }
    );
    expect(onCaption).toHaveBeenCalledWith('nested value', expect.any(Object));
  });

  test('falls back to raw text when the response field is missing', async () => {
    const onCaption = await triggerCaptionAndWait('text', { other: 'data' });
    // Falls back to the raw transcript
    expect(onCaption).toHaveBeenCalledWith('hello world', expect.any(Object));
  });

  test('uses plain text from a non-JSON response', async () => {
    const providers = loadProviders();
    const onCaption = jest.fn();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/plain' },
      json: jest.fn(),
      text: () => Promise.resolve('plain text caption')
    });

    let recognitionInstance;
    window.SpeechRecognition = function () {
      recognitionInstance = this;
      this.start = jest.fn();
      this.stop = jest.fn();
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    };
    const p = loadProviders();

    p.createProviderSession(
      {
        provider: 'https-json',
        providerEndpoint: 'https://example.com/api',
        providerResponseField: 'text'
      },
      { onCaption }
    );

    recognitionInstance.onresult({
      results: [[{ transcript: 'fallback text' }]]
    });

    jest.runAllTimers();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // The text field of {text: 'plain text caption'} is 'plain text caption'
    expect(onCaption).toHaveBeenCalledWith('plain text caption', expect.any(Object));
  });
});
