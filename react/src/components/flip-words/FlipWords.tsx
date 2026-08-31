import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils.js";
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

	useEffect(() => {
		// Re-schedule whenever a new word becomes active (not during exit).
		if (isExiting) return;
		if (words.length < 2) return;
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => {
			setIsExiting(true);
			if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
			exitTimeoutRef.current = setTimeout(() => {
				setIsExiting(false);
				setCurrentIndex((index) => (index + 1) % words.length);
			}, EXIT_MS);
		}, duration);
	}, [currentIndex, duration, isExiting, words]);

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
