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
- **Need Mac Internet Sharing help:** Open `https://mgifford.github.io/AirScript/mac-internet-sharing.html` for step-by-step setup from System Settings.

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

### macOS Internet Sharing (recommended for events)

1. Open **System Settings**.
2. Go to **General** -> **Sharing**.
3. Open **Internet Sharing** settings.
4. Set **Share your connection from** to your active uplink (Wi-Fi or Ethernet).
5. Set **To computers using** to **Wi-Fi**.
6. Configure Wi-Fi options (SSID and password).
7. Turn **Internet Sharing** on.
8. On audience phones, join that shared Wi-Fi and scan the QR code from `/demo/speaker.html`.

If these steps are hard to follow in the room, use the dedicated guide page:

- `https://mgifford.github.io/AirScript/mac-internet-sharing.html`

## HTTP Endpoints

- `GET /stream`: SSE stream for caption and slide updates
- `POST /update`: broadcast caption text with `{ "text": "..." }`
- `POST /slides`: broadcast slide HTML with `{ "html": "<section>...</section>" }`
- `GET /status`: basic runtime status

## Phase 3 Direction

The relay server already supports a separate `slide-change` SSE event. To integrate a markdown slide deck, render the current slide to HTML and POST it to `/slides` whenever the presenter advances.
