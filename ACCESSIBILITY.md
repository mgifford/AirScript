# ACCESSIBILITY.md

## Our Commitment

Accessibility is not a feature; it is a fundamental requirement of **AirScript**. Our goal is to ensure that live presentations are inclusive by default, moving the "accommodation" from a centralized screen to the user's personal device, where they have full control over their viewing environment.

We aim to meet or exceed **WCAG 2.2 Level AA** standards for all audience-facing interfaces.

---

## 1. Core Principles

### A. Perceivable: Multi-Modal Communication

- **Live Regions:** The captioning area utilizes `aria-live="polite"` to ensure that screen readers announce new text without the user needing to manually refresh or move focus.
- **Visual Contrast:** The default theme provides a contrast ratio of at least **7:1** for text.
- **High Contrast Mode:** The audience page includes a "High Contrast" toggle (Yellow on Black) to assist users with low vision or light sensitivity.

### B. Operable: Low-Barrier Interaction

- **No-App Entry:** By using a QR code and standard web technologies (HTML/HTMX), we eliminate the barrier of downloading proprietary software that may not be accessible.
- **Touch Targets:** All interactive elements, such as theme toggles and settings controls, have a minimum hit area of **44x44 CSS pixels** to accommodate users with motor impairments.
- **Keyboard Support:** Every feature accessible via touch/mouse is fully navigable via keyboard (`Tab` and `Space/Enter`).

### C. Understandable: Clarity and Consistency

- **Predictable UI:** The interface is kept intentionally "boring." Captions stay in a fixed location to minimize cognitive load and eye tracking strain.
- **Language Support:** While the local engine handles the primary language, the HTML structure includes proper `lang` attributes to allow the user's browser-level translation tools to work effectively.

### D. Robust: Support for Assistive Technology (AT)

- **Semantic HTML:** We use standard HTML5 tags (`<main>`, `<section>`, `<header>`) instead of generic `<div>` soups, ensuring that screen readers can map the page structure accurately.
- **Clean Markup:** By using **HTMX**, we keep the DOM updates surgical. This prevents screen readers from "re-reading" the entire page every time a new sentence is captioned.

---

## 2. Real-Time Specifics

### Captioning Logic

- **Buffer Control:** Captions remain in a fixed display region rather than forcing a rapid chat-style scroll.
- **Font Scaling:** The audience page now includes `Small`, `Medium`, `Large`, and `Extra Large` text size options backed by CSS variables, while still allowing browser zoom up to **400%** without breaking the layout.

### Pulse & Feedback (Remote)

- **Line Spacing:** The audience page includes `Standard` and `Wide` line spacing settings to support different reading preferences.
- **Settings Persistence:** Theme, text size, and line spacing are stored locally on the audience device so each person can personalize their own view without affecting others.

---

## 3. Offline Inclusivity

We believe that **Accessibility should not require an Internet Connection.**

- By hosting the server locally via "Internet Sharing," we ensure that users in "Dead Zones" or secure facilities still have access to live captions.
- Local-first deployments can serve all assets from the Node.js server to prevent "broken" accessibility features when offline. The current GitHub Pages mode still uses CDN-hosted HTMX and should be treated as a connected fallback until those assets are vendored locally.

---

## 4. Accessibility Checklist for Contributors

When adding features to this project, please verify:

1. [ ] **Color:** Is the information conveyed through color also available in text or icons?
2. [ ] **Focus:** Is the focus indicator clearly visible when tabbing through the Speaker Dashboard?
3. [ ] **Alt-Text:** Do any status icons (e.g., "Mic On/Off") have descriptive `alt` or `aria-label` text?
4. [ ] **Latency:** Does the HTMX swap cause a "flicker" that might be disruptive to users with vestibular disorders?

---

## 5. Feedback

We are always learning. If you encounter a barrier while using this tool, please open an Issue or contact the maintainer directly. We prioritize accessibility bugs with the same urgency as security vulnerabilities.

---

### Implementation Note

To make this document live, AirScript includes an Accessibility Settings menu directly on the audience page in [docs/index.html](docs/index.html). It is a user preference control, not an accessibility overlay: it helps each attendee personalize how captions are displayed on their own device without claiming to repair inaccessible markup.

The current implementation follows the direction described in these personalization references:

- [User Personalization and Accessibility Best Practices](https://mgifford.github.io/ACCESSIBILITY.md/examples/USER_PERSONALIZATION_ACCESSIBILITY_BEST_PRACTICES.html)
- [Light/Dark Mode Accessibility Best Practices](https://mgifford.github.io/ACCESSIBILITY.md/examples/LIGHT_DARK_MODE_ACCESSIBILITY_BEST_PRACTICES.html)

The audience settings menu uses CSS variables plus HTMX event bindings for:

- **Text Size:** `Small | Medium | Large | Extra Large`
- **Theme:** `System | Light | Dark | High Contrast (Yellow/Black)`
- **Line Spacing:** `Standard | Wide`

The settings apply on-device and persist in local storage so each attendee can adjust the display independently. By default, theme selection follows the device or browser color preference until the attendee explicitly overrides it on the page.

Contributor guidance for future personalization work:

- Respect browser and OS preferences first, including `prefers-color-scheme`, `prefers-reduced-motion`, and forced-colors mode.
- Keep all preference controls keyboard operable, screen-reader labeled, and announced through a live region when values change.
- Preserve browser zoom and user assistive technology behavior rather than replacing them.
- Add a clear reset path back to device defaults whenever more controls are introduced.
- Verify all theme combinations continue to meet WCAG 2.2 AA contrast requirements.
