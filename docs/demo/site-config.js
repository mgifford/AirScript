(function () {
  const currentUrl = new URL(window.location.href);
  const currentDirUrl = new URL('./', currentUrl);
  const pathSegments = currentDirUrl.pathname.split('/').filter(Boolean);
  const isDemoPath = pathSegments[pathSegments.length - 1] === 'demo';
  const demoPath = 'demo';
  const derivedRepoName = pathSegments[0] || 'airscript';
  const derivedRepoOwner = currentUrl.hostname.endsWith('github.io')
    ? currentUrl.hostname.replace(/\.github\.io$/i, '')
    : 'mgifford';
  const localPlaceholderBaseUrl = `https://YOUR_IP_ADDRESS/${derivedRepoName}/`;

  function withTrailingSlash(value) {
    return value.endsWith('/') ? value : `${value}/`;
  }

  function derivePagesBaseUrl() {
    if (currentUrl.hostname.endsWith('github.io')) {
      const repoSegment = pathSegments.length > 0 ? pathSegments[0] : '';
      if (isDemoPath) {
        return withTrailingSlash(new URL(`../`, currentDirUrl).toString());
      }

      if (repoSegment) {
        return `${currentUrl.origin}/${repoSegment}/`;
      }
    }

    return withTrailingSlash(currentDirUrl.toString());
  }

  const pagesBaseUrl = derivePagesBaseUrl();
  const demoUrl = isDemoPath
    ? withTrailingSlash(currentDirUrl.toString())
    : withTrailingSlash(new URL(`./${demoPath}/`, pagesBaseUrl).toString());

  window.AirScriptSiteConfig = {
    repoOwner: derivedRepoOwner,
    repoName: derivedRepoName,
    demoPath,
    pagesBaseUrl,
    demoUrl,
    demoIndexUrl: new URL('index.html', demoUrl).toString(),
    localDemoPlaceholderUrl: `${localPlaceholderBaseUrl}${demoPath}/`,
    localSpeakerPlaceholderUrl: `${localPlaceholderBaseUrl}${demoPath}/speaker.html`,
    generatedBy: 'static-default'
  };
})();