(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const providerDefinitions = [
    {
      id: 'web-speech',
      label: 'Web Speech API (default)',
      details: 'Browser-native speech recognition with no external provider dependency.'
    },
    {
      id: 'https-json',
      label: 'HTTPS speech or LLM adapter',
      details: 'Captures speech with the browser, then sends transcript chunks to an HTTPS JSON endpoint for refinement or alternate caption generation.'
    }
  ];

  function listProviders() {
    return providerDefinitions.slice();
  }

  function getProviderDefinition(providerId) {
    return providerDefinitions.find((provider) => provider.id === providerId) || providerDefinitions[0];
  }

  function createProviderSession(config, hooks) {
    const providerId = config.provider || 'web-speech';

    if (providerId === 'https-json') {
      return createHttpsJsonSession(config, hooks);
    }

    return createWebSpeechSession(config, hooks);
  }

  function createWebSpeechSession(config, hooks) {
    if (!SpeechRecognition) {
      throw new Error('This browser does not support the Web Speech API.');
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = config.language || 'en-US';

    recognition.onstart = () => {
      hooks.onStart?.({
        provider: 'web-speech',
        label: 'Web Speech API'
      });
    };

    recognition.onend = () => {
      hooks.onStop?.({
        provider: 'web-speech',
        label: 'Web Speech API'
      });
    };

    recognition.onerror = (event) => {
      hooks.onError?.(new Error(`Speech recognition error: ${event.error}`));
    };

    recognition.onresult = (event) => {
      const rawText = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      hooks.onCaption?.(rawText, {
        provider: 'web-speech',
        rawText
      });
    };

    return {
      start() {
        recognition.start();
      },
      stop() {
        recognition.stop();
      },
      destroy() {
        recognition.onstart = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
      }
    };
  }

  function createHttpsJsonSession(config, hooks) {
    if (!config.providerEndpoint) {
      throw new Error('An HTTPS provider endpoint is required for the HTTPS adapter.');
    }

    if (!/^https:\/\//i.test(config.providerEndpoint)) {
      throw new Error('The HTTPS adapter requires an https:// endpoint.');
    }

    let debounceTimer;
    let abortController;
    let requestSequence = 0;
    let deliveredSequence = 0;
    let lastRawText = '';

    const baseSession = createWebSpeechSession(config, {
      onStart(info) {
        hooks.onStart?.({
          ...info,
          provider: 'https-json',
          label: 'HTTPS speech or LLM adapter'
        });
      },
      onStop(info) {
        clearPendingRequest();
        hooks.onStop?.({
          ...info,
          provider: 'https-json',
          label: 'HTTPS speech or LLM adapter'
        });
      },
      onError(error) {
        hooks.onError?.(error);
      },
      onCaption(rawText) {
        lastRawText = rawText;
        scheduleRemoteRequest(rawText);
      }
    });

    function clearPendingRequest() {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }

      if (abortController) {
        abortController.abort();
        abortController = undefined;
      }
    }

    function scheduleRemoteRequest(rawText) {
      clearPendingRequest();
      hooks.onStatus?.('Sending transcript to HTTPS provider...');

      debounceTimer = window.setTimeout(() => {
        void requestRemoteCaption(rawText);
      }, 350);
    }

    async function requestRemoteCaption(rawText) {
      requestSequence += 1;
      const currentSequence = requestSequence;
      abortController = new AbortController();

      const response = await fetch(config.providerEndpoint, {
        method: 'POST',
        mode: 'cors',
        signal: abortController.signal,
        headers: window.LocalSyncConfig.publishHeaders(config.apiKey),
        body: JSON.stringify({
          text: rawText,
          prompt: config.providerPrompt || '',
          source: 'web-speech',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Provider request failed with HTTP ${response.status}`);
      }

      const responseBody = await readRemoteResponse(response);

      if (currentSequence < deliveredSequence) {
        return;
      }

      deliveredSequence = currentSequence;
      hooks.onCaption?.(extractRemoteCaption(responseBody, config.providerResponseField || 'text', lastRawText), {
        provider: 'https-json',
        rawText,
        responseBody
      });
    }

    return {
      start() {
        baseSession.start();
      },
      stop() {
        clearPendingRequest();
        baseSession.stop();
      },
      destroy() {
        clearPendingRequest();
        baseSession.destroy();
      }
    };
  }

  async function readRemoteResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    return { text: await response.text() };
  }

  function extractRemoteCaption(payload, responseField, fallbackText) {
    if (typeof payload === 'string') {
      return payload.trim() || fallbackText;
    }

    const fields = responseField.split('.').map((part) => part.trim()).filter(Boolean);
    let value = payload;

    for (const field of fields) {
      value = value?.[field];
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return fallbackText;
  }

  window.LocalSyncProviders = {
    listProviders,
    getProviderDefinition,
    createProviderSession
  };
})();