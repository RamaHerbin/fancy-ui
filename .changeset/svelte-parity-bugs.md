---
"fancy-ui-svelte": patch
---

Fix a set of upstream defects surfaced while reviewing the React port, so both packages share the same behaviour:

- AnimatedBeam: the `delay` prop now staggers the beam (`begin` on the SMIL animations); it was declared but never wired.
- AnimatedTooltip: the avatar wrapper no longer claims `role="button"`; keyboard focus shows the tooltip and links it with `aria-describedby` / `role="tooltip"`.
- AnimatedTestimonials, InteractiveHoverButton, SmoothCursor, Stepper, CodeDiff, DisplacementText: small accessibility corrections (explicit `type="button"`, decorative layers `aria-hidden`, list semantics kept, add/remove verdicts and rasterised text exposed to assistive tech).
- ContextMenu: a second right-click repositions the panel at the new pointer position.
- Drawer, Sheet: new optional `ariaLabel` prop names the dialog when no `title` is rendered.
- DropdownMenu: submenu panels are labelled by their trigger.
- Select: the listbox popup carries an accessible name.
- EditorialEngine: the article keeps its heading and paragraph semantics once the engine boots.
- FileUpload: repeating an identical rejection is announced again.
- FireworksHdr: the window pointer listener is removed on unmount even when `interactive` changed after mount.
- LineReveal: `document.fonts` is guarded; `font` and `line-height` no longer clobber each other.
- NumberTicker: a value change cancels the in-flight animation instead of running two loops.
- RippleButton: ripple keys are unique across same-millisecond clicks.
- Sparkles: particle coordinates are no longer double-scaled on high-DPI displays.
- TerminalText: the glitch loop is cleaned up and survives prop changes without doubling.
- TimePicker: committing a slot with the pointer returns focus to the trigger instead of `<body>`.
- VoiceInput: keyboard focus follows the control across state switches.
