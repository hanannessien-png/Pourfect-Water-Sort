---
name: Level generation rules
description: Difficulty ramp intent and tutorial trap rule for the Pourfect campaign generator.
---
- Owner said the game was "too easy" (Oct 2026); the ramp was made steeper. Don't soften bands without asking.
  **Why:** explicit owner feedback.
- Tutorial levels 1–2 must have no dead-end traps (checked exhaustively by `hasTrap` in the generator). Even the original level 1 (2 colours, 1 empty tube) had a one-move trap.
  **How to apply:** if the tutorial spec changes, keep the trap check; the full 300-level regeneration takes ~4 min — run it in the background.
