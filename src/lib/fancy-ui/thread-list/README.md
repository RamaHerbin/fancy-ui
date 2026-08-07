# Thread List

The conversation history that lives down the side of a chat app: one row per thread, an unread dot where something new landed, the last thing said underneath, and how long ago it was said on the right.

## Components

- `ThreadList` — the whole list, rows and empty state included

## Usage

```svelte
<script>
	import { ThreadList } from "fancy-ui-svelte";

	let activeId = $state("t1");

	const threads = [
		{
			id: "t1",
			title: "Retry policy for billing webhooks",
			preview: "So a 429 should back off exponentially…",
			updatedAt: Date.now() - 4 * 60_000,
			unread: true,
		},
		{ id: "t2", title: "Migration plan", updatedAt: Date.now() - 3 * 3_600_000 },
	];
</script>

<ThreadList {threads} bind:activeId />
```

## The data contract

`threads` is a list of `ThreadData`, the shape shared by every component in this family — the same object can come straight off the endpoint that also feeds the transcript:

```ts
interface ThreadData {
	id: string;
	title: string;
	preview?: string;
	updatedAt: Date | number;
	unread?: boolean;
}
```

`id`, `title` and `updatedAt` are required. A thread with no `preview` renders as a single line rather than a line and a gap. `updatedAt` takes epoch milliseconds or a `Date`, whichever your API hands you.

## Props

| Prop       | Type                             | Default           | Description                                                             |
| ---------- | -------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| `threads`  | `ThreadData[]`                   | —                 | The conversations to list, in the order they should appear. Required.   |
| `activeId` | `string`                         | `undefined`       | Id of the selected conversation. Bindable — a click writes the new one. |
| `onSelect` | `(thread: ThreadData) => void`   | `undefined`       | Called with the conversation the reader picked                          |
| `onDelete` | `(thread: ThreadData) => void`   | `undefined`       | Supplying it puts a delete button on every row                          |
| `label`    | `string`                         | `"Conversations"` | Accessible name for the list                                            |
| `item`     | `Snippet<[ThreadData, boolean]>` | `undefined`       | Replaces the built-in row body; receives the thread and its active flag |
| `empty`    | `Snippet`                        | `undefined`       | Replaces the built-in "No conversations yet" line                       |
| `class`    | `string`                         | `undefined`       | Additional CSS classes                                                  |
| `ref`      | `HTMLElement \| null`            | `null`            | Bindable reference to the root element                                  |

## Selection

`activeId` is bindable, and a click writes it **whether or not you passed `onSelect`** — so `bind:activeId` on its own is enough to drive the highlight, and `onSelect` is there for the work that follows the pick (loading the transcript, closing a mobile drawer, pushing a route).

```svelte
<ThreadList {threads} bind:activeId onSelect={(thread) => load(thread.id)} />
```

The active row carries `aria-current="true"` alongside its tint, so the selection is not a colour a screen reader has to guess at. An `activeId` naming no thread in the list simply highlights nothing.

## Deleting

Pass `onDelete` and every row grows a delete button, hidden at rest and revealed on hover or focus. It is never removed from the DOM, only faded, so tabbing reaches it — and reaching it is what lights it up. On a touch screen, where nothing ever hovers, it stays visible.

```svelte
<ThreadList {threads} bind:activeId onDelete={(thread) => archive(thread.id)} />
```

Its accessible name is the whole sentence — `"Delete Migration plan"` — rather than a bare "Delete" repeated down a list of otherwise identical buttons. It is a sibling of the row button, not a child (nesting buttons is invalid HTML), so deleting never selects on the way through.

Nothing is deleted for you: the row disappears when the next `threads` array arrives without it, which keeps an undo or a confirmation dialog entirely yours.

## Timestamps

Every row shows `updatedAt` as relative text — "4 minutes ago", "yesterday" — with the exact time on the `<time>` element's `datetime` and `title`, so hovering gives the real one and a machine reads the real one. A timestamp the browser cannot read has no exact form to give, so it gets neither attribute rather than an empty one: `datetime=""` is invalid, not absent.

The list refreshes them **from a single clock**, one interval for the whole list rather than one per row: a sidebar of fifty conversations schedules exactly one timer, started on mount and stopped on teardown. Nothing is scheduled during SSR.

## Overriding a row

`item` replaces the row body and receives the thread plus whether it is the active one:

```svelte
<ThreadList {threads} bind:activeId>
	{#snippet item(thread, active)}
		<span class="min-w-0 flex-1 truncate" class:font-semibold={active}>{thread.title}</span>
		<span class="ml-auto shrink-0 text-xs">{thread.messageCount} messages</span>
	{/snippet}
</ThreadList>
```

The button, its `aria-current`, the unread dot and its screen-reader label all survive the override — you are replacing what the row _says_, not what it _is_ — and the delete button, being a sibling, is unaffected.

`empty` replaces the line shown when `threads` is empty, which is the right place for a "Start a conversation" call to action.

## Styling

The unread dot reads its colour from `--ft-status-running`, the run-status vocabulary shared with `ToolCall`, `ToolTimeline`, `TerminalBlock`, `CodeDiff` and `ChatError` — an unread thread is, after all, one with something still in flight. Set it anywhere up the tree and every component in the family follows.

| Variable                          | Default                                        | Applies to                                   |
| --------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| `--ft-status-running`             | `oklch(0.5 0.18 265)` / `oklch(0.72 0.15 265)` | The unread dot, and the family's "in flight" |
| `--ft-threadlist-unread`          | `--ft-status-running`                          | The unread dot, this list alone              |
| `--ft-threadlist-active-bg`       | `currentColor` at 7%                           | Tint behind the selected row                 |
| `--ft-threadlist-dot-size`        | `0.4375rem`                                    | Diameter of the unread dot                   |
| `--ft-threadlist-reveal-duration` | `150ms`                                        | Fade of the delete button                    |

The status default is a `light-dark()` pair, because no single token clears its contrast on both white and near-black. Which half applies is decided by `color-scheme`, so **your theme must declare it**:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

Without that declaration a page resolves to the light half, which is the safe default on the white background most unthemed pages have.

The active tint is deliberately faint — seven percent of the text colour, mixed in `oklab` so one value works on both themes — because the muted preview line has to keep its contrast sitting on top of it. Every colour is read at its point of use, so a value you set wins without having to out-specify the component's own scoped rules.

## Implementation Notes

- Rows are real `<button>`s inside a `role="list"` / `<li>` structure: the list's length is announced, and each row is a control that answers to Enter, Space, and the focus ring.
- The unread dot's column is reserved on every row, read or not, so titles stay on one vertical line instead of stepping sideways as messages are read. Unread is also carried by weight — the title goes semibold — and spelled out in a screen-reader-only "Unread", so colour is never the only signal.
- Rows are keyed by `id` alone. A repeated id — the kind that comes off a paginated endpoint that overlapped — renders both rows instead of crashing the keyed block: the second and later rows under an id get an occurrence suffix. It counts occurrences rather than positions on purpose, so a reorder renames nothing and every row keeps its DOM node, along with the focus and the scroll position on it.
- Long titles and previews truncate with the full text on `title`, and the timestamp never gets squeezed out: it sits in its own non-shrinking column.
- The delete button's fade lives behind `prefers-reduced-motion: no-preference`. Reduced motion gets the same reveal, instantly.
- Nothing is scheduled and no DOM is touched at construction time; the single clock starts in `onMount`, so the list renders under SSR unchanged.
