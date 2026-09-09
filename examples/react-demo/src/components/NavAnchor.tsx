"use client";

import { useEffect, useState } from "react";
import { LiquidGlass, SoundToggle } from "fancy-ui-react";
import { c } from "@/content/content";
import { useTheme } from "@/lib/theme";

function scrollToTop() {
	window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * The nav body, rendered twice: plain for first paint, then again inside
 * LiquidGlass once the 200 ms timer flips. It is REMOUNTED on that swap, so it
 * holds no state of its own — the theme lives on <html>, sound in the package's
 * singleton.
 */
function NavInner({ title }: { title: string }) {
	const { isDark, toggleTheme } = useTheme();

	return (
		<nav
			className="relative flex min-h-12 w-full items-center justify-between px-4 py-2 sm:px-6 md:px-8 lg:px-12"
			aria-label="Main navigation"
		>
			{/* Brand */}
			<button
				type="button"
				onClick={scrollToTop}
				className="text-foreground focus:ring-primary/50 relative flex min-h-[44px] min-w-[44px] translate-y-[5px] items-center justify-center rounded-lg p-3 font-serif italic font-semibold transition-transform duration-300 select-none hover:scale-110 focus:ring-2 focus:outline-none"
				style={{ fontSize: "40px", lineHeight: 1, top: "2px" }}
				aria-label={c("shared.nav.brand-aria")}
			>
				{c("shared.nav.brand")}
			</button>

			{/* Title, out of flow so it stays centred on the nav itself. The symmetric
			    padding is `nav padding + 92px` (the right group: 44 + gap-1 + 44), so
			    the title clears both control groups at every breakpoint. */}
			<div className="pointer-events-none absolute inset-0 flex items-center justify-center px-[6.75rem] sm:px-[7.25rem] md:px-[7.75rem] lg:px-[8.75rem]">
				<span className="text-muted-foreground pointer-events-auto truncate text-sm font-medium tracking-wide">
					{title}
				</span>
			</div>

			{/* Controls, grouped so the centred title has one known width to clear. */}
			<div className="flex items-center gap-1">
				<span className="flex min-h-[44px] min-w-[44px] items-center justify-center">
					<SoundToggle size="md" variant="ghost" />
				</span>

				<button
					type="button"
					onClick={toggleTheme}
					className="bg-muted/50 hover:bg-muted focus:ring-primary/50 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg p-3 transition-colors duration-200 focus:ring-2 focus:outline-none"
					aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
				>
					{isDark ? (
						<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
						</svg>
					) : (
						<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path
								fillRule="evenodd"
								d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
								clipRule="evenodd"
							/>
						</svg>
					)}
				</button>
			</div>
		</nav>
	);
}

export function NavAnchor() {
	// Delay the LiquidGlass effect so the nav renders immediately on first paint.
	const [showBackgroundEffects, setShowBackgroundEffects] = useState(false);

	useEffect(() => {
		const timeout = setTimeout(() => setShowBackgroundEffects(true), 200);
		return () => clearTimeout(timeout);
	}, []);

	const title = c("shared.nav.title");

	return (
		// Fixed, horizontally-centred positioner. Both nav variants fill it, so
		// LiquidGlass's own `position: relative` cannot knock it off-centre.
		<div className="fixed top-8 left-1/2 z-[999999] w-[500px] max-w-[95vw] -translate-x-1/2 rounded-lg">
			{!showBackgroundEffects && (
				<div className="bg-background/80 border-border/20 w-full rounded-lg border backdrop-blur-sm">
					<NavInner title={title} />
				</div>
			)}

			{showBackgroundEffects && (
				<LiquidGlass containerClass="w-full">
					<NavInner title={title} />
				</LiquidGlass>
			)}
		</div>
	);
}
