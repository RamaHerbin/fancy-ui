# Code Diff

A unified diff rendered at chat width: one file card per patched file, a header carrying the path and the `+N / −N` tally, and a foldable body of tinted lines.

## Components

- `CodeDiff` — parses raw patch text and renders every file it finds

## Usage

```svelte
<script>
	import { CodeDiff } from "fancy-ui-svelte";

	const patch = `diff --git a/src/query.ts b/src/query.ts
--- a/src/query.ts
+++ b/src/query.ts
@@ -12,3 +12,4 @@ export function build() {
 	const rows = await db.query(sql);
-	return rows;
+	if (rows.length === 0) return [];
+	return rows.map(normalise);
 }`;
</script>

<CodeDiff diff={patch} />
```

The input is plain unified-diff text — whatever `git diff` printed, headers and all. Nothing needs pre-parsing, and nothing needs to be complete: a truncated or headerless patch degrades to a best-effort reading rather than throwing, so the same string can be handed over again on every chunk while it streams in.

## Props

| Prop          | Type                     | Default     | Description                                                   |
| ------------- | ------------------------ | ----------- | ------------------------------------------------------------- |
| `diff`        | `string`                 | —           | Raw unified diff text. Required.                              |
| `filename`    | `string`                 | `undefined` | Header label when the patch names no file, or names just one  |
| `lineNumbers` | `boolean`                | `true`      | Whether to show the old/new line-number gutters               |
| `collapsed`   | `boolean`                | `false`     | Whether the bodies are folded away. Bindable                  |
| `maxLines`    | `number`                 | `0`         | Lines shown before the rest hide behind a button. 0 shows all |
| `wrap`        | `boolean`                | `false`     | Whether long lines wrap instead of scrolling sideways         |
| `class`       | `string`                 | `undefined` | Additional CSS classes                                        |
| `ref`         | `HTMLDivElement \| null` | `null`      | Bindable reference to the root element                        |

## Folding

Every file header is a toggle, and `collapsed` is the master switch above them: set it and the whole patch folds, clear it and the whole patch opens. A click folds only the file it belongs to, and `collapsed` is written back as _"nothing is left open"_ — so a bound variable stays honest for a one-file patch and still means something for a ten-file one. Headers never fold away; the path and the tally are readable whatever the body is doing.

## Clamping long patches

`maxLines` puts a soft ceiling on each file independently. Past it the body stops on a line — never on a `@@` header, so no hunk is ever announced with nothing under it — and a `Show N more lines` button takes its place. Expanding is per file and one-way: a reader who asked for the rest is not asked again — until the patch itself changes, which starts every file clean.

## No syntax highlighting, by design

Lines are monochrome. A diff in a chat transcript is read for _what moved_, and layering token colours on top of the add/delete tints turns the one distinction that matters into the hardest one to see. It also means no language detection, no grammar payloads, and no highlighter to keep current — the component stays the same size whatever the patch is written in.

Every readable signal is carried twice: an add row gets the green tint _and_ a `+`, a delete row the red tint _and_ a `−`, so the rows survive a monochrome print or a reader who does not separate those hues.

## Theming

Added and deleted derive from the run-status vocabulary shared with `ToolCall`, `ToolTimeline`, `TerminalBlock` and `ChatError`: `--ft-status-done` and `--ft-status-error`. Set those to recolour success and failure across the whole family.

Both default to a `light-dark()` pair — `oklch(0.5 0.14 145)` / `oklch(0.72 0.15 145)` for added, `oklch(0.5 0.19 25)` / `oklch(0.7 0.18 25)` for deleted — because the `+N`/`−N` tallies are text and one token cannot clear 4.5:1 against both white and near-black. Declare `color-scheme: light` / `dark` on your theme so the right half is picked; without it a page gets the light half. See the [ToolCall README](../tool-call/README.md#styling) for the full palette.

Four further properties override this component alone, on it or anywhere above it:

| Property           | Default                    | Applies to       |
| ------------------ | -------------------------- | ---------------- |
| `--ft-diff-add-bg` | `--ft-status-done` at 12%  | Added row tint   |
| `--ft-diff-del-bg` | `--ft-status-error` at 12% | Deleted row tint |
| `--ft-diff-add-fg` | `--ft-status-done`         | The `+N` tally   |
| `--ft-diff-del-fg` | `--ft-status-error`        | The `−N` tally   |

## Implementation Notes

- Parsing runs through the shared unified-diff reader, which is total: every input yields a value and nothing throws. Text that is not a patch at all yields no files, and the component renders an empty shell rather than an error.
- Line numbers, the `+`/`−` glyphs and the `@@` hunk headers are `user-select: none`, so dragging across a diff and hitting copy yields the code alone — no gutters or hunk markers to strip out afterwards.
- Fold and clamp state is keyed by file name and cleared whenever the patch's file list changes, so a folded file never hands its state to whatever takes its place in the next patch.
- Renames render as `old → new`; a file the patch creates or removes is badged `new file` or `deleted` instead of showing a `/dev/null` side.
- Rows are `width: max-content` with a `100%` floor, so a row's tint runs the whole scroll width instead of stopping where its own text ends.
- Expand/collapse is a one-row grid transitioning `grid-template-rows` between `0fr` and `1fr`, so `auto` height animates without measuring anything. The folded body is `inert`, keeping it out of the tab order and the accessibility tree.
- Both animations — the fold and the chevron — live behind `prefers-reduced-motion: no-preference`.
- Nothing touches the DOM or the clock outside effects, so the component renders identically on the server.
