# FileUpload

A drop zone backed by a real `<input type="file">`, with per-file progress,
JS-side validation and a removable row list.

## Components

- `FileUpload` — a dashed drop zone plus a file list. Selecting through the
  native picker and dropping onto the zone both funnel through the same
  validation and both add rows to the same list.

## Usage

```svelte
<script>
	import { FileUpload } from "fancy-ui-svelte";
	import type { UploadFile } from "fancy-ui-svelte";

	let files = $state<UploadFile[]>([]);
</script>

<FileUpload bind:files multiple accept="image/*" maxSize={4_000_000} hint="PNG, SVG — 4 MB max" />
```

Or handle the change yourself instead of binding:

```svelte
<script>
	import { FileUpload } from "fancy-ui-svelte";

	function onFilesChange(files) {
		console.log("files are now", files);
	}
</script>

<FileUpload {onFilesChange} label="Attachments" />
```

Drive progress by writing back into the bound array as an upload proceeds —
`FileUpload` never starts, tracks or cancels an upload itself, it only draws
whatever `status`/`progress` each `UploadFile` currently holds. Look the row
up in the bound array by `id` and mutate that, rather than the object
`onFilesChange` hands back — see the warning in Implementation Notes below:

```svelte
<script>
	import { FileUpload } from "fancy-ui-svelte";
	import type { UploadFile } from "fancy-ui-svelte";

	let files = $state<UploadFile[]>([]);

	async function upload(id: string) {
		const entry = files.find((f) => f.id === id);
		if (entry) entry.status = "uploading";
		// ...report files.find((f) => f.id === id).progress = 0..100 as the request progresses...
		const done = files.find((f) => f.id === id);
		if (done) done.status = "done";
	}
</script>

<FileUpload
	bind:files
	multiple
	onFilesChange={(next) => {
		for (const entry of next) {
			if (entry.status === "pending") upload(entry.id);
		}
	}}
/>
```

Inside a `FormField`, drop the `id`/`invalid` wiring entirely — the field
context supplies `controlId`, `aria-describedby`, `aria-invalid`, `required`
and `disabled`:

```svelte
<script>
	import { FormField, FileUpload } from "fancy-ui-svelte";
</script>

<FormField label="Attachments" error={files.length === 0 ? "Add at least one file." : undefined}>
	<FileUpload bind:files multiple />
</FormField>
```

## Props

| Prop            | Type                            | Default | Description                                                                           |
| --------------- | ------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `files`         | `UploadFile[]`                  | `[]`    | Selected files; bindable                                                              |
| `onFilesChange` | `(files: UploadFile[]) => void` | —       | Called with the new list on every change — a selection, a drop, or a removal          |
| `accept`        | `string`                        | —       | The input's native `accept` attribute; also enforced in JS (see Implementation Notes) |
| `multiple`      | `boolean`                       | `false` | Allows more than one file per selection or drop                                       |
| `maxSize`       | `number`                        | —       | Maximum size per file, in bytes. A larger file is added with status `"error"`         |
| `maxFiles`      | `number`                        | —       | Maximum number of files the list may hold. Extra files are rejected, not added        |
| `disabled`      | `boolean`                       | `false` | Blocks selecting, dropping and removing files                                         |
| `required`      | `boolean`                       | `false` | Native `required` on the underlying input                                             |
| `invalid`       | `boolean`                       | `false` | Drives the error border and `aria-invalid`                                            |
| `id`            | `string`                        | —       | Element id, applied to the underlying file input                                      |
| `name`          | `string`                        | —       | Native `name` on the underlying input                                                 |
| `label`         | `string`                        | —       | Accessible name — for a control with no visible Label next to it                      |
| `hint`          | `string`                        | —       | Constraint text under the drop zone, e.g. `"PNG, SVG — 4 MB max"`                     |
| `class`         | `string`                        | —       | Additional CSS classes                                                                |
| `ref`           | `HTMLInputElement \| null`      | `null`  | Bindable reference to the underlying file input                                       |

All of `disabled`, `required` and `invalid`, plus the element's `id`, are
overridden by a surrounding `FormField`'s own context — see Implementation
Notes.

### UploadFile

```ts
interface UploadFile {
	id: string;
	file: File;
	progress: number | null; // 0–100, or null when not reporting progress
	status: "pending" | "uploading" | "done" | "error";
	error?: string;
}
```

## Theming

The accent has no semantic token in the app's theme layer, so it falls back
to a `light-dark()` pair local to the component — the dashed border, the
dragging-state tint, the focus halo and the progress fill all read the same
custom property:

```css
.my-form {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint every `FileUpload` beneath it.

The finished-file label reads `--ft-status-done`, the library's shared "operation
landed" token — the same one `PasswordInput`'s strength label, `CopyButton` and
the tool-call surfaces use — so retinting success once moves all of them
together:

```css
.my-form {
	--ft-status-done: oklch(0.6 0.16 150);
}
```

## Motion

The determinate progress bar is a `scaleX` transform driven by a custom
property, never a `width`. Writing progress as `width: 70%` forces the browser
to lay the row out again on every value a consumer pushes in — a transform is
handled by the compositor and costs nothing per frame. The bar also _eases_
toward each new value over 150ms on the library's arrival curve instead of
snapping to it, which is what makes a report every few hundred milliseconds read
as a bar filling rather than as a bar twitching. The property carries a 0–1
ratio, so `progress: 70` reaches CSS as `--ft-fileupload-progress: 0.7`.

While `progress` is `null` the same element becomes an indeterminate block that
sweeps across the track on a 1.4s loop. That sweep is a `translateX` too, for
the same reason; the block's own 40% width is plain layout, set once and never
animated.

Rows animate in and out. A new row rises 8px into place over 150ms on the
arrival curve; a removed row simply fades over 200ms on the departure curve —
shorter, and with no travel, so nothing appears to fly back out of the list.

Removal stays instant as far as your code is concerned: `files` and
`onFilesChange` both update in the same tick they always did, and the row only
lingers on screen for the length of its fade. It is `inert` for that whole
window, so a leaving row's remove button cannot be clicked or tabbed into.
Focus moves immediately, to the row that took the removed one's place — chosen
by id from the new list, not by counting what is currently on screen, precisely
because the leaving row is still on screen and unfocusable.

- **Reduced motion** — every one of these collapses. Rows appear and disappear
  in the same frame, exactly as they did before this component animated at all;
  the progress bar jumps straight to each reported value; the indeterminate
  sweep stops, leaving a static block that still marks the bar as busy. Nothing
  about validation, announcements, or focus depends on any of it.
- **Touch and coarse pointers** — unchanged. Nothing here is pointer-gated, and
  no motion sits between a tap on a remove button and the row leaving the list.

## Implementation Notes

- **A real `<input type="file">` does the work; drag-and-drop is layered on
  top.** The input sits behind the drop zone, kept in the tab order with a
  standard visually-hidden (`sr-only`) treatment rather than `display:none` —
  Tab reaches it, Enter/Space opens the picker, exactly like any native file
  input. Dropping a file is an enhancement on top of that path, never a
  replacement for it: a keyboard-only user never touches drag-and-drop and
  still gets full functionality.
- **The drop zone is a plain `<div role="presentation">`, not a button.** It
  wraps a `<label for>` pointing at the input, and clicking a label already
  delegates activation to its control — no extra click handler is needed, and
  no second interactive element is nested around the input. Making the zone
  itself a button would do exactly that: two interactive controls stacked
  around the same file input.
- **`accept`, `maxSize` and `maxFiles` are all re-checked in JS**, on both
  paths. The input's own `accept` attribute only filters what the OS picker
  chooses to show — it is a convenience, not a guarantee, and a file dropped
  from outside the picker bypasses it entirely. A file that fails `accept` or
  `maxSize` is still added to the list, with `status: "error"` and a message;
  a file that would push the list past `maxFiles` is rejected outright and
  never added, so the cap actually caps.
- **Rejections are announced, not just shown.** Every `accept`/`maxSize`
  failure and every `maxFiles` rejection is spoken through a polite live
  region in addition to whatever text renders on the row — the row text alone
  sits in the DOM with nothing moving focus to it, so a screen reader only
  reaches it if something also announces it.
- **The drag counter, not a boolean, tracks the dragging state.**
  `dragenter`/`dragleave` bubble from every descendant the pointer crosses —
  the icon, the prompt text, the hint — so toggling a plain boolean flickers
  the state off the instant the pointer passes over any of them. The zone
  counts enter/leave pairs instead and reads as dragging exactly while the
  count is above zero, which survives crossing into a child cleanly.
- **`role="progressbar"` carries `aria-valuemin`/`aria-valuemax` always, and
  `aria-valuenow` only when `progress` is a number.** While `progress` is
  `null` the bar renders as an indeterminate fill (with the sweep gated behind
  `prefers-reduced-motion: no-preference` — the block itself is visible either
  way) and the element never claims a numeric value it doesn't have.
- **Each row's remove button is named after the file** (`aria-label="Remove
<filename>"`), not a bare `✕`. Removing a row moves focus to the row that
  slides into its place, the row before it if the removed one was last, or
  back to the file input once the list is empty — never left on a button that
  is on its way out. The target is looked up by row id in the new list rather
  than by position among the buttons currently rendered: the removed row is
  still in the DOM while it fades, and it is `inert`, so a positional lookup
  would aim focus at an element the browser refuses to focus and drop it on
  `<body>` instead.
- **`disabled` blocks both paths in JS, not just via the native attribute.** A
  disabled native input already refuses focus and clicks, but a synthetic
  `drop` dispatch walks straight past that the same way a synthetic click
  walks past a disabled button — `addFiles` itself checks `disabled` too.
- **`multiple={false}` replaces the current file rather than appending**,
  matching how a native non-multiple `<input type="file">` behaves on a new
  selection.
- **`files` is the source of truth; native form submission is not the
  intended path.** Because dropped files never touch the underlying input's
  own `FileList`, a native `<form>` submit relying on `name` only ever sees
  files added through the picker. A consumer building a real upload (native
  submit or otherwise) should read `entry.file` off the bound `files` array
  rather than depend on the input's internal state.
- **Mutate progress through the bound `files` array, not through the row
  object a callback handed you.** `onFilesChange`'s argument is a plain
  snapshot array; writing to a property on one of its entries directly does
  not reach the `$state` Svelte is actually rendering from, so the bar's
  value changes in memory but never moves on screen. Look the row up by `id`
  in the array you bound with `bind:files` (`files.find((f) => f.id ===
id).progress = …`) and mutate that instead — see `MultipleWithProgress` in
  the docs examples for the full pattern, including the timer-driven fake
  upload.
- `getField()` (from the shared `_internals/field.svelte.ts` context) is
  `undefined` outside a `FormField`. Every context-sensitive value —
  `controlId`, `aria-describedby`, `aria-invalid`, `required`, `disabled` —
  falls back to this component's own prop of the same name in that case.
