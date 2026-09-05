import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import "./terminal-text.css";

export interface TerminalTextProps {
	lines: string[];
	speed?: number;
	delay?: number;
	cursor?: boolean;
	cursorChar?: string;
	glitch?: boolean;
	className?: string;
	onComplete?: () => void;
}

const GLITCH_GLYPHS = "アイウエオ@#$%&!?░▒▓█▄▀■□▪▫";

export function TerminalText({
	lines,
	speed = 40,
	delay = 0,
	cursor = true,
	cursorChar = "█",
	glitch = false,
	className,
	onComplete,
}: TerminalTextProps) {
	const [displayedLines, setDisplayedLines] = useState<string[]>([]);
	const [done, setDone] = useState(false);

	// Latest-value refs so timeout callbacks read current values, matching the
	// Svelte closures over reactive props/state.
	const displayedLinesRef = useRef(displayedLines);
	displayedLinesRef.current = displayedLines;
	const glitchRef = useRef(glitch);
	glitchRef.current = glitch;
	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;

	// The stream reads the CURRENT list when it schedules, the way the source's
	// `streamLines()` closure reads the reactive `lines` prop.
	const linesRef = useLiveRef(lines);

	// The stream is keyed on the CONTENT, never on the `lines` array itself. The
	// array is an identity that a call site like `lines={["a", "b"]}` re-allocates
	// on every parent render; keying the effect on it would clear the pending
	// timeouts, wipe the typed-out text and restart the whole animation each time
	// the parent re-renders. The source restarts only when a tracked value really
	// changes, and an inline literal in a Svelte template is not one.
	// Serialised rather than joined, so `["ab"]` and `["a", "b"]` — which stream
	// differently — never collide on the same key.
	//
	// Keyed on `lines` REFERENCE identity via useMemo, not recomputed on every
	// call: the component body re-runs once per streamed character (each is
	// its own state update), and JSON.stringify over a long transcript on
	// every one of those internal renders is O(n²) in the stream length. A
	// fresh array from the parent (different identity) still re-serialises —
	// so equal-content-but-new-reference arrays keep comparing by content,
	// same as before — only re-renders that reuse the same array skip it.
	const linesKey = useMemo(() => JSON.stringify(lines), [lines]);

	// Glitch bookkeeping never drives markup, so it lives in a ref, not state.
	const glitchStateRef = useRef<{ lineIdx: number; charIdx: number; original: string } | null>(
		null
	);

	// Timeout pool owned by the stream: the character schedule, the done tick and
	// the 100ms glitch restores. Cleared whenever the stream restarts
	// (lines/speed/delay change) and on unmount. The self-rescheduling glitch
	// chain is NOT in here — see the glitch effect below.
	const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	function scheduleTimeout(fn: () => void, ms: number) {
		const id = setTimeout(fn, ms);
		timeoutsRef.current.push(id);
		return id;
	}

	function clearAllTimeouts() {
		timeoutsRef.current.forEach(clearTimeout);
		timeoutsRef.current = [];
	}

	function glitchOnce() {
		const displayed = displayedLinesRef.current;
		if (displayed.length === 0) return;

		// Pick a random line with content
		const linesWithContent = displayed.map((l, i) => ({ l, i })).filter(({ l }) => l.length > 0);
		if (linesWithContent.length === 0) return;

		const { l, i } = linesWithContent[Math.floor(Math.random() * linesWithContent.length)]!;
		const charIdx = Math.floor(Math.random() * l.length);
		const original = l[charIdx]!;
		const fakeGlyph = GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];

		glitchStateRef.current = { lineIdx: i, charIdx, original };

		// Temporarily replace char in display, restore after 100ms
		setDisplayedLines((prev) =>
			prev.map((line, idx) => {
				if (idx !== i) return line;
				return line.slice(0, charIdx) + fakeGlyph + line.slice(charIdx + 1);
			})
		);

		scheduleTimeout(() => {
			const glitchState = glitchStateRef.current;
			if (glitchState && glitchState.lineIdx === i && glitchState.charIdx === charIdx) {
				setDisplayedLines((prev) =>
					prev.map((line, idx) => {
						if (idx !== i) return line;
						return line.slice(0, charIdx) + original + line.slice(charIdx + 1);
					})
				);
				glitchStateRef.current = null;
			}
		}, 100);
	}

	// The chain owns its own pending id and a cancelled flag, so its teardown
	// stops exactly the chain it started. Keeping it out of the stream's pool
	// means a lines/speed/delay restart no longer kills the loop, and a glitch
	// flip no longer leaves an orphaned chain running alongside the new one.
	function startGlitchLoop(chain: { cancelled: boolean; id: ReturnType<typeof setTimeout> | null }) {
		const scheduleGlitch = () => {
			// Random interval between 2s and 4s
			const interval = 2000 + Math.random() * 2000;
			chain.id = setTimeout(() => {
				if (chain.cancelled) return;
				if (glitchRef.current) glitchOnce();
				scheduleGlitch();
			}, interval);
		};

		scheduleGlitch();
	}

	// React only to lines/speed/delay — changing glitch won't restart the stream
	useEffect(() => {
		clearAllTimeouts();
		setDisplayedLines([]);
		displayedLinesRef.current = [];
		setDone(false);
		glitchStateRef.current = null;

		let totalDelay = delay;

		const streamed = linesRef.current;
		for (let lineIdx = 0; lineIdx < streamed.length; lineIdx++) {
			const line = streamed[lineIdx]!;

			// Push empty line placeholder
			const capturedIdx = lineIdx;
			scheduleTimeout(() => {
				setDisplayedLines((prev) => [...prev, ""]);
			}, totalDelay);

			// Stream characters one by one
			for (let charIdx = 0; charIdx < line.length; charIdx++) {
				const capturedChar = charIdx;
				const capturedLine = line;
				totalDelay += speed;
				scheduleTimeout(() => {
					setDisplayedLines((prev) =>
						prev.map((l, i) => (i === capturedIdx ? capturedLine.slice(0, capturedChar + 1) : l))
					);
				}, totalDelay);
			}

			// Small pause between lines
			totalDelay += speed * 3;
		}

		// Mark done
		scheduleTimeout(() => {
			setDone(true);
			onCompleteRef.current?.();
		}, totalDelay);

		return () => {
			clearAllTimeouts();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [linesKey, speed, delay]);

	// React to glitch changes without restarting the stream
	useEffect(() => {
		if (!glitch) {
			glitchStateRef.current = null;
			return;
		}

		const chain: { cancelled: boolean; id: ReturnType<typeof setTimeout> | null } = {
			cancelled: false,
			id: null,
		};
		startGlitchLoop(chain);

		return () => {
			chain.cancelled = true;
			if (chain.id !== null) clearTimeout(chain.id);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [glitch]);

	return (
		<div className={cn("terminal-text font-mono text-sm leading-relaxed", className)}>
			{displayedLines.map((line, i) => (
				<div key={i} className="min-h-[1.4em]">
					<span>{line}</span>
					{cursor && i === displayedLines.length - 1 && !done ? (
						<span className="cursor-blink">{cursorChar}</span>
					) : null}
				</div>
			))}
			{cursor && done ? (
				<div className="min-h-[1.4em]">
					<span className="cursor-blink">{cursorChar}</span>
				</div>
			) : null}
		</div>
	);
}
