# Pourfect — Owner Decisions (override the PDF where they differ)

Source spec: attached_assets/Water_Sort_Puzzle_—_Replit_Master_Prompt_1791933700635.pdf — follow it fully except for the overrides below.

## Identity
- Play title: **Pourfect: Water Sort Puzzle** (27 chars). Short/launcher name: **Pourfect**. Owner asked for a short, distinctive English name; this is it.
- Android package: `com.apexinteractive.pourfect` (kept in src/config/brand.ts + app.config.ts only). Owner typed the studio as "Apex Interative"; confirm spelling with owner before the first Play upload — package cannot change after publishing.
- Developer: Apex Interactive — contact: hanannessien@gmail.com (use in PRIVACY_POLICY.md, in-app privacy text, STORE_LISTING.md; no contact placeholders).

## Ads — NO IDs AT ALL
- Do NOT put any ad IDs anywhere: not the owner's, not Google's TestIds, not the sample app id `ca-app-pub-3940256099942544~...`.
- src/config/ads.ts holds empty strings for the Android app id and the 4 unit ids (banner, app-open, interstitial, rewarded), each with a clear `// PASTE YOUR ID HERE` marker. The owner will hand over the real IDs at the end.
- Expo Go / preview: MockProvider handles all four formats (fake banner strip + fake full-screen ads with 3–5 s countdown) so every ad flow is testable.
- AdMobProvider activates only when IDs are present. Because the AdMob native SDK crashes on launch without an app id, app.config.ts must make any EAS/standalone build fail early with a clear message ("Add your AdMob app id in src/config/ads.ts") while the app id is empty. Owner accepted that no real APK is built until the IDs arrive.
- Everything else in PDF section 8 (consent/UMP, thresholds, policy rules, tests with fake clock) stays.

## Audience & privacy
- Target audience 13+ (not Families). maxAdContentRating PG, tagForChildDirectedTreatment false, tagForUnderAgeOfConsent false.
- Privacy policy: deliver text only (docs/PRIVACY_POLICY.md + bundled in-app). Owner hosts the public URL themselves. No Replit-hosted page.

## Pacing (overrides "never stop")
Stop for owner review on their Android phone (Expo Go) at:
1. End of Phase 3 — board playable with fixed levels.
2. End of Phase 5 — meta systems + store/skins.
3. End of Phase 6 — audio done, before ads and release.
Then Phases 7–8 straight through. Between checkpoints, follow the PDF's "no questions" rule and log decisions in README.md.

## Visual direction (chosen by me, owner said "you pick")
"Calm twilight": deep indigo → teal gradient backdrop, frosted rounded cards on the 8 dp grid, warm coral/gold accent for primary actions, white Fredoka type. Glossy glass tubes with liquids that glow softly against the dark backdrop. Default equipped items: Classic glass tube, Classic liquid palette, Twilight gradient background.

## Platform
Android only, portrait, English-only UI. No iOS or web work. Final AAB built via EAS on the owner's connected Expo account only after ad IDs are in; owner uploads to Play Console.
