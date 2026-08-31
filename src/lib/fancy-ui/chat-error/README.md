# ChatError

A quiet inline failure banner for a chat turn: what went wrong, optionally why, and a way to try again.

A failed assistant turn is not an application-level catastrophe, so this is not a modal and there is no overlay. It is a single tinted row that takes the place of the reply that never arrived, sized and spaced like the messages around it. The retry button appears only when there is something to retry.

## Usage

```svelte
<script lang="ts">
	import { ChatError } from "fancy-ui-svelte";

	let retrying = $state(false);

	async function send() {
		retrying = true;
		await resend();
		retrying = false;
	}
</script>

<ChatError
	message="The assistant couldn't finish that reply"
	detail="network_error · request 8f21c0"
	onRetry={send}
	{retrying}
/>
```

```svelte
<!-- Message only, nothing to retry -->
<ChatError message="This conversation is read-only" />
```

```svelte
<!-- Own copy through the children snippet -->
<ChatError onRetry={send}>
	Rate limit reached. Your next message will go through in about 30 seconds.
</ChatError>
```

## Props

| Prop         | Type                   | Default                  | Description                                                       |
| ------------ | ---------------------- | ------------------------ | ----------------------------------------------------------------- |
| `message`    | `string`               | `"Something went wrong"` | The failure line                                                  |
| `detail`     | `string`               | —                        | Secondary muted line under the message, e.g. the error code       |
| `onRetry`    | `() => void`           | —                        | Pressing retry calls this; the button only exists when it is set  |
| `retryLabel` | `string`               | `"Retry"`                | Label for the retry button                                        |
| `retrying`   | `boolean`              | `false`                  | Whether a retry is in flight: disables the button, marks row busy |
| `icon`       | `Snippet`              | —                        | Leading icon, replacing the default warning triangle              |
| `children`   | `Snippet`              | —                        | Rendered instead of the message and detail block                  |
| `class`      | `string`               | —                        | Additional CSS classes                                            |
| `ref`        | `HTMLDivElement\|null` | `null`                   | Bindable element reference                                        |
| `sound`      | `boolean`              | `false`                  | Plays the `press` cue on retry, once the user has enabled sound   |

## Theming

The row's tint comes from a single variable. `--ft-error-fg` colours the icon and, through `color-mix`, both the background wash and the border. It is an inherited custom property, so set it anywhere up the tree — a wrapper's `style`, a theme class, `:root` — and every row below follows:

```svelte
<div style="--ft-error-fg: oklch(0.65 0.18 40)">
	<ChatError message="Upload rejected" />
</div>
```

`--ft-error-bg` and `--ft-error-border` are read first and override the derived values if you want the wash and the outline to part ways with the accent. All three are read at their point of use rather than declared on the root, so a value set by a consumer wins without having to out-specify the component's own scoped rules.

Left unset, `--ft-error-fg` falls through to `--ft-status-error`, the failure colour shared with `ToolCall`, `ToolTimeline`, `TerminalBlock` and `CodeDiff`. Set that one instead and everything that reports a failure moves together.

Its default is a `light-dark()` pair — `oklch(0.5 0.19 25)` on light, `oklch(0.7 0.18 25)` on dark — since one token cannot clear 4.5:1 against both white and near-black. Declare `color-scheme: light` / `dark` on your theme so the right half is picked; without it a page gets the light half. See the [ToolCall README](../tool-call/README.md#styling) for the full palette.

## Sound

Set `sound` to play the `press` cue on retry, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<ChatError onRetry={send} sound />
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the component **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). `retrying` blocks the cue exactly like it blocks `onRetry` — a press that never fires the callback plays nothing either.

## Implementation notes

- The root is a `role="alert"` region, so the failure is announced when it appears. It carries `aria-busy="true"` only while `retrying`, which tells assistive tech the row is mid-update rather than settled.
- The icon slot is `aria-hidden` whether it holds the default triangle or a caller's snippet: the message text already carries the meaning, and a second announcement of it would be noise.
- `retrying` disables the button rather than hiding it, so the row does not reflow mid-retry and the pointer target stays where the reader left it. The pulsing dot is the only thing that appears.
- The entrance fade and the retry dot's pulse both live entirely inside `@media (prefers-reduced-motion: no-preference)`. With those rules gone the row simply appears and the dot is a static dot — still a visible in-flight marker, with nothing to keep in sync.
- The component owns no state and starts no timers. Whether a retry is running is the caller's fact to hold, because only the caller knows when the request comes back.
