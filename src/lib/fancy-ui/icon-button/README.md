# IconButton

A square or circular icon-only button, built on top of Button. `label` is required — an icon carries no text for a screen reader to fall back on, so this is the accessible name.

## Usage

```svelte
<script lang="ts">
	import { IconButton } from "fancy-ui-svelte";
</script>

<IconButton label="Edit" onclick={() => console.log("edit")}>
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M12 20h9" />
		<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
	</svg>
</IconButton>
```

```svelte
<!-- Variants -->
{#snippet pencil()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M12 20h9" />
		<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
	</svg>
{/snippet}

{#snippet gear()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="3" />
		<path
			d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
		/>
	</svg>
{/snippet}

{#snippet trash()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M3 6h18" />
		<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
		<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
	</svg>
{/snippet}

<IconButton label="Edit" variant="primary">{@render pencil()}</IconButton>
<IconButton label="Settings" variant="outline">{@render gear()}</IconButton>
<IconButton label="Delete" variant="destructive">{@render trash()}</IconButton>
```

```svelte
<!-- Sizes: the same icon at each size, so it settles at the button's own footprint -->
{#snippet gear()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="3" />
		<path
			d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
		/>
	</svg>
{/snippet}

<IconButton label="Settings" size="sm">{@render gear()}</IconButton>
<IconButton label="Settings" size="md">{@render gear()}</IconButton>
<IconButton label="Settings" size="lg">{@render gear()}</IconButton>
```

```svelte
<!-- Shape: square keeps the size's own radius, circle rounds it fully -->
{#snippet gear()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="3" />
		<path
			d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
		/>
	</svg>
{/snippet}

<IconButton label="Settings" shape="square">{@render gear()}</IconButton>
<IconButton label="Settings" shape="circle">{@render gear()}</IconButton>
```

```svelte
<!-- href renders an <a> instead of a <button>, exactly like Button -->
<IconButton label="Open in new tab" href="https://example.com" target="_blank">
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
		<polyline points="15 3 21 3 21 9" />
		<line x1="10" y1="14" x2="21" y2="3" />
	</svg>
</IconButton>
```

## Props

| Prop       | Type                                                                            | Default     | Description                                                              |
| ---------- | ------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `label`    | `string`                                                                        | —           | **Required.** Accessible name — there is no visible text to fall back on |
| `variant`  | `"primary" \| "secondary" \| "outline" \| "ghost" \| "accent" \| "destructive"` | `"outline"` | Visual treatment, forwarded to the underlying Button                     |
| `size`     | `"sm" \| "md" \| "lg"`                                                          | `"md"`      | Square footprint (30 / 36 / 42px) and resting radius                     |
| `shape`    | `"square" \| "circle"`                                                          | `"square"`  | Square keeps the size's own radius; circle rounds it fully               |
| `type`     | `"button" \| "submit" \| "reset"`                                               | `"button"`  | Native `type`; ignored once `href` renders an anchor instead             |
| `disabled` | `boolean`                                                                       | `false`     | Greys the control out and blocks activation                              |
| `loading`  | `boolean`                                                                       | `false`     | Spinner in place of the icon, `aria-busy`, blocks activation             |
| `href`     | `string`                                                                        | —           | Renders an `<a>` instead of a `<button>` when set                        |
| `target`   | `string`                                                                        | —           | Anchor `target`. `"_blank"` forces a safe `rel`                          |
| `rel`      | `string`                                                                        | —           | Anchor `rel`, widened rather than replaced when `target="_blank"`        |
| `onclick`  | `(event: MouseEvent) => void`                                                   | —           | Fires on activation; never called while `disabled` or `loading`          |
| `children` | `Snippet`                                                                       | —           | The icon, rendered centred                                               |
| `class`    | `string`                                                                        | —           | Additional CSS classes                                                   |
| `ref`      | `HTMLButtonElement \| HTMLAnchorElement \| null`                                | `null`      | Bindable element reference                                               |
| `sound`    | `boolean`                                                                       | `false`     | Plays the `press` cue on activation, once the user has enabled sound     |

## Theming

IconButton forwards `variant` straight to Button, so it follows the same tokens: `primary` / `secondary` / `outline` / `destructive` read the theme's own semantic colors, and `accent` reads the shared `--ft-accent` / `--ft-accent-foreground` custom properties (see the Button README for how to retint it). The focus ring and loading spinner are Button's own — nothing about them is reimplemented here.

## Sound

Set `sound` to play the `press` cue on activation, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<IconButton sound label="Like" onclick={like}>
	<!-- icon -->
</IconButton>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the icon button **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). `disabled` and `loading` block the cue exactly like they block `onclick`. `sound` is forwarded straight through to the underlying `Button`, which is the only place the cue actually plays — IconButton adds no second call site of its own.

## Implementation notes

- IconButton renders a `<Button>` under the hood: `label` becomes Button's `aria-label`, and the icon is forwarded as Button's `iconStart` rather than its `children`. That routing matters — Button swaps `iconStart` for its spinner while `loading` and leaves `children` alone, so the icon disappears cleanly during loading instead of sitting next to the spinner.
- The square footprint comes from zeroing Button's own horizontal padding and setting an explicit `size-[Npx]` per size variant; the per-size radius is inherited from Button unchanged, so `shape="square"` needs no override at all — only `shape="circle"` overrides it, with `rounded-full`.
- `variant="ghost"` rests at `text-muted-foreground` instead of Button's own full-strength foreground: with no label alongside the icon, the muted tone reads as the more appropriate resting state, brightening on hover/focus the same way Button's ghost variant already does.
- `fullWidth` is deliberately not exposed — an icon-only control has no reason to stretch to its container's width.
