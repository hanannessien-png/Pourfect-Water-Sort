---
name: Store listing screenshots
description: How the Google Play screenshots were captured and composed, so they can be regenerated after UI changes.
---
- Captured from the web preview with puppeteer-core plus Chromium (`/repl/tools/bin/chromium`) at 400×720 with DPR 3. Then composed into 1080×1920 frames using an HTML page in the same browser, with a gold caption in Lilita One over the amethyst background.
- To seed progress, set `localStorage.save_v1` in `evaluateOnNewDocument`. Writing it after the app has loaded does not work, because the app overwrites the save.
- Hide the ad banner with CSS `[data-testid="banner-slot"]{display:none}`.
- To get real mid-level boards, solve the level with `solveBest` from the engine through tsx, then tap tubes found by `aria-label^="Tube N."`.
  **Why:** /tmp is wiped between sessions, so the scripts are lost; this is the recipe.
