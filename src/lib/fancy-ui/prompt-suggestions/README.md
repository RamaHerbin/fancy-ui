# Prompt Suggestions

A row of prompt pills that cascade in after a reply lands, offering the user a next turn without them having to compose one.

## Components

- `PromptSuggestions` - Wrapping row of pill buttons, entering one after another when shown

## Usage

```svelte
<script>
	import { PromptSuggestions } from "fancy-ui-svelte";

	let visible = $state(false);

	const suggestions = ["Why was the lockfile stale?", "Show me the failing job"];

	function select(suggestion) {
		send(suggestion);
		visible = false;
	}
</script>

<PromptSuggestions {suggestions} {visible} onSelect={select} label="Follow-up prompts" />
```

## Props

| Prop          | Type                                          | Default         | Description                                                             |
| ------------- | --------------------------------------------- | --------------- | ----------------------------------------------------------------------- |
| `suggestions` | `string[]`                                    | —               | Prompt texts offered to the user, in display order (required)           |
| `onSelect`    | `(suggestion: string, index: number) => void` | `undefined`     | Called with the chosen prompt and its index when a pill is activated    |
| `visible`     | `boolean`                                     | `true`          | Whether the pills are shown; flipping this to true replays the entrance |
| `staggerMs`   | `number`                                      | `60`            | Delay between two consecutive pills entering, in milliseconds           |
| `label`       | `string`                                      | `'Suggestions'` | Accessible name of the group wrapping the pills                         |
| `class`       | `string`                                      | `undefined`     | Additional CSS classes                                                  |
| `ref`         | `HTMLDivElement \| null`                      | `null`          | Bindable element reference                                              |
| `sound`       | `boolean`                                     | `false`         | Plays the `select` cue when a pill is picked                            |

## Sound

Set `sound` to play the `select` cue when a pill is picked, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<PromptSuggestions {suggestions} onSelect={pick} sound />
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the component **and** the user has turned sound on globally. A pick is an activation rather than a change of a selected value, so there is no changed-only guard — every activation plays. The pills carry no disabled state, and the staggered entrance (including the `visible`-driven replay) never plays a cue of its own.

## Slots

| Snippet | Arguments                             | Description                                              |
| ------- | ------------------------------------- | -------------------------------------------------------- |
| `item`  | `(suggestion: string, index: number)` | Custom pill content, replacing the plain suggestion text |

```svelte
<PromptSuggestions {suggestions}>
	{#snippet item(suggestion)}
		<span class="flex items-center gap-1.5">
			<Icon />
			{suggestion}
		</span>
	{/snippet}
</PromptSuggestions>
```

## Theming

Two custom properties drive the entrance. `--ft-suggestions-stagger` is only written inline when you pass `staggerMs`; leave it out and set the property from CSS instead if you want a whole subtree themed at once, falling back to 60ms where nothing sets it. `--ft-suggestions-duration` has no prop and is the intended override point for how long a single pill takes to arrive.

```css
.chat-thread {
	--ft-suggestions-duration: 320ms;
}
```

## Implementation Notes

- Each pill carries `--ft-suggestions-delay: calc(var(--ft-suggestions-stagger, 60ms) * i)` and the keyframe reads that, so the whole cascade is one shared custom property away from being retimed — no per-pill recomputation in JS.
- The entrance uses `animation-fill-mode: backwards`. Without it every pill would paint at full opacity, then drop out to fade back in when its delay expired, which reads as a flicker rather than a cascade.
- `visible = false` sets `display: none` on the group inline. The pills stay in the DOM but leave the accessibility tree and the tab order.
- Replaying the cascade needs new elements — a CSS animation does not restart on an element that already finished one. The `{#each}` is keyed on a counter that only advances when `visible` goes false → true, which recreates the pills at exactly that moment and nowhere else. The counter is bumped in an `$effect.pre` so the re-key and the unhiding land in the same DOM update; a post-flush bump would show the old pills for a frame first.
- A component that mounts already visible has not transitioned, so the first effect run only records the initial value. Changing `suggestions` while visible updates the text in place without replaying — the entrance belongs to the reveal, not to the content.
- The whole animation lives inside `@media (prefers-reduced-motion: no-preference)`. When motion is reduced the pills are simply present at their final position; there is nothing to override.
- `staggerMs` is clamped to `0…400ms`. A negative value drops later pills in mid-entrance instead of delaying them, and an unbounded one strands the last pill long after the reply it belongs to.
- Every pill is `type="button"`, so a suggestion row nested in a form never submits it.
- The group is `role="group"` with an `aria-label` from `label`, which keeps the pills announced as one named set rather than as loose buttons after the reply.
