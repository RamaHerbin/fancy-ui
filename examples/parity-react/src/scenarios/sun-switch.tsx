// Mirrors src/lib/components/docs/examples/sun-switch/BasicUsage.svelte.
import { useState } from "react";
import { SunSwitch } from "fancy-ui-react";

export default function Scenario() {
	// The sun is the site's theme switch (the Svelte demo drives createThemeState); the bench
	// stage owns the theme through the URL, so the switch flips the same `dark` class directly.
	const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

	return (
		<header className="w-full max-w-2xl">
			<div className="border-foreground/15 flex items-end justify-between gap-6 border-b">
				<div className="min-w-0 pb-5">
					<p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
						Issue 14 · Late autumn
					</p>
					<h3 className="mt-2 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
						Hours of low light
					</h3>
				</div>
				<SunSwitch
					checked={!isDark}
					onCheckedChange={(day) => {
						document.documentElement.classList.toggle("dark", !day);
						setIsDark(!day);
					}}
					label="Day mode"
					sound
					className="shrink-0"
				/>
			</div>
			<p className="text-muted-foreground mt-4 max-w-prose text-sm leading-relaxed">
				Hover the sun to look at it through the lens. Click it, or focus it and press Space, to
				change the light: the new theme spreads from the sun across the whole page.
			</p>
		</header>
	);
}
