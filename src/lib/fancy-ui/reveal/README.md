# Reveal

Animates content in the first time it is warranted — the viewport scrolling it
into view, the moment it mounts, or an external switch the caller drives —
using one of six directional/scale looks, with an arbitrary-length JS-computed
stagger for lists. Where `BlurReveal` is a single scroll-only blur+offset look
capped at ten `nth-child`-staggered children, `Reveal` is the general-purpose
entrance: three trigger modes, six presets, and a stagger with no child-count
ceiling.

## Usage

```svelte
<script lang="ts">
	import { Reveal } from "$lib/fancy-ui/reveal";
</script>

<Reveal preset="fade-up">
	<p>Scrolls into view, then rises and fades in.</p>
</Reveal>
```

### Staggering a list

```svelte
<Reveal stagger={50} from="first" class="grid grid-cols-3 gap-4">
	{#each items as item (item.id)}
		<Card {...item} />
	{/each}
</Reveal>
```

`stagger > 0` switches `Reveal` from animating its own root to animating each
direct **element** child instead — the root itself stays static and
unstyled, so nothing double-animates. `stagger` reaches direct element
children only: put `Reveal` itself on the grid/flex container (it already
supports `class` and `as`) rather than wrapping another element between
`Reveal` and the items you want staggered — wrapping the `{#each}` in its
own `<div>` gives `Reveal` exactly one child (that div), so `stagger` finds
nothing to stagger and the whole block cross-fades as one, indistinguishable
from `stagger={0}`. Bare text (`<Reveal>Hello</Reveal>`) still animates
correctly at `stagger={0}` (the default): the root itself is the thing that
moves — but `stagger > 0` on text-only content animates nothing at all
(there are no element children to find), silently.

### Excluding a child from the stagger

```svelte
<Reveal stagger={50} class="grid grid-cols-3 gap-4">
	<Card {...pinned} data-reveal-skip />
	{#each items as item (item.id)}
		<Card {...item} />
	{/each}
</Reveal>
```

A direct child carrying `data-reveal-skip` keeps its resting (visible,
untransformed) styles the whole time and receives no
`--ft-reveal-child-delay` — the remaining children's indices close up
around it, so the stagger sequence stays contiguous.

### Firing manually

```svelte
<script lang="ts">
	let shown = $state(false);
</script>

<Reveal trigger="manual" active={shown}>
	<p>Toggle `shown` to reveal, or re-hide it.</p>
</Reveal>
<button onclick={() => (shown = !shown)}>Toggle</button>
```

## Props

| Prop         | Type                                                                           | Default                           | Description                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preset`     | `"fade" \| "fade-up" \| "fade-down" \| "fade-left" \| "fade-right" \| "scale"` | `"fade-up"`                       | Which directional/scale look to animate with                                                                                                                                                            |
| `trigger`    | `"view" \| "mount" \| "manual"`                                                | `"view"`                          | What starts the reveal — viewport, next frame after mount, or the `active` prop                                                                                                                         |
| `active`     | `boolean`                                                                      | `false`                           | Read only when `trigger="manual"` — `true` reveals, `false` re-arms                                                                                                                                     |
| `once`       | `boolean`                                                                      | `true`                            | Disconnects the observer after the first reveal; `false` re-arms on leaving the viewport (`trigger="view"` only)                                                                                        |
| `threshold`  | `number`                                                                       | `0.1`                             | IntersectionObserver threshold (`trigger="view"` only)                                                                                                                                                  |
| `rootMargin` | `string`                                                                       | `"0px 0px -10% 0px"`              | IntersectionObserver rootMargin (`trigger="view"` only)                                                                                                                                                 |
| `duration`   | `number`                                                                       | `600`                             | Entrance duration in ms                                                                                                                                                                                 |
| `delay`      | `number`                                                                       | `0`                               | Delay before the entrance starts, in ms                                                                                                                                                                 |
| `easing`     | `string`                                                                       | `"cubic-bezier(0.16, 1, 0.3, 1)"` | CSS easing for the entrance                                                                                                                                                                             |
| `distance`   | `number`                                                                       | `16`                              | Travel distance in px for the four directional presets — ignored by `scale`                                                                                                                             |
| `stagger`    | `number`                                                                       | `0`                               | ms per stagger step; `0` animates the root, any positive value animates direct element children                                                                                                         |
| `from`       | `"first" \| "last" \| "center" \| number`                                      | `"first"`                         | Where the stagger counts distance from — only meaningful when `stagger > 0`                                                                                                                             |
| `initial`    | `"hidden" \| "visible"`                                                        | `"hidden"`                        | Server-rendered starting state: `"hidden"` paints hidden until the reveal (no flash); `"visible"` paints visible and hides on mount (one-frame flash, safe without hydration); see Implementation notes |
| `as`         | `keyof HTMLElementTagNameMap`                                                  | `"div"`                           | The element tag `Reveal` renders as, via `<svelte:element>`                                                                                                                                             |
| `onReveal`   | `() => void`                                                                   | —                                 | Fires once per reveal, the moment the state reaches `visible` — every re-reveal when `once={false}`                                                                                                     |
| `children`   | `Snippet`                                                                      | required                          | Content to reveal                                                                                                                                                                                       |
| `class`      | `string`                                                                       | —                                 | Additional CSS classes, merged onto the root                                                                                                                                                            |
| `ref`        | `HTMLElement \| null` (bindable)                                               | `null`                            | Bindable reference to the root element                                                                                                                                                                  |

## Theming

| CSS var                   | Fallback                             | Notes                                                                              |
| ------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| `--ft-reveal-duration`    | `var(--ft-duration-entrance, 600ms)` | Entrance duration                                                                  |
| `--ft-reveal-delay`       | `0ms`                                | Delay before the entrance starts                                                   |
| `--ft-reveal-easing`      | `var(--ft-ease-out)`                 | Entrance-only — `Reveal` never uses the departure curve                            |
| `--ft-reveal-distance`    | `16px`                               | Ignored by the `scale` preset                                                      |
| `--ft-reveal-child-delay` | —                                    | JS-written, per child, only when `stagger > 0` — never a static `:nth-child` sheet |

## Motion

- **Reduced motion**: the hiding CSS lives only inside
  `@media (prefers-reduced-motion: no-preference) and (scripting: enabled)` —
  outside it, every state renders at its resting opacity/transform. The
  `idle → armed → visible` state machine (and `onReveal`) runs identically
  either way; only the visual hiding disappears.
- **Touch and coarse pointers**: nothing here is pointer-driven — the
  viewport/mount/manual triggers and the stagger delays behave identically
  regardless of input type.
- **Timing**: the default entrance is `600ms` (`--ft-duration-entrance`)
  eased with `--ft-ease-out`. Stagger steps compress — never clip — to a
  600ms total delay span, however many children there are.

## Accessibility

- Hiding is `opacity`/`transform` only, never `visibility`/`display` — hidden
  content stays in the tab order the whole time. A keyboard user could
  otherwise `Tab` into content that looks invisible and get stuck there;
  instead, `focusin` bubbling from anywhere inside forces `visible`
  immediately, regardless of `trigger` — including `manual` with
  `active={false}`, where a mouse user would otherwise wait on an external
  toggle a keyboard user never has to.
- The reverse direction is guarded too: `once={false}` (view) re-hides on
  leaving the viewport, and `trigger="manual"` re-hides when `active` turns
  false — neither ever re-hides while focus sits inside the node. A tall
  `<Reveal once={false}>` around a form, for instance, won't fade a field the
  user is mid-Tab-into out from under their caret just because scrolling
  focus into view carried the container below the intersection threshold.
- `Reveal` renders no role or ARIA of its own — semantics belong to whatever
  content it wraps.

## Implementation notes

- **Cleanup**: `trigger="view"`'s IntersectionObserver, `trigger="mount"`'s
  pending animation frame, and the stagger `MutationObserver` are each torn
  down in their own `$effect` cleanup / action `destroy()`. The stagger
  cleanup also clears every `--ft-reveal-child-delay` it wrote, so a `stagger`
  that drops back to `0` doesn't leave stale inline vars behind.
- **SSR**: `initial="hidden"` (the default) renders `data-state="armed"` on
  the server, and `armed` is the only state the hiding CSS matches — so the
  content is hidden from the first paint and reveals without a flash.
  `initial="visible"` renders `data-state="idle"` instead, which paints fully
  visible; the mount effect flips it to `armed` (an instant hide — the
  entrance transition is declared on the `visible` state only, so nothing
  fades out) and the reveal plays from there. Pick `"visible"` for content
  that must be readable with JS off or on a route that never hydrates, and
  accept a one-frame flash. With reduced motion on, the hiding CSS never
  matches at all, so content is visible immediately regardless of `initial`.
- `as` renders through `<svelte:element>`, so `Reveal` can wrap any tag
  (`"ul"`, `"section"`, …) while keeping the `ft-reveal` class and its data
  attributes.

## Browser support

The hidden-by-default styling lives behind
`@media (prefers-reduced-motion: no-preference) and (scripting: enabled)` — an
unrecognized media feature makes the whole query not match, so on a browser
old enough not to know `scripting`, content simply renders visible from the
first paint instead of ever being hidden. Failing visible beats failing
invisible. Separately, on a browser (or environment) with no
`IntersectionObserver` at all, `trigger="view"` reports visible immediately
rather than leaving content stuck in its hidden state forever.

`scripting: enabled` reflects the _browser's_ capability, not whether _this
page_ actually hydrated — a route that ships with JS disabled server-side
(for example a SvelteKit page with `csr = false`), or a hydration that fails
partway, still matches the query in an otherwise fully capable browser, and
content stays hidden with nothing left to flip it visible. On such a route,
pass `initial="visible"`: the server paint is then visible and the hide only
happens once the mount effect actually runs.

`threshold` is a ratio of the element's own box against the (possibly
shrunk, via `rootMargin`) root — for content much taller than the viewport
(roughly 9× or more, with the default `threshold={0.1}` and
`rootMargin="0px 0px -10% 0px"`), the intersection ratio can never reach the
threshold and the node never reports visible on its own. Pass `threshold={0}`
for a `Reveal` around content that tall (`focusin` still rescues keyboard
users either way).
