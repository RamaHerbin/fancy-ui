import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { cn } from "../../utils.js";

export interface ContainerScrollProps {
	/** Additional CSS classes */
	className?: string;
	/** Content rendered in the title area above the card */
	titleContent?: ReactNode;
	/** Content rendered inside the tilting card */
	cardContent?: ReactNode;
}

export function ContainerScroll({
	className = "",
	titleContent,
	cardContent,
}: ContainerScrollProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isMobile, setIsMobile] = useState(false);
	const [scrollYProgress, setScrollYProgress] = useState(0);

	const scaleDimensions: [number, number] = isMobile ? [0.7, 0.9] : [1.05, 1];
	const rotate = 20 * (1 - scrollYProgress);
	const scale =
		scaleDimensions[0] + (scaleDimensions[1] - scaleDimensions[0]) * scrollYProgress;
	const translateY = -100 * scrollYProgress;

	// Svelte does this in `onMount`, which runs before the browser paints. A passive
	// effect would paint one frame at the unresolved pose (desktop scale, rotate 20deg)
	// before snapping — see internals-api.md §4.
	useIsomorphicLayoutEffect(() => {
		function updateIsMobile() {
			setIsMobile(window.innerWidth <= 768);
		}

		function updateScroll() {
			if (!containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			const windowHeight = window.innerHeight;
			const progress = 1 - Math.max(0, rect.bottom - window.scrollY) / windowHeight;
			setScrollYProgress(Math.max(0, Math.min(1, progress)));
		}

		updateIsMobile();
		updateScroll();

		window.addEventListener("resize", updateIsMobile);
		window.addEventListener("scroll", updateScroll, { passive: true });
		window.addEventListener("resize", updateScroll, { passive: true });

		return () => {
			window.removeEventListener("resize", updateIsMobile);
			window.removeEventListener("scroll", updateScroll);
			window.removeEventListener("resize", updateScroll);
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative flex h-[60rem] items-center justify-center p-2 md:h-[80rem] md:p-20",
				className
			)}
		>
			<div className="relative w-full py-10 md:py-40" style={{ perspective: "1000px" }}>
				{/* Title */}
				<div
					style={{ transform: `translateY(${translateY}px)` }}
					className="mx-auto max-w-5xl text-center"
				>
					{titleContent}
				</div>

				{/* Card */}
				<div
					style={{
						transform: `rotateX(${rotate}deg) scale(${scale})`,
						boxShadow:
							"0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
					}}
					className="mx-auto -mt-12 h-[30rem] w-full max-w-5xl rounded-[30px] border-4 border-[#6C6C6C] bg-[#222222] p-2 shadow-2xl md:h-[40rem] md:p-6"
				>
					<div className="size-full overflow-hidden rounded-2xl bg-gray-100 md:rounded-2xl md:p-4 dark:bg-zinc-900">
						{cardContent}
					</div>
				</div>
			</div>
		</div>
	);
}
