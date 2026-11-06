---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

LetterPullup, TextGenerateEffect, BoxReveal, HyperText, SparklesText, Book, AnimatedTestimonials, FlipWords, ContainerTextFlip and TerminalText now honour `prefers-reduced-motion`, at mount and when the preference changes: the text, letters and cover rest in their final state, the word cyclers and the sparkle field stop, HyperText shows its whole text instead of scrambling, and TerminalText shows every line after `delay` (still calling `onComplete`, once) with a steady caret, snapping to all lines if the preference flips mid-stream and ignoring a flip after it finished. AnimatedTestimonials swaps the quote in the same tick as a previous or next press under a reduce preference, and also pauses autoplay while focus is inside it in the Svelte and Vue ports, as the React port already did. Without a reduce preference the pictures and timings are unchanged.
