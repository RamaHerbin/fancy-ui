---
"fancy-ui-svelte": minor
---

Add the tool-use surfaces of the AI/chat family: `ToolCall` (one invocation in a disclosure card — status dot, duration, pretty-printed request/result with cycle-safe JSON rendering, error calls auto-open), `ToolTimeline` (compact session summary on a vertical rail with verbs, targets, diff stats, and relative timestamps), `TerminalBlock` (live append-only command transcript with a hand-rolled ANSI SGR subset, stick-to-bottom autoscroll, running cursor, and exit-status footer), and `CodeDiff` (unified diff tuned for chat width — foldable per-file cards, tinted add/delete rows, copy-safe gutters, soft line clamping — driven by the internal diff parser). Introduces the shared `--ft-status-*` color tokens with `light-dark()` fallbacks used across the family for run-status semantics.
