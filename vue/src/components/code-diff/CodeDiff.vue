<script lang="ts">
import type { HTMLAttributes } from "vue";

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
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, reactive, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { parseUnifiedDiff, type DiffFile, type DiffLine } from "../../internals/diff.js";
import { sound as soundFx } from "../../sound/sound.js";

defineOptions({ name: "CodeDiff", inheritAttrs: false });

const {
	diff,
	filename,
	lineNumbers = true,
	maxLines = 0,
	wrap = false,
	class: className,
	sound: soundProp = false,
} = defineProps<CodeDiffProps>();

// The counterpart of the source's bindable `collapsed`.
const collapsed = defineModel<boolean>("collapsed", { default: false });

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

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

const uid = useFancyId();

const files = computed(() => parseUnifiedDiff(diff));

// Per-file fold and clamp state, keyed by file name rather than position: a
// patch that arrives with a different set of files must not hand file 0's
// folded state to whatever now happens to sit first. `collapsed` is the
// master switch: it seeds every file and wipes the overrides whenever the
// consumer flips it, so binding it still folds the whole patch while a click
// still folds one file.
const folded = reactive<Record<string, boolean>>({});
const unclamped = reactive<Record<string, boolean>>({});
let lastCollapsed = collapsed.value;

function clearRecord(record: Record<string, boolean>): void {
	for (const key of Object.keys(record)) delete record[key];
}

watch(
	() => collapsed.value,
	(next) => {
		if (next === lastCollapsed) return;
		lastCollapsed = next;
		clearRecord(folded);
	},
	{ flush: "post" }
);

// Names alone would let a reused path carry state across two unrelated
// patches, so the whole list is watched: when it changes, both records start
// empty and every file is back under `collapsed`.
// A name on its own cannot tell two patches apart when both touch the same
// path, so a replacement would inherit the fold and clamp state of the patch
// before it. The first hunk's declared start pins that down, and it is fixed
// the moment that header parses — a patch still streaming in only ever gains
// lines and later hunks, so growth in place still reads as the same file.
const signature = computed(() =>
	files.value
		.map((file) => {
			const anchor = file.hunks[0];
			return `${nameOf(file, files.value.length)}:${anchor?.oldStart ?? ""}:${anchor?.newStart ?? ""}`;
		})
		.join("\n")
);
// Read outside any tracking scope on purpose: this is the "what did we render
// last" marker, and it is the watcher below — not this line — that is meant
// to notice a change.
let lastSignature = signature.value;

watch(
	() => signature.value,
	(next) => {
		if (next === lastSignature) return;
		lastSignature = next;
		clearRecord(folded);
		clearRecord(unclamped);
	},
	{ flush: "post" }
);

function isFolded(name: string): boolean {
	return folded[name] ?? collapsed.value;
}

function toggle(name: string) {
	// Captured before the write, so the cue that plays matches the state this
	// click is actually producing — the watchers above that also touch
	// `folded` (a collapsed-prop flip, a patch-signature change) never run
	// through this function, so they can never trigger it either.
	const nextFolded = !isFolded(name);
	folded[name] = nextFolded;
	if (soundProp) soundFx.play(nextFolded ? "close" : "open");
	// `collapsed` reports the whole patch, so it is true only once nothing is left open.
	const all = views.value.every((view) => folded[view.name] ?? collapsed.value);
	lastCollapsed = all;
	collapsed.value = all;
}

function revealMore(name: string) {
	if (soundProp) soundFx.play("open");
	unclamped[name] = true;
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

const views = computed<FileView[]>(() =>
	files.value.map((file) => {
		const name = nameOf(file, files.value.length);
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

<template>
	<div
		ref="el"
		role="group"
		aria-label="Code diff"
		:class="
			cn(
				'border-border bg-card/50 w-full overflow-hidden rounded-lg border font-mono text-xs',
				className
			)
		"
	>
		<div
			v-for="(view, index) in views"
			:key="index"
			class="border-border border-t first:border-t-0"
		>
			<button
				type="button"
				:id="`${uid}-${index}-header`"
				class="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
				:aria-expanded="!isFolded(view.name)"
				:aria-controls="`${uid}-${index}-body`"
				@click="toggle(view.name)"
			>
				<svg
					class="ft-chevron size-3.5 shrink-0"
					:class="{ 'ft-open': !isFolded(view.name) }"
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
				<span v-if="view.name" class="text-foreground min-w-0 truncate">{{ view.name }}</span>
				<span v-if="view.file.isNew" class="ft-badge">new file</span>
				<span v-else-if="view.file.isDeleted" class="ft-badge">deleted</span>
				<span class="ml-auto flex shrink-0 items-center gap-2 tabular-nums">
					<span v-if="view.file.additions > 0" class="ft-stat-add">+{{ view.file.additions }}</span>
					<span v-if="view.file.deletions > 0" class="ft-stat-del">−{{ view.file.deletions }}</span>
				</span>
			</button>

			<div class="ft-body" :class="{ 'ft-open': !isFolded(view.name) }">
				<div class="overflow-hidden">
					<div
						:id="`${uid}-${index}-body`"
						role="group"
						:aria-labelledby="`${uid}-${index}-header`"
						v-bind="isFolded(view.name) ? { inert: true } : {}"
					>
						<div class="ft-scroll" :class="{ 'ft-wrap': wrap }">
							<template v-for="(row, rowIndex) in view.rows" :key="rowIndex">
								<div v-if="row.kind === 'sep'" class="ft-sep">{{ row.text }}</div>
								<div
									v-else
									class="ft-row"
									:data-kind="row.line.type"
									:class="{
										'ft-add': row.line.type === 'add',
										'ft-del': row.line.type === 'del',
										'ft-context': row.line.type === 'context',
										'ft-meta': row.line.type === 'meta',
									}"
								>
									<template v-if="lineNumbers">
										<span class="ft-num" aria-hidden="true">{{ row.line.oldLine ?? "" }}</span>
										<span class="ft-num" aria-hidden="true">{{ row.line.newLine ?? "" }}</span>
									</template>
									<span class="ft-glyph" aria-hidden="true">{{ GLYPH[row.line.type] }}</span>
									<span v-if="row.line.type === 'add'" class="sr-only select-none">Added line</span>
									<span v-else-if="row.line.type === 'del'" class="sr-only select-none"
										>Removed line</span
									>
									<span class="ft-code">{{ row.line.text }}</span>
								</div>
							</template>
						</div>

						<button
							v-if="view.hidden > 0"
							type="button"
							class="text-muted-foreground hover:text-foreground hover:bg-muted/40 border-border w-full border-t px-3 py-1.5 text-left transition-colors"
							@click="revealMore(view.name)"
						>
							Show {{ view.hidden }} more {{ view.hidden === 1 ? "line" : "lines" }}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
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
