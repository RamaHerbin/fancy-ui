---
"fancy-ui-svelte": minor
---

Add the shared foundations for an upcoming AI/chat component family. A new dependency-free, SSR-safe `_internals` module set ships inside the package: a hardened markdown mini-renderer (token-tree rendering with zero raw-HTML sinks, allowlisted link schemes, and linear-time parsing under adversarial input, with a dedicated security regression suite), a streaming-text primitive that animates appended deltas then settles, a unified-diff parser, floating-menu positioning with viewport flip/clamp, a chat autoscroll action with stick-to-bottom detection, elapsed/relative time helpers, copy-to-clipboard state, and a waveform draw core. Shared AI data types (`ChatMessageData`, `ToolCallData`, `SourceData`, `PlanStepData`, `ThreadData`, …) are exported from the package barrel, and two new registry categories (`ai-chat`, `ai-agents`) land with labels translated across all 16 docs locales.
