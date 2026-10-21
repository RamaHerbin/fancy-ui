/**
 * Vocabulary shared by the preview-health sweep (preview-health.spec.ts) and
 * its reporter (preview-health.reporter.ts). Kept apart so the reporter does
 * not import the spec, which declares tests.
 */

/**
 * Failure classes. Every failure the sweep reports carries exactly one.
 *
 *   RESOLVE         the stage shows a resolution error ("No preview available",
 *                   "Component not found", "No module found", "Failed to load")
 *                   or never received a single element
 *   STUCK           the hero spinner is still there after its 8 s budget and
 *                   a 15 s grace (clearing inside the grace is only noted as
 *                   slow), or the page itself never loaded
 *   COLLAPSE        the stage has children but no descendant is at least 8×8 px
 *                   (a root sized from a parent that has no height or width)
 *   UNSIZED_CANVAS  a visible canvas has a 0 px bitmap, a 0 px box inside a
 *                   visible parent, or holds a context but is stuck at the
 *                   300×150 default while its box is bigger (the resize step
 *                   never ran)
 *   INVISIBLE       fewer than 0.4 % of the demo's pixels (or of a canvas's)
 *                   differ from the background behind them (white on white,
 *                   black on black, an empty canvas)
 *   CRASH           an uncaught exception on the page
 *   CONSOLE         a console error outside the project's allowlist
 *   GPU_ONLY        in the no-gpu project only: any of the above on a stage
 *                   whose canvas asked for a WebGL/WebGPU context, or a crash
 *                   that names one; points at a missing GPU fallback, not at
 *                   the docs wiring
 */
export const FAILURE_CLASSES = [
	"RESOLVE",
	"STUCK",
	"COLLAPSE",
	"UNSIZED_CANVAS",
	"INVISIBLE",
	"CRASH",
	"CONSOLE",
	"GPU_ONLY",
] as const;

export type FailureClass = (typeof FAILURE_CLASSES)[number];

export interface PreviewFailure {
	class: FailureClass;
	/** Index of the [data-thumb-stage] (0 = hero, 1+ = examples); null for page-level failures. */
	stage: number | null;
	detail: string;
	/** Repo-relative path of the stage screenshot, when one was taken. */
	screenshot?: string;
}

/** Name of the JSON attachment each test hands to the reporter. */
export const FAILURES_ATTACHMENT = "preview-health-failures";

/** Where the reporter writes the merged result. */
export const REPORT_PATH = "test-results/preview-health.json";
