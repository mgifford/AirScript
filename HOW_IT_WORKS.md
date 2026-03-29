# How AirScript Works

## Current Architecture

AirScript is now a browser-first caption system with an optional local relay.

1. The speaker page runs speech capture in the browser.
2. The default transcription provider is the Web Speech API.
3. Captions can stay local on the speaker device with no backend at all.
4. When you want audience devices to follow along, the speaker page posts caption updates to the local Node relay.
5. The relay publishes updates over Server-Sent Events so audience devices receive caption and slide changes in near real time.
6. The same relay also generates the QR code and serves the static audience and speaker pages.

## Main Files

- `docs/demo/index.html`: audience experience
- `docs/demo/speaker.html`: speaker console and relay/provider controls
- `docs/demo/app-config.js`: browser-side persistence and query-string configuration
- `docs/demo/site-config.js`: URL derivation for Pages, forks, and local placeholders
- `server.js`: optional local relay, HTTPS local server, QR generation, SSE broadcast
- `docs/mac-internet-sharing.html`: setup guide for live room networking

## Deployment Modes

### 1. Static Preview

Use GitHub Pages or any static host when you want a shareable preview of the interface.

- Good for demos, design review, and browser-only speaker testing.
- No local relay required.
- Cross-device live captions do not work unless you point the speaker page at a relay.

### 2. Local Relay Over LAN

Use `npm start` on the presenter laptop when you want live audience devices to receive updates.

- The relay serves the static files.
- The relay exposes `/update`, `/slides`, `/stream`, and `/status`.
- The speaker browser posts updates to the relay.
- Audience browsers subscribe to the SSE stream.

### 3. Remote HTTPS Relay

The speaker page can also point at a compatible HTTPS endpoint instead of the bundled local relay.

- Useful when you have a trusted remote host or a managed edge service.
- Requires the endpoint to accept the same JSON payload shape and expose an SSE stream.

## HTTPS And Trust Options

The current local relay defaults to HTTPS because browser APIs and mixed-content rules make plain HTTP increasingly fragile.

### Option A: Self-signed certificate

- This is the current default.
- Best when the presenter controls the laptop and can accept the trust warning once.
- Lowest setup cost.
- Downside: the first-run warning is ugly and confusing for guests if they hit the URL directly before trust is established.

### Option B: Local CA with `mkcert`

- Better local developer and event-host experience.
- You install and trust your own local certificate authority once per device.
- Certificates generated from that CA are trusted without the harsh self-signed warning.
- Downside: every audience device must trust that CA if they connect directly to the LAN server.

### Option C: Reverse proxy with a real certificate

- Best when you have a stable domain name and an internet-visible endpoint or managed network edge.
- Use Caddy, Nginx, or another reverse proxy in front of the relay.
- Cleanest browser experience because the certificate chains to a public CA.
- Downside: usually requires DNS control and often internet access for certificate issuance and renewal.

### Option D: Secure private mesh or tunnel

- Good for trusted teams using something like Tailscale, Cloudflare Tunnel, or a VPN-backed hostname.
- Lets you keep the relay private while avoiding ad hoc LAN trust prompts.
- Downside: audience members need compatible clients or access to the same private network.

### Option E: Plain HTTP on a fully local network

- Simplest technically, but no longer the best default.
- Can still work in some browsers and environments.
- Downside: mixed-content restrictions and browser API security requirements make it brittle.

## Practical Recommendation

For now:

1. Keep self-signed HTTPS as the default fallback for fully offline rooms.
2. Document `mkcert` as the smoother self-hosted option for repeat local use.
3. Document reverse-proxy HTTPS as the best option for institutional or semi-permanent deployments.

## Testing And Verification

The current automated verification path is:

1. Lighthouse CI against the landing page, audience page, speaker page, and Mac setup guide.
2. Monthly `github/accessibility-scanner` runs against the published Pages site.

For local verification run:

```bash
npm run test:lighthouse
```

## What Should Stay In Sync

When behavior changes, update these together:

1. `README.md`
2. `AGENTS.md`
3. `ACCESSIBILITY.md`
4. workflow files in `.github/workflows/`
5. any setup guides in `docs/`
