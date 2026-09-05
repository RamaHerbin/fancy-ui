# Pressable

A wrapper that gives any interactive child a consistent, cross-browser press animation — a small scale-down on `pointerdown`/`keydown`, back to rest on release. It supersedes hand-rolled `:active` styling with one shared, tactile-feeling press state that doesn't depend on the wrapped element's own CSS.

## Usage

```svelte
<script>
	import { Pressable } from "fancy-ui-svelte";
	import { Button } from "fancy-ui-svelte";
</script>

<Pressable>
	<Button>Save changes</Button>
</Pressable>
```

Pressable renders exactly one wrapper `<div>` around its child and never adds a role, `tabindex`, or click handling of its own — the wrapped element (a `<button>`, an `<a>`, a custom control) keeps its own semantics and stays the only thing that actually activates. Pressable only reacts to press and release, it never triggers anything.

**Wrap exactly one interactive element.** Pressable supersedes `:active` styling — if the wrapped element (or something in your global CSS) also styles `:active`, the two effects stack. Most browsers' default `:active` style is invisible anyway, but don't add your own on top of Pressable's scale.

### Composition: a glass or gradient surface

Pressable never writes a `transform` anywhere except its own wrapper `<div>`, so it composes cleanly with any surface that has none of its own on the outermost box — for example `LiquidGlass` or `FrostedGlass`:

```svelte
<Pressable class="flex w-full">
	<LiquidGlass class="rounded-2xl p-6">
		<p>Tap to expand</p>
	</LiquidGlass>
</Pressable>
```

The glass panel presses as a whole, with nothing to fight over which element owns `transform`.

### Not a replacement for RippleButton

`RippleButton` draws a click ripple; Pressable is a press-and-release scale. They answer different questions ("did my click land visually?" vs. "does this feel physically pressable?") and can be combined — `<Pressable><RippleButton>…</RippleButton></Pressable>` — but wrapping a `RippleButton` in Pressable is usually redundant, since a `RippleButton` is already a `<button>` and gets the same scale as any other child.

## Props

| Prop       | Type                     | Default | Description                                                                                                                                                                            |
| ---------- | ------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scale`    | `number`                 | `0.97`  | Target `scale()` factor while pressed. Proportional to the child's size — a 40px chip barely moves at the default, while a large surface (a card, a panel) reads better around `0.99`. |
| `haptic`   | `false \| HapticPattern` | `false` | Touch-only vibration pattern fired on `pointerdown` (`"light" \| "medium" \| "heavy" \| "success" \| "error"`). `false` never vibrates.                                                |
| `disabled` | `boolean`                | `false` | Suppresses every listener; `data-pressed` never appears.                                                                                                                               |
| `children` | `Snippet`                | —       | Exactly one interactive child. Required. Not enforced at runtime.                                                                                                                      |
| `class`    | `string`                 | —       | Additional CSS classes, merged onto the wrapper.                                                                                                                                       |
| `ref`      | `HTMLDivElement \| null` | `null`  | Bindable reference to the wrapper element.                                                                                                                                             |

Any other standard `<div>` attribute (`id`, `data-*`, `aria-*`, …) is passed through to the wrapper.

## Theming

| CSS variable              | Default | Applies to                                                                                                                                                                                                                                           |
| ------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ft-pressable-scale`    | `0.97`  | `transform: scale(...)` while `[data-pressed]`, no-preference only. Written inline only when `scale` differs from the default, so a stylesheet rule can still set it otherwise.                                                                      |
| `--ft-pressable-duration` | `150ms` | Transition duration for the scale, no-preference only.                                                                                                                                                                                               |
| `--ft-pressable-opacity`  | `0.85`  | Opacity while `[data-pressed]` under reduced motion (or when neither motion-preference query is supported). While motion is enabled (`no-preference`), the pressed state resets opacity back to `1` so scale is the only channel — see Motion below. |

## Motion

- **Reduced motion**: the moving scale transition lives entirely inside `@media (prefers-reduced-motion: no-preference)`. With reduced motion, `[data-pressed]` still gets the `opacity: var(--ft-pressable-opacity, 0.85)` change — a static, non-moving stand-in that keeps press feedback intact. When motion is enabled, that same fallback opacity is reset back to `1` on press, so scale is the only thing that moves — a press never shrinks _and_ fades at once.
- **Touch and coarse pointers**: `touch-action: manipulation` removes the ~300ms tap delay and disables double-tap-zoom, without blocking scroll the way `touch-action: none` would — a card in a scrollable list stays scrollable while it press-reacts. `haptic` only fires for `pointerType === "touch"`; pen and mouse never vibrate. Reserve `haptic` for standalone controls rather than rows inside a scroll container: the buzz fires on `pointerdown`, before a gesture is known to be a tap versus a scroll, so a scroll that starts on the element also vibrates it.
- **Timing**: 150ms, `--ft-ease-inout` (`cubic-bezier(0.4, 0, 0.2, 1)`) — a reversible-state curve, since a press can resolve either by releasing (back to rest) or by the interaction continuing.

## Accessibility

- Pressable never assigns a role or `tabindex`; the wrapped element's own semantics and focusability are unchanged.
- Keyboard parity: `data-pressed` arms on `Space`/`Enter` `keydown` (only when the event's target is inside the wrapper, and never on a held-key repeat) and releases on the matching `keyup`, `pointerup`, `pointercancel`, `pointerleave`, or `focusout` — whichever comes first (note that `Space` does not activate an `<a>` child — the press shows, the link does not follow).
- Pressable never calls `preventDefault()` or `stopPropagation()` and never handles activation itself — the wrapped control's own click/Enter/Space behaviour fires exactly as it would unwrapped.
- `disabled` suppresses every listener; the wrapper never carries `data-pressed`. It does not visually dim anything on its own — let the wrapped control's own `disabled` styling show through instead of stacking a second dimmed state on top.
- Pressable owns seven events on the wrapper — `onpointerdown`, `onpointerup`, `onpointercancel`, `onpointerleave`, `onfocusout`, `onkeydown`, `onkeyup`. Put your own handlers for those on the child instead; every other event (including `onclick`) passes through untouched.

## Implementation notes

- **Cleanup**: every listener is a plain Svelte template binding (`onpointerdown={...}`, and so on) on the wrapper element itself — there is no manual `addEventListener`, observer, or timer to tear down. Svelte removes the bindings automatically when the wrapper unmounts.
- **SSR**: the wrapper and its static resting state (`scale(1)`, unpressed) render on the server exactly as they do on the client. `data-pressed` only ever appears after a real pointer/keyboard interaction, so there's nothing that could mismatch during hydration.
- **Stacking context**: while motion is enabled the wrapper carries a `transform`, so a `position: fixed` descendant (a dropdown, a tooltip) anchors to the wrapper instead of the viewport.
- **Shrink-to-fit width**: the wrapper is `inline-flex`, so it shrink-wraps its child and sits on a text baseline. A block-level child (a full-width `<Button class="w-full">`, a card) will stop filling its container unless you also pass `class="flex w-full"` on the `Pressable` itself.
