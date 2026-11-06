import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "../../utils.js";
import "./letter-pullup.css";

/**
 * LetterPullup - Staggered letter pull-up animation
 *
 * Each letter of the provided text pulls up from below with a staggered delay,
 * creating a wave-like entrance effect. Pure CSS animation.
 */
export interface LetterPullupProps extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
	/** Text to animate (each character gets its own animation) */
	words: string;
	/** Delay between each letter animation (seconds) */
	delay?: number;
	/** Additional CSS classes */
	className?: string;
}

export function LetterPullup({ words, delay = 0.05, className, ...props }: LetterPullupProps) {
	const letters = words.split("");

	return (
		<div className="letter-pullup flex justify-center" {...props}>
			{letters.map((letter, index) => (
				<span
					key={index}
					className={cn(
						"letter-pullup-char inline-block text-center text-4xl font-bold tracking-[-0.02em] text-black drop-shadow-sm md:leading-[5rem] dark:text-white",
						className
					)}
					style={{ "--letter-pullup-delay": `${index * delay}s` } as CSSProperties}
				>
					{letter === " " ? " " : letter}
				</span>
			))}
		</div>
	);
}
