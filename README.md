# LocalSync Captions

Privacy-first live captions with a browser-first transcription path. The default engine is the Web Speech API running entirely in the browser, which means the UI can be hosted as static files, including on GitHub Pages. HTMX remains the delivery layer for audience updates when a relay stream is present. When you want shared audience captions, a local or remote relay can be added without changing the default capture flow.

## Try The Demo

Start here if you want to see the app before reading the setup notes.

- Live demo: `https://mgifford.github.io/airscript/demo/`
- Canonical document URL: `https://mgifford.github.io/airscript/demo/index.html`

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

Host the contents of `public/` on GitHub Pages or any static host. In this mode:

- Speech recognition runs in the browser with the Web Speech API
- Captions can stay on the speaker device with no backend
- HTMX stays in place on the audience page and connects only when you supply a relay stream URL
- You can optionally point the speaker page at a compatible relay endpoint later

For this repository, the default public demo URL is:

- `https://mgifford.github.io/airscript/demo/`

The canonical document URL is `https://mgifford.github.io/airscript/demo/index.html`, but the shorter `/demo/` path is the one intended for QR codes and sharing.

This repository includes a GitHub Actions workflow at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) that publishes the `public/` directory to GitHub Pages.

Minimal GitHub Pages setup:

1. Push the repository to GitHub.
2. In the repository settings, open Pages.
3. Set Build and deployment Source to GitHub Actions.
4. Push to `main` or run the `Deploy GitHub Pages` workflow manually.

The workflow publishes a root redirect and places the actual static app under `demo/`. It also generates `site-config.js` from the repository owner and repository name, lowercasing both so forks automatically get their own Pages URL without code edits.

The static artifact includes [public/.nojekyll](public/.nojekyll) so GitHub Pages serves the folder as plain static content without Jekyll processing.

The speaker page also includes a browser-side QR fallback. If the locally generated `qr.png` is missing, it renders a QR code for the default GitHub Pages demo URL instead.

### 2. Local Relay Mode

Run the Node server when you want QR discovery, SSE broadcasting, or local audience devices.

```bash
npm install
npm start
```

Then open:

- Audience view: `http://YOUR_LOCAL_IP:8000/`
- Speaker view: `http://YOUR_LOCAL_IP:8000/speaker.html`

The local relay accepts cross-origin browser requests so a separately hosted static speaker page can post captions to it, provided browser security rules allow the origin/transport combination.

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

1. Open System Settings > General > Sharing.
2. Enable Internet Sharing.
3. Share your connection to Wi-Fi.
4. Configure the Wi-Fi network name and password.
5. Join audience devices to the same network and scan the QR code.

## HTTP Endpoints

- `GET /stream`: SSE stream for caption and slide updates
- `POST /update`: broadcast caption text with `{ "text": "..." }`
- `POST /slides`: broadcast slide HTML with `{ "html": "<section>...</section>" }`
- `GET /status`: basic runtime status

## Phase 3 Direction

The relay server already supports a separate `slide-change` SSE event. To integrate a markdown slide deck, render the current slide to HTML and POST it to `/slides` whenever the presenter advances.
