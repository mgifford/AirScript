# LocalSync Captions

Privacy-first live captions with a browser-first transcription path. The default engine is the Web Speech API running entirely in the browser, which means the UI can be hosted as static files, including on GitHub Pages. HTMX remains the delivery layer for audience updates when a relay stream is present. When you want shared audience captions, a local or remote relay can be added without changing the default capture flow.

## Try The Demo

Start here if you want to see the app before reading the setup notes.

- Live demo: `https://mgifford.github.io/AirScript/demo/`
- Canonical document URL: `https://mgifford.github.io/AirScript/demo/index.html`

The root GitHub Pages URL redirects into the demo, but the `/demo/` path is the main public entry point and the one intended for sharing and QR codes.

## Features

- Web Speech API as the default Phase 1 transcription engine
- Provider adapter layer for selecting Web Speech or an HTTPS speech/LLM service
- Static-friendly speaker and audience pages that can be hosted on GitHub Pages
- Default GitHub Pages publish path at `/demo/`, with fork-friendly URL generation
- Client-side QR fallback for the static Pages demo URL when the local relay QR is unavailable
- Optional relay mode for local Express broadcasting over Wi-Fi or Internet Sharing
- Audience page using HTMX SSE for near real-time updates when a relay is configured
- Optional bearer-token support for compatible third-party relay endpoints
- Dynamic QR code generation from the local Node relay when you run it

## Requirements

- A browser with Web Speech API support on the speaker machine
- Node.js 18+ only if you want the optional local relay server

## Modes

### 1. Static Browser Mode

Host the contents of `docs/` on GitHub Pages or any static host. In this mode:

- Speech recognition runs in the browser with the Web Speech API
- Captions can stay on the speaker device with no backend
- HTMX stays in place on the audience page and connects only when you supply a relay stream URL
- You can optionally point the speaker page at a compatible relay endpoint later

For this repository, the default public demo URL is:

- `https://mgifford.github.io/AirScript/demo/`

The canonical document URL is `https://mgifford.github.io/AirScript/demo/index.html`, but the shorter `/demo/` path is the one intended for QR codes and sharing.

Minimal GitHub Pages setup:

1. Push the repository to GitHub.
2. In the repository settings, open Pages.
3. Set Build and deployment Source to `Deploy from a branch`.
4. Set Branch to `main` and folder to `/docs`.
5. Save settings and wait for the Pages publish to complete.

The static app is served from `docs/demo/`, so the public URL stays at `/demo/`. The root `docs/index.html` page is a lightweight landing page that points people to the demo and speaker views first.

The repository includes [docs/.nojekyll](docs/.nojekyll) so GitHub Pages serves the folder as plain static content without Jekyll processing.

The speaker page also includes a browser-side QR fallback. If the locally generated `qr.png` is missing, it renders a QR code for the default GitHub Pages demo URL instead.

### 2. Local Relay Mode

Run the Node server when you want QR discovery, SSE broadcasting, or local audience devices.

```bash
npm install
npm start
```

Then open:

- Audience view: `http://YOUR_LOCAL_IP:8000/demo/`
- Speaker view: `http://YOUR_LOCAL_IP:8000/demo/speaker.html`

## Troubleshooting

- **Pages URL returns 404:** Confirm repository Pages settings are `Deploy from a branch`, branch `main`, folder `/docs`, and then wait for the next publish.
- **Speaker says Web Speech is unsupported:** Use Chrome or Edge for speaker mode. Safari and Firefox support may be limited.
- **Audience QR does not open the right page:** Verify it resolves to `/demo/` or `/demo/index.html`. Refresh the speaker page after changing publish mode or relay URL.
- **Relay updates fail from GitHub Pages:** If the page is HTTPS and the relay is `http://`, browsers usually block requests as mixed content. Use local server mode or an HTTPS relay.
- **No live audience text yet:** Static mode works without relay. Configure relay mode only when you need cross-device SSE updates.
- **I don't have internet at my event:** That's fine! AirScript requires **zero internet**. Run `npm start` and serve locally from your laptop. All transcription, caption updates, and QR codes work entirely on the local network.
- **Venue Wi-Fi blocks device-to-device traffic:** Use Internet Sharing to create your own network, or run local relay mode (`npm start`) and share your laptop's IP.
- **Need network setup help:** Open `https://mgifford.github.io/AirScript/mac-internet-sharing.html` for two options: using your regular Wi-Fi and local relay, or setting up Mac Internet Sharing.

The local relay accepts cross-origin browser requests so a separately hosted static speaker page can post captions to it, provided browser security rules allow the origin/transport combination.

## Accessibility CI/CD

This repository now has layered accessibility automation in GitHub Actions:

- PR and main-branch gate: `.github/workflows/a11y-ci.yml`
  - Runs `pa11y-ci` against key URLs in `.pa11yci.json`.
  - Runs Lighthouse accessibility assertions from `.lighthouserc.json`.
  - Fails the workflow when accessibility score drops below `0.90`.
- Scheduled and manual deep scan: `.github/workflows/accessibility-scanner.yml`
  - Runs monthly on the 1st and can be triggered manually.
  - Uses `github/accessibility-scanner` to open trackable issues.

The CI gate currently scans:

- `/`
- `/demo/`
- `/demo/speaker.html`
- `/mac-internet-sharing.html`

### Required secret for scheduled scanner

The scheduled scanner needs a fine-grained PAT stored as `GH_TOKEN` because `GITHUB_TOKEN` is not sufficient for issue/PR creation by that action.

Recommended token permissions:

- `actions: write`
- `contents: write`
- `issues: write`
- `pull-requests: write`
- `metadata: read`

If contrast still feels weak in specific places, run the `Accessibility CI` workflow and inspect which route fails. That gives a concrete target before visual adjustments.

## GitHub Pages Notes

- The default transcription engine is the MDN [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- HTMX is still part of the design. It handles SSE-driven audience updates rather than microphone capture, because the Web Speech API itself must run in browser JavaScript.
- If the page is served over HTTPS, browsers usually block requests from that page to an `http://` relay. That matters when GitHub Pages tries to talk to a local LAN relay such as `http://192.168.2.1:8000`.
- For local audience broadcasting, the cleanest path is to use the local Express server directly for both the speaker and audience pages.
- For remote or third-party services, prefer an HTTPS relay endpoint that accepts `POST /update` and exposes `GET /stream`.

## Provider Adapters

The speaker app now includes a small provider adapter layer with two built-in options:

- `web-speech`: browser-native capture and transcription via the Web Speech API
- `https-json`: browser speech capture plus a configurable HTTPS JSON endpoint for caption refinement or alternate generation

The HTTPS adapter uses this request shape:

```json
{
  "text": "captured speech transcript",
  "prompt": "optional instruction for cleanup or formatting",
  "source": "web-speech",
  "timestamp": "2026-03-28T23:00:00.000Z"
}
```

By default it expects a JSON response with a top-level `text` field. You can override that in the speaker UI with a dot-path such as `result.text` or `choices.0.message.content` if your service uses a different response shape.

## Relay Configuration

The speaker page supports two publish modes:

- `Local preview only`: browser-only captions, no network publishing
- `Relay`: posts caption JSON to a relay endpoint

Relay requests use this payload shape:

```json
{
  "text": "Hello world",
  "source": "web-speech",
  "timestamp": "2026-03-28T23:00:00.000Z"
}
```

If an API key is entered in the speaker UI, it is sent as `Authorization: Bearer <key>` and stored only for the current browser session.

## Network Setup

**AirScript requires no internet connection.** All transcription and caption updates happen on-device or over your local network.

### Simplest Setup: Local Relay Mode

If your venue has regular Wi-Fi (or any network where devices can see each other):

1. Run `npm install && npm start` on your laptop.
2. Find your laptop's IP: **System Settings** → **Wi-Fi** → **Details**, or run `ifconfig | grep inet` in Terminal.
3. Share the URL with audience, e.g., `http://192.168.1.100:8000/demo/`.
4. Audience joins your Wi-Fi and navigates to that URL.
5. Open speaker console on your laptop at `http://localhost:8000/demo/speaker.html`.
6. Start speaking. Captions sync in real-time to all devices—no internet needed.

### If Venue Wi-Fi Blocks Local Traffic: macOS Internet Sharing

Only use this if your network admin has blocked device-to-device communication:

1. Open **System Settings** → **General** → **Sharing**.
2. Select **Internet Sharing**.
3. Set **Share your connection from** to your active uplink (Wi-Fi, Ethernet, or cellular hotspot—you don't need internet visible to devices).
4. Set **To computers using** to **Wi-Fi**.
5. Turn **Internet Sharing** on and configure the network name/password.
6. Follow the same local relay steps as above (devices join your shared network instead).

Note: If you only have one Wi-Fi radio, macOS cannot share Wi-Fi to Wi-Fi. In that case, use the regular network (option 1) or get an Ethernet adapter for option 2.

For step-by-step help with both setups:

- `https://mgifford.github.io/AirScript/mac-internet-sharing.html`

## HTTP Endpoints

- `GET /stream`: SSE stream for caption and slide updates
- `POST /update`: broadcast caption text with `{ "text": "..." }`
- `POST /slides`: broadcast slide HTML with `{ "html": "<section>...</section>" }`
- `GET /status`: basic runtime status

## Phase 3 Direction

The relay server already supports a separate `slide-change` SSE event. To integrate a markdown slide deck, render the current slide to HTML and POST it to `/slides` whenever the presenter advances.
