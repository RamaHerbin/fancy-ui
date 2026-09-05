# Chat Panel

The shell a conversation lives in: a sticky header, a transcript that scrolls and
pins itself to the bottom while an answer arrives, and a sticky composer row.
Plus the greeting that stands in for the transcript before anyone has said
anything.

## Components

- `ChatPanel` — the four-region shell
- `ChatEmptyState` — a centred greeting for the panel with nothing in it yet

## Usage

```svelte
<script>
	import { ChatPanel, ChatEmptyState, ChatMessage, Composer } from "fancy-ui-svelte";

	let turns = $state([]);
	let streaming = $state(false);

	function send({ text }) {
		turns.push({ id: crypto.randomUUID(), role: "user", content: text });
	}
</script>

<div class="h-[32rem]">
	<ChatPanel {streaming} empty={turns.length === 0}>
		{#snippet header()}
			<div class="px-4 py-3 text-sm font-semibold">Support thread</div>
		{/snippet}

		<div class="flex flex-col gap-5 px-4 py-4">
			{#each turns as turn, i (`${turn.id}#${i}`)}
				<ChatMessage role={turn.role} content={turn.content} />
			{/each}
		</div>

		{#snippet emptyState()}
			<ChatEmptyState description="Ask about a thread, a deploy, or a file you are holding." />
		{/snippet}

		{#snippet composer()}
			<div class="p-3"><Composer onSubmit={send} /></div>
		{/snippet}
	</ChatPanel>
</div>
```

## The shell contract

`ChatPanel` is a compound-lite layout: four regions, no context, nothing imported
from the rest of the family. Whatever you put in a snippet is rendered as-is —
the panel supplies the frame and the scrolling, and never the padding, the
avatars, or the send button.

| Region       | Snippet      | Behaviour                                                                                  |
| ------------ | ------------ | ------------------------------------------------------------------------------------------ |
| Header       | `header`     | Fixed at the top, ruled off below. Omitted if unfilled                                     |
| Transcript   | `children`   | The only region that scrolls                                                               |
| Empty state  | `emptyState` | Replaces `children` while `empty`                                                          |
| Composer row | `composer`   | Fixed at the bottom, ruled off above and given the panel's background. Omitted if unfilled |

**It takes its height from you.** The root is `h-full`, so a bare `<ChatPanel />`
in a page that never constrains it will grow with its content and never scroll.
Give it a parent with a height — `h-[32rem]`, a grid row, a flex child with
`min-h-0` — and the transcript becomes the only part that moves.

The two ends are sticky without `position: sticky`: the shell is a flex column
whose middle row is the only one allowed to grow, so the ends simply never
scroll. That middle row carries `min-h-0`, which is what lets it shrink below its
content — a flex item refuses to go under its intrinsic height otherwise, and the
whole panel would grow instead of scrolling.

The header and composer rows are only rendered when their snippets are filled, so
an unfinished panel does not carry two rules across an otherwise bare surface.

## Scrolling

`streaming` is the whole scrolling contract. While it is true the transcript is
pinned to its bottom edge and stays there as chunks land; the moment the reader
scrolls up to look back, the pin is released and new content stops dragging the
view. Scrolling back down inside 40px of the bottom re-arms it. There is no flag
to get out of sync: "pinned" is recomputed from the scroll position itself.

Three more things the region does on its own:

- **It opens at the latest turn.** On mount the transcript jumps instantly to the
  bottom, because a conversation opens where it left off. Instant rather than
  smooth: there is no journey to show on first paint, and a smooth scroll still
  in flight reads as _not at the bottom_ to the tracking above. A transcript that
  arrives after mount — a store resolving, a fetch landing a frame later — is
  still the panel opening, so it lands at the bottom too. That stops the first
  time the reader touches the scrollbar, and never resumes.
- **It offers the way back.** Once the reader is away from the bottom, a pill
  labelled by `returnLabel` floats above the composer. Clicking it returns to the
  latest turn — smoothly, or instantly under `prefers-reduced-motion: reduce` —
  and hands focus to the transcript, which is about to lose the pill from under
  the pointer and would otherwise leave the keyboard with nothing focused.
- **It answers to the keyboard.** The transcript takes a tab stop, because a
  scroll container that only answers to a pointer is unreachable otherwise. Its
  focus ring is drawn inset: the region fills its wrapper edge to edge, so a ring
  outside the border box would be clipped away by the shell's `overflow-hidden`.

It carries no ARIA role of its own. The panel around it is already a named region
— `Conversation` unless `label` says otherwise — and a `log` role here, which
implies a polite live region, would have a screen reader read every streamed
token back out loud.

### On the duplicated scroll region

The pinning behind this region is the `autoscroll` action, the same one
`ScrollAnchor` is built on; the return pill repeats that component's markup and
behaviour rather than importing it. That duplication is deliberate.

`ChatPanel` is a shell, and a shell that requires a second component to scroll is
not a shell — it is two components with a seam in the middle, and a consumer who
wants the panel now owns the wiring between them. Sharing the action rather than
the component keeps the behaviour identical while leaving the panel a single tag
you can drop into a layout. It is also why the panel has no `dependencies` in the
registry: it imports nothing from the rest of the family.

The one place the panel goes further than the action: the action releases every
listener when `enabled` is false, which is most of the time, since it is only
enabled while a reply streams. The panel therefore tracks the scroll position
itself so the pill is still offered to a reader who scrolls up between replies.

That tracking cannot live on the scroll event alone. Content growing under a
scrollbar that never moved fires no scroll event at all, and it is exactly the
case that matters: a reply landing below a reader who is already sitting a little
above the bottom. The panel watches the region for growth as well, and re-reads
the same geometry whenever `streaming` or `empty` flips — two more moments that
change what the region holds without moving anything.

## ChatPanel props

| Prop          | Type                     | Default            | Description                                            |
| ------------- | ------------------------ | ------------------ | ------------------------------------------------------ |
| `streaming`   | `boolean`                | `false`            | Whether a reply is still arriving; pins the transcript |
| `empty`       | `boolean`                | `false`            | Renders `emptyState` in place of `children`            |
| `returnLabel` | `string`                 | `"Jump to latest"` | Label on the pill offered once the reader scrolls up   |
| `label`       | `string`                 | `"Conversation"`   | Accessible name for the panel as a whole               |
| `class`       | `string`                 | `undefined`        | Additional CSS classes                                 |
| `ref`         | `HTMLDivElement \| null` | `null`             | Bindable reference to the root element                 |
| `sound`       | `boolean`                | `false`            | Plays `press` on the jump-to-latest pill, once enabled |

### Snippets

| Snippet      | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| `header`     | Sticky top region: a title, a model name, a close button        |
| `children`   | The message stream, filling the scroll region                   |
| `composer`   | Sticky bottom region — where `Composer` belongs                 |
| `emptyState` | Rendered instead of `children` while `empty` — `ChatEmptyState` |

The root mirrors its two flags as `data-streaming` and `data-empty`, present
without a value, so a consumer can style the shell against either without
threading a class through.

## ChatEmptyState props

| Prop          | Type                     | Default             | Description                                                        |
| ------------- | ------------------------ | ------------------- | ------------------------------------------------------------------ |
| `title`       | `string`                 | `"How can I help?"` | The greeting, rendered as the heading                              |
| `description` | `string`                 | `undefined`         | A line under the greeting saying what this is for                  |
| `icon`        | `Snippet`                | `undefined`         | Decorative mark above the greeting, replacing the sparkle          |
| `children`    | `Snippet`                | `undefined`         | Rendered under the description — where `PromptSuggestions` belongs |
| `class`       | `string`                 | `undefined`         | Additional CSS classes                                             |
| `ref`         | `HTMLDivElement \| null` | `null`              | Bindable reference to the root element                             |

It centres itself in whatever height it is given and takes generous padding, so
dropping it into the panel's `emptyState` needs no wrapper:

```svelte
{#snippet emptyState()}
	<ChatEmptyState title="Where should we start?" description="I can read the repo and cite it.">
		<PromptSuggestions suggestions={["Summarise this thread", "What broke the deploy?"]} />
	</ChatEmptyState>
{/snippet}
```

The mark above the greeting is hidden from the accessibility tree whether it is
the default sparkle or one of yours: the greeting carries the meaning, and an
icon repeated out loud in front of it is noise.

## Sound

Set `sound` to play the `press` cue when the jump-to-latest pill is activated, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<ChatPanel sound>
	{#snippet composer()}
		<Composer sound onSend={send} />
	{/snippet}
</ChatPanel>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the panel **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). Scroll handling, the `MutationObserver`/`ResizeObserver` sync and the initial snap to the latest turn are all programmatic and stay silent — only the pill's own click plays. A panel commonly hosts a `Composer` in its `composer` snippet; enable `sound` on each component separately so one gesture never plays two cues.

## Styling

| Variable                   | Default   | Applies to                                        |
| -------------------------- | --------- | ------------------------------------------------- |
| `--ft-panel-return-offset` | `0.75rem` | How far the return pill floats above the composer |

Everything else is Tailwind utilities on the theme's own tokens — `bg-card`,
`border-border`, `text-muted-foreground` — so the panel picks up whatever theme
it lands in. Pass `class` to override the root; the composer row and the pill both
carry `bg-card`, so a panel on a tinted background stays legible where the
transcript scrolls under them.

## Implementation Notes

- No context, no store, no imports from the rest of the family. The panel is a
  layout and the snippets are yours.
- Nothing is scheduled and no DOM is touched at construction time, so the shell
  renders under SSR unchanged; the mount jump and the scroll tracking only start
  once there is an element.
- The pill's entrance lives behind `prefers-reduced-motion: no-preference`, and
  its click scrolls instantly under `reduce`. Reduced motion gets the same states
  with nothing to shorten.
- The transcript is a plain scroll container, not a live region: streamed text is
  already announced by whatever is rendering it, and announcing it twice is worse
  than not announcing it at all.
