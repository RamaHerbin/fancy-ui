import { useState } from "react";

import { useReducedMotion } from "../../internals/motion/media-query.js";
import { cn } from "../../utils.js";
import { AppleCard } from "./AppleCard.js";
import type { AppleCardData } from "./AppleCard.js";

export type { AppleCardData };

export interface AppleCardCarouselProps {
	/** Cards to display in the carousel */
	cards: AppleCardData[];
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the matching open/close cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

export function AppleCardCarousel({
	cards,
	className = "",
	sound = false,
}: AppleCardCarouselProps) {
	const [expandedIndex, setExpandedIndex] = useState(-1);
	const reducedMotion = useReducedMotion();

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
						sound={sound}
					/>
				))}
			</div>
		</div>
	);
}
