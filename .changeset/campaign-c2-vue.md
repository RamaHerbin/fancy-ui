---
"fancy-ui-vue": minor
---

Toast: `toast()` takes `onClose(reason)`, called exactly once with `"timeout"`, `"dismiss"`, `"action"` or `"evicted"` (pressing the action settles it as `"action"` before its handler runs and does not close the toast), and `progress: true`, a thin bar that drains over `duration`, pauses with the toast and stays full under reduced motion. This is what lets an undo flow commit a deletion only when nothing took it back.
