<script lang="ts" module>
	/**
	 * Props for CodeDiff
	 */
	export interface CodeDiffProps {
		/**
		 * Raw unified diff text — whatever `git diff` printed. Parsed on every
		 * change, so a patch that is still arriving can be handed over as it grows.
		 */
		diff: string;
		/** Header label when the patch names no file, or names exactly one. */
		filename?: string;
		/** Whether to show the old/new line-number gutters. */
		lineNumbers?: boolean;
		/** Whether the bodies are folded away. Bindable — see the README. */
		collapsed?: boolean;
		/** Lines shown before the rest hide behind a "show more" button. 0 shows all. */
		maxLines?: number;
		/** Whether long lines wrap instead of scrolling sideways. */
		wrap?: boolean;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { parseUnifiedDiff, type DiffFile, type DiffLine } from "../_internals/diff.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		diff,
		filename,
		lineNumbers = true,
		collapsed = $bindable(false),
		maxLines = 0,
		wrap = false,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: CodeDiffProps = $props();

	type Row = { kind: "sep"; text: string } | { kind: "line"; line: DiffLine };

	interface FileView {
		file: DiffFile;
		name: string;
		rows: Row[];
		/** Lines the clamp is currently withholding; 0 when everything is on screen. */
		hidden: number;
	}

	/** Glyphs, not markers: they are never copied, so they can be the prettier pair. */
	const GLYPH = { add: "+", del: "−", context: " ", meta: " " } as const;

	const uid = $props.id();

	const files = $derived(parseUnifiedDiff(diff));

	// Per-file fold and clamp state, keyed by file name rather than position: a
	// patch that arrives with a different set of files must not hand file 0's
	// folded state to whatever now happens to sit first. `collapsed` is the master
	// switch: it seeds every file and wipes the overrides whenever the consumer
	// flips it, so binding it still folds the whole patch while a click still
	// folds one file.
	let folded = $state<Record<string, boolean>>({});
	let unclamped = $state<Record<string, boolean>>({});
	let lastCollapsed = collapsed;

	$effect(() => {
		const next = collapsed;
		untrack(() => {
			if (next === lastCollapsed) return;
			lastCollapsed = next;
			folded = {};
		});
	});

	// Names alone would let a reused path carry state across two unrelated
	// patches, so the whole list is watched: when it changes, both records start
	// empty and every file is back under `collapsed`.
	// A name on its own cannot tell two patches apart when both touch the same
	// path, so a replacement would inherit the fold and clamp state of the patch
	// before it. The first hunk's declared start pins that down, and it is fixed
	// the moment that header parses — a patch still streaming in only ever gains
	// lines and later hunks, so growth in place still reads as the same file.
	const signature = $derived(
		files
			.map((file) => {
				const anchor = file.hunks[0];
				return `${nameOf(file, files.length)}:${anchor?.oldStart ?? ""}:${anchor?.newStart ?? ""}`;
			})
			.join("\n")
	);
	// Untracked on purpose: this is the "what did we render last" marker, and it is
	// the effect below — not this line — that is meant to notice a change.
	let lastSignature = untrack(() => signature);

	$effect(() => {
		const next = signature;
		untrack(() => {
			if (next === lastSignature) return;
			lastSignature = next;
			folded = {};
			unclamped = {};
		});
	});

	function isFolded(name: string): boolean {
		return folded[name] ?? collapsed;
	}

	function toggle(name: string) {
		// Captured before the write, so the cue that plays matches the state this
		// click is actually producing — the $effects below that also touch
		// `folded` (a collapsed-prop flip, a patch-signature change) never run
		// through this function, so they can never trigger it either.
		const nextFolded = !isFolded(name);
		folded[name] = nextFolded;
		if (sound) soundFx.play(nextFolded ? "close" : "open");
		// `collapsed` reports the whole patch, so it is true only once nothing is left open.
		const all = views.every((view) => folded[view.name] ?? collapsed);
		lastCollapsed = all;
		collapsed = all;
	}

	function nameOf(file: DiffFile, count: number): string {
		if (filename !== undefined && count <= 1) return filename;
		if (
			file.isRename &&
			file.oldPath !== null &&
			file.newPath !== null &&
			file.oldPath !== file.newPath
		) {
			return `${file.oldPath} → ${file.newPath}`;
		}
		return file.newPath ?? file.oldPath ?? "";
	}

	const views: FileView[] = $derived(
		files.map((file) => {
			const name = nameOf(file, files.length);
			const rows: Row[] = [];
			let total = 0;
			for (const hunk of file.hunks) {
				if (hunk.header !== "") rows.push({ kind: "sep", text: hunk.header });
				for (const line of hunk.lines) {
					rows.push({ kind: "line", line });
					total++;
				}
			}

			if (maxLines <= 0 || unclamped[name] || total <= maxLines) {
				return { file, name, rows, hidden: 0 };
			}

			// Cut on a line, never on a hunk header, so the clamp never leaves a
			// dangling `@@` with nothing under it.
			const shown: Row[] = [];
			let seen = 0;
			for (const row of rows) {
				shown.push(row);
				if (row.kind !== "line") continue;
				seen++;
				if (seen === maxLines) break;
			}
			return { file, name, rows: shown, hidden: total - maxLines };
		})
	);
</script>

<div
	bind:this={ref}
	role="group"
	aria-label="Code diff"
	class={cn(
		"border-border bg-card/50 w-full overflow-hidden rounded-lg border font-mono text-xs",
		className
	)}
>
	{#each views as view, index (index)}
		{@const open = !isFolded(view.name)}
		{@const headerId = `${uid}-${index}-header`}
		{@const bodyId = `${uid}-${index}-body`}
		<div class="border-border border-t first:border-t-0">
			<button
				type="button"
				id={headerId}
				class="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
				aria-expanded={open}
				aria-controls={bodyId}
				onclick={() => toggle(view.name)}
			>
				<svg
					class="ft-chevron size-3.5 shrink-0"
					class:ft-open={open}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m9 6 6 6-6 6" />
				</svg>
				{#if view.name}
					<span class="text-foreground min-w-0 truncate">{view.name}</span>
				{/if}
				{#if view.file.isNew}
					<span class="ft-badge">new file</span>
				{:else if view.file.isDeleted}
					<span class="ft-badge">deleted</span>
				{/if}
				<span class="ml-auto flex shrink-0 items-center gap-2 tabular-nums">
					{#if view.file.additions > 0}
						<span class="ft-stat-add">+{view.file.additions}</span>
					{/if}
					{#if view.file.deletions > 0}
						<span class="ft-stat-del">−{view.file.deletions}</span>
					{/if}
				</span>
			</button>

			<div class="ft-body" class:ft-open={open}>
				<div class="overflow-hidden">
					<div id={bodyId} role="group" aria-labelledby={headerId} inert={!open}>
						<div class="ft-scroll" class:ft-wrap={wrap}>
							{#each view.rows as row, rowIndex (rowIndex)}
								{#if row.kind === "sep"}
									<div class="ft-sep">{row.text}</div>
								{:else}
									<div
										class="ft-row"
										data-kind={row.line.type}
										class:ft-add={row.line.type === "add"}
										class:ft-del={row.line.type === "del"}
										class:ft-context={row.line.type === "context"}
										class:ft-meta={row.line.type === "meta"}
									>
										{#if lineNumbers}
											<span class="ft-num" aria-hidden="true">{row.line.oldLine ?? ""}</span>
											<span class="ft-num" aria-hidden="true">{row.line.newLine ?? ""}</span>
										{/if}
										<span class="ft-glyph" aria-hidden="true">{GLYPH[row.line.type]}</span>
										<span class="ft-code">{row.line.text}</span>
									</div>
								{/if}
							{/each}
						</div>

						{#if view.hidden > 0}
							<button
								type="button"
								class="text-muted-foreground hover:text-foreground hover:bg-muted/40 border-border w-full border-t px-3 py-1.5 text-left transition-colors"
								onclick={() => {
									if (sound) soundFx.play("open");
									unclamped[view.name] = true;
								}}
							>
								Show {view.hidden} more {view.hidden === 1 ? "line" : "lines"}
							</button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	/*
	 * 0fr → 1fr on a one-row grid transitions "auto" height without measuring
	 * anything; the inner wrapper does the clipping.
	 */
	.ft-body {
		display: grid;
		grid-template-rows: 0fr;
	}

	.ft-body.ft-open {
		grid-template-rows: 1fr;
	}

	.ft-chevron.ft-open {
		transform: rotate(90deg);
	}

	.ft-scroll {
		overflow-x: auto;
		overflow-y: hidden;
		padding-block: 0.25rem;
	}

	.ft-scroll.ft-wrap {
		overflow-x: hidden;
	}

	/*
	 * `max-content` with a 100% floor keeps a row's tint running the full scroll
	 * width instead of stopping where the shortest line ends.
	 */
	.ft-row,
	.ft-sep {
		width: max-content;
		min-width: 100%;
	}

	.ft-wrap .ft-row,
	.ft-wrap .ft-sep {
		width: auto;
	}

	.ft-row {
		display: flex;
		align-items: flex-start;
		line-height: 1.6;
	}

	.ft-sep {
		padding: 0.375rem 0.75rem;
		white-space: pre;
		opacity: 0.55;
	}

	/*
	 * Tint and glyph both carry the verdict, so the rows stay readable when the
	 * hues do not land — colour is never the only signal. Both tints are mixed
	 * from the `--ft-status-*` vocabulary this component family shares, so a
	 * theme that recolours success and failure once recolours the diff too.
	 */
	.ft-add {
		background-color: var(
			--ft-diff-add-bg,
			color-mix(
				in oklab,
				var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145))) 12%,
				transparent
			)
		);
	}

	.ft-del {
		background-color: var(
			--ft-diff-del-bg,
			color-mix(
				in oklab,
				var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25))) 12%,
				transparent
			)
		);
	}

	.ft-context {
		background-color: transparent;
	}

	.ft-meta {
		font-style: italic;
		opacity: 0.6;
	}

	.ft-stat-add {
		color: var(
			--ft-diff-add-fg,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	.ft-stat-del {
		color: var(
			--ft-diff-del-fg,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
	}

	.ft-badge {
		flex: none;
		border-radius: 0.25rem;
		padding: 0.0625rem 0.375rem;
		font-size: 0.6875rem;
		background-color: var(--ft-diff-badge-bg, color-mix(in oklab, currentColor 12%, transparent));
	}

	/* Gutters, glyphs and hunk headers are chrome: skipping them keeps a copied
	   selection compilable — no line numbers, no markers, no dangling `@@`. */
	.ft-num,
	.ft-glyph,
	.ft-sep {
		user-select: none;
		-webkit-user-select: none;
	}

	.ft-num,
	.ft-glyph {
		flex: none;
	}

	.ft-num {
		min-width: 4ch;
		padding-inline: 0.5rem 0;
		text-align: right;
		opacity: 0.45;
		font-variant-numeric: tabular-nums;
	}

	.ft-glyph {
		width: 2.5ch;
		text-align: center;
		opacity: 0.7;
	}

	.ft-code {
		flex: 1 1 auto;
		min-width: 0;
		white-space: pre;
		padding-inline-end: 0.75rem;
	}

	.ft-wrap .ft-code {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	/* Everything that moves lives behind the query; reduced motion gets the same
	   states with nothing to shorten. */
	@media (prefers-reduced-motion: no-preference) {
		.ft-body {
			transition: grid-template-rows 260ms cubic-bezier(0.4, 0, 0.2, 1);
		}

		.ft-chevron {
			transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
		}
	}
</style>
