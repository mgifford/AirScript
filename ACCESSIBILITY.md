# ACCESSIBILITY.md

## Our Commitment

Accessibility is not a feature; it is a fundamental requirement of **AirScript**. Our goal is to ensure that live presentations are inclusive by default, moving the "accommodation" from a centralized screen to the user's personal device, where they have full control over their viewing environment.

We aim to meet or exceed **WCAG 2.2 Level AA** standards for all audience-facing interfaces.

---

## 1. Core Principles

### A. Perceivable: Multi-Modal Communication

- **Live Regions:** The captioning area utilizes `aria-live="polite"` (or `assertive` depending on user settings) to ensure that screen readers announce new text without the user needing to manually refresh or move focus.
- **Visual Contrast:** The default theme provides a contrast ratio of at least **7:1** for text.
- **High Contrast Mode:** We provide a "High Contrast" toggle (Yellow on Black) to assist users with low vision or light sensitivity.

### B. Operable: Low-Barrier Interaction

- **No-App Entry:** By using a QR code and standard web technologies (HTML/HTMX), we eliminate the barrier of downloading proprietary software that may not be accessible.
- **Touch Targets:** All interactive elements, such as the "Pulse" slider or theme toggles, have a minimum hit area of **44x44 CSS pixels** to accommodate users with motor impairments.
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

- **Buffer Control:** Users should have the option to slow down the "scroll" of captions to suit their reading speed.
- **Font Scaling:** We utilize `rem` units for all typography, allowing the audience to scale text up to **400%** using their browser's native zoom without breaking the layout.

### Pulse & Feedback (Remote)

- **ARIA Labels:** The "Pulse" slider is wrapped with descriptive labels (`aria-label="Presentation Pace Indicator"`) and provides real-time feedback of its value to the user.
- **Haptic Feedback:** Where supported by the mobile browser, interaction triggers subtle haptics to confirm data transmission for users with visual impairments.

---

## 3. Offline Inclusivity

We believe that **Accessibility should not require an Internet Connection.**

- By hosting the server locally via "Internet Sharing," we ensure that users in "Dead Zones" or secure facilities still have access to live captions.
- All assets (HTMX, CSS, Fonts) are served from the local Node.js server rather than CDNs to prevent "broken" accessibility features when offline.

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

To make this document "live," I recommend adding an **Accessibility Settings** menu to your `audience.html` that includes:

- **Text Size:** `Small | Medium | Large | Extra Large`
- **Theme:** `Dark | Light | High Contrast (Yellow/Black)`
- **Line Spacing:** `Standard | Wide`

**Would you like me to provide the CSS variables and HTMX code to make these toggles functional on the audience's phones?**
