import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useAutoscroll } from "../../internals/use-autoscroll.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { parseAnsi, type AnsiSegment } from "./ansi.js";
import "./terminal-block.css";

/**
 * Props for TerminalBlock
 */
export interface TerminalBlockProps extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
	/** Everything the command has printed so far, not the latest chunk. Reassign as lines arrive. */
	output: string;
	/** The command that produced the output, shown on the first line after the prompt glyph. */
	command?: string;
	/** Prompt glyph in front of the command. */
	prompt?: string;
	/** Whether the command is still running. Shows the cursor and keeps the view pinned. */
	running?: boolean;
	/** Exit status. Anything other than null or undefined ends the run and shows the footer. */
	exitCode?: number | null;
	/** How long the run took, shown next to the exit status. */
	durationMs?: number;
	/** Read the SGR subset and colour the output. False renders the same text, unstyled. */
	ansi?: boolean;
	/** Height at which the output starts scrolling. */
	maxHeight?: string;
	/** Title bar above the output — window dots, a file name, a copy button. */
	header?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * The palette a consumer overrides by setting `--ft-terminal-*` anywhere above
 * the block. Each entry is the readable-on-dark version of its colour, which
 * is also why the bright SGR codes fold onto the same eight values.
 */
const FALLBACK: Record<string, string> = {
	"--ft-terminal-black": "oklch(0.44 0.01 260)",
	"--ft-terminal-red": "oklch(0.7 0.18 22)",
	"--ft-terminal-green": "oklch(0.78 0.17 150)",
	"--ft-terminal-yellow": "oklch(0.85 0.15 90)",
	"--ft-terminal-blue": "oklch(0.74 0.13 250)",
	"--ft-terminal-magenta": "oklch(0.74 0.18 330)",
	"--ft-terminal-cyan": "oklch(0.82 0.11 200)",
	"--ft-terminal-white": "oklch(0.95 0.005 260)",
};

/**
 * Parse once over the whole stream, then cut the segments at the newlines:
 * a colour opened on one line and closed three lines later stays in effect
 * for the lines in between, the way a terminal would show it.
 */
function toRows(src: string, styled: boolean): AnsiSegment[][] {
	if (src === "") return [];
	// CRLF becomes one newline; a lone CR is dropped rather than rewinding
	// the line, so a progress bar collapses instead of exploding into rows.
	const normalized = src.replace(/\r\n/g, "\n").replace(/\r/g, "");
	const lines: AnsiSegment[][] = [[]];
	for (const segment of parseAnsi(normalized)) {
		const parts = segment.text.split("\n");
		for (let i = 0; i < parts.length; i++) {
			if (i > 0) lines.push([]);
			const part = parts[i] as string;
			if (part === "") continue;
			(lines[lines.length - 1] as AnsiSegment[]).push({
				text: part,
				bold: styled && segment.bold,
				fg: styled ? segment.fg : null,
			});
		}
	}
	return lines;
}

function colour(fg: string | null): string | undefined {
	if (fg === null) return undefined;
	return `var(${fg}, ${FALLBACK[fg] ?? "inherit"})`;
}

/**
 * Command durations live in the sub-second range often enough that a
 * stopwatch reading of "0s" would be the wrong answer most of the time.
 */
function formatDuration(ms: number | undefined): string | null {
	if (ms === undefined || !Number.isFinite(ms) || ms < 0) return null;
	if (ms < 1000) return `${Math.round(ms)}ms`;
	if (ms < 60_000) {
		// Rounded to a tenth first: a value that rounds up to a full 60.0s has
		// to fall through to the minute form rather than print a second count
		// that does not exist.
		const deciseconds = Math.round(ms / 100);
		if (deciseconds < 600) return `${(deciseconds / 10).toFixed(1)}s`;
	}
	// Rounding to whole seconds before splitting means the carry happens on its
	// own: rounding each unit separately is what produced "1m 60s".
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`;
}

export const TerminalBlock = forwardRef<HTMLDivElement, TerminalBlockProps>(function TerminalBlock(
	{
		output,
		command,
		prompt = "$",
		running = false,
		exitCode = null,
		durationMs,
		ansi = true,
		maxHeight = "20rem",
		header,
		className,
		...rest
	},
	ref
) {
	const finished = exitCode !== null && exitCode !== undefined;
	const ok = exitCode === 0;
	const duration = formatDuration(durationMs);

	const lines = toRows(output, ansi);
	// A stream that has printed nothing yet still needs a line to put the
	// cursor on; a finished one should not end on a blank line just because
	// its last write ended in a newline.
	let rows: AnsiSegment[][];
	if (lines.length === 0) {
		rows = running ? [[]] : [];
	} else {
		const last = lines[lines.length - 1] as AnsiSegment[];
		if (!running && lines.length > 1 && last.length === 0) lines.pop();
		rows = lines;
	}

	const [logNode, logRef] = useElementRef<HTMLDivElement>();
	useAutoscroll(logNode, { enabled: running, pinOnConnect: true });

	return (
		<div ref={ref} className={cn("ft-terminal overflow-hidden rounded-lg font-mono text-sm", className)} {...rest}>
			{header ? <div className="ft-rule flex items-center gap-2 border-b px-4 py-2">{header}</div> : null}

			<div
				ref={logRef}
				role="log"
				className="overflow-y-auto px-4 py-3 leading-relaxed"
				style={{ maxHeight }}
			>
				{command ? (
					<div className="ft-line flex gap-2">
						<span className="ft-prompt shrink-0 select-none" aria-hidden="true">
							{prompt}
						</span>
						<span className="ft-wrap">{command}</span>
					</div>
				) : null}
				{rows.map((segments, row) => (
					// eslint-disable-next-line react/no-array-index-key
					<div key={row} className="ft-line ft-wrap">
						{segments.map((segment, i) => (
							// eslint-disable-next-line react/no-array-index-key
							<span key={i} className={cn(segment.bold && "ft-bold")} style={{ color: colour(segment.fg) }}>
								{segment.text}
							</span>
						))}
						{running && row === rows.length - 1 ? (
							<span className="ft-cursor" aria-hidden="true">
								▊
							</span>
						) : null}
					</div>
				))}
			</div>

			{finished ? (
				<div role="status" className={cn("ft-rule ft-status flex items-center gap-2 border-t px-4 py-2 text-xs", ok && "ft-ok")}>
					<span aria-hidden="true">{ok ? "✓" : "✗"}</span>
					<span>exited {exitCode}</span>
					{duration ? <span className="ft-muted ml-auto tabular-nums">{duration}</span> : null}
				</div>
			) : null}
		</div>
	);
});
