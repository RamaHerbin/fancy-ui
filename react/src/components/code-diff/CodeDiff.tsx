import { forwardRef, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useInertAttribute } from "../../internals/dom/use-inert-attribute.js";
import { useFancyId } from "../../internals/use-id.js";
import { parseUnifiedDiff, type DiffFile, type DiffLine } from "../../internals/diff.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./code-diff.css";

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
	/**
	 * Whether the bodies are folded away. A master switch: it seeds every file,
	 * and flipping it re-folds or re-opens the whole patch. The React
	 * counterpart of the Svelte source's bindable prop — pair it with
	 * `onCollapsedChange` to observe the aggregate the way `bind:collapsed`
	 * would report it.
	 */
	collapsed?: boolean;
	/**
	 * Reports the whole-patch fold state after a header click: true only once
	 * nothing is left open.
	 */
	onCollapsedChange?: (collapsed: boolean) => void;
	/** Lines shown before the rest hide behind a "show more" button. 0 shows all. */
	maxLines?: number;
	/** Whether long lines wrap instead of scrolling sideways. */
	wrap?: boolean;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

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

export const CodeDiff = forwardRef<HTMLDivElement, CodeDiffProps>(function CodeDiff(
	{
		diff,
		filename,
		lineNumbers = true,
		collapsed = false,
		onCollapsedChange,
		maxLines = 0,
		wrap = false,
		className,
		sound = false,
	},
	ref
) {
	const uid = useFancyId();
	const playCue = useSoundCue(sound);

	const files = useMemo(() => parseUnifiedDiff(diff), [diff]);

	// Per-file fold and clamp state, keyed by file name rather than position: a
	// patch that arrives with a different set of files must not hand file 0's
	// folded state to whatever now happens to sit first. `collapsed` is the
	// master switch: it seeds every file and wipes the overrides whenever the
	// consumer flips it, so driving the prop still folds the whole patch while
	// a click still folds one file.
	const [folded, setFolded] = useState<Record<string, boolean>>({});
	const [unclamped, setUnclamped] = useState<Record<string, boolean>>({});

	// The live fold seed — the counterpart of the Svelte source's local
	// `collapsed`, which a header click writes back to. The prop re-seeds it
	// whenever the consumer changes it; a click updates it directly.
	const [collapsedValue, setCollapsedValue] = useState(collapsed);
	const [lastProp, setLastProp] = useState(collapsed);

	// Resynced during render, not from an effect: what the switch decides is
	// visible on the very first painted frame, so the seed and the override
	// wipe have to land in the same commit the flip produced — the Svelte
	// source reads `collapsed` straight out of `isFolded` and defers only the
	// wipe to a pre-paint `$effect`. React restarts the render before
	// committing, so the pass below never reaches the screen.
	if (lastProp !== collapsed) {
		setLastProp(collapsed);
		// Only a flip that actually moves the seed wipes the per-file
		// overrides: a value the consumer merely echoed back from
		// `onCollapsedChange` is the state this component already produced,
		// and folding one file of a two-file patch must not unfold the other.
		if (collapsedValue !== collapsed) {
			setCollapsedValue(collapsed);
			setFolded({});
		}
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

	// Names alone would let a reused path carry state across two unrelated
	// patches, so the whole list is watched: when it changes, both records start
	// empty and every file is back under `collapsed`.
	// A name on its own cannot tell two patches apart when both touch the same
	// path, so a replacement would inherit the fold and clamp state of the patch
	// before it. The first hunk's declared start pins that down, and it is fixed
	// the moment that header parses — a patch still streaming in only ever gains
	// lines and later hunks, so growth in place still reads as the same file.
	//
	// Memoised for the reason the Svelte source keeps this in `$derived`: a
	// parent that re-renders per streamed token would otherwise walk the whole
	// file list again for a patch that did not move.
	const signature = useMemo(
		() =>
			files
				.map((file) => {
					const anchor = file.hunks[0];
					return `${nameOf(file, files.length)}:${anchor?.oldStart ?? ""}:${anchor?.newStart ?? ""}`;
				})
				.join("\n"),
		// `nameOf` is re-created every render but reads nothing beyond `filename`,
		// so the two inputs below are the whole dependency set.
		[files, filename]
	);
	// Seeded with the first render's value on purpose: this is the "what did we
	// render last" marker, and it is the comparison below — not the seeding —
	// that is meant to notice a change.
	const [lastSignature, setLastSignature] = useState(signature);

	// Same render-phase resync as the master switch above, and for the same
	// reason: a replacement patch must not paint one frame with the previous
	// patch's fold and clamp overrides on top of the new content.
	if (lastSignature !== signature) {
		setLastSignature(signature);
		setFolded({});
		setUnclamped({});
	}

	function isFolded(name: string): boolean {
		return folded[name] ?? collapsedValue;
	}

	const views: FileView[] = useMemo(
		() =>
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
			}),
		// Same as above: `filename` stands in for `nameOf`.
		[files, filename, maxLines, unclamped]
	);

	function toggle(name: string) {
		// Captured before the write, so the cue that plays matches the state this
		// click is actually producing — the resyncs above that also wipe `folded`
		// (a collapsed-prop flip, a patch-signature change) never run through this
		// function, so they can never trigger it either.
		const next = !isFolded(name);
		const nextFolded = { ...folded, [name]: next };
		setFolded(nextFolded);
		playCue(next ? "close" : "open");
		// `collapsed` reports the whole patch, so it is true only once nothing is left open.
		const all = views.every((view) => nextFolded[view.name] ?? collapsedValue);
		setCollapsedValue(all);
		onCollapsedChange?.(all);
	}

	return (
		<div
			ref={ref}
			role="group"
			aria-label="Code diff"
			className={cn(
				"fancy-code-diff",
				"border-border bg-card/50 w-full overflow-hidden rounded-lg border font-mono text-xs",
				className
			)}
		>
			{views.map((view, index) => {
				const open = !isFolded(view.name);
				const headerId = `${uid}-${index}-header`;
				const bodyId = `${uid}-${index}-body`;
				return (
					<div key={index} className="border-border border-t first:border-t-0">
						<button
							type="button"
							id={headerId}
							className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
							aria-expanded={open}
							aria-controls={bodyId}
							onClick={() => toggle(view.name)}
						>
							<svg
								className={cn("ft-chevron size-3.5 shrink-0", open && "ft-open")}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<path d="m9 6 6 6-6 6" />
							</svg>
							{view.name ? (
								<span className="text-foreground min-w-0 truncate">{view.name}</span>
							) : null}
							{view.file.isNew ? (
								<span className="ft-badge">new file</span>
							) : view.file.isDeleted ? (
								<span className="ft-badge">deleted</span>
							) : null}
							<span className="ml-auto flex shrink-0 items-center gap-2 tabular-nums">
								{view.file.additions > 0 ? (
									<span className="ft-stat-add">+{view.file.additions}</span>
								) : null}
								{view.file.deletions > 0 ? (
									<span className="ft-stat-del">−{view.file.deletions}</span>
								) : null}
							</span>
						</button>

						<div className={cn("ft-body", open && "ft-open")}>
							<div className="overflow-hidden">
								<DiffBody id={bodyId} labelledBy={headerId} open={open}>
									<div className={cn("ft-scroll", wrap && "ft-wrap")}>
										{view.rows.map((row, rowIndex) =>
											row.kind === "sep" ? (
												<div key={rowIndex} className="ft-sep">
													{row.text}
												</div>
											) : (
												<div
													key={rowIndex}
													className={cn(
														"ft-row",
														row.line.type === "add" && "ft-add",
														row.line.type === "del" && "ft-del",
														row.line.type === "context" && "ft-context",
														row.line.type === "meta" && "ft-meta"
													)}
													data-kind={row.line.type}
												>
													{lineNumbers ? (
														<>
															<span className="ft-num" aria-hidden="true">
																{row.line.oldLine ?? ""}
															</span>
															<span className="ft-num" aria-hidden="true">
																{row.line.newLine ?? ""}
															</span>
														</>
													) : null}
													<span className="ft-glyph" aria-hidden="true">
														{GLYPH[row.line.type]}
													</span>
													{/* The glyph stays out of the reading flow — it is
													    punctuation, and it must not be copied — so the
													    verdict a sighted reader takes from the tint and
													    the +/− is spoken here instead. Unselectable for
													    the same copy hygiene the gutters follow. */}
													{row.line.type === "add" || row.line.type === "del" ? (
														<span className="sr-only select-none">
															{row.line.type === "add" ? "Added line" : "Removed line"}
														</span>
													) : null}
													<span className="ft-code">{row.line.text}</span>
												</div>
											)
										)}
									</div>

									{view.hidden > 0 ? (
										<button
											type="button"
											className="text-muted-foreground hover:text-foreground hover:bg-muted/40 border-border w-full border-t px-3 py-1.5 text-left transition-colors"
											onClick={() => {
												playCue("open");
												setUnclamped((current) => ({ ...current, [view.name]: true }));
											}}
										>
											Show {view.hidden} more {view.hidden === 1 ? "line" : "lines"}
										</button>
									) : null}
								</DiffBody>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
});

/**
 * One file's body region, extracted for the single reason that its inertness is
 * a hook: `inert` cannot be written as a JSX prop across this package's peer
 * range (React 18 drops `inert={true}`, React 19 rejects `inert=""`), so it goes
 * to the node imperatively — and a hook cannot be called inside the `views.map`
 * above. The markup is unchanged.
 */
function DiffBody({
	id,
	labelledBy,
	open,
	children,
}: {
	id: string;
	labelledBy: string;
	open: boolean;
	children: ReactNode;
}) {
	const inertRef = useInertAttribute<HTMLDivElement>(!open);
	return (
		<div ref={inertRef} id={id} role="group" aria-labelledby={labelledBy}>
			{children}
		</div>
	);
}
