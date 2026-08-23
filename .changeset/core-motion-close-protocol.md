---
"fancy-ui-svelte": minor
---

Dialogs and alert dialogs now close the way they open: the panel and its backdrop fade out together instead of vanishing, focus comes back to the trigger the instant you dismiss rather than when the fade ends, and the page stays locked until the backdrop is actually gone. Also fixes a long-standing entrance bug where both surfaces drifted in from half their own size off-centre.

The entrance is now 300 ms and the exit 200 ms, both on the shared motion tokens — the panel scales as well as fades, the backdrop fades alone. Pressing Escape a second time while a dialog is leaving is no longer swallowed by the panel on its way out: it reaches whatever is underneath, and the dismiss fires exactly once either way. Reopening a dialog mid-close reverses the animation from wherever it had got to instead of restarting it, and pulls focus back inside the panel so the next dismiss returns it to the trigger exactly as the first one would have.

With reduced motion the close is fully synchronous again, exactly as before — no animation runs at all, and nothing a caller can observe waits for one in any case: `open` still flips, and `onOpenChange` still fires, the moment you dismiss.

Three internal primitives grew to support this and are available to every overlay: the dismiss layer can now report whether it is still live, the focus trap can hand back a pair of functions that return focus immediately and re-arm the trap on a reopen, and the scroll lock has an action form that releases at unmount rather than on a state flip. No public prop was added, removed or renamed.

No layout properties are animated by this change, so it names no exceptions to the transform-and-opacity rule.
