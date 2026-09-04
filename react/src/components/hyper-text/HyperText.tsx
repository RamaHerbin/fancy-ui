import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils.js";
import "./hyper-text.css";

/**
 * HyperText - Character scramble effect
 *
 * Displays text that scrambles through random characters on hover (or on load),
 * then resolves back to the original text. Each character is individually animated
 * with a staggered reveal.
 */
export interface HyperTextProps {
	/** Text to display and scramble */
	text: string;
	/** Total animation duration in ms */
	duration?: number;
	/** Whether to animate on initial load */
	animateOnLoad?: boolean;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Seed for the scramble-character stream. The same seed always produces the
	 * same scramble sequence, which makes the effect reproducible in a test and
	 * identical across mounts. The default is shared, so two `<HyperText />`
	 * with no seed scramble alike.
	 */
	seed?: number;
}

const ALPHABETS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * mulberry32 — a tiny deterministic PRNG, standing in for the source's bare
 * `Math.random()`. Seeding costs nothing visually (the same uniform
 * distribution) and buys a scramble that can be asserted on in a test.
 */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function HyperText({
	text,
	duration = 800,
	animateOnLoad = false,
	className,
	seed = 1,
}: HyperTextProps) {
	const [displayText, setDisplayText] = useState<string[]>(() => text.split(""));
	// Mirror of `displayText`, so a tick builds the next array before handing it to
	// the setter. React may call a state updater twice (StrictMode, in dev); an
	// updater that scrambled in place would draw twice from the seeded stream and
	// map the array twice per tick.
	const displayTextRef = useRef(displayText);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const iterationsRef = useRef(0);

	// The Svelte interval handler reads `text` live; mirror that with a ref so a
	// running animation resolves toward the current prop, not a stale closure.
	const textRef = useRef(text);
	const seedRef = useRef(seed);
	useEffect(() => {
		textRef.current = text;
		seedRef.current = seed;
	});

	/** The single write path: keeps the ref mirror and the state in step. */
	function writeDisplayText(next: string[]) {
		displayTextRef.current = next;
		setDisplayText(next);
	}

	// Sync displayText when text prop changes (the source's `$effect`).
	useEffect(() => {
		writeDisplayText(text.split(""));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [text]);

	function stopAnimation() {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}

	function startAnimation() {
		stopAnimation();
		iterationsRef.current = 0;
		const currentText = textRef.current;
		const intervalMs = duration / (currentText.length * 10);
		const random = mulberry32(seedRef.current);
		const getRandomLetter = () => ALPHABETS.charAt(Math.floor(random() * ALPHABETS.length));

		intervalRef.current = setInterval(() => {
			const target = textRef.current;
			if (iterationsRef.current < target.length) {
				const next = displayTextRef.current.map((l, i) =>
					l === " " ? l : i <= iterationsRef.current ? (target[i] ?? l) : getRandomLetter()
				);
				writeDisplayText(next);
				iterationsRef.current += 0.1;
			} else {
				stopAnimation();
				writeDisplayText(target.split(""));
			}
		}, intervalMs);
	}

	function triggerAnimation() {
		iterationsRef.current = 0;
		startAnimation();
	}

	// onMount: optionally start, always clear the interval on unmount.
	useEffect(() => {
		if (animateOnLoad) {
			triggerAnimation();
		}
		return stopAnimation;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div
			className={cn("hyper-text flex scale-100 cursor-default overflow-hidden py-2", className)}
			onMouseEnter={triggerAnimation}
			role="presentation"
		>
			<div className="flex">
				{displayText.map((letter, i) => (
					<span
						key={i}
						className={cn("hyper-text-char inline-block font-mono", letter === " " ? "w-3" : "")}
						style={{
							animation: "hyperFadeIn 0.3s ease forwards",
							animationDelay: `${i * (duration / (text.length * 10))}ms`,
							opacity: 0,
						}}
					>
						{letter.toUpperCase()}
					</span>
				))}
			</div>
		</div>
	);
}
