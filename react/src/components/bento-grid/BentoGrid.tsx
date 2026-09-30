import { useEffect, useState } from "react";
import type { CSSProperties, FocusEvent, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useInView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { staggerDelay } from "../../internals/motion/stagger.js";
import "./bento-grid.css";

export interface BentoGridProps extends HTMLAttributes<HTMLDivElement> {
	className?: string;
	/** Tiles fade up in a stagger the first time the grid scrolls into view. */
	reveal?: boolean;
	/** Colour of the hover glow, the lit bottom edge, the icon ring and the CTA arrow. Any CSS colour; writes `--bento-accent`. */
	accent?: string;
	children?: ReactNode;
}

/** ms per tile, and the total ceiling the stagger is compressed into. */
const STEP = 70;
const CAP = 420;

export function BentoGrid({
	className = "",
	reveal = true,
	accent,
	children,
	style,
	onFocus,
	...rest
}: BentoGridProps) {
	const [node, nodeRef] = useElementRef<HTMLDivElement>();
	const [shown, setShown] = useState(false);

	const reduced = useReducedMotion();
	const revealing = reveal && !reduced;

	// Index every direct element child: `--bento-i` (its position) and
	// `--bento-delay` (its capped stagger delay). Re-indexed when the child
	// list changes, so a list that grows stays in order.
	useEffect(() => {
		if (!node) return;
		const root = node;
		function apply() {
			const kids = Array.from(root.children).filter(
				(el): el is HTMLElement => el instanceof HTMLElement
			);
			kids.forEach((el, i) => {
				el.style.setProperty("--bento-i", String(i));
				el.style.setProperty(
					"--bento-delay",
					`${staggerDelay(i, kids.length, STEP, "first", CAP)}ms`
				);
			});
		}
		apply();
		const mo = new MutationObserver(apply);
		mo.observe(root, { childList: true });
		return () => {
			mo.disconnect();
			for (const el of Array.from(root.children)) {
				if (el instanceof HTMLElement) {
					el.style.removeProperty("--bento-i");
					el.style.removeProperty("--bento-delay");
				}
			}
		};
	}, [node]);

	useInView(node, {
		enabled: revealing && !shown,
		once: true,
		// Any pixel, not a fraction: a grid taller than ~12 viewports could never
		// show 8% of itself at once, and would stay hidden for good.
		threshold: 0,
		rootMargin: "0px 0px -6% 0px",
		onChange: (v) => {
			if (v) setShown(true);
		},
	});

	// Focus arriving inside a still-hidden grid reveals it at once, so a
	// keyboard user never tabs into invisible tiles. React's onFocus is the
	// bubbling focusin.
	function handleFocus(event: FocusEvent<HTMLDivElement>) {
		setShown(true);
		onFocus?.(event);
	}

	const mergedStyle =
		accent === undefined ? style : ({ ...style, "--bento-accent": accent } as CSSProperties);

	return (
		<div
			ref={nodeRef}
			className={cn(
				"fancy-bento mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3",
				revealing && "bento-reveal",
				className
			)}
			data-state={revealing ? (shown ? "shown" : "armed") : undefined}
			style={mergedStyle}
			onFocus={handleFocus}
			{...rest}
		>
			{children}
		</div>
	);
}
