import { useEffect, useState } from "react";

import { cn } from "../../utils.js";
import { AppleCard } from "./AppleCard.js";
import type { AppleCardData } from "./AppleCard.js";

export type { AppleCardData };

export interface AppleCardCarouselProps {
	/** Cards to display in the carousel */
	cards: AppleCardData[];
	/** Additional CSS classes */
	className?: string;
}

export function AppleCardCarousel({ cards, className = "" }: AppleCardCarouselProps) {
	const [expandedIndex, setExpandedIndex] = useState(-1);
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReducedMotion(mq.matches);
		const handler = (e: MediaQueryListEvent) => {
			setReducedMotion(e.matches);
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	return (
		<div className={cn("relative w-full", className)}>
			<div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{cards.map((card, i) => (
					<AppleCard
						key={i}
						card={card}
						index={i}
						expandedIndex={expandedIndex}
						reducedMotion={reducedMotion}
						onExpand={(idx) => setExpandedIndex(idx)}
						onCollapse={() => setExpandedIndex(-1)}
					/>
				))}
			</div>
		</div>
	);
}
