import { useEffect, useRef } from "react";
import { cn } from "../../utils.js";

export interface TextGenerateEffectProps {
	words: string;
	filter?: boolean;
	duration?: number;
	delay?: number;
	stagger?: number;
	className?: string;
}

export function TextGenerateEffect({
	words,
	filter = true,
	duration = 0.7,
	delay = 0,
	stagger = 200,
	className,
}: TextGenerateEffectProps) {
	const wordsArray = words.split(" ");
	const scopeRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const scope = scopeRef.current;
		if (!scope) return;
		const spans = scope.querySelectorAll<HTMLSpanElement>("span");

		const timeout = setTimeout(() => {
			spans.forEach((span, index) => {
				const wordTimeout = setTimeout(() => {
					span.style.opacity = "1";
					span.style.filter = filter ? "blur(0px)" : "none";
				}, index * stagger);

				// Store timeout ID for cleanup
				(span as HTMLSpanElement & { _tid?: ReturnType<typeof setTimeout> })._tid = wordTimeout;
			});
		}, delay);

		return () => {
			clearTimeout(timeout);
			spans.forEach((span) => {
				const tid = (span as HTMLSpanElement & { _tid?: ReturnType<typeof setTimeout> })._tid;
				if (tid) clearTimeout(tid);
			});
		};
		// Mount-only, mirroring the source's onMount: prop changes after mount
		// do not restart the reveal sequence.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className={cn("leading-snug tracking-wide", className)}>
			<div ref={scopeRef}>
				{wordsArray.map((word, idx) => (
					<span
						key={word + idx}
						className="inline-block"
						style={{
							opacity: 0,
							filter: filter ? "blur(10px)" : "none",
							transition: `opacity ${duration}s, filter ${duration}s`,
						}}
					>
						{word}
						{"\u00A0"}
					</span>
				))}
			</div>
		</div>
	);
}
