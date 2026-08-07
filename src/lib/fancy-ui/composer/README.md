# Composer

The input at the bottom of a chat, taken apart. A root that owns the draft and eight parts that read it: a growing textarea, a send button that becomes a stop button, a rail for controls, a model switcher, an attachment row with its chips, and a completion menu you can mount twice on the same draft — once for `/` commands, once for `@` mentions.

Nothing here uploads a file, opens a microphone, or talks to a model. The composer holds a draft and tells you when it leaves.

## Components

- `Composer` — the form, the draft, and the context every part reads
- `ComposerInput` — the auto-growing textarea, Enter to send
- `ComposerSubmit` — send, or stop while a response is arriving
- `ComposerToolbar` — the bottom rail the controls sit on
- `ComposerModelPicker` — the model switcher, with a keyboard-driven listbox
- `ComposerAttachments` — the chip row and the paperclip that fills it
- `ComposerAttachment` — one file chip: name, size, upload progress, remove
- `ComposerCommandMenu` — a completion menu bound to one trigger character

## Usage

```svelte
<script>
	import { Composer } from "fancy-ui-svelte";

	let draft = $state("");

	function send({ text, attachments }) {
		console.log(text, attachments);
	}
</script>

<Composer bind:value={draft} placeholder="Ask anything" onSubmit={send} />
```

With no `children`, the root composes a `ComposerInput` and a right-aligned `ComposerSubmit` for you. That default exists so a composer can be dropped into a page in one line; everything below is what you write once you outgrow it.

## The context contract

The root publishes one object under a module-private key and every part reads it with `getContext`. That is why the parts take almost no props: the draft, the attachments, the two switches and the six commands are already in scope, wherever in the subtree a part is mounted.

```ts
interface ComposerContext {
	readonly value: { readonly current: string };
	readonly attachments: { readonly current: AttachmentData[] };
	readonly disabled: boolean;
	readonly streaming: boolean;
	readonly textareaRef: { readonly current: HTMLTextAreaElement | null };
	submit(): void;
	stop(): void;
	setValue(next: string): void;
	insertText(text: string, replaceTriggerToken?: boolean): void;
	addFiles(files: File[]): void;
	removeAttachment(id: string): void;
}
```

Three properties are worth reading twice:

- **The getters are what make it reactive.** `value.current` read inside a part's own reactive scope re-runs that scope when the root's draft changes. A part that destructures `const { current } = ctx.value` gets a dead string.
- **`textareaRef` is typed read-only** because exactly one part writes it. `ComposerInput` registers its own element on mount through a documented cast, and retracts it on unmount. Everyone else reads — that is how `ComposerCommandMenu` finds a textarea it never rendered.
- **Every part must survive without it.** Mounted outside a `Composer`, each one degrades instead of throwing: the input becomes a plain uncontrolled textarea, the submit button goes permanently disabled, the picker behaves as a standalone select, the chip row and the command menu render nothing at all.

`getContext` only answers during a child's initialisation, so a consumer reaching for the context has to do it from a component mounted inside the composer — not from the same component that renders `<Composer>`.

## Recipes

### Minimal

The default composition, written out. This is exactly what the root renders when you pass no `children`:

```svelte
<Composer bind:value={draft} onSubmit={send}>
	{#snippet children()}
		<ComposerInput placeholder="Ask anything" />
		<div class="mt-2 flex items-center gap-2">
			<div class="flex-1"></div>
			<ComposerSubmit />
		</div>
	{/snippet}
</Composer>
```

### Toolbar and model picker

`ComposerToolbar` is one flexible row with no opinions about what sits on it. Anything belonging on the right is pushed there by a spacer you write, rather than by a second slot the component would have to invent:

```svelte
<Composer bind:value={draft} onSubmit={send}>
	{#snippet children()}
		<ComposerInput />
		<ComposerToolbar class="mt-2">
			<ComposerModelPicker models={MODELS} bind:value={model} />
			<div class="flex-1"></div>
			<ComposerSubmit />
		</ComposerToolbar>
	{/snippet}
</Composer>
```

`MODELS` is a `ModelOptionData[]` — `{ id, label, badge?, description? }`. Leave `value` unbound and the picker reports the first model in the list; pass a `value` naming something absent from `models` and the trigger shows its bare label rather than quietly claiming a model nobody selected.

### Attachments

The composer never uploads anything. `addFiles` hands the picked files straight to `onAttach`, and you push onto `attachments` when your upload has an id for them:

```svelte
<script>
	let attachments = $state([]);

	async function attach(files) {
		for (const file of files) {
			const id = crypto.randomUUID();
			attachments = [...attachments, { id, name: file.name, size: file.size, status: "uploading" }];
			const url = await upload(file, (progress) => patch(id, { progress }));
			patch(id, { status: "done", previewUrl: url });
		}
	}
</script>

<Composer bind:value={draft} bind:attachments onAttach={attach} onSubmit={send}>
	{#snippet children()}
		<ComposerAttachments accept="image/*,.pdf" />
		<ComposerInput />
		<ComposerToolbar class="mt-2">
			<div class="flex-1"></div>
			<ComposerSubmit />
		</ComposerToolbar>
	{/snippet}
</Composer>
```

A successful submit clears the text and leaves the attachments alone — only you know whether an upload is still in flight. Drop them yourself in `onSubmit` when the turn is really gone.

`ComposerAttachments` renders a `ComposerAttachment` per entry by default. Pass `children` to render your own chips and the paperclip stays; render `ComposerAttachment` directly and it removes through the context, unless you hand it an `onRemove`, which wins outright.

### Two menus on one draft

`ComposerCommandMenu` is one primitive bound to one trigger character. Mount it twice and each answers only to its own:

```svelte
<Composer bind:value={draft} onSubmit={send}>
	{#snippet children()}
		<ComposerInput />
		<ComposerToolbar class="mt-2">
			<div class="flex-1"></div>
			<ComposerSubmit />
		</ComposerToolbar>

		<ComposerCommandMenu trigger="/" items={COMMANDS} />
		<ComposerCommandMenu
			trigger="@"
			items={PEOPLE}
			onSelect={(item, { insertText }) => insertText(`<@${item.id}>`, true)}
		/>
	{/snippet}
</Composer>
```

Both menus listen to the same textarea and both stay shut unless the token under the caret opens with their character, so only one can ever be up. `onSelect` replaces the default completion outright rather than running alongside it — the snippet above inserts a mention id where the default would have inserted the label.

The menus never take focus: the reader is mid-sentence, and a completion list that steals the caret breaks the sentence it is completing. See [Accessibility](#accessibility) for what that costs and how to get the full combobox pattern back.

### A voice accessory

`accessory` is an overlay covering the whole composer — a voice panel, a drop target, a confirmation. It sits above the composition rather than replacing it, so the draft is still there when the overlay lifts:

```svelte
<script>
	import {
		Composer,
		ComposerInput,
		ComposerSubmit,
		ComposerToolbar,
		VoiceInput,
	} from "fancy-ui-svelte";

	let recording = $state(false);
</script>

<Composer bind:value={draft} onSubmit={send} accessory={recording ? voicePanel : undefined}>
	{#snippet children()}
		<ComposerInput />
		<ComposerToolbar class="mt-2">
			<button type="button" onclick={() => (recording = true)}>Speak</button>
			<div class="flex-1"></div>
			<ComposerSubmit />
		</ComposerToolbar>
	{/snippet}
</Composer>

{#snippet voicePanel()}
	<VoiceInput
		bind:active={recording}
		{transcript}
		onStop={() => {
			draft = `${draft}${transcript}`;
			recording = false;
		}}
		onCancel={() => (recording = false)}
	/>
{/snippet}
```

The overlay is a plain absolutely-positioned layer, not a focus trap: what it contains and how it is dismissed are yours to decide.

## Enter and Shift+Enter

| Key                 | While idle                          | While `streaming` or `disabled`    |
| ------------------- | ----------------------------------- | ---------------------------------- |
| `Enter`             | Sends, then clears the text         | Nothing                            |
| `Shift+Enter`       | A newline, as in any textarea       | Nothing — the textarea is readonly |
| `Enter`, menu open  | Completes the token, key never sent | Nothing                            |
| `Tab`, menu open    | Completes the token                 | Nothing                            |
| `Escape`, menu open | Dismisses for that token only       | —                                  |

Two details this table flattens:

**Mid-composition Enter belongs to the IME.** `event.isComposing` short-circuits both the input's send and the menu's completion, so picking a candidate never sends the sentence being composed.

**The menu takes the key away rather than just claiming it.** It calls `stopPropagation` as well as `preventDefault`, because the input's Enter-to-send handler is registered further up the tree and never asks whether the event was already handled. When there is nothing to complete — an open menu with no matches — Enter is left alone and goes back to meaning send.

A submit is refused, whatever triggered it, when the composer is `disabled`, when it is `streaming`, or when the draft is empty _and_ carries no attachments. Files alone are a sendable draft.

## Trigger tokens and `insertText`

`insertText(text, replaceTriggerToken)` splices at the caret. With the second argument it replaces the trigger token the caret sits in, and closes the completion with a trailing space unless one is already there.

**A trigger token is the whitespace-delimited run ending at the caret whose first character is not a letter or a digit.** That is the whole rule, and it is deliberately vocabulary-free: the root never holds a list of trigger characters, so `/`, `@`, `#`, `:` and whatever a menu invents all behave identically, and adding a menu on a new character requires no change to the core.

| Draft (`        | ` is the caret) | Token found                                    | Why |
| --------------- | --------------- | ---------------------------------------------- | --- |
| `/de\|`         | `/de`           | Runs to the caret, opens on a non-alphanumeric |
| `ping @jo\|`    | `@jo`           | Whitespace ends the previous run               |
| `open src/li\|` | none            | The run opens with `o` — a path, not a command |
| `hello\|`       | none            | Opens with a letter                            |
| `/deploy \|`    | none            | The caret sits at a word boundary              |
| `@jo\|rdan`     | `@jo`           | The token ends at the caret, not at the word   |

That last row is why completing `@jo|rdan` searches for `jo`: the query is what the reader has actually committed to.

Without `replaceTriggerToken`, `insertText` splices exactly what it was handed at the caret and adds nothing — no space, no token search. Either way the caret lands after the insertion and focus returns to the textarea on the next tick, since the call almost certainly came from a menu that had taken it.

## Props

### Composer

| Prop          | Type                                                                 | Default     | Description                                                  |
| ------------- | -------------------------------------------------------------------- | ----------- | ------------------------------------------------------------ |
| `value`       | `string`                                                             | `""`        | The draft text, bindable. Cleared by a successful submit     |
| `attachments` | `AttachmentData[]`                                                   | `[]`        | Files riding along with the draft, bindable                  |
| `disabled`    | `boolean`                                                            | `false`     | Blocks typing, sending, and attaching                        |
| `streaming`   | `boolean`                                                            | `false`     | A response is arriving: send becomes stop                    |
| `placeholder` | `string`                                                             | `undefined` | For the default input. Ignored once `children` is passed     |
| `onSubmit`    | `(payload: { text: string; attachments: AttachmentData[] }) => void` | `undefined` | The trimmed draft and a snapshot of the attachments          |
| `onStop`      | `() => void`                                                         | `undefined` | The stop button was pressed while streaming                  |
| `onAttach`    | `(files: File[]) => void`                                            | `undefined` | Files were picked. Upload them, then push onto `attachments` |
| `children`    | `Snippet`                                                            | `undefined` | Replaces the default input-and-send-row composition          |
| `accessory`   | `Snippet`                                                            | `undefined` | An overlay covering the composer                             |
| `class`       | `string`                                                             | `undefined` | Additional CSS classes                                       |
| `ref`         | `HTMLFormElement \| null`                                            | `null`      | Bindable reference to the form                               |

### ComposerInput

| Prop          | Type                          | Default      | Description                                                   |
| ------------- | ----------------------------- | ------------ | ------------------------------------------------------------- |
| `placeholder` | `string`                      | `"Message…"` | Shown while the draft is empty                                |
| `rows`        | `number`                      | `1`          | Height in lines before anything is typed. Also the SSR height |
| `maxRows`     | `number`                      | `8`          | Height ceiling in lines. Past it the textarea scrolls         |
| `autofocus`   | `boolean`                     | `false`      | Take focus on mount                                           |
| `class`       | `string`                      | `undefined`  | Additional CSS classes                                        |
| `ref`         | `HTMLTextAreaElement \| null` | `null`       | Bindable reference to the textarea                            |

### ComposerSubmit

| Prop        | Type      | Default     | Description                                   |
| ----------- | --------- | ----------- | --------------------------------------------- |
| `label`     | `string`  | `"Send"`    | Accessible name while the composer is idle    |
| `stopLabel` | `string`  | `"Stop"`    | Accessible name while a response is streaming |
| `children`  | `Snippet` | `undefined` | Replaces the built-in icon, in both states    |
| `class`     | `string`  | `undefined` | Additional CSS classes                        |

### ComposerToolbar

| Prop       | Type      | Default     | Description                                             |
| ---------- | --------- | ----------- | ------------------------------------------------------- |
| `children` | `Snippet` | `undefined` | The controls on the rail, left to right in source order |
| `class`    | `string`  | `undefined` | Additional CSS classes                                  |

### ComposerModelPicker

| Prop       | Type                   | Default     | Description                                                |
| ---------- | ---------------------- | ----------- | ---------------------------------------------------------- |
| `models`   | `ModelOptionData[]`    | —           | The models on offer. Required; an empty list is inert      |
| `value`    | `string`               | `undefined` | The selected model's id, bindable. Falls back to the first |
| `onChange` | `(id: string) => void` | `undefined` | A _change_ of model — re-picking the current one is silent |
| `label`    | `string`               | `"Model"`   | Accessible name for the control and its menu               |
| `class`    | `string`               | `undefined` | Additional CSS classes                                     |

### ComposerAttachments

| Prop       | Type      | Default          | Description                                         |
| ---------- | --------- | ---------------- | --------------------------------------------------- |
| `children` | `Snippet` | `undefined`      | Replaces the default chips. The add button stays    |
| `addLabel` | `string`  | `"Attach files"` | Accessible name and tooltip for the add button      |
| `accept`   | `string`  | `undefined`      | `accept` for the file picker, e.g. `"image/*,.pdf"` |
| `multiple` | `boolean` | `true`           | Whether one pick may carry several files            |
| `class`    | `string`  | `undefined`      | Additional CSS classes                              |

### ComposerAttachment

| Prop         | Type                   | Default     | Description                                                      |
| ------------ | ---------------------- | ----------- | ---------------------------------------------------------------- |
| `attachment` | `AttachmentData`       | —           | The file to show, and whatever the upload knows so far. Required |
| `onRemove`   | `(id: string) => void` | `undefined` | Called instead of the composer's own removal                     |
| `class`      | `string`               | `undefined` | Additional CSS classes                                           |

### ComposerCommandMenu

| Prop       | Type                                                | Default     | Description                                                 |
| ---------- | --------------------------------------------------- | ----------- | ----------------------------------------------------------- |
| `trigger`  | `string`                                            | —           | The character that opens the menu. Required                 |
| `items`    | `CommandItemData[]`                                 | —           | Everything the menu can offer, before filtering. Required   |
| `onSelect` | `(item, ctx: { insertText, query }) => void`        | `undefined` | Handles a pick. Defaults to completing with the label       |
| `filter`   | `(item: CommandItemData, query: string) => boolean` | `undefined` | Defaults to a case-insensitive label/description match      |
| `empty`    | `Snippet`                                           | `undefined` | Shown in place of the rows when nothing matches             |
| `maxItems` | `number`                                            | `8`         | How many matches the menu shows at once                     |
| `class`    | `string`                                            | `undefined` | Additional CSS classes                                      |
| `ref`      | `HTMLDivElement \| null`                            | `null`      | Bindable. Null while closed — the menu is not rendered then |

## Data shapes

All three come from the family's shared vocabulary, so an object can arrive from a token counter, an upload queue or a command registry and land here without translation:

```ts
interface AttachmentData {
	id: string;
	name: string;
	size?: number;
	type?: string;
	previewUrl?: string;
	progress?: number; // 0–1, drawn as a bar along the chip's bottom edge
	status?: "uploading" | "done" | "error";
}

interface ModelOptionData {
	id: string;
	label: string;
	badge?: string;
	description?: string;
}

interface CommandItemData {
	id: string;
	label: string;
	description?: string;
	hint?: string;
}
```

## Accessibility

The textarea stays **readonly, never disabled**, while a response streams: a disabled textarea drops out of the tab order and stops announcing its content, and a reader mid-draft should still be able to select and copy what they wrote.

The model picker is a full listbox. Focus moves into it on open — the element carrying `aria-activedescendant` has to be the one holding focus — and returns to the trigger on Escape, on a pick, and on Tab. The menu is in the DOM only while it is open.

The command menu is the deliberate exception, and the tradeoff is worth stating plainly. It never takes focus, which rules out the combobox wiring: that needs `role`, `aria-expanded`, `aria-controls` and `aria-activedescendant` on the input itself, and the menu is in no position to put them there — the textarea belongs to `ComposerInput`, and reaching across to rewrite a sibling's attributes is exactly the spooky action a compound component should not do. So it announces through a live region instead: a screen-reader user hears how many matches there are and that the arrows do something, but not each row as it becomes active.

If you need the full pattern, own the input part yourself: the rows carry stable ids, and `ComposerCommandMenu` exposes its element through `ref`, so you can point your own `aria-activedescendant` at the selected row.

`ComposerToolbar` is deliberately not `role="toolbar"` — that role promises arrow-key roving focus between its controls, and a row announcing itself as a toolbar without implementing that is worse for a keyboard user than a plain row of tab stops.

## Styling

Every colour is read at the point of use with a fallback rather than declared on a root, so a value set anywhere up the tree wins without having to out-specify the components' own scoped rules.

| Variable                            | Applies to                                      |
| ----------------------------------- | ----------------------------------------------- |
| `--ft-composer-radius`              | The composer's corner radius                    |
| `--ft-composer-bg`                  | The composer surface                            |
| `--ft-composer-border`              | The composer border, at rest                    |
| `--ft-composer-border-focus`        | The composer border, with focus inside          |
| `--ft-composer-ring`                | The focus ring around the whole surface         |
| `--ft-composer-disabled-opacity`    | The whole composer while disabled               |
| `--ft-composer-input-color`         | The textarea's own text colour                  |
| `--ft-composer-menu-bg`             | Both menus' surface                             |
| `--ft-composer-menu-border`         | Both menus' border                              |
| `--ft-composer-menu-shadow`         | The command menu's shadow                       |
| `--ft-composer-menu-radius`         | The command menu's corner radius                |
| `--ft-composer-menu-active`         | The command row Enter would take                |
| `--ft-composer-menu-hover`          | The command row under the pointer               |
| `--ft-composer-menu-min-width`      | The command menu's floor width                  |
| `--ft-composer-menu-max-width`      | The command menu's ceiling width                |
| `--ft-composer-menu-max-height`     | Where the command menu starts scrolling         |
| `--ft-composer-menu-z`              | The command menu's stacking order               |
| `--ft-composer-option-active-bg`    | The model row under the cursor or the arrows    |
| `--ft-composer-menu-muted`          | Model descriptions                              |
| `--ft-composer-badge-bg`            | Model badge pills                               |
| `--ft-composer-attachment-radius`   | Chip corner radius                              |
| `--ft-composer-attachment-bg`       | Chip surface                                    |
| `--ft-composer-attachment-border`   | Chip border                                     |
| `--ft-composer-attachment-error`    | A failed chip, ahead of the shared status token |
| `--ft-composer-attachment-track`    | The progress track along a chip                 |
| `--ft-composer-attachment-progress` | The progress bar itself                         |

Failed and uploading chips fall through to `--ft-status-error` and `--ft-status-running`, the run-status vocabulary shared with the rest of the AI family, so retinting one recolours every failure and every progress bar at once. Their defaults are `light-dark()` pairs, which means **your theme must declare `color-scheme`**:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

Every animation in the compound — the chip's entrance, the progress fill, the chevron flip, the model menu's appearance, the command row's tint — lives entirely inside `@media (prefers-reduced-motion: no-preference)`. Reduced motion is not a second variant kept in sync: the rules simply do not exist, and everything is already where it was going.
