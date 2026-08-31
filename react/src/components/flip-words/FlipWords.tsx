import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import "./flip-words.css";

/**
 * FlipWords - Cycling word animation
 *
 * Cycles through an array of words with per-letter fade-in animation.
 * Each word fades in letter-by-letter, stays visible for `duration` ms,
 * then scales/blurs out before the next word appears.
 */
export interface FlipWordsProps {
	/** Array of words to cycle through */
	words: string[];
	/** Time each word stays visible (ms) */
	duration?: number;
	/** Additional CSS classes */
	className?: string;
}

const EXIT_MS = 600;

export function FlipWords({ words, duration = 3000, className }: FlipWordsProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isExiting, setIsExiting] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const currentWord = words[currentIndex] ?? "";
	const splitWords = currentWord.split(" ").map((word) => ({
		word,
		letters: word.split(""),
	}));

	// The pending timeouts read the CURRENT list, the way the source's closures
	// read the reactive `words` prop at fire time.
	const wordsRef = useLiveRef(words);

	// `words.length`, never `words` itself. The array is an identity that a call
	// site like `words={["Hello", "World"]}` re-allocates on every parent render;
	// keying the schedule on it would clear the pending timeout and re-arm a fresh
	// `duration` wait each time, so a parent re-rendering faster than `duration`
	// would stop the words flipping altogether. The source re-schedules only when
	// a tracked value actually changes, and `wordCount` is what its `< 2` guard
	// reads.
	const wordCount = words.length;

	useEffect(() => {
		// Re-schedule whenever a new word becomes active (not during exit).
		if (isExiting) return;
		if (wordCount < 2) return;
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => {
			if (wordsRef.current.length < 2) return;
			setIsExiting(true);
			if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
			exitTimeoutRef.current = setTimeout(() => {
				setIsExiting(false);
				// `words` can shrink to empty while this exit animation is in
				// flight (a parent clearing/reloading the list). Re-check the
				// CURRENT length here rather than trusting the length captured
				// when the timeout was armed: `% 0` is NaN, and once NaN lands
				// in state every future `(index + 1) % length` is NaN too — the
				// component would stay blank forever, even after `words` is
				// repopulated. Deferring to index 0 lets it resume normally.
				const length = wordsRef.current.length;
				setCurrentIndex((index) => (length === 0 ? 0 : (index + 1) % length));
			}, EXIT_MS);
		}, duration);
	}, [currentIndex, duration, isExiting, wordCount, wordsRef]);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
		};
	}, []);

	return (
		<div className="flip-words relative inline-block px-2">
			<div
				key={currentIndex}
				className={cn(
					"relative z-10 inline-block text-left text-neutral-900 dark:text-neutral-100",
					isExiting ? "flip-words-exit" : "flip-words-enter",
					className
				)}
			>
				{splitWords.map((wordObj, wordIndex) => (
					<span
						key={wordObj.word + wordIndex}
						className="flip-words-word inline-block whitespace-nowrap opacity-0"
						style={{
							animation: "flipFadeInWord 0.3s ease forwards",
							animationDelay: `${wordIndex * 0.3}s`,
						}}
					>
						{wordObj.letters.map((letter, letterIndex) => (
							<span
								key={wordObj.word + letterIndex}
								className="inline-block opacity-0"
								style={{
									animation: "flipFadeInLetter 0.2s ease forwards",
									animationDelay: `${wordIndex * 0.3 + letterIndex * 0.05}s`,
								}}
							>
								{letter}
							</span>
						))}
						<span className="inline-block">&nbsp;</span>
					</span>
				))}
			</div>
		</div>
	);
}
