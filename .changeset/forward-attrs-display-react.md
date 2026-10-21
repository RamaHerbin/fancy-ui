---
"fancy-ui-react": patch
---

PixelLoader and TypingIndicator keep role="status" and aria-live="polite", and BentoGrid keeps its reveal data-state, even when a consumer passes their own (these were previously overridable). NeonBorder now accepts and merges a consumer `style`.
