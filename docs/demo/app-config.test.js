/**
 * @jest-environment jsdom
 */

'use strict';

// ── helpers ──────────────────────────────────────────────────────────────────

function loadAppConfig() {
  // Only reset the output global; leave AirScriptSiteConfig (the input) intact.
  delete window.LocalSyncConfig;

  jest.resetModules();
  require('./app-config.js');
  return window.LocalSyncConfig;
}

function setWindowLocation(url) {
  const parsed = new URL(url);
  // jsdom does not allow Object.defineProperty on window.location;
  // delete + assignment is the supported jsdom pattern.
  delete window.location;
  window.location = {
    href: parsed.href,
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    host: parsed.host,
    port: parsed.port,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
    origin: parsed.origin
  };
}

// ── isGithubPagesHost ────────────────────────────────────────────────────────

describe('LocalSyncConfig.isGithubPagesHost', () => {
  let config;

  beforeAll(() => {
    setWindowLocation('http://localhost:3000/');
    config = loadAppConfig();
  });

  test('returns true for *.github.io hostnames', () => {
    expect(config.isGithubPagesHost('mgifford.github.io')).toBe(true);
    expect(config.isGithubPagesHost('user.github.io')).toBe(true);
  });

  test('returns false for non-github.io hostnames', () => {
    expect(config.isGithubPagesHost('example.com')).toBe(false);
    expect(config.isGithubPagesHost('localhost')).toBe(false);
    expect(config.isGithubPagesHost('192.168.1.1')).toBe(false);
  });

  test('returns false for strings that merely contain github.io mid-string', () => {
    // 'github.io.example.com' contains github.io but does NOT end with github.io
    expect(config.isGithubPagesHost('github.io.example.com')).toBe(false);
  });
});

// ── isLocalLikeHost ──────────────────────────────────────────────────────────

describe('LocalSyncConfig.isLocalLikeHost', () => {
  let config;

  beforeAll(() => {
    setWindowLocation('http://localhost:3000/');
    config = loadAppConfig();
  });

  test('"localhost" is local-like', () => {
    expect(config.isLocalLikeHost('localhost')).toBe(true);
  });

  test('"127.0.0.1" is local-like', () => {
    expect(config.isLocalLikeHost('127.0.0.1')).toBe(true);
  });

  test('*.local hostnames are local-like', () => {
    expect(config.isLocalLikeHost('mydevice.local')).toBe(true);
  });

  test('any IPv4 numeric address is local-like', () => {
    expect(config.isLocalLikeHost('192.168.1.42')).toBe(true);
    expect(config.isLocalLikeHost('10.0.0.1')).toBe(true);
  });

  test('public hostnames are not local-like', () => {
    expect(config.isLocalLikeHost('example.com')).toBe(false);
    expect(config.isLocalLikeHost('mgifford.github.io')).toBe(false);
  });
});

// ── buildEndpoint ─────────────────────────────────────────────────────────────

describe('LocalSyncConfig.buildEndpoint', () => {
  let config;

  beforeAll(() => {
    setWindowLocation('http://localhost:3000/');
    config = loadAppConfig();
  });

  test('returns empty string when baseUrl is falsy', () => {
    expect(config.buildEndpoint('', '/update')).toBe('');
    expect(config.buildEndpoint(null, '/update')).toBe('');
  });

  test('concatenates baseUrl and path', () => {
    expect(config.buildEndpoint('https://192.168.1.1:8000', '/update'))
      .toBe('https://192.168.1.1:8000/update');
  });

  test('strips a trailing slash from baseUrl before appending path', () => {
    expect(config.buildEndpoint('https://192.168.1.1:8000/', '/stream'))
      .toBe('https://192.168.1.1:8000/stream');
  });

  test('handles baseUrl without trailing slash', () => {
    expect(config.buildEndpoint('http://localhost:8000', '/status'))
      .toBe('http://localhost:8000/status');
  });
});

// ── publishHeaders ────────────────────────────────────────────────────────────

describe('LocalSyncConfig.publishHeaders', () => {
  let config;

  beforeAll(() => {
    setWindowLocation('http://localhost:3000/');
    config = loadAppConfig();
  });

  test('always includes Content-Type application/json', () => {
    expect(config.publishHeaders('')['Content-Type']).toBe('application/json');
    expect(config.publishHeaders(null)['Content-Type']).toBe('application/json');
  });

  test('adds Authorization Bearer header when apiKey is provided', () => {
    const headers = config.publishHeaders('my-secret-key');
    expect(headers.Authorization).toBe('Bearer my-secret-key');
  });

  test('does not include Authorization header when apiKey is empty', () => {
    expect(config.publishHeaders('')).not.toHaveProperty('Authorization');
  });

  test('does not include Authorization header when apiKey is null', () => {
    expect(config.publishHeaders(null)).not.toHaveProperty('Authorization');
  });
});

// ── readStoredConfig / saveConfig / loadConfig ────────────────────────────────

describe('LocalSyncConfig.saveConfig and loadConfig', () => {
  beforeEach(() => {
    setWindowLocation('https://mgifford.github.io/AirScript/demo/');
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  function getFreshConfig() {
    delete window.LocalSyncConfig;
    jest.resetModules();
    require('./app-config.js');
    return window.LocalSyncConfig;
  }

  test('saveConfig persists provider to localStorage', () => {
    const config = getFreshConfig();
    config.saveConfig({ provider: 'https-json' });
    const stored = JSON.parse(window.localStorage.getItem('localsync-config'));
    expect(stored.provider).toBe('https-json');
  });

  test('saveConfig persists relayBaseUrl to localStorage', () => {
    const config = getFreshConfig();
    config.saveConfig({ relayBaseUrl: 'https://192.168.1.1:8000' });
    const stored = JSON.parse(window.localStorage.getItem('localsync-config'));
    expect(stored.relayBaseUrl).toBe('https://192.168.1.1:8000');
  });

  test('saveConfig stores apiKey in sessionStorage', () => {
    const config = getFreshConfig();
    config.saveConfig({ apiKey: 'tok123' });
    expect(window.sessionStorage.getItem('localsync-api-key')).toBe('tok123');
  });

  test('saveConfig removes apiKey from sessionStorage when empty', () => {
    const config = getFreshConfig();
    window.sessionStorage.setItem('localsync-api-key', 'old');
    config.saveConfig({ apiKey: '' });
    expect(window.sessionStorage.getItem('localsync-api-key')).toBeNull();
  });

  test('loadConfig returns defaults when nothing is stored', () => {
    const config = getFreshConfig();
    const loaded = config.loadConfig();
    expect(loaded.provider).toBe('web-speech');
    expect(loaded.providerResponseField).toBe('text');
  });

  test('loadConfig returns stored provider', () => {
    const config = getFreshConfig();
    config.saveConfig({ provider: 'https-json' });
    const loaded = config.loadConfig();
    expect(loaded.provider).toBe('https-json');
  });

  test('loadConfig includes updateUrl derived from relayBaseUrl', () => {
    const config = getFreshConfig();
    config.saveConfig({ relayBaseUrl: 'https://192.168.1.5:8000' });
    const loaded = config.loadConfig();
    expect(loaded.updateUrl).toBe('https://192.168.1.5:8000/update');
  });

  test('loadConfig includes slidesUrl derived from relayBaseUrl', () => {
    const config = getFreshConfig();
    config.saveConfig({ relayBaseUrl: 'https://192.168.1.5:8000' });
    const loaded = config.loadConfig();
    expect(loaded.slidesUrl).toBe('https://192.168.1.5:8000/slides');
  });

  test('loadConfig gracefully handles corrupt localStorage data', () => {
    window.localStorage.setItem('localsync-config', 'NOT_VALID_JSON');
    const config = getFreshConfig();
    expect(() => config.loadConfig()).not.toThrow();
  });

  test('loadConfig reads apiKey from sessionStorage', () => {
    const config = getFreshConfig();
    window.sessionStorage.setItem('localsync-api-key', 'session-token');
    const loaded = config.loadConfig();
    expect(loaded.apiKey).toBe('session-token');
  });

  test('saveConfig stores providerEndpoint and providerResponseField', () => {
    const config = getFreshConfig();
    config.saveConfig({
      providerEndpoint: 'https://api.example.com/caption',
      providerResponseField: 'result.text'
    });
    const stored = JSON.parse(window.localStorage.getItem('localsync-config'));
    expect(stored.providerEndpoint).toBe('https://api.example.com/caption');
    expect(stored.providerResponseField).toBe('result.text');
  });

  test('saveConfig stores providerPrompt', () => {
    const config = getFreshConfig();
    config.saveConfig({ providerPrompt: 'Clean up the transcript.' });
    const stored = JSON.parse(window.localStorage.getItem('localsync-config'));
    expect(stored.providerPrompt).toBe('Clean up the transcript.');
  });

  test('saveConfig computes streamUrl from relayBaseUrl when streamUrl is absent', () => {
    const config = getFreshConfig();
    config.saveConfig({ relayBaseUrl: 'https://192.168.1.5:8000' });
    const stored = JSON.parse(window.localStorage.getItem('localsync-config'));
    expect(stored.streamUrl).toBe('https://192.168.1.5:8000/stream');
  });

  test('loadConfig includes streamUrl derived from relayBaseUrl', () => {
    const config = getFreshConfig();
    config.saveConfig({ relayBaseUrl: 'https://192.168.1.5:8000' });
    const loaded = config.loadConfig();
    expect(loaded.streamUrl).toBe('https://192.168.1.5:8000/stream');
  });
});

// ── getSiteConfig ─────────────────────────────────────────────────────────────

describe('LocalSyncConfig.getSiteConfig', () => {
  test('returns an object with the expected keys', () => {
    setWindowLocation('http://localhost:3000/');
    const config = loadAppConfig();
    const site = config.getSiteConfig();
    expect(site).toHaveProperty('demoPath');
    expect(site).toHaveProperty('pagesBaseUrl');
    expect(site).toHaveProperty('demoUrl');
    expect(site).toHaveProperty('demoIndexUrl');
    expect(site).toHaveProperty('repoOwner');
    expect(site).toHaveProperty('repoName');
  });

  test('picks up values from window.AirScriptSiteConfig', () => {
    setWindowLocation('http://localhost:3000/');
    window.AirScriptSiteConfig = {
      repoOwner: 'test-owner',
      repoName: 'test-repo',
      demoPath: 'demo',
      pagesBaseUrl: 'http://localhost:3000/',
      demoUrl: 'http://localhost:3000/demo/',
      demoIndexUrl: 'http://localhost:3000/demo/index.html'
    };
    const config = loadAppConfig();
    const site = config.getSiteConfig();
    expect(site.repoOwner).toBe('test-owner');
    expect(site.repoName).toBe('test-repo');
  });

  test('defaults to empty strings when AirScriptSiteConfig is absent', () => {
    setWindowLocation('http://localhost:3000/');
    delete window.AirScriptSiteConfig;
    const config = loadAppConfig();
    const site = config.getSiteConfig();
    expect(typeof site.repoOwner).toBe('string');
    expect(typeof site.repoName).toBe('string');
  });
});
