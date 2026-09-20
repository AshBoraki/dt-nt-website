# DTNT Website

Standalone product website for Denali Tech Net-Tools (DTNT).

Canonical domain: https://dt-nt.com/
Publisher: Denali Tech Inc

Privacy controls live in `analytics.js`. Optional Google Analytics and Microsoft Advertising load only after their respective choices; Global Privacy Control suppresses both. Sensitive purchase and activation pages exclude tracking even with a saved opt-in. Deploy privacy notice changes together with the controls they describe.

Run the dependency-free privacy regression suite with Node 24:

```sh
node --test tests/*.test.mjs
```

Current public version: 2.1.0-a.68
Latest approved Store version: 2.1.0-a.68
Primary install path: Microsoft Store product 9PFKHZ8M32HJ

This repo intentionally excludes generated customer order and license JSON artifacts. The purchase success flow should use the DTNT fulfillment API.

Free/Pro copy source of truth lives in `C:\Users\Hello\OneDrive\Desktop\DTNT\docs\PUBLIC_SURFACE_SYNC.md`. Keep the website aligned to the feature-level split: Free is usable for Wi-Fi survey, live channel view, IP scans, Copy IP, speed tests, saved profile review, and ping once; Pro unlocks recommendations, follow-up actions, exports, saved-key reveal, and advanced diagnostics.

Email/support routing source of truth lives in `EMAIL_SYSTEM.md`. Public DTNT support should stay on `support@dt-nt.com`, currently routed into `ash@denalitechs.com` through Google Workspace aliasing.
