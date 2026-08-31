import { forwardRef, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { formatElapsed } from "../../internals/use-elapsed.js";
import type { ToolCallData } from "../../internals/ai-types.js";
import "./tool-call.css";

/**
 * Props for ToolCall
 */
export interface ToolCallProps {
	/** The invocation to render: name, status, and whatever payloads exist so far. */
	call: ToolCallData;
	/**
	 * Whether the payloads are expanded. Controlled when supplied — pair it with
	 * `onToggle`, the React counterpart of the Svelte source's `bind:open`. Left
	 * out until either the reader or a failure decides — see the open-behaviour
	 * contract in the README.
	 */
	open?: boolean;
	/** Replaces the default request rendering. Receives `call.input`. */
	input?: (value: unknown) => ReactNode;
	/** Replaces the default result rendering. Receives `call.output`. */
	output?: (value: unknown) => ReactNode;
	/** Leading icon, replacing the default wrench. */
	icon?: ReactNode;
	/** Called whenever the card opens or closes, by click or on its own. */
	onToggle?: (open: boolean) => void;
	/** Additional CSS classes */
	className?: string;
}

/** Spoken alongside the tool name, since the dot's colour says nothing out loud. */
const STATUS_LABELS = {
	pending: "Pending",
	running: "Running",
	done: "Completed",
	error: "Failed",
	cancelled: "Cancelled",
} as const;

/** Shown when a call reports failure without saying why. */
const FALLBACK_ERROR = "The tool call failed.";

/**
 * The shared formatter floors to the second, which reads as "0s" for anything
 * quicker than that — and a tool call more often than not is. Sub-second work
 * is reported in milliseconds here; everything else defers to the shared
 * formatter, whose contract other callers depend on.
 */
function formatDuration(ms: number): string {
	if (Number.isFinite(ms) && ms >= 0 && ms < 1000) return `${Math.round(ms)}ms`;
	return formatElapsed(ms);
}

/**
 * Objects and arrays get pretty-printed JSON; primitives are rendered bare so
 * a string result reads as prose rather than as a quoted literal.
 *
 * The two things `JSON.stringify` refuses outright — a cycle and a bigint —
 * are what tool payloads are actually made of, and `String()` turns both into
 * `[object Object]`, which tells the reader nothing. So a refusal earns a
 * second attempt through a replacer that names them instead; `String` is left
 * for the payload that defeats even that, such as a `toJSON` that throws.
 */
function formatPayload(value: unknown): string {
	if (value === undefined) return "";
	if (value === null || typeof value !== "object") return String(value);
	try {
		return JSON.stringify(value, null, 2) ?? String(value);
	} catch {
		try {
			// Tracking every object ever seen would call the second of two
			// siblings pointing at one value a cycle, which it is not. Only the
			// chain currently being descended counts. `this` is whatever object
			// owns the key being visited, so popping back to it before the check
			// unwinds the stack on the way out of a branch.
			const ancestors: unknown[] = [];
			const json = JSON.stringify(
				value,
				function (this: unknown, _key, entry: unknown) {
					if (typeof entry === "bigint") return `${entry}n`;
					if (entry !== null && typeof entry === "object") {
						while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
							ancestors.pop();
						}
						if (ancestors.includes(entry)) return "[Circular]";
						ancestors.push(entry);
					}
					return entry;
				},
				2
			);
			return json ?? String(value);
		} catch {
			return String(value);
		}
	}
}

/**
 * One tool invocation as a collapsible card: name, status dot, duration in the
 * header; request and result payloads behind a click.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const ToolCall = forwardRef<HTMLDivElement, ToolCallProps>(function ToolCall(
	{ call, open, input, output, icon, onToggle, className },
	ref
) {
	const uid = useFancyId();
	const headerId = `${uid}-header`;
	const bodyId = `${uid}-body`;
	const requestId = `${uid}-request`;
	const resultId = `${uid}-result`;

	// `open` stays undefined until something actually decides: `autoOpen` carries
	// the answer in the meantime, so a consumer that never touches the prop still
	// gets the automatic behaviour and one that controls it still owns the value.
	// Seeded from the initial status as well, because the effect that opens a
	// failed call never runs on the server: a call that already reports failure
	// would otherwise be rendered folded and only spring open at hydration.
	const [autoOpen, setAutoOpen] = useState(() => call.status === "error");
	const userToggledRef = useRef(false);

	const isOpen = open ?? autoOpen;
	const status = call.status;
	const isError = status === "error";
	const errorText = isError ? (call.error ?? FALLBACK_ERROR) : "";
	const duration = call.durationMs === undefined ? "" : formatDuration(call.durationMs);

	// A render prop counts as content on its own: a caller who renders the
	// payload themselves may well have nothing on `call` for us to look at.
	const hasRequest = input !== undefined || call.input !== undefined;
	const hasOutput = output !== undefined || call.output !== undefined;
	const hasResult = hasOutput || errorText !== "";

	const requestText = hasRequest ? formatPayload(call.input) : "";
	const resultText = hasOutput ? formatPayload(call.output) : "";

	function commit(next: boolean) {
		if ((open ?? autoOpen) === next) return;
		setAutoOpen(next);
		onToggle?.(next);
	}

	function toggle() {
		// From here on the reader owns the card: a later failure will not pop it
		// open again behind their back.
		userToggledRef.current = true;
		commit(!isOpen);
	}

	// A failure is the one thing worth reading without being asked, so it expands
	// itself — unless the reader has already taken over. Everything but the
	// status is read through refs so that taking over, or the card opening some
	// other way, does not itself re-run this.
	const isOpenRef = useRef(isOpen);
	isOpenRef.current = isOpen;
	const onToggleRef = useRef(onToggle);
	onToggleRef.current = onToggle;

	useEffect(() => {
		if (call.status !== "error" || userToggledRef.current) return;
		if (isOpenRef.current) return;
		setAutoOpen(true);
		onToggleRef.current?.(true);
	}, [call.status]);

	return (
		<div
			ref={ref}
			className={cn("ft-toolcall border-border bg-card/50 w-full rounded-lg border text-sm", className)}
			data-status={status}
		>
			<button
				type="button"
				id={headerId}
				className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
				aria-expanded={isOpen}
				aria-controls={bodyId}
				onClick={toggle}
			>
				<span className="ft-toolcall-icon flex-none" aria-hidden="true">
					{icon ?? (
						<svg
							className="size-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
						</svg>
					)}
				</span>

				{/*
					Filled versus hollow, not just hue: the four states stay apart for anyone
					who cannot tell the colours apart, and the label below says it in words.
				*/}
				<span
					className={cn(
						"ft-toolcall-dot flex-none",
						status === "pending" && "ft-status-pending",
						status === "running" && "ft-status-running",
						status === "done" && "ft-status-done",
						isError && "ft-status-error",
						status === "cancelled" && "ft-status-cancelled"
					)}
					aria-hidden="true"
				></span>

				<span
					className={cn(
						"ft-toolcall-name text-foreground min-w-0 truncate font-mono text-xs",
						status === "cancelled" && "ft-struck"
					)}
				>
					{call.name}
				</span>
				<span className="sr-only">{STATUS_LABELS[status]}</span>

				<span className="ml-auto flex flex-none items-center gap-2">
					{duration ? <span className="text-xs tabular-nums">{duration}</span> : null}
					<svg
						className={cn("ft-toolcall-chevron size-3.5", isOpen && "ft-open")}
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
				</span>
			</button>

			<div className={cn("ft-toolcall-body", isOpen && "ft-open")}>
				<div className="overflow-hidden">
					<div
						id={bodyId}
						role="group"
						aria-labelledby={headerId}
						inert={!isOpen}
						className="flex flex-col gap-3 px-3 pb-3"
					>
						{hasRequest ? (
							<section aria-labelledby={requestId}>
								<div id={requestId} className="text-muted-foreground mb-1 text-xs font-medium">
									Request
								</div>
								{input ? input(call.input) : <pre className="ft-toolcall-payload">{requestText}</pre>}
							</section>
						) : null}

						{hasResult ? (
							<section aria-labelledby={resultId}>
								<div id={resultId} className="text-muted-foreground mb-1 text-xs font-medium">
									Result
								</div>
								{errorText ? <p className="ft-toolcall-error-text">{errorText}</p> : null}
								{output ? (
									output(call.output)
								) : hasOutput ? (
									<pre className={cn("ft-toolcall-payload", errorText && "mt-2")}>{resultText}</pre>
								) : null}
							</section>
						) : null}

						{!hasRequest && !hasResult ? (
							<p className="text-muted-foreground text-xs italic">Nothing recorded yet.</p>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
});
