# Chat Message

One turn in a conversation: aligned and dressed by its role, streaming its body while the answer is still arriving, with an action rail that stays out of the way until you reach for it.

## Components

- `ChatMessage` — the root. Lays the turn out, renders the body, publishes context.
- `ChatMessageActions` — a toolbar rail that fades in on hover or focus.
- `ChatMessageAction` — one icon button in that rail.
- `ChatMessageBranches` — a `‹ 2/3 ›` navigator for regenerated versions.

The three parts read the root through context, so they can sit anywhere inside it — directly in a snippet, or nested a few components deep in your own wrapper — without anything being threaded down as props.

## Usage

```svelte
<script lang="ts">
	import { ChatMessage } from "fancy-ui-svelte";

	let reply = $state("");
	let streaming = $state(true);
</script>

<ChatMessage role="user" content="What changed in this file?" timestamp={Date.now() - 60_000} />
<ChatMessage role="assistant" content={reply} {streaming} />
```

`content` follows the same contract as `StreamingText`: it is **the whole body so far, not the latest delta**. Reassign it with a longer string as chunks arrive and the growth is what animates.

### The full compound

```svelte
<script lang="ts">
	import {
		ChatMessage,
		ChatMessageActions,
		ChatMessageAction,
		ChatMessageBranches,
	} from "fancy-ui-svelte";

	let version = $state(2);
	let liked = $state(false);
</script>

<ChatMessage role="assistant" content={reply} {streaming} timestamp={answeredAt}>
	{#snippet avatar()}
		<span class="flex size-8 items-center justify-center rounded-full bg-indigo-500/15">AI</span>
	{/snippet}

	{#snippet actions()}
		<ChatMessageActions>
			<ChatMessageAction label="Copy answer" confirmLabel="Copied" onclick={copy}>
				<CopyIcon class="size-3.5" />
			</ChatMessageAction>
			<ChatMessageAction label="Good answer" active={liked} onclick={() => (liked = !liked)}>
				<ThumbsUpIcon class="size-3.5" />
			</ChatMessageAction>
		</ChatMessageActions>
	{/snippet}

	{#snippet footer()}
		<ChatMessageBranches index={version} count={3} onNavigate={(next) => (version = next)} />
	{/snippet}
</ChatMessage>
```

## How each role looks

| Role        | Alignment | Body                                                             |
| ----------- | --------- | ---------------------------------------------------------------- |
| `user`      | Right     | Filled bubble, capped at `--ft-message-max-width`                |
| `assistant` | Left      | Plain flowing text, no bubble chrome — the answer reads as prose |
| `system`    | Centred   | Small muted text, no avatar column                               |

The asymmetry is the point. A bubble on both sides makes an answer look like a chat reply from a person; leaving the assistant turn as plain text lets a long answer read as a written document, which is what it usually is.

A `system` turn is a notice about the conversation rather than a turn in it, so it drops the avatar column and the action rail: `avatar` and `actions` are ignored for that role. `children`, `timestamp` and `footer` still render. The role is also mirrored onto the root as `data-role`, so you can reach any of the three from your own stylesheet.

## Props

### ChatMessage

| Prop        | Type                                | Default       | Description                                                              |
| ----------- | ----------------------------------- | ------------- | ------------------------------------------------------------------------ |
| `role`      | `'user' \| 'assistant' \| 'system'` | `'assistant'` | Who produced the turn; drives alignment, chrome, and the accessible name |
| `content`   | `string`                            | `''`          | The body so far; reassign with a longer string as chunks arrive          |
| `streaming` | `boolean`                           | `false`       | Whether `content` is still growing; shows the trailing cursor            |
| `markdown`  | `boolean`                           | `false`       | Render the body as markdown instead of a tinted plain-text stream        |
| `timestamp` | `Date \| number`                    | `undefined`   | Rendered relative ("5 minutes ago"), with the exact time as its tooltip  |
| `avatar`    | `Snippet`                           | `undefined`   | Rendered beside the body                                                 |
| `children`  | `Snippet`                           | `undefined`   | Replaces the default body rendering entirely; `content` is then ignored  |
| `actions`   | `Snippet`                           | `undefined`   | The action rail — put `ChatMessageActions` here                          |
| `footer`    | `Snippet`                           | `undefined`   | Rendered under the body — where `ChatMessageBranches` belongs            |
| `class`     | `string`                            | `undefined`   | Additional CSS classes                                                   |
| `ref`       | `HTMLElement \| null`               | `null`        | Bindable reference to the root `<article>`                               |

### ChatMessageActions

| Prop            | Type      | Default     | Description                                                                  |
| --------------- | --------- | ----------- | ---------------------------------------------------------------------------- |
| `alwaysVisible` | `boolean` | `false`     | Keep the rail on screen even when the message is neither hovered nor focused |
| `children`      | `Snippet` | `undefined` | The buttons                                                                  |
| `class`         | `string`  | `undefined` | Additional CSS classes                                                       |

### ChatMessageAction

| Prop           | Type                          | Default     | Description                                                    |
| -------------- | ----------------------------- | ----------- | -------------------------------------------------------------- |
| `label`        | `string`                      | —           | Accessible name and tooltip. Required — the icon names nothing |
| `onclick`      | `(event: MouseEvent) => void` | `undefined` | Called on click, before any confirmation label swaps in        |
| `active`       | `boolean`                     | `undefined` | Pressed state for a toggle; omit entirely for a plain button   |
| `confirmLabel` | `string`                      | `undefined` | Swapped in as the label for two seconds after a click          |
| `children`     | `Snippet`                     | `undefined` | The icon                                                       |
| `class`        | `string`                      | `undefined` | Additional CSS classes                                         |

### ChatMessageBranches

| Prop         | Type                      | Default     | Description                                               |
| ------------ | ------------------------- | ----------- | --------------------------------------------------------- |
| `index`      | `number`                  | —           | Which version is on screen, 1-based. Required             |
| `count`      | `number`                  | —           | How many versions exist. Required                         |
| `onNavigate` | `(index: number) => void` | —           | Asked to show another version, by 1-based index. Required |
| `class`      | `string`                  | `undefined` | Additional CSS classes                                    |

The navigator holds no state: it renders the index you give it and asks for another one. Owning the array of versions stays with you, which is the only place it can live.

## The context contract

The root publishes this under `CHAT_MESSAGE_CONTEXT_KEY`:

```ts
interface ChatMessageContext {
	readonly role: "user" | "assistant" | "system";
	readonly streaming: boolean;
	readonly hovered: { readonly current: boolean };
}
```

Everything is a getter over the root's own state, so a child that reads it inside a reactive scope updates with the root. `hovered.current` is true while the pointer is over the message **or** while focus is anywhere inside it — a pointer wandering off must not strand a focused button in an invisible rail.

Both the key and the type are exported, so you can build your own parts:

```svelte
<script lang="ts">
	import { getContext } from "svelte";
	import { CHAT_MESSAGE_CONTEXT_KEY, type ChatMessageContext } from "fancy-ui-svelte";

	const message = getContext<ChatMessageContext | undefined>(CHAT_MESSAGE_CONTEXT_KEY);
</script>

{#if message?.streaming}
	<StopButton />
{/if}
```

Read it as optional. Every shipped part does, so a rail rendered outside a message degrades to a plain toolbar instead of throwing.

## Styling

| Custom property          | Default                                             | Effect                         |
| ------------------------ | --------------------------------------------------- | ------------------------------ |
| `--ft-message-user-bg`   | `color-mix(in oklab, currentColor 8%, transparent)` | User bubble fill               |
| `--ft-message-user-fg`   | `inherit`                                           | User bubble text colour        |
| `--ft-message-max-width` | `85%`                                               | Cap on the user bubble's width |

Set them on the message, or on any ancestor:

```svelte
<div style="--ft-message-user-bg: var(--color-primary); --ft-message-user-fg: white;">
	<ChatMessage role="user" content="Themed." />
</div>
```

## Implementation Notes

- The body is a `StreamingText`, so a growing `content` tints its delta and settles it, and `streaming` grows the trailing cursor. Pass `children` instead and you own the body completely — attachments, a tool card, a table — while keeping the layout, the timestamp, the rail, and the context.
- Hover and focus are tracked as two separate flags and OR-ed together, so leaving with the pointer while a button still holds focus does not hide the rail out from under the keyboard.
- The rail hides with `opacity`, never `display`: it keeps its box, so revealing it never reflows the message, and it stays focusable while invisible — which is what makes `:focus-within` able to bring it back. On pointers with no hover at all (`@media (hover: none)`) it is simply always visible, because gating on hover there would hide it for good.
- `ChatMessageAction`'s confirmation swap is a local 2-second timer that a second click restarts rather than inheriting the old deadline; it is cleared on unmount. Nothing is scheduled until a click, so it is safe during SSR.
- `aria-pressed` is emitted only when `active` is actually passed. A button that is not a toggle should not claim to be one.
- The timestamp renders through the shared `formatRelativeTime` helper and sits in a `<time datetime>` element whose `title` is the ISO string, so the exact moment is one hover away. It keeps advancing while the message stays mounted, off a shared, throttled clock rather than the timestamp you passed in.
- The body is `aria-live="polite"` with `aria-atomic="true"`, and `aria-busy` mirrors `streaming`: assistive tech waits out the busy state and announces the settled reply once, instead of reading every streamed token.
- The only animation is the rail's opacity transition, and it lives inside `@media (prefers-reduced-motion: no-preference)`. Reduced motion gets the same two states, instantly.
- The root is an `<article>` with an `aria-label` naming the role, so a transcript reads as a list of named turns rather than an undifferentiated block of text.
