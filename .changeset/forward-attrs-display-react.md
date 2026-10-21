---
"fancy-ui-react": patch
---

PixelLoader, TypingIndicator, NeonBorder and BentoGrid now apply the rest props before their managed attributes, so a consumer can add attributes but no longer override `role`, `aria-live`, `data-state` or the component's own styles.
