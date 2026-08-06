---
"fancy-ui-svelte": minor
---

Add the first five AI/chat components: `PixelLoader` (pixel-matrix pre-token loading state with a deterministic diagonal wave), `TypingIndicator` (staggered three-dot presence indicator), `ThinkingIndicator` (live agent status with shimmering activity label and elapsed stopwatch, inline or pill variant, with a `done` snippet), `StreamingText` (renders a growing string as a live token stream — appended deltas land tinted and settle, optional block cursor and markdown mode), and `ReasoningPanel` (collapsible reasoning trace that streams, autoscrolls, and folds itself into a "Thought for Ns" summary once done). All five are SSR-safe, honor `prefers-reduced-motion`, expose `--ft-*` theming hooks, and ship with colocated tests, docs examples, and stories.
