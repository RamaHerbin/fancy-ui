---
"fancy-ui-svelte": patch
---

CopyButton keeps its width when the label changes: the button reserves the widest of the idle, copied and failed labels, and the text now swaps with a short out and in instead of jumping. `onCopy` also reports the value that was actually written when `value` changes while a copy is still in flight.
