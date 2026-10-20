// Mirrors src/lib/components/docs/examples/scroll-progress/BasicUsage.svelte.
import { useState } from "react";
import { ScrollProgress } from "fancy-ui-react";

export default function Scenario() {
	const [box, setBox] = useState<HTMLDivElement | null>(null);

	return (
		<div className="mx-auto flex w-full max-w-sm flex-col gap-2 p-6">
			<ScrollProgress target={box} position="inline" className="text-primary rounded-full" />
			<div
				ref={setBox}
				className="border-border bg-card h-56 overflow-y-auto rounded-lg border p-4 text-sm leading-relaxed"
			>
				<p className="text-foreground text-xs font-semibold tracking-wide uppercase">0.9.0</p>
				<p className="text-muted-foreground mt-1 mb-4">
					Redesigned the sidebar navigation and shipped a set of layout primitives for scroll-driven
					pages.
				</p>
				<p className="text-foreground text-xs font-semibold tracking-wide uppercase">0.8.0</p>
				<p className="text-muted-foreground mt-1 mb-4">
					Added dark-mode tokens to every core component and fixed a focus-trap bug in the command
					menu.
				</p>
				<p className="text-foreground text-xs font-semibold tracking-wide uppercase">0.7.0</p>
				<p className="text-muted-foreground mt-1 mb-4">
					Introduced the shared motion foundation: easing tokens, a reduced-motion rune, and
					staggered reveal presets.
				</p>
				<p className="text-foreground text-xs font-semibold tracking-wide uppercase">0.6.0</p>
				<p className="text-muted-foreground mt-1">
					Rebuilt the docs search and added keyboard shortcuts for jumping between components.
				</p>
			</div>
			<p className="text-muted-foreground text-xs">
				Scroll the panel above — the bar tracks that element directly (
				<code className="text-xs">target</code>
				), not the whole page.
			</p>
		</div>
	);
}
