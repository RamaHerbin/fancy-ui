<script lang="ts">
import type { HTMLAttributes } from "vue";

/** One file FileUpload is tracking — selected, uploading, or settled. */
export interface UploadFile {
	/** Stable id for this row. Used as the `v-for` key — never the array index, since rows are removed from the middle. */
	id: string;
	/** The underlying browser File. */
	file: File;
	/** 0–100, or null when the consumer is not reporting progress. */
	progress: number | null;
	/** Lifecycle state. "error" covers both local validation failures (accept/maxSize/maxFiles) and upload failures the consumer reports back. */
	status: "pending" | "uploading" | "done" | "error";
	/** Message shown on the row and announced while status is "error". */
	error?: string;
}

export interface FileUploadProps {
	/** Selected files; two-way through `v-model:files`. */
	files?: UploadFile[];
	/** Called with the new list on every change — a selection, a drop, or a removal. */
	onFilesChange?: (files: UploadFile[]) => void;
	/** The input's native `accept` attribute (comma-separated extensions and/or MIME types/wildcards). Also enforced in JS: a dropped file never passes through the picker, so the browser's own filtering never sees it. */
	accept?: string;
	/** Allows more than one file per selection or drop. */
	multiple?: boolean;
	/** Maximum size per file, in bytes. A larger file is added to the list with status "error" rather than silently discarded. */
	maxSize?: number;
	/** Maximum number of files the list may hold. Files beyond the cap are rejected outright, not added as errors. */
	maxFiles?: number;
	/** Blocks selecting, dropping and removing files. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Native `required` on the underlying input. Overridden by a surrounding FormField. */
	required?: boolean;
	/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
	invalid?: boolean;
	/** Element id, applied to the underlying file input. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name` on the underlying input. */
	name?: string;
	/** Accessible name — for a control with no visible Label next to it. Omit when a surrounding FormField already supplies one. */
	label?: string;
	/** Constraint text under the drop zone, e.g. "PNG, SVG — 4 MB max". Informational only; not itself enforced — pair it with matching `accept`/`maxSize` values. */
	hint?: string;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useFancyId } from "../../internals/use-id.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS, JS_EASINGS } from "../../internals/motion/tokens.js";
import { runTransition, type TransitionRun } from "../../internals/motion/animate.js";
import { sound as soundFx } from "../../sound/sound.js";

defineOptions({ name: "FileUpload", inheritAttrs: false });

const {
	onFilesChange,
	accept,
	multiple = false,
	maxSize,
	maxFiles,
	disabled = false,
	required = false,
	invalid = false,
	id,
	name,
	label,
	hint,
	class: className,
	sound = false,
} = defineProps<FileUploadProps>();

// The counterpart of the source's `files = $bindable([])`: writable from
// inside, kept in step with a caller driving it through `v-model:files`, and
// free to move on its own when nobody is listening.
const files = defineModel<UploadFile[]>("files", { default: () => [] });

// Undefined outside a FormField — every computed below then falls back to
// this component's own prop instead, so the control works standalone
// exactly as it does wrapped. Context always wins when present, via `??`.
const field = useField();

// The file input is a labelable element, so — unlike a control whose root
// isn't (a role="radiogroup" wrapper needs labelId instead) — a plain
// controlId + <label for> pairing is enough. Generated with useFancyId(),
// not internals/id.ts's uid(), because that one throws outside the
// browser and this control's own "browse" label needs a stable target id
// even during SSR, FormField or not.
const generatedId = useFancyId();
const effectiveId = computed(() => field?.controlId ?? id ?? generatedId);
const effectiveDisabled = computed(() => field?.disabled ?? disabled);
const effectiveRequired = computed(() => field?.required ?? required);
const effectiveInvalid = computed(() => field?.invalid ?? invalid);

const hintId = computed(() => `${effectiveId.value}-hint`);
const describedBy = computed(
	() => [field?.describedBy, hint ? hintId.value : undefined].filter(Boolean).join(" ") || undefined
);

// Counts enter/leave pairs instead of toggling a boolean on either one.
// dragenter/dragleave bubble from every child the pointer crosses — the
// icon, the prompt text, the hint — so a naive "enter -> true, leave ->
// false" flickers false the instant the pointer passes over any of them.
// The zone reads as dragging exactly while this count is above zero,
// which stays true across a leave that is immediately followed by the
// matching child's enter.
const dragDepth = ref(0);
const dragging = computed(() => dragDepth.value > 0);

const inputRef = useTemplateRef<HTMLInputElement>("input");
// Convention C-4: exactly where the source declares its bindable `ref`.
defineExpose({ ref: inputRef });

const listRef = useTemplateRef<HTMLUListElement>("list");
// Rejections are announced here rather than left to the per-row error
// text alone — that text sits in the DOM but nothing moves focus to it,
// so a screen reader only reaches it if this also speaks.
const liveMessage = ref("");

// Never a render input, never reactive: minted inside event handlers only, so
// the counter cannot drift between a server render and its hydration.
let nextRowId = 0;
function createRowId(): string {
	nextRowId += 1;
	return `${generatedId}-file-${nextRowId}`;
}

function formatBytes(bytes: number): string {
	if (bytes >= 1_000_000) {
		const mb = bytes / 1_000_000;
		return `${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
	}
	if (bytes >= 1_000) {
		const kb = bytes / 1_000;
		return `${kb % 1 === 0 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
	}
	return `${bytes} B`;
}

// The input's own `accept` attribute only filters what the OS picker
// shows — it is a convenience, not a guarantee, and a dropped file
// bypasses it entirely. This is the real gate, run for both paths.
function matchesAccept(file: File, pattern: string | undefined): boolean {
	if (!pattern) return true;
	const rules = pattern
		.split(",")
		.map((rule) => rule.trim().toLowerCase())
		.filter(Boolean);
	if (rules.length === 0) return true;

	const fileName = file.name.toLowerCase();
	const fileType = file.type.toLowerCase();
	return rules.some((rule) => {
		if (rule.startsWith(".")) return fileName.endsWith(rule);
		if (rule.endsWith("/*")) return fileType.startsWith(rule.slice(0, -1));
		return fileType === rule;
	});
}

// The single place new files enter the list, from either the native
// picker or a drop — both funnel through here so maxSize/maxFiles/accept
// are enforced identically regardless of path.
// Setting `liveMessage` to a value it already holds is a no-op — the
// ref's value is unchanged, so nothing re-renders and the sr-only
// region's text node never mutates, so the announcement never fires.
// That bites a repeat of the exact same rejection (or two drops that
// both produce e.g. "notes.txt is not an accepted file type."): the
// second attempt is silent to a screen-reader user even though a sighted
// user sees the row. Clearing first and awaiting a tick before writing
// the real message forces a text-node mutation every time, identical
// message or not.
async function announceLive(message: string) {
	if (message === liveMessage.value) {
		liveMessage.value = "";
		await nextTick();
	}
	liveMessage.value = message;
}

async function addFiles(incoming: File[]) {
	if (effectiveDisabled.value || incoming.length === 0) return;

	const selected = multiple ? incoming : incoming.slice(0, 1);
	// A single-file picker replaces its previous selection rather than
	// stacking, matching how a native non-multiple input behaves.
	const next = multiple ? [...files.value] : [];
	// Every rejection ends up here — a file kept out of the list entirely
	// by maxFiles, and a file added with status "error" by accept/maxSize
	// alike — because both need a message a screen reader actually reaches,
	// not just row text nothing moved focus to.
	const problems: string[] = [];
	let addedCount = 0;

	// Files past the first one in a drop onto a non-multiple zone are just
	// as much a rejection as anything below — the OS picker can't even
	// offer a multi-select when `multiple` is unset, so a drop is the only
	// path an extra file can arrive by at all. Discarding it without a word
	// would be an enhancement-path-only silent failure: the one path a
	// keyboard user cannot take (drag-and-drop) would behave differently
	// from the one they can (the picker, which physically can't produce
	// this case).
	for (const file of incoming.slice(selected.length)) {
		problems.push(`${file.name} was not added: only one file is accepted.`);
	}

	for (const file of selected) {
		if (maxFiles !== undefined && next.length >= maxFiles) {
			problems.push(
				`${file.name} was not added: the limit of ${maxFiles} file${maxFiles === 1 ? "" : "s"} has been reached.`
			);
			continue;
		}

		if (!matchesAccept(file, accept)) {
			const error = `${file.name} is not an accepted file type.`;
			next.push({ id: createRowId(), file, progress: null, status: "error", error });
			problems.push(error);
			addedCount += 1;
			continue;
		}

		if (maxSize !== undefined && file.size > maxSize) {
			const error = `${file.name} exceeds the ${formatBytes(maxSize)} limit.`;
			next.push({ id: createRowId(), file, progress: null, status: "error", error });
			problems.push(error);
			addedCount += 1;
			continue;
		}

		next.push({ id: createRowId(), file, progress: null, status: "pending" });
		addedCount += 1;
	}

	files.value = next;
	// Mirrors the liveMessage precedence right below: a rejection anywhere
	// in this batch wins the cue over an acceptance, and a batch that added
	// nothing plays nothing at all. Never `success` — this component only
	// tracks a selection/drop, it does not perform the upload itself.
	if (sound) {
		if (problems.length > 0) soundFx.play("error");
		else if (addedCount > 0) soundFx.play("select");
	}
	onFilesChange?.(next);

	if (problems.length > 0) {
		await announceLive(problems.join(" "));
	} else if (addedCount > 0) {
		await announceLive(`${addedCount} file${addedCount === 1 ? "" : "s"} added.`);
	}
}

function handleInputChange(event: Event) {
	if (effectiveDisabled.value) return;
	const input = event.currentTarget as HTMLInputElement;
	const picked = Array.from(input.files ?? []);
	// Cleared so selecting the exact same file again still fires change —
	// otherwise the browser sees an unchanged selection and stays silent.
	input.value = "";
	addFiles(picked);
}

function handleDragEnter(event: DragEvent) {
	event.preventDefault();
	if (effectiveDisabled.value) return;
	dragDepth.value += 1;
}

function handleDragOver(event: DragEvent) {
	// Required on every dragover, disabled or not: without it the browser
	// never fires `drop` at all, and a disabled zone still needs `drop` to
	// fire so it can swallow the file instead of letting the browser
	// navigate to it.
	event.preventDefault();
}

function handleDragLeave(event: DragEvent) {
	event.preventDefault();
	if (effectiveDisabled.value) return;
	dragDepth.value = Math.max(0, dragDepth.value - 1);
}

function handleDrop(event: DragEvent) {
	event.preventDefault();
	dragDepth.value = 0;
	if (effectiveDisabled.value) return;
	const dropped = Array.from(event.dataTransfer?.files ?? []);
	addFiles(dropped);
}

async function removeFile(fileId: string) {
	if (effectiveDisabled.value) return;
	const index = files.value.findIndex((entry) => entry.id === fileId);
	if (index === -1) return;

	const next = files.value.filter((entry) => entry.id !== fileId);
	files.value = next;
	onFilesChange?.(next);

	// The removed row's own button can't keep focus. Move it to the row that
	// slid into its place, the row before it if this was the last one, or
	// back to the picker once the list is empty, rather than letting it fall
	// back to <body>.
	//
	// The target is resolved from `next` by id, not by counting buttons in
	// the DOM, because the removed row has NOT left the DOM yet: its exit
	// transition is still playing, and the row is marked `inert` for the whole
	// of it. A DOM-order lookup would hand focus to the very button that is on
	// its way out — which browsers refuse to focus inside an inert subtree,
	// dropping focus on <body> exactly where this code exists to stop it
	// landing. Reading `next` gives the same answer whether the exit is running
	// or reduced motion already collapsed it to nothing.
	await nextTick();
	const target = next[Math.min(index, next.length - 1)];
	const button = target
		? Array.from(listRef.value?.querySelectorAll<HTMLLIElement>("[data-file-row]") ?? [])
				.find((row) => row.dataset.fileRow === target.id)
				?.querySelector<HTMLButtonElement>("[data-file-remove]")
		: undefined;
	if (button) {
		button.focus();
	} else {
		inputRef.value?.focus();
	}
}

// A split enter/leave pair rather than one bidirectional transition, which is
// the house rule everywhere else. The list is keyed, so a row has no local
// `open` flag a single directive could read to tell an arrival from a
// departure, and a row id is never reused (`createRowId` only counts up), so
// the reversal smoothing a bidirectional transition buys is smoothing nothing:
// a leaving row can never come back mid-exit. Toast is shaped the same way for
// the same two reasons. Splitting also lets the exit be its own, quieter
// gesture rather than the entrance played backwards: a row arrives by rising
// into place and leaves by simply fading, so nothing appears to travel back out
// of the list.
const rowEnter = preset("fade-up");
const rowLeave = preset("fade");

// One live leg per row id, so a row whose id comes back mid-exit reverses from
// where the exit actually got to rather than restarting at the far end.
const runs = new Map<string, TransitionRun>();

// The counterpart of the source's `out:…|global`. Emptying the list would
// otherwise tear the whole `<ul>` down in the same patch, and a transition on a
// child of an unmounting element never runs — every other removal would fade
// and the final one would vanish on the spot. `holdList` keeps the `<ul>`
// mounted while any leg is still leaving; the entrance stays local (no
// `appear`), which is what keeps a restored list from animating every row in at
// once.
const holdList = ref(false);
let leavingLegs = 0;

// `flush: "pre"`, so the flag is already set when the same flush re-renders the
// list — the row that empties it has to find its `<ul>` still there.
watch(
	() => files.value.length,
	(count, previous) => {
		if (count === 0 && (previous ?? 0) > 0) holdList.value = true;
	},
	{ flush: "pre" }
);

const listMounted = computed(() => files.value.length > 0 || holdList.value);

function rowIdOf(element: Element): string {
	return (element as HTMLElement).dataset.fileRow ?? "";
}

function onRowEnter(element: Element, done: () => void) {
	const rowId = rowIdOf(element);
	const spec = rowEnter(
		element,
		{
			duration: prefersReducedMotion() ? 0 : DURATIONS.fast,
			distance: 8,
			easing: JS_EASINGS.out,
		},
		{ direction: "in" }
	);
	// `let`, not `const`: on the reduced-motion path the finish callback fires
	// synchronously from inside runTransition, before the binding is assigned.
	let run: TransitionRun | undefined;
	let settled = false;
	run = runTransition(element, spec, 1, runs.get(rowId), () => {
		settled = true;
		runs.delete(rowId);
		// Aborting on ENTER finish drops the `fill: forwards` so the row falls
		// back to its resting style — which *is* the visible end state by
		// construction. The exit below deliberately does NOT abort: its node
		// stays in the DOM until the leave callback removes it, and dropping
		// fill-forwards would flash the row back for a frame.
		run?.abort();
		done();
	});
	// A duration-0 entrance has already finished and deleted itself, so
	// registering it again would strand a dead handle.
	if (!settled) runs.set(rowId, run);
}

function onRowLeave(element: Element, done: () => void) {
	const rowId = rowIdOf(element);
	// Set synchronously, immediately before the exit starts. A closing row is
	// not something a pointer or a screen reader should be able to reach.
	element.toggleAttribute("inert", true);
	leavingLegs += 1;
	const spec = rowLeave(
		element,
		{
			duration: prefersReducedMotion() ? 0 : DURATIONS.exit,
			easing: JS_EASINGS.in,
		},
		{ direction: "out" }
	);
	let settled = false;
	const run = runTransition(element, spec, 0, runs.get(rowId), () => {
		settled = true;
		runs.delete(rowId);
		leavingLegs -= 1;
		if (leavingLegs === 0) holdList.value = false;
		done();
	});
	if (!settled) runs.set(rowId, run);
}

onBeforeUnmount(() => {
	for (const run of runs.values()) run.abort();
	runs.clear();
});

const classes = computed(() => cn("ft-file-upload flex flex-col gap-3", className));

const dropzoneClasses = computed(() =>
	cn(
		"ft-file-upload-dropzone flex flex-col items-center gap-1 rounded-[10px] border-[1.5px] border-dashed p-[18px] text-center transition-colors",
		effectiveInvalid.value ? "border-destructive/60" : "ft-file-upload-accent-border",
		dragging.value && "ft-file-upload-dragging",
		effectiveDisabled.value && "cursor-not-allowed opacity-50"
	)
);
</script>

<template>
	<div :class="classes">
		<div
			:class="dropzoneClasses"
			role="presentation"
			:data-dragging="dragging ? 'true' : undefined"
			@dragenter="handleDragEnter"
			@dragover="handleDragOver"
			@dragleave="handleDragLeave"
			@drop="handleDrop"
		>
			<input
				ref="input"
				type="file"
				:id="effectiveId"
				:name="name"
				:accept="accept"
				:multiple="multiple"
				:disabled="effectiveDisabled"
				:required="effectiveRequired"
				:aria-invalid="effectiveInvalid ? 'true' : undefined"
				:aria-describedby="describedBy"
				:aria-label="label"
				class="ft-file-upload-input sr-only"
				@change="handleInputChange"
			/>
			<!--
				A real, focusable `<input type="file">` behind everything — this
				`<label>` is a click-target enhancement layered on top of it, not a
				replacement path. Keyboard users reach the input directly by Tab and
				open the picker with Enter/Space, same as any native file input; this
				label only makes the whole prompt (not just the input's own tiny
				native button) clickable, and gives the input its default accessible
				name when the `label` prop and any surrounding FormField are both
				absent. The drop zone itself (the div above) stays a plain, non-
				interactive element — making it a button as well would nest two
				interactive controls around the same input.
			-->
			<label :for="effectiveId" class="ft-file-upload-prompt flex flex-col items-center gap-1">
				<span aria-hidden="true" class="ft-file-upload-icon">⇪</span>
				<span class="text-[12px] font-medium">
					Drag and drop or <span class="ft-file-upload-browse">browse</span>
				</span>
			</label>
			<p v-if="hint" :id="hintId" class="text-muted-foreground text-[11px]">{{ hint }}</p>
		</div>

		<ul v-if="listMounted" ref="list" class="ft-file-upload-list flex flex-col gap-2">
			<TransitionGroup :css="false" @enter="onRowEnter" @leave="onRowLeave">
				<li
					v-for="entry in files"
					:key="entry.id"
					:data-file-row="entry.id"
					class="border-border flex items-center gap-[10px] rounded-[8px] border px-[10px] py-[8px] text-[12px]"
				>
					<span aria-hidden="true">📄</span>
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<span class="truncate">{{ entry.file.name }}</span>
						<div
							v-if="entry.status === 'uploading'"
							role="progressbar"
							:aria-valuemin="0"
							:aria-valuemax="100"
							:aria-valuenow="entry.progress ?? undefined"
							:aria-label="`Uploading ${entry.file.name}`"
							class="ft-file-upload-progress-track"
						>
							<div
								:class="
									cn(
										'ft-file-upload-progress-fill',
										entry.progress === null && 'ft-file-upload-progress-indeterminate'
									)
								"
								:style="{
									'--ft-fileupload-progress':
										entry.progress !== null ? entry.progress / 100 : undefined,
								}"
							></div>
						</div>
						<p v-else-if="entry.status === 'error' && entry.error" class="text-destructive">
							{{ entry.error }}
						</p>
						<span
							v-else-if="entry.status === 'done'"
							class="ft-file-upload-done flex items-center gap-1"
						>
							<span aria-hidden="true">✓</span> Done
						</span>
					</div>
					<span
						v-if="entry.status === 'uploading' && entry.progress !== null"
						aria-hidden="true"
						class="text-muted-foreground"
						>{{ entry.progress }}%</span
					>
					<button
						type="button"
						data-file-remove
						:disabled="effectiveDisabled"
						:aria-label="`Remove ${entry.file.name}`"
						class="ft-file-upload-remove text-muted-foreground shrink-0"
						@click="removeFile(entry.id)"
					>
						✕
					</button>
				</li>
			</TransitionGroup>
		</ul>

		<div aria-live="polite" class="sr-only">{{ liveMessage }}</div>
	</div>
</template>

<style scoped>
/*
 * The brand accent has no semantic token, so it is declared locally with a
 * light-dark() fallback — the same shape Input uses for its own focus
 * ring — on the component root rather than the dropzone alone, since the
 * file rows' progress fills read it too and they are the dropzone's
 * sibling, not its descendant. Every other rule below reads this one
 * custom property, so retinting --ft-accent higher up the tree moves the
 * dashed border, the dragging state, the focus halo and the progress
 * fills together.
 */
.ft-file-upload {
	--ft-field-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
}

.ft-file-upload-dropzone {
	background-color: color-mix(in oklab, var(--ft-field-accent) 4%, transparent);
}

.ft-file-upload-accent-border {
	border-color: color-mix(in oklab, var(--ft-field-accent) 40%, transparent);
}

.ft-file-upload-dragging {
	border-color: var(--ft-field-accent);
	background-color: color-mix(in oklab, var(--ft-field-accent) 10%, transparent);
}

/* Keyboard focus lands on the sr-only input, not the dropzone — this is
   what actually surfaces that focus to a sighted user. :has() runs off
   the input's own :focus-visible, so it never lights up on a mouse click,
   only on the same conditions the input's own ring would use if it were
   visible. */
.ft-file-upload-dropzone:has(.ft-file-upload-input:focus-visible) {
	border-color: var(--ft-field-accent);
	border-style: solid;
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
}

.ft-file-upload-browse {
	color: var(--ft-field-accent);
}

.ft-file-upload-icon {
	font-size: 18px;
	color: var(--ft-field-accent);
}

.ft-file-upload-progress-track {
	position: relative;
	height: 3px;
	border-radius: 2px;
	overflow: hidden;
	background-color: var(--color-muted, rgba(255, 255, 255, 0.08));
}

/*
 * scaleX off a custom property, never `width` — the same technique
 * ScrollProgress ships for the same reason: a width change forces layout on
 * every progress report a consumer pushes in, while a transform is
 * compositor-only. The property carries a 0–1 ratio (70% is `0.7`), so the
 * component never has to parse a percentage back out of a style string.
 * `transform-origin: left` makes the bar grow from the start edge.
 */
.ft-file-upload-progress-fill {
	position: absolute;
	inset: 0;
	border-radius: 2px;
	background-color: var(--ft-field-accent, currentColor);
	transform: scaleX(var(--ft-fileupload-progress, 0));
	transform-origin: left;
}

/*
 * `width: 40%` is layout, not animation: it sizes the travelling block once
 * and never changes it, which is why it stays a `width` rather than becoming
 * another transform. `transform: none` un-does the determinate rule above —
 * without it an indeterminate bar under reduced motion (where the keyframes
 * never run) would sit at `scaleX(0)` and vanish, where today it shows a
 * static block. The keyframes below out-rank this declaration whenever the
 * animation is actually running.
 */
.ft-file-upload-progress-indeterminate {
	width: 40%;
	transform: none;
}

@media (prefers-reduced-motion: no-preference) {
	/* A bar that eases toward each reported value instead of jumping to it is
	   the whole user-visible point of the swap above. tokens.ts:
	   DURATIONS.fast / EASINGS.out. */
	.ft-file-upload-progress-fill {
		transition: transform var(--ft-duration-fast, 150ms)
			var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
	}

	.ft-file-upload-progress-indeterminate {
		/* tokens.* n/a: loop period, component-owned */
		animation: ft-file-upload-indeterminate 1.4s var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1))
			infinite;
	}
}

/* translateX, not margin-left: a margin animation re-runs layout on every
   frame of a loop that never stops. The arithmetic: the block is 40% of the
   track wide, so -100% parks it fully off the left edge and 250% (2.5 × 40%)
   carries it fully off the right. */
@keyframes ft-file-upload-indeterminate {
	0% {
		transform: translateX(-100%);
	}
	100% {
		transform: translateX(250%);
	}
}

.ft-file-upload-done {
	color: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)));
}

.ft-file-upload-remove {
	font-size: 11px;
	line-height: 1;
	padding: 4px;
	border-radius: 999px;
}

.ft-file-upload-remove:hover:not(:disabled) {
	background-color: color-mix(in oklab, currentColor 10%, transparent);
}

.ft-file-upload-remove:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
