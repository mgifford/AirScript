(function () {
  const STORAGE_KEY = 'localsync-config';
  const SESSION_API_KEY = 'localsync-api-key';
  const siteConfig = window.AirScriptSiteConfig || {};

  function isGithubPagesHost(hostname) {
    return hostname.endsWith('github.io');
  }

  function isLocalLikeHost(hostname) {
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname.endsWith('.local')
      || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  }

  function defaultRelayBaseUrl() {
    if (window.location.protocol === 'file:') {
      return '';
    }

    if (isGithubPagesHost(window.location.hostname)) {
      return '';
    }

    return window.location.origin;
  }

  function buildEndpoint(baseUrl, path) {
    if (!baseUrl) {
      return '';
    }

    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }

  function readStoredConfig() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function readQueryConfig() {
    const params = new URLSearchParams(window.location.search);
    return {
      relayBaseUrl: params.get('relay') || '',
      streamUrl: params.get('stream') || '',
      publishMode: params.get('publish') || '',
      provider: params.get('provider') || '',
      providerEndpoint: params.get('providerEndpoint') || '',
      providerPrompt: params.get('providerPrompt') || '',
      providerResponseField: params.get('providerResponseField') || ''
    };
  }

  function loadConfig() {
    const stored = readStoredConfig();
    const query = readQueryConfig();
    const relayBaseUrl = query.relayBaseUrl || stored.relayBaseUrl || defaultRelayBaseUrl();
    const streamUrl = query.streamUrl || stored.streamUrl || buildEndpoint(relayBaseUrl, '/stream');
    const publishMode = query.publishMode || stored.publishMode || (relayBaseUrl ? 'relay' : 'local-only');

    return {
      provider: query.provider || stored.provider || 'web-speech',
      providerEndpoint: query.providerEndpoint || stored.providerEndpoint || '',
      providerPrompt: query.providerPrompt || stored.providerPrompt || '',
      providerResponseField: query.providerResponseField || stored.providerResponseField || 'text',
      relayBaseUrl,
      streamUrl,
      updateUrl: buildEndpoint(relayBaseUrl, '/update'),
      slidesUrl: buildEndpoint(relayBaseUrl, '/slides'),
      publishMode,
      apiKey: window.sessionStorage.getItem(SESSION_API_KEY) || ''
    };
  }

  function saveConfig(config) {
    const payload = {
      provider: config.provider || 'web-speech',
      providerEndpoint: config.providerEndpoint || '',
      providerPrompt: config.providerPrompt || '',
      providerResponseField: config.providerResponseField || 'text',
      relayBaseUrl: config.relayBaseUrl || '',
      streamUrl: config.streamUrl || buildEndpoint(config.relayBaseUrl || '', '/stream'),
      publishMode: config.publishMode || 'local-only'
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    if (config.apiKey) {
      window.sessionStorage.setItem(SESSION_API_KEY, config.apiKey);
    } else {
      window.sessionStorage.removeItem(SESSION_API_KEY);
    }
  }

  function publishHeaders(apiKey) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    return headers;
  }

  function getSiteConfig() {
    return {
      demoPath: siteConfig.demoPath || 'demo',
      pagesBaseUrl: siteConfig.pagesBaseUrl || '',
      demoUrl: siteConfig.demoUrl || '',
      demoIndexUrl: siteConfig.demoIndexUrl || '',
      repoOwner: siteConfig.repoOwner || '',
      repoName: siteConfig.repoName || ''
    };
  }

  window.LocalSyncConfig = {
    STORAGE_KEY,
    SESSION_API_KEY,
    buildEndpoint,
    isGithubPagesHost,
    isLocalLikeHost,
    loadConfig,
    saveConfig,
    publishHeaders,
    getSiteConfig
  };
})();