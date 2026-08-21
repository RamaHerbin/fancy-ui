# Copy Button

A button that writes a value to the clipboard, and says so — the label and
icon swap to a success skin for a moment, then settle back.

## Components

- `CopyButton` - A `Button` preset wired to the clipboard, with a transient copied state

## Usage

```svelte
<script>
	import { CopyButton } from "fancy-ui-svelte";
</script>

<CopyButton value="npm install fancy-ui-svelte" />
```

Icon-only, for a toolbar:

```svelte
<CopyButton value={snippet} iconOnly label="Copy snippet" />
```

React to the outcome instead of trusting the label alone:

```svelte
<script>
	import { CopyButton } from "fancy-ui-svelte";

	function onCopy(value, ok) {
		if (!ok) console.warn("Clipboard write failed for", value);
	}
</script>

<CopyButton value="npm install fancy-ui-svelte" {onCopy} />
```

## Props

| Prop          | Type                                             | Default     | Description                                                               |
| ------------- | ------------------------------------------------ | ----------- | ------------------------------------------------------------------------- |
| `value`       | `string`                                         | —           | The text written to the clipboard on activation (required)                |
| `label`       | `string`                                         | `"Copy"`    | Idle label                                                                |
| `copiedLabel` | `string`                                         | `"Copied"`  | Label shown for `resetMs` after a successful copy                         |
| `resetMs`     | `number`                                         | `2000`      | How long the copied state holds before reverting, in milliseconds         |
| `variant`     | `ButtonVariant`                                  | `"outline"` | Passed straight through to the underlying `Button`                        |
| `size`        | `ButtonSize`                                     | `"md"`      | Passed straight through to the underlying `Button`                        |
| `disabled`    | `boolean`                                        | `false`     | Disables the button and blocks the copy                                   |
| `iconOnly`    | `boolean`                                        | `false`     | Drops the visible label, moving it to `aria-label` instead                |
| `onCopy`      | `(value: string, ok: boolean) => void`           | —           | Called with the value and whether the write actually succeeded            |
| `children`    | `Snippet`                                        | —           | Overrides the default icon + label content                                |
| `class`       | `string`                                         | —           | Additional CSS classes                                                    |
| `ref`         | `HTMLButtonElement \| HTMLAnchorElement \| null` | `null`      | Bindable element reference — matches `Button`'s own ref type              |
| `sound`       | `boolean`                                        | `false`     | Plays `copy`/`error` on the copy outcome, once the user has enabled sound |

## Theming

The copied state reads its colour from `--ft-status-done`, the library's
actual "operation landed" token — the same one `ToolCall`, `ToolTimeline`,
`AgentPlan`, `SubagentList`, `CodeDiff`, `ApprovalCard`, `AiDataTable`,
`TerminalBlock` and `RecommendationCard` all read. Retint it
once and every success surface in a consumer's theme, `CopyButton` included,
moves together:

```css
.my-toolbar {
	--ft-status-done: oklch(0.6 0.17 145);
}
```

Its own default is a `light-dark()` pair, so **your theme must declare
`color-scheme`** for the right half to be picked:

```css
:root {
	color-scheme: light dark;
}
```

## Sound

Set `sound` to play a cue on the copy outcome, through the shared sound controller (see [`sound/README.md`](../sound/README.md)): `copy` when the write succeeds, `error` when it does not.

```svelte
<CopyButton value="npm install fancy-ui-svelte" sound />
```

It is opt-in and silent by default, and it is not simply forwarded to the inner `Button` — the inner button stays quiet so a click only ever plays one cue, not `press` followed by `copy`/`error`.

## Implementation Notes

- Wraps `Button` rather than reimplementing its geometry, variants, disabled
  state, and focus ring — `variant`/`size`/`disabled` are forwarded as-is, so
  a `CopyButton` picks up any future change to `Button` automatically.
- Copy state is owned by `createCopy` (`../_internals/clipboard.svelte.js`),
  the shared helper any future copy affordance should reach for rather than
  re-implementing the timer — `CopyButton` is its first consumer. `copy()`
  resolves `false` instead of throwing when the clipboard API is missing or
  the write is denied, and `onCopy` reports that outcome honestly — the
  button does not claim success it did not get.
- `resetMs` configures the helper's timer once, at construction, matching how
  the helper itself takes it as a constructor argument rather than a
  reactive input; changing the prop after mount has no effect on an
  already-running button.
- The label swap sits inside an `aria-live="polite"` region so a screen
  reader announces the copy landing, not just the sighted swap. That region is
  mounted **unconditionally** — including when `children` replaces the
  built-in content — because a custom `children` snippet has no way of its
  own to say the copy landed, and colour alone is a sighted-only signal. It is
  visually hidden (`sr-only`) whenever something else already owns the
  visible label (icon-only, or a custom `children`); otherwise the span _is_
  the visible label. `aria-label` on the button (icon-only case) covers the
  one-time accessible name; the live region covers the announcement, since
  changing `aria-label` alone is not reliably announced.
- The success skin (border, background wash, text colour) is applied through
  a `:global()` selector, not a normal scoped one: the classes land on the
  `<button>`/`<a>` that `Button` renders inside its own template, which is
  outside `CopyButton`'s scoped tree.
- Passing `children` replaces the built-in icon and visible label; the
  success skin, the disabled/copy wiring, and the live-region announcement
  above all still apply. Set `iconOnly` alongside it if the custom content has
  no readable text, so the button keeps an accessible name.
