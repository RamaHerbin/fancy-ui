"use client";

import { useEffect, useState } from "react";
import { BlurReveal, FluidCursor, InteractiveGridPattern, RainbowButton } from "fancy-ui-react";
import { c } from "@/content/content";

export function Hero({ version }: { version: string }) {
	// The grid pattern waits for an idle slot so first paint is the copy + fluid only.
	const [showInteractiveElements, setShowInteractiveElements] = useState(false);

	useEffect(() => {
		if (typeof window.requestIdleCallback === "function") {
			const id = window.requestIdleCallback(() => setShowInteractiveElements(true), { timeout: 200 });
			return () => window.cancelIdleCallback(id);
		}
		const id = window.setTimeout(() => setShowInteractiveElements(true), 100);
		return () => window.clearTimeout(id);
	}, []);

	return (
		<div className="relative flex min-h-[90vh] items-center justify-center overflow-hidden">
			{/* Fluid cursor — contained to this section, never full-screen. HDR path on a
			    WebGPU browser with an HDR display; WebGL fallback everywhere else. */}
			<FluidCursor contained simResolution={128} hdr hdrBoost={2} className="absolute inset-0 -z-10" />

			{/* Grid pinned to a fixed square box centred on the hero copy (4rem lower
			    than the section centre because of `mt-32`), masked by a 500px spotlight
			    so the pattern reads the same at every viewport width. */}
			{showInteractiveElements && (
				<div className="absolute top-[calc(50%+4rem)] left-1/2 h-[1040px] w-[1040px] -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(circle_500px_at_center,white,transparent)] opacity-30">
					<InteractiveGridPattern squares={[26, 26]} className="h-full w-full" />
				</div>
			)}

			<div className="relative z-10 mx-auto mt-32 max-w-4xl px-6 text-center lg:px-8">
				<h1 className="text-foreground text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
					{c("home.hero.title")}
				</h1>

				<BlurReveal delay={0.2} duration={0.75} className="space-y-6">
					<h2 className="text-muted-foreground text-xl font-medium sm:text-2xl lg:text-3xl">
						{c("home.hero.role")}
					</h2>

					<p className="text-muted-foreground text-lg sm:text-xl">
						<span>{c("home.hero.lead")}</span>{" "}
						<a
							href={c("home.hero.sibling.href")}
							target="_blank"
							rel="noopener noreferrer"
							className="text-foreground font-semibold underline-offset-4 hover:underline"
							aria-label={`Open ${c("home.hero.sibling.label")} on npm in a new tab`}
						>
							{c("home.hero.sibling.label")}
						</a>{" "}
						<span className="text-foreground/80">{c("home.hero.lead-tail")}</span>
						<span className="text-foreground/80 text-tiny block italic">{c("home.hero.tagline")}</span>
					</p>

					<div className="pt-8">
						<RainbowButton
							href="#projects"
							sound
							className="px-8 py-4 text-lg font-medium transition-all hover:scale-105"
						>
							{c("home.hero.cta")}
						</RainbowButton>
					</div>
				</BlurReveal>
			</div>

			{/* Version badge — top left */}
			<div className="absolute top-6 left-6 z-20">
				<span className="text-muted-foreground/60 bg-background/80 border-border/20 rounded-md border px-3 py-1.5 font-mono text-xs backdrop-blur-sm">
					{c("home.hero.badge.prefix")}
					{version}
				</span>
			</div>
		</div>
	);
}
