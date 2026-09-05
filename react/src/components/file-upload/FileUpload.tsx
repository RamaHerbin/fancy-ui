import { forwardRef, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, DragEvent, MouseEvent, RefCallback } from "react";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useFancyId } from "../../internals/use-id.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS, JS_EASINGS } from "../../internals/motion/tokens.js";
import { runTransition, type TransitionRun } from "../../internals/motion/animate.js";
import { useSoundCue } from "../../sound/use-sound.js";
import type { SoundCue } from "../../sound/types.js";
import "./file-upload.css";

/** One file FileUpload is tracking — selected, uploading, or settled. */
export interface UploadFile {
	/** Stable id for this row. Used as the row key — never the array index, since rows are removed from the middle. */
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
	/**
	 * Selected files. Controlled when supplied: pair it with `onFilesChange`,
	 * the React counterpart of the Svelte source's `bind:files`.
	 */
	files?: UploadFile[];
	/** Initial files when uncontrolled (no `files` prop given). */
	defaultFiles?: UploadFile[];
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
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

// A split enter/exit pair rather than one bidirectional transition, which is
// the house rule everywhere else. The list is keyed, and an id this component
// mints is never reused (`createRowId` only counts up), so the reversal
// smoothing a bidirectional transition buys is smoothing nothing. A controlled
// consumer that supplies its own ids CAN bring one back mid-exit; the
// reconciler revives that row in place rather than reversing a leg for it.
// Splitting also lets the exit be its own, quieter gesture
// rather than the entrance played backwards: a row arrives by rising into
// place and leaves by simply fading, so nothing appears to travel back out of
// the list.
const rowEnter = preset("fade-up");
const rowLeave = preset("fade");

/** One list row as actually rendered — the live entry, or a removed entry kept
 *  mounted (and inert) while its exit transition plays out. */
interface RenderedRow {
	entry: UploadFile;
	exiting: boolean;
}

function sameRendered(a: RenderedRow[], b: RenderedRow[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) {
		if (a[i]!.entry !== b[i]!.entry || a[i]!.exiting !== b[i]!.exiting) return false;
	}
	return true;
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

/**
 * A drop zone wrapped around a real, focusable `<input type="file">`, with a
 * validated file list underneath — accept/maxSize/maxFiles enforced identically
 * for the picker and the drop path, rejections announced through a live region,
 * and rows that enter and leave through the shared motion presets.
 *
 * The element reference arrives through the ref channel (the Svelte source
 * declares `ref = $bindable(null)`), pointing at the native file input.
 */
export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
	(
		{
			files: filesProp,
			defaultFiles = [],
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
			className,
			sound = false,
		},
		ref
	) => {
		// The Svelte side's `files = $bindable([])` becomes the standard
		// controlled/uncontrolled split: uncontrolled by default, controlled
		// the moment a `files` prop is passed.
		const isControlled = filesProp !== undefined;
		const [uncontrolledFiles, setUncontrolledFiles] = useState<UploadFile[]>(defaultFiles);
		const files = isControlled ? filesProp : uncontrolledFiles;

		// Undefined outside a FormField — every fallback below then uses this
		// component's own prop instead, so the control works standalone
		// exactly as it does wrapped. Context always wins when present, via `??`.
		const field = useField();

		// The file input is a labelable element, so — unlike a control whose root
		// isn't (a role="radiogroup" wrapper needs labelId instead) — a plain
		// controlId + <label for> pairing is enough. Generated with useFancyId(),
		// not uid(), because that one throws outside the browser and this
		// control's own "browse" label needs a stable target id even during SSR,
		// FormField or not.
		const generatedId = useFancyId();
		const effectiveId = field?.controlId ?? id ?? generatedId;
		const effectiveDisabled = field?.disabled ?? disabled;
		const effectiveRequired = field?.required ?? required;
		const effectiveInvalid = field?.invalid ?? invalid;

		const playCue = useSoundCue(sound);

		const hintId = `${effectiveId}-hint`;
		const describedBy =
			[field?.describedBy, hint ? hintId : undefined].filter(Boolean).join(" ") || undefined;

		// Counts enter/leave pairs instead of toggling a boolean on either one.
		// dragenter/dragleave bubble from every child the pointer crosses — the
		// icon, the prompt text, the hint — so a naive "enter -> true, leave ->
		// false" flickers false the instant the pointer passes over any of them.
		// The zone reads as dragging exactly while this count is above zero,
		// which stays true across a leave that is immediately followed by the
		// matching child's enter.
		const [dragDepth, setDragDepth] = useState(0);
		const dragging = dragDepth > 0;

		const inputRef = useRef<HTMLInputElement | null>(null);
		const composedInputRef = useComposedRefs(ref, inputRef);
		const listRef = useRef<HTMLUListElement | null>(null);

		// Rejections are announced here rather than left to the per-row error
		// text alone — that text sits in the DOM but nothing moves focus to it,
		// so a screen reader only reaches it if this also speaks.
		const [liveMessage, setLiveMessage] = useState("");

		// A live region only speaks when its text actually CHANGES. Rejecting
		// the very same file twice produces byte-identical text, so writing it
		// straight back would leave the text node untouched and the second
		// rejection silent. Clearing first and writing the message one commit
		// later forces the mutation an assistive technology listens for.
		function announce(message: string) {
			setLiveMessage("");
			queueMicrotask(() => setLiveMessage(message));
		}

		const nextRowIdRef = useRef(0);
		// Minted inside event handlers only — never in a render path — so the
		// counter can be a plain ref without breaking hydration.
		function createRowId(): string {
			nextRowIdRef.current += 1;
			return `${generatedId}-file-${nextRowIdRef.current}`;
		}

		// ------------------------------------------------------------------
		// Exit-aware rendering. The Svelte source hands a removed row's exit to
		// the framework's outro scheduler (`out:` + `|global` so even the LAST
		// row keeps the <ul> mounted until it finishes). React removes what
		// stops rendering in the same commit, so the clock is owned here: the
		// rendered list is `files` plus every removed row still playing its
		// exit, each kept at its old position, marked `inert` for the whole of
		// it, and dropped only when the transition lands.
		// ------------------------------------------------------------------
		const [rendered, setRendered] = useState<RenderedRow[]>(() =>
			files.map((entry) => ({ entry, exiting: false }))
		);
		const renderedRef = useRef(rendered);
		const rowElsRef = useRef(new Map<string, HTMLLIElement>());
		const rowRefCallbacksRef = useRef(new Map<string, RefCallback<HTMLLIElement>>());
		const runsRef = useRef(new Map<string, TransitionRun>());
		const exitStartedRef = useRef(new Set<string>());
		const enterIdsRef = useRef(new Set<string>());

		function rowRefFor(rowId: string): RefCallback<HTMLLIElement> {
			let callback = rowRefCallbacksRef.current.get(rowId);
			if (!callback) {
				callback = (node) => {
					if (node) {
						rowElsRef.current.set(rowId, node);
					} else {
						rowElsRef.current.delete(rowId);
						// Evicted by identity: a detach runs on the OLD
						// callback, and by then the cache may already hold its
						// replacement. Deleting unconditionally would throw
						// that replacement away and mint a new callback on
						// every render for the rest of the component's life,
						// making React detach and re-attach every row's ref
						// each time — the exact churn this cache exists to
						// prevent.
						if (rowRefCallbacksRef.current.get(rowId) === callback) {
							rowRefCallbacksRef.current.delete(rowId);
						}
					}
				};
				rowRefCallbacksRef.current.set(rowId, callback);
			}
			return callback;
		}

		// `cue` is played between the commit and the consumer callback, the
		// same slot the Svelte source plays it in.
		function commitFiles(next: UploadFile[], cue?: SoundCue) {
			if (!isControlled) setUncontrolledFiles(next);
			if (cue) playCue(cue);
			onFilesChange?.(next);
		}

		// Reconcile the rendered list against `files`: a row that vanished from
		// `files` stays, flagged as exiting; a row that appeared is inserted in
		// order and — only when the list already existed — queued for an
		// entrance. That guard mirrors the Svelte side's LOCAL `in:`: a row
		// present on first render, or created because the whole list block just
		// appeared, paints at rest with no intro.
		useIsomorphicLayoutEffect(() => {
			const prev = renderedRef.current;
			const listExisted = prev.some((row) => !row.exiting);
			const fileIds = new Set(files.map((entry) => entry.id));
			const next: RenderedRow[] = [];
			let fileIndex = 0;
			// Ids whose row was mid-exit when the same id came back.
			const revived: string[] = [];

			const pushFresh = (entry: UploadFile) => {
				next.push({ entry, exiting: false });
				if (listExisted) enterIdsRef.current.add(entry.id);
			};

			for (const row of prev) {
				if (fileIds.has(row.entry.id)) {
					while (fileIndex < files.length && files[fileIndex]!.id !== row.entry.id) {
						pushFresh(files[fileIndex]!);
						fileIndex += 1;
					}
					// A row still playing its exit whose id is back in `files`
					// is revived IN PLACE, never re-added alongside itself: two
					// rows under one key would share a single ref callback, and
					// the id filter in `finishExit` would take both away when
					// the exit landed — losing the entry the consumer had just
					// put back. The keyed block on the Svelte side resumes the
					// leaving element for a returning key for the same reason.
					if (row.exiting) revived.push(row.entry.id);
					// The `fileIds.has` guard above guarantees this index lands on
					// the matching entry.
					next.push({ entry: files[fileIndex]!, exiting: false });
					fileIndex += 1;
				} else {
					next.push({ entry: row.entry, exiting: true });
				}
			}
			while (fileIndex < files.length) {
				pushFresh(files[fileIndex]!);
				fileIndex += 1;
			}

			for (const rowId of revived) {
				runsRef.current.get(rowId)?.abort();
				runsRef.current.delete(rowId);
				exitStartedRef.current.delete(rowId);
				rowElsRef.current.get(rowId)?.removeAttribute("inert");
			}

			if (!sameRendered(prev, next)) {
				renderedRef.current = next;
				setRendered(next);
			}
		}, [files]);

		// Start the legs the reconciliation above queued up. Layout phase, so a
		// reduced-motion exit (duration 0 → synchronous finish, `animate()`
		// never called) settles before paint, exactly like the source's fast
		// path — a visitor who asked for less motion gets a synchronous removal.
		useIsomorphicLayoutEffect(() => {
			const finishExit = (rowId: string) => {
				runsRef.current.delete(rowId);
				exitStartedRef.current.delete(rowId);
				renderedRef.current = renderedRef.current.filter((row) => row.entry.id !== rowId);
				setRendered(renderedRef.current);
			};

			for (const row of renderedRef.current) {
				const rowId = row.entry.id;
				if (!row.exiting || exitStartedRef.current.has(rowId)) continue;
				exitStartedRef.current.add(rowId);
				const element = rowElsRef.current.get(rowId);
				if (!element) {
					finishExit(rowId);
					continue;
				}
				// Set synchronously, immediately before the exit starts — the
				// same instant the Svelte outro marks a leaving element inert.
				// A closing row is not something a pointer or a screen reader
				// should be able to reach.
				element.toggleAttribute("inert", true);
				const spec = rowLeave(
					element,
					{
						duration: prefersReducedMotion() ? 0 : DURATIONS.exit,
						easing: JS_EASINGS.in,
					},
					{ direction: "out" }
				);
				const run = runTransition(element, spec, 0, runsRef.current.get(rowId), () =>
					finishExit(rowId)
				);
				// Registered only while the leg is still live. On the
				// reduced-motion path `runTransition` finishes SYNCHRONOUSLY,
				// so `finishExit` has already dropped this row from the map by
				// the time we get here — writing the spent handle back would
				// leave a dead entry behind for good, and hand it to the next
				// exit of the same id as a counterpart whose `t()` collapses
				// that exit to no keyframes at all. `finishExit` clears the
				// same flag, so this reads as "did the leg outlive the call".
				if (exitStartedRef.current.has(rowId)) runsRef.current.set(rowId, run);
			}

			if (enterIdsRef.current.size > 0) {
				const pending = Array.from(enterIdsRef.current);
				enterIdsRef.current.clear();
				for (const rowId of pending) {
					const element = rowElsRef.current.get(rowId);
					if (!element) continue;
					const spec = rowEnter(
						element,
						{
							duration: prefersReducedMotion() ? 0 : DURATIONS.fast,
							distance: 8,
							easing: JS_EASINGS.out,
						},
						{ direction: "in" }
					);
					// `let`, not `const`: on the reduced-motion path the finish
					// callback fires synchronously from inside runTransition,
					// before the binding is assigned — `run?.` covers that, and
					// there is nothing to abort there anyway.
					let run: TransitionRun | undefined;
					let settled = false;
					run = runTransition(element, spec, 1, undefined, () => {
						settled = true;
						runsRef.current.delete(rowId);
						// On ENTER finish, abort the run: that removes the
						// `fill: forwards` so the row falls back to its resting
						// style — which *is* the visible end state by
						// construction. The exit path above deliberately does
						// NOT abort: its node stays in the DOM until React
						// processes the removal one render later, and dropping
						// fill-forwards would flash the row back for a frame.
						run?.abort();
					});
					// Same live-leg guard as the exit above: a duration-0
					// entrance has already finished and deleted itself, so
					// registering it again would strand a dead handle.
					if (!settled) runsRef.current.set(rowId, run);
				}
			}
		}, [rendered]);

		// Unmount: abort every in-flight leg so nothing fires into a dead tree.
		useIsomorphicLayoutEffect(() => {
			const runs = runsRef.current;
			return () => {
				for (const run of runs.values()) run.abort();
				runs.clear();
			};
		}, []);

		// The single place new files enter the list, from either the native
		// picker or a drop — both funnel through here so maxSize/maxFiles/accept
		// are enforced identically regardless of path.
		function addFiles(incoming: File[]) {
			if (effectiveDisabled || incoming.length === 0) return;

			const selected = multiple ? incoming : incoming.slice(0, 1);
			// A single-file picker replaces its previous selection rather than
			// stacking, matching how a native non-multiple input behaves.
			const next = multiple ? [...files] : [];
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

			// Mirrors the liveMessage precedence right below: a rejection
			// anywhere in this batch wins the cue over an acceptance, and a
			// batch that added nothing plays nothing at all. Never `success` —
			// this component only tracks a selection/drop, it does not perform
			// the upload itself.
			const cue: SoundCue | undefined =
				problems.length > 0 ? "error" : addedCount > 0 ? "select" : undefined;
			commitFiles(next, cue);

			if (problems.length > 0) {
				announce(problems.join(" "));
			} else if (addedCount > 0) {
				announce(`${addedCount} file${addedCount === 1 ? "" : "s"} added.`);
			}
		}

		function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
			if (effectiveDisabled) return;
			addFiles(Array.from(event.currentTarget.files ?? []));
		}

		/**
		 * The reset that keeps the SAME file re-selectable happens HERE, on the
		 * click that opens the picker, not after the change it produces.
		 *
		 * Clearing on change is the usual spelling of this trick, and it is what
		 * the Svelte source does — but this control documents `name` and
		 * `required` on a real `<input type="file">`, and an input cleared the
		 * instant it changes carries no `FileList` into a native form submission:
		 * the field posts nothing and `required` fails validation against a list
		 * the reader can plainly see. Clearing at picker-open time leaves the
		 * browser comparing the new pick against an empty value, so re-picking
		 * the same file still counts as a change, and the pick then survives
		 * until the next picker opens.
		 *
		 * Divergence from the Svelte source (which clears on change), with one
		 * residual gap of its own: opening the picker and CANCELLING leaves the
		 * input empty, so the native submission loses a pick the row list still
		 * shows. Restoring it would need a `DataTransfer` round-trip. Drag-drop
		 * has never fed the native input at all, on either side.
		 *
		 * The other end of that policy lives in `removeFile`, which clears the
		 * input again the moment a removal takes one of its files out of the
		 * list — the two together are what keep `required` from validating
		 * against a file the reader can see is gone.
		 */
		function handleInputClick(event: MouseEvent<HTMLInputElement>) {
			event.currentTarget.value = "";
		}

		function handleDragEnter(event: DragEvent<HTMLDivElement>) {
			event.preventDefault();
			if (effectiveDisabled) return;
			setDragDepth((depth) => depth + 1);
		}

		function handleDragOver(event: DragEvent<HTMLDivElement>) {
			// Required on every dragover, disabled or not: without it the browser
			// never fires `drop` at all, and a disabled zone still needs `drop` to
			// fire so it can swallow the file instead of letting the browser
			// navigate to it.
			event.preventDefault();
		}

		function handleDragLeave(event: DragEvent<HTMLDivElement>) {
			event.preventDefault();
			if (effectiveDisabled) return;
			setDragDepth((depth) => Math.max(0, depth - 1));
		}

		function handleDrop(event: DragEvent<HTMLDivElement>) {
			event.preventDefault();
			setDragDepth(0);
			if (effectiveDisabled) return;
			const dropped = Array.from(event.dataTransfer?.files ?? []);
			addFiles(dropped);
		}

		function removeFile(fileId: string) {
			if (effectiveDisabled) return;
			const index = files.findIndex((entry) => entry.id === fileId);
			if (index === -1) return;

			const next = files.filter((entry) => entry.id !== fileId);
			commitFiles(next);

			// The input keeps its picked FileList (see `handleInputClick`), and
			// that list is what a native submit posts and what `required`
			// validates against — so a removal that takes a picked file out of
			// the list has to take it off the input too. Without this, removing
			// the file just picked leaves `required` satisfied by a file the
			// reader can plainly see is gone, and a submit posts it.
			const input = inputRef.current;
			if (input && input.files && input.files.length > 0) {
				const remaining = new Set(next.map((entry) => entry.file));
				const stale = Array.from(input.files).some((file) => !remaining.has(file));
				if (stale) input.value = "";
			}

			// The removed row's own button can't keep focus. Move it to the row
			// that slid into its place, the row before it if this was the last
			// one, or back to the picker once the list is empty, rather than
			// letting it fall back to <body>.
			//
			// The target is resolved from `next` by id, not by counting buttons
			// in the DOM, because the removed row has NOT left the DOM yet: its
			// exit transition is about to play, inert for the whole of it. A
			// DOM-order lookup would hand focus to the very button that is on
			// its way out — which browsers refuse to focus inside an inert
			// subtree, dropping focus on <body> exactly where this code exists
			// to stop it landing. Reading `next` gives the same answer whether
			// the exit runs its course or reduced motion collapses it to
			// nothing — and the surviving button is already in the DOM, so the
			// lookup can run right here rather than after a tick.
			const target = next[Math.min(index, next.length - 1)];
			const button = target
				? Array.from(listRef.current?.querySelectorAll<HTMLLIElement>("[data-file-row]") ?? [])
						.find((row) => row.dataset.fileRow === target.id)
						?.querySelector<HTMLButtonElement>("[data-file-remove]")
				: undefined;
			if (button) {
				button.focus();
			} else {
				inputRef.current?.focus();
			}
		}

		const classes = cn("ft-file-upload flex flex-col gap-3", className);

		const dropzoneClasses = cn(
			"ft-file-upload-dropzone flex flex-col items-center gap-1 rounded-[10px] border-[1.5px] border-dashed p-[18px] text-center transition-colors",
			effectiveInvalid ? "border-destructive/60" : "ft-file-upload-accent-border",
			dragging && "ft-file-upload-dragging",
			effectiveDisabled && "cursor-not-allowed opacity-50"
		);

		return (
			<div className={classes}>
				<div
					className={dropzoneClasses}
					role="presentation"
					data-dragging={dragging ? "true" : undefined}
					onDragEnter={handleDragEnter}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					<input
						ref={composedInputRef}
						type="file"
						id={effectiveId}
						name={name}
						accept={accept}
						multiple={multiple}
						disabled={effectiveDisabled}
						required={effectiveRequired}
						aria-invalid={effectiveInvalid ? "true" : undefined}
						aria-describedby={describedBy}
						aria-label={label}
						className="ft-file-upload-input sr-only"
						onClick={handleInputClick}
						onChange={handleInputChange}
					/>
					{/*
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
					*/}
					<label
						htmlFor={effectiveId}
						className="ft-file-upload-prompt flex flex-col items-center gap-1"
					>
						<span aria-hidden="true" className="ft-file-upload-icon">
							⇪
						</span>
						<span className="text-[12px] font-medium">
							Drag and drop or <span className="ft-file-upload-browse">browse</span>
						</span>
					</label>
					{hint && (
						<p id={hintId} className="text-muted-foreground text-[11px]">
							{hint}
						</p>
					)}
				</div>

				{rendered.length > 0 && (
					<ul ref={listRef} className="ft-file-upload-list flex flex-col gap-2">
						{rendered.map(({ entry }) => (
							<li
								key={entry.id}
								ref={rowRefFor(entry.id)}
								data-file-row={entry.id}
								className="border-border flex items-center gap-[10px] rounded-[8px] border px-[10px] py-[8px] text-[12px]"
							>
								<span aria-hidden="true">📄</span>
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<span className="truncate">{entry.file.name}</span>
									{entry.status === "uploading" ? (
										<div
											role="progressbar"
											aria-valuemin={0}
											aria-valuemax={100}
											aria-valuenow={entry.progress ?? undefined}
											aria-label={`Uploading ${entry.file.name}`}
											className="ft-file-upload-progress-track"
										>
											<div
												className={cn(
													"ft-file-upload-progress-fill",
													entry.progress === null && "ft-file-upload-progress-indeterminate"
												)}
												style={
													{
														["--ft-fileupload-progress" as string]:
															entry.progress !== null ? entry.progress / 100 : undefined,
													} as CSSProperties
												}
											></div>
										</div>
									) : entry.status === "error" && entry.error ? (
										<p className="text-destructive">{entry.error}</p>
									) : entry.status === "done" ? (
										<span className="ft-file-upload-done flex items-center gap-1">
											<span aria-hidden="true">✓</span> Done
										</span>
									) : null}
								</div>
								{entry.status === "uploading" && entry.progress !== null && (
									<span aria-hidden="true" className="text-muted-foreground">
										{entry.progress}%
									</span>
								)}
								<button
									type="button"
									data-file-remove
									disabled={effectiveDisabled}
									aria-label={`Remove ${entry.file.name}`}
									className="ft-file-upload-remove text-muted-foreground shrink-0"
									onClick={() => removeFile(entry.id)}
								>
									✕
								</button>
							</li>
						))}
					</ul>
				)}

				<div aria-live="polite" className="sr-only">
					{liveMessage}
				</div>
			</div>
		);
	}
);

FileUpload.displayName = "FileUpload";
