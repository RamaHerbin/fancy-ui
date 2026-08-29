import { useEffect, useState, type HTMLAttributes } from "react";
import { cn } from "../../utils.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import "./container-text-flip.css";

export interface ContainerTextFlipProps extends HTMLAttributes<HTMLParagraphElement> {
	words?: string[];
	interval?: number;
	animationDuration?: number;
	className?: string;
	textClass?: string;
}

export function ContainerTextFlip({
	words = ["better", "modern", "beautiful", "awesome"],
	interval = 3000,
	animationDuration = 700,
	className = "",
	textClass = "",
	...rest
}: ContainerTextFlipProps) {
	const [currentWordIndex, setCurrentWordIndex] = useState(0);
	const currentWord = words[currentWordIndex] ?? "";
	const letters = currentWord.split("");

	// The tick reads the CURRENT `words` (the source's closure reads the reactive
	// prop, so a swapped list changes the cycle length without restarting it) and
	// `interval` is captured once at arm time, exactly as the source's `onMount`
	// evaluates it once.
	const wordsRef = useLiveRef(words);
	const intervalRef = useLiveRef(interval);

	// Mount-only, as the Svelte side starts its interval in `onMount`. Keying this
	// on `words` would tear the timer down and re-arm it on every parent render
	// that passes an inline array literal — a new reference each time — which
	// resets the cadence forever and the word never flips.
	useEffect(() => {
		const id = setInterval(() => {
			setCurrentWordIndex((index) => (index + 1) % wordsRef.current.length);
		}, intervalRef.current);

		return () => clearInterval(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<p
			className={cn(
				// Port-added anchor for the colocated CSS (the source relied on
				// Svelte's compiler scoping).
				"container-text-flip",
				"relative inline-block rounded-lg px-4 pt-2 pb-3 text-center text-4xl font-bold text-black md:text-7xl dark:text-white",
				"[background:linear-gradient(to_bottom,#f3f4f6,#e5e7eb)]",
				"shadow-[inset_0_-1px_#d1d5db,inset_0_0_0_1px_#d1d5db,_0_4px_8px_#d1d5db]",
				"dark:[background:linear-gradient(to_bottom,#374151,#1f2937)]",
				"dark:shadow-[inset_0_-1px_#10171e,inset_0_0_0_1px_hsla(205,89%,46%,.24),_0_4px_8px_#00000052]",
				className
			)}
			{...rest}
		>
			<span className={cn("inline-block", textClass)}>
				<span className="inline-block">
					<span key={currentWord}>
						{letters.map((letter, index) => (
							<span
								key={index}
								className="text-flip-letter inline-block"
								style={{
									animationDelay: `${index * 0.02}s`,
									animationDuration: `${animationDuration}ms`,
								}}
							>
								{letter === " " ? " " : letter}
							</span>
						))}
					</span>
				</span>
			</span>
		</p>
	);
}
