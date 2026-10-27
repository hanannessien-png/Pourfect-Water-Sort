---
name: Android CI decisions
description: Constraints for external Android builds without changing the Expo project.
---
- Keep external Android CI on Linux x64 while workspace overrides exclude other platforms' native packages.
  **Why:** a macOS Codemagic worker would not match the existing package-manager constraints.
  **How to apply:** inspect those overrides before changing build machines.
- Never treat Expo's generated release signing as production signing.
  **Why:** the generated template points release builds at the debug key.
  **How to apply:** explicitly disable signing for compilation-only builds, or require the owner's upload key and fail if missing.
